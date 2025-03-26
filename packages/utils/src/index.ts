// src/index.ts

// Export all types
export * from './types/translation'
export * from './types/configuration'
export * from './types/file'
export * from './types/IFrenglishSDK'

// Export all utils
export * from './utils/config'
export * from './utils/files'
export * from './utils/utils'

export const FRENGLISH_BACKEND_URL = process.env.FRENGLISH_BACKEND_URL || 'https://api.frenglish.com'
