import type { OrangeDelayApi } from '../shared/types'

declare global {
  interface Window {
    orange: OrangeDelayApi
  }
}

export {}
