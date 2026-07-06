import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import fs from 'fs'
import path from 'path'
import ffmpegStaticImport from 'ffmpeg-static'
// node-media-server v2 is CommonJS
import NodeMediaServer from 'node-media-server'
import type { AppConfig, RelayStatus, RelayState } from '../shared/types'

/**
 * Resolve the bundled ffmpeg binary path, accounting for asar packaging.
 * In a packaged app the binary lives under app.asar.unpacked.
 */
function resolveFfmpegPath(): string {
  const raw = (ffmpegStaticImport as unknown as string) || ''
  return raw.replace('app.asar', 'app.asar.unpacked')
}

const SEG_RE = /^seg_(\d+)\.ts$/

/**
 * OrangeDelay relay pipeline.
 *
 *   OBS ──RTMP──> node-media-server (localhost:PORT/live/KEY)
 *                      │
 *          ingest ffmpeg (-c copy) ──> rolling .ts segment ring buffer on disk
 *                      │
 *          feeder (paced, realtime) ──> egress ffmpeg (pipe:0 mpegts -> flv) ──> Twitch
 *
 * The ring buffer is always filled while OBS is publishing, so the DELAY can be
 * changed live and instantly (jump the read cursor inside the already-buffered
 * content) without ever restarting OBS or the Twitch connection.
 */
export class RelayManager extends EventEmitter {
  private config: AppConfig
  private readonly bufferDir: string
  private readonly ffmpegPath: string

  private nms: any = null
  private ingest: ChildProcess | null = null
  private egress: ChildProcess | null = null

  private activeStreamPath: string | null = null
  private feederTimer: NodeJS.Timeout | null = null
  private statusTimer: NodeJS.Timeout | null = null

  // feeder state
  private nextToSend = 0
  private dueCount = 0
  private lastTickMs = 0
  private feeding = false // reentrancy lock while writing a segment
  private egressWritable = true
  private wantLive = false // user asked to be live to Twitch
  private feederStartedAt = 0

  // metrics
  private bitrateInKbps = 0
  private bitrateOutKbps = 0
  private lastError: string | null = null

  private status: RelayStatus

  constructor(config: AppConfig, bufferDir: string) {
    super()
    this.config = { ...config }
    this.bufferDir = bufferDir
    this.ffmpegPath = resolveFfmpegPath()
    this.status = {
      state: 'OFFLINE',
      obsConnected: false,
      pushingToTwitch: false,
      delaySeconds: config.delaySeconds,
      effectiveDelaySeconds: 0,
      bitrateInKbps: 0,
      bitrateOutKbps: 0,
      uptimeSeconds: 0,
      lastError: null
    }
  }

  // ---------------------------------------------------------------- lifecycle

  /** Boot the local RTMP server. Idempotent. */
  start(): void {
    if (this.nms) return
    this.ensureBufferDir(true)

    const nmsConfig = {
      logType: 0,
      rtmp: {
        port: this.config.rtmpPort,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
      },
      http: {
        port: 8000,
        allow_origin: '*'
      }
    }

    this.nms = new (NodeMediaServer as any)(nmsConfig)

    this.nms.on('postPublish', (_id: string, streamPath: string) => {
      this.log(`OBS conectado — publicando em ${streamPath}`)
      this.activeStreamPath = streamPath
      this.status.obsConnected = true
      this.startIngest(streamPath)
      // If the user already armed "go live", start pushing to Twitch now.
      if (this.wantLive) this.startEgress()
      this.setState('WAITING')
      this.pushStatus()
    })

    this.nms.on('donePublish', (_id: string, streamPath: string) => {
      if (streamPath !== this.activeStreamPath) return
      this.log('OBS desconectado — parando ingestão')
      this.status.obsConnected = false
      this.stopIngest()
      this.stopEgress()
      this.setState('OFFLINE')
      this.pushStatus()
    })

    try {
      this.nms.run()
      this.log(`Servidor RTMP escutando em rtmp://localhost:${this.config.rtmpPort}/live`)
    } catch (err: any) {
      this.fail(`Falha ao iniciar o servidor RTMP: ${err?.message || err}`)
    }

    this.statusTimer = setInterval(() => this.pushStatus(), 1000)
  }

  stop(): void {
    this.stopEgress()
    this.stopIngest()
    if (this.statusTimer) clearInterval(this.statusTimer)
    this.statusTimer = null
    if (this.nms) {
      try {
        this.nms.stop()
      } catch {
        /* ignore */
      }
      this.nms = null
    }
  }

  // ------------------------------------------------------------------- ingest

