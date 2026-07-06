// Shared IPC contract between main and renderer.

export type RelayState = 'OFFLINE' | 'WAITING' | 'RELAYING' | 'ERROR'

export interface RelayStatus {
  /** High level state of the relay pipeline. */
  state: RelayState
  /** True when OBS is publishing into the local RTMP server. */
  obsConnected: boolean
  /** True when the delayed feeder is pushing to Twitch. */
  pushingToTwitch: boolean
  /** Desired delay in seconds (what the user asked for). */
  delaySeconds: number
  /** Delay actually being applied right now (limited by buffer available since stream start). */
  effectiveDelaySeconds: number
  /** Incoming bitrate from OBS, kbps. */
  bitrateInKbps: number
  /** Outgoing bitrate to Twitch, kbps. */
  bitrateOutKbps: number
  /** Seconds since the relay to Twitch started (0 when not live). */
  uptimeSeconds: number
  /** Last human-readable error, if any. */
  lastError: string | null
}

export interface AppConfig {
  streamKey: string
  delaySeconds: number
  twitchIngestUrl: string
  rtmpPort: number
  segmentSeconds: number
  maxBufferSeconds: number
  setupComplete: boolean
}

export const DEFAULT_CONFIG: AppConfig = {
  streamKey: '',
  delaySeconds: 30,
  twitchIngestUrl: 'rtmp://live.twitch.tv/app',
  rtmpPort: 1935,
  segmentSeconds: 1,
  maxBufferSeconds: 180,
  setupComplete: false
}

// Renderer -> Main invokable channels
export interface OrangeDelayApi {
  getStatus(): Promise<RelayStatus>
  getConfig(): Promise<AppConfig>
  setStreamKey(key: string): Promise<void>
  setDelay(seconds: number): Promise<number>
  startRelay(): Promise<{ ok: boolean; error?: string }>
  stopRelay(): Promise<void>
  testConnection(): Promise<{ ok: boolean; error?: string }>
  toggleDelay(): Promise<boolean>
  completeSetup(): Promise<void>
  // Main -> Renderer push
  onStatus(cb: (status: RelayStatus) => void): () => void
  onLog(cb: (line: string) => void): () => void
}

export const DELAY_PRESETS = [
  { label: 'AO VIVO', seconds: 0 },
  { label: 'RÁPIDO', seconds: 15 },
  { label: 'MÉDIO', seconds: 30 },
  { label: 'LONGO', seconds: 60 }
] as const
