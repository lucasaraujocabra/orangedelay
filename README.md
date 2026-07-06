# OrangeDelay

RTMP relay that sits **between OBS and Twitch** and holds your stream in a buffer for a
delay you choose — and can change **live, without restarting OBS or dropping the stream.**
Anti stream-sniping for Valorant / CS2.

```
OBS ──> rtmp://localhost:1935/live  (OrangeDelay)  ──buffer + delay──>  Twitch
```

## How the delay works (Milestone 1 — validated)

1. `node-media-server` accepts the RTMP publish from OBS on `rtmp://localhost:1935/live`.
2. An **ingest FFmpeg** (`-c copy`, no re-encode) pulls that stream and writes it to a rolling
   ring buffer of 1-second MPEG-TS segments on disk (up to `maxBufferSeconds`, default 180s).
   This runs the whole time OBS is live, regardless of the current delay.
3. A **feeder** paces segments out at realtime to an **egress FFmpeg** that pushes FLV to Twitch.
   The read cursor sits `delay` seconds behind the live edge.
4. **Changing the delay** just moves the read cursor inside the already-buffered content —
   instantly, because the buffer is always full. Increasing delay jumps the cursor *back*
   into buffered footage; decreasing it jumps *forward*. The Twitch connection is never
   restarted and OBS never needs to reconnect.

> The relay was validated headlessly (`OBS → server → segment buffer → delayed egress →
> playable output`, including a live 4s→10s delay change producing a valid stream with zero
> decode errors). See the commit for the harness.

## Run it (dev)

```bash
npm install
npm run dev
```

The app window opens, and the RTMP server starts on `rtmp://localhost:1935/live`.

## Test it with OBS → Twitch (today)

1. **Paste your Twitch stream key** in the SETUP section (get it from
   dashboard.twitch.tv → Settings → Stream). Click **SAVE**, then **TEST TWITCH CONNECTION**.
2. **Point OBS at OrangeDelay** — OBS → Settings → Stream:
   - Service: **Custom...**
   - Server: `rtmp://localhost:1935/live`
   - Stream Key: anything (e.g. `obs`)
3. Start streaming in OBS. The header shows **OBS: CONNECTED** and BITRATE_IN starts moving.
4. Pick a delay (preset or +/- stepper), then click **ENABLE DELAY // GO LIVE**.
   BITRATE_OUT starts, uptime counts, and your Twitch channel goes live ~delay seconds behind.
5. **Change the delay live** — click a different preset while live. The `EFFECTIVE_NOW`
   readout tracks the applied delay. OBS keeps streaming uninterrupted.
6. Global hotkey **Ctrl + Alt + D** toggles the Twitch push on/off.

### Verifying the delay quickly
Point a phone/second device at your public Twitch channel while an on-screen clock is visible
in OBS. The Twitch view should lag your OBS preview by roughly the chosen delay.

## Notes / limits (MVP)

- Egress uses stream **copy** (no re-encode) — very low CPU. On a delay change the cursor
  jumps, so there is a one-time timestamp discontinuity; FFmpeg absorbs it and the Twitch
  connection stays up. Viewers see a brief skip/rewind at the moment you change delay.
- Max delay is bounded by `maxBufferSeconds` (default 180s). Requesting a delay larger than
  what's currently buffered applies the largest available and grows to target as buffer fills.
- Buffer lives in the OS temp dir (`orangedelay-buffer`) and is cleared on each ingest start.

## Build a Windows installer

```bash
npm run build:win
```

Produces an NSIS installer (`orangedelay-<version>-setup.exe`) and a portable exe in `release/`.
`ffmpeg-static` is unpacked from the asar (see `electron-builder.yml`) so the end user needs
**no FFmpeg installed**.

## Stack

Electron + electron-vite · React + TypeScript · Tailwind · node-media-server · ffmpeg-static ·
electron-store · lucide-react · electron-builder.