  private startIngest(streamPath: string): void {
    this.stopIngest()
    this.ensureBufferDir(true)

    const src = `rtmp://127.0.0.1:${this.config.rtmpPort}${streamPath}`
    const pattern = path.join(this.bufferDir, 'seg_%08d.ts')

    // Continuous timestamps across segments (NO -reset_timestamps) so the
    // concatenated bytes form one monotonic mpegts stream at the egress.
    const args = [
      '-loglevel', 'info',
      '-stats',
      '-fflags', '+genpts',
      '-i', src,
      '-c', 'copy',
      '-f', 'segment',
      '-segment_time', String(this.config.segmentSeconds),
      '-segment_format', 'mpegts',
      '-reset_timestamps', '0',
      '-y',
      pattern
    ]

    this.log(`ingestão: ffmpeg puxando ${src}`)
    // Give NMS a beat to register the stream before ffmpeg connects.
    setTimeout(() => {
      if (!this.status.obsConnected) return
      const proc = spawn(this.ffmpegPath, args, { windowsHide: true })
      this.ingest = proc
      this.nextToSend = 0
      proc.stderr.on('data', (d) => this.onFfmpegStderr('IN', d.toString()))
      proc.on('exit', (code) => {
        this.log(`ffmpeg de ingestão encerrou (${code})`)
        if (this.ingest === proc) this.ingest = null
      })
      proc.on('error', (err) => this.fail(`erro no ffmpeg de ingestão: ${err.message}`))
    }, 400)
  }

  private stopIngest(): void {
    this.stopFeeder()
    if (this.ingest) {
      try {
        this.ingest.kill('SIGKILL')
      } catch {
        /* ignore */
      }
      this.ingest = null
    }
    this.bitrateInKbps = 0
  }

  // ------------------------------------------------------------------- egress

  /**
   * Arm/start pushing the delayed stream to Twitch. Safe to call before OBS
   * connects — it will begin once ingest produces buffer.
   */
  startEgress(): { ok: boolean; error?: string } {
    this.wantLive = true
    if (!this.config.streamKey) {
      const msg = 'Nenhuma stream key da Twitch configurada.'
      this.lastError = msg
      return { ok: false, error: msg }
    }
    if (!this.status.obsConnected) {
      // Armed; will start on postPublish.
      this.log('No ar armado — aguardando o OBS conectar...')
      this.pushStatus()
      return { ok: true }
    }
    if (this.egress) return { ok: true }

    const target = `${this.config.twitchIngestUrl}/${this.config.streamKey}`
    const args = [
      '-loglevel', 'info',
      '-stats',
      '-fflags', '+genpts+igndts',
      '-f', 'mpegts',
      '-i', 'pipe:0',
      '-c', 'copy',
      '-bsf:a', 'aac_adtstoasc',
      '-muxdelay', '0',
      '-muxpreload', '0',
      '-f', 'flv',
      target
    ]

    this.log('saída: iniciando envio pra Twitch')
    const proc = spawn(this.ffmpegPath, args, { windowsHide: true })
    this.egress = proc
    this.egressWritable = true
    this.feederStartedAt = Date.now()

    proc.stdin.on('error', () => {
      /* broken pipe on shutdown — ignore */
    })
    proc.stdin.on('drain', () => {
      this.egressWritable = true
    })
    proc.stderr.on('data', (d) => this.onFfmpegStderr('OUT', d.toString()))
    proc.on('exit', (code) => {
      this.log(`ffmpeg de saída encerrou (${code})`)
      if (this.egress === proc) {
        this.egress = null
        this.status.pushingToTwitch = false
        if (this.wantLive && this.status.obsConnected) {
          // Unexpected drop while we still want to be live — surface it.
          this.setState('ERROR')
          this.lastError = 'Envio pra Twitch caiu inesperadamente. Verifique a stream key / conexão.'
        }
        this.pushStatus()
      }
    })
    proc.on('error', (err) => this.fail(`erro no ffmpeg de saída: ${err.message}`))

    this.status.pushingToTwitch = true
    this.setState('RELAYING')
    this.startFeeder()
    return { ok: true }
  }

  stopEgress(): void {
    this.wantLive = false
    this.stopFeeder()
    if (this.egress) {
      try {
        this.egress.stdin?.end()
        this.egress.kill('SIGKILL')
      } catch {
        /* ignore */
      }
      this.egress = null
    }
    this.status.pushingToTwitch = false
    this.bitrateOutKbps = 0
    if (this.status.obsConnected) this.setState('WAITING')
  }

  // ------------------------------------------------------------------- feeder

