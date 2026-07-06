declare module 'node-media-server' {
  export default class NodeMediaServer {
    constructor(config: unknown)
    run(): void
    stop(): void
    on(event: string, listener: (...args: any[]) => void): void
  }
}
