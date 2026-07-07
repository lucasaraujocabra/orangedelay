import { contextBridge, ipcRenderer } from 'electron'
import type { RelayStatus } from '../shared/types'

const api = {
  getStatus: () => ipcRenderer.invoke('relay:getStatus'),
  getConfig: () => ipcRenderer.invoke('relay:getConfig'),
  setStreamKey: (key: string) => ipcRenderer.invoke('relay:setStreamKey', key),
  setDelay: (seconds: number) => ipcRenderer.invoke('relay:setDelay', seconds),
  startRelay: () => ipcRenderer.invoke('relay:start'),
  stopRelay: () => ipcRenderer.invoke('relay:stop'),
  testConnection: () => ipcRenderer.invoke('relay:test'),
  toggleDelay: () => ipcRenderer.invoke('relay:toggle'),
  completeSetup: () => ipcRenderer.invoke('relay:completeSetup'),
  getLicense: () => ipcRenderer.invoke('license:get'),
  setLicenseKey: (key: string) => ipcRenderer.invoke('license:set', key),
  refreshLicense: () => ipcRenderer.invoke('license:refresh'),
  openCheckout: (plan: 'monthly' | 'annual') => ipcRenderer.invoke('license:checkout', plan),
  onStatus: (cb: (status: RelayStatus) => void) => {
    const handler = (_e: unknown, status: RelayStatus) => cb(status)
    ipcRenderer.on('relay:status', handler)
    return () => ipcRenderer.removeListener('relay:status', handler)
  },
  onLog: (cb: (line: string) => void) => {
    const handler = (_e: unknown, line: string) => cb(line)
    ipcRenderer.on('relay:log', handler)
    return () => ipcRenderer.removeListener('relay:log', handler)
  }
}

contextBridge.exposeInMainWorld('orange', api)