  private startFeeder(): void {
    this.stopFeeder()
    // Initialise the read cursor to sit `delay` behind the current live edge.
    const latest = this.completeLatest()
    const delaySegs = this.delaySegments()
    this.nextToSend = Math.max(this.oldestIndex(), latest - delaySegs + 1)
    if (this.nextToSend < 0) this.nextToSend = 0
    this.dueCount = 0
    this.lastTickMs = Date.now()
    this.feederStartedAt = Date.now()
    this.feederTimer = setInterval(() => void this.tick(), 200)
  }

  private stopFeeder(): void {
    if (this.feederTimer) clearInterval(this.feederTimer)
    this.feederTimer = null
    this.feeding = false
  }

  private async tick(): Promise<void> {
    if (this.feeding || !this.egress || !this.egress.stdin?.writable) return

    const now = Date.now()
    const dt = (now - this.lastTickMs) / 1000
    this.lastTickMs = now

    // Realtime pacing: accumulate how many segments are "due".
    this.dueCount += dt / this.config.segmentSeconds

    const latest = this.completeLatest()
    if (latest < 0) return

    // Prune the ring buffer while we're here.
    this.pruneBuffer(latest)

    if (this.nextToSend < this.oldestIndex()) {
      // Requested content already pruned — snap forward to oldest available.
      this.nextToSend = this.oldestIndex()
    }

    this.feeding = true
    try {
      // Emit at most a few segments per tick to catch up, but never the future.
      let guard = 0
      while (this.dueCount >= 1 && this.nextToSend <= latest && this.egressWritable && guard < 8) {
        const idx = this.nextToSend
        const ok = await this.sendSegment(idx)
        if (!ok) break
        this.nextToSend++
        this.dueCount -= 1
        guard++
      }
      if (this.dueCount > 3) this.dueCount = 3 // avoid runaway catch-up
    } finally {
      this.feeding = false
    }
  }

  private async sendSegment(idx: number): Promise<boolean> {
    const file = path.join(this.bufferDir, this.segName(idx))
    let data: Buffer
    try {
      data = await fs.promises.readFile(file)
    } catch {
      return false // not ready / pruned
    }
    const stdin = this.egress?.stdin
    if (!stdin || !stdin.writable) return false
    const ok = stdin.write(data)
    if (!ok) {
      this.egressWritable = false
    }
    return true
  }

  // ------------------------------------------------------------- delay control

  /** Change the live delay. Applies instantly by jumping the read cursor. */
  setDelay(seconds: number): number {
    const clamped = Math.max(0, Math.min(seconds, this.config.maxBufferSeconds - 5))
    this.config.delaySeconds = clamped
    this.status.delaySeconds = clamped

    if (this.egress && this.status.obsConnected) {
      const latest = this.completeLatest()
      const delaySegs = this.delaySegments()
      const desired = latest - delaySegs + 1
      this.nextToSend = Math.max(this.oldestIndex(), Math.min(desired, latest + 1))
      this.dueCount = 0
      this.lastTickMs = Date.now()
      this.log(`delay -> ${clamped}s (cursor pulou para o segmento ${this.nextToSend})`)
    } else {
      this.log(`delay -> ${clamped}s`)
    }
    this.pushStatus()
    return clamped
  }

  setStreamKey(key: string): void {
    this.config.streamKey = key.trim()
  }

  updateConfig(patch: Partial<AppConfig>): void {
    this.config = { ...this.config, ...patch }
    this.status.delaySeconds = this.config.delaySeconds
  }

  /** Ctrl+Alt+D: toggle the Twitch push on/off. Returns new "live" intent. */
  toggle(): boolean {
    if (this.wantLive || this.egress) {
      this.stopEgress()
      return false
    }
    this.startEgress()
    return true
  }

  // -------------------------------------------------------- connection test

  /**
   * Verify we can reach Twitch ingest with the current key by probing the RTMP
   * endpoint with a tiny throwaway ffmpeg publish.
   */
  testConnection(): Promise<{ ok: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!this.config.streamKey) {
        resolve({ ok: false, error: 'Nenhuma stream key configurada.' })
        return
      }
      const target = `${this.config.twitchIngestUrl}/${this.config.streamKey}`
      // Generate 0.4s of black + silence and try to publish; if the handshake
      // and first packets succeed, the key/route is valid.
      const args = [
        '-loglevel', 'error',
        '-f', 'lavfi', '-i', 'color=c=black:s=256x144:r=15',
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
        '-t', '0.4',
        '-c:v', 'libx264', '-preset', 'ultrafast', '-b:v', '200k', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '32k',
        '-f', 'flv', target
      ]
      let stderr = ''
      const proc = spawn(this.ffmpegPath, args, { windowsHide: true })
      const killer = setTimeout(() => proc.kill('SIGKILL'), 8000)
      proc.stderr.on('data', (d) => (stderr += d.toString()))
      proc.on('exit', (code) => {
        clearTimeout(killer)
        if (code === 0) resolve({ ok: true })
        else {
          const reason = /Operation not permitted|Server error|401|403|Name does not resolve|failed/i.test(stderr)
            ? 'Twitch recusou a conexão — verifique sua stream key.'
            : `ffmpeg encerrou com código ${code}.`
          resolve({ ok: false, error: reason })
        }
      })
      proc.on('error', (err) => {
        clearTimeout(killer)
        resolve({ ok: false, error: err.message })
      })
    })
  }

  // --------------------------------------------------------------- buffer utils

  private segName(idx: number): string {
    return `seg_${String(idx).padStart(8, '0')}.ts`
  }

  private listSegments(): number[] {
    let files: string[]
    try {
      files = fs.readdirSync(this.bufferDir)
    } catch {
      return []
    }
    const idx: number[] = []
    for (const f of files) {
      const m = SEG_RE.exec(f)
      if (m) idx.push(parseInt(m[1], 10))
    }
    idx.sort((a, b) => a - b)
    return idx
  }

  /** Highest fully-written segment index (the max on disk is still being written). */
  private completeLatest(): number {
    const idx = this.listSegments()
    if (idx.length < 2) return -1
    return idx[idx.length - 2]
  }

  private oldestIndex(): number {
    const idx = this.listSegments()
    return idx.length ? idx[0] : 0
  }

  private delaySegments(): number {
    return Math.round(this.config.delaySeconds / this.config.segmentSeconds)
  }

  private pruneBuffer(latest: number): void {
    const keep = Math.ceil(this.config.maxBufferSeconds / this.config.segmentSeconds)
    const minKeep = latest - keep
    if (minKeep <= 0) return
    for (const i of this.listSegments()) {
      if (i < minKeep && i < this.nextToSend) {
        fs.promises.unlink(path.join(this.bufferDir, this.segName(i))).catch(() => {})
      }
    }
  }

  private ensureBufferDir(clean: boolean): void {
    try {
      if (clean && fs.existsSync(this.bufferDir)) {
        for (const f of fs.readdirSync(this.bufferDir)) {
          if (SEG_RE.test(f)) fs.unlinkSync(path.join(this.bufferDir, f))
        }
      }
      fs.mkdirSync(this.bufferDir, { recursive: true })
    } catch (err: any) {
      this.log(`buffer dir error: ${err?.message}`)
    }
  }

  // ------------------------------------------------------------------- status

  private effectiveDelaySeconds(): number {
    const latest = this.completeLatest()
    if (latest < 0 || !this.egress) return 0
    const lastSent = this.nextToSend - 1
    const segs = Math.max(0, latest - lastSent)
    return Math.round(segs * this.config.segmentSeconds)
  }

  getStatus(): RelayStatus {
    this.status.delaySeconds = this.config.delaySeconds
    this.status.effectiveDelaySeconds = this.effectiveDelaySeconds()
    this.status.bitrateInKbps = Math.round(this.bitrateInKbps)
    this.status.bitrateOutKbps = Math.round(this.bitrateOutKbps)
    this.status.uptimeSeconds =
      this.status.pushingToTwitch && this.feederStartedAt
        ? Math.floor((Date.now() - this.feederStartedAt) / 1000)
        : 0
    this.status.lastError = this.lastError
    return { ...this.status }
  }

  getConfig(): AppConfig {
    return { ...this.config }
  }

  private setState(s: RelayState): void {
    this.status.state = s
    if (s !== 'ERROR') this.lastError = this.lastError && s === 'OFFLINE' ? null : this.lastError
  }

  private pushStatus(): void {
    this.emit('status', this.getStatus())
  }

  private onFfmpegStderr(dir: 'IN' | 'OUT', text: string): void {
    const m = /bitrate=\s*([\d.]+)\s*kbits\/s/i.exec(text)
    if (m) {
      const v = parseFloat(m[1])
      if (dir === 'IN') this.bitrateInKbps = v
      else this.bitrateOutKbps = v
    }
    // surface only real errors to the log to avoid spam
    if (/error|failed|Invalid|Non-monotonous|Connection refused/i.test(text)) {
      const line = text.split('\n').find((l) => /error|failed|Invalid|refused/i.test(l))
      if (line) this.log(`[${dir}] ${line.trim()}`)
    }
  }

  private log(line: string): void {
    this.emit('log', line)
  }

  private fail(msg: string): void {
    this.lastError = msg
    this.setState('ERROR')
    this.log(`ERROR: ${msg}`)
    this.pushStatus()
  }
}
