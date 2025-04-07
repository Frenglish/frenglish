import { Configuration } from "../types/configuration"

/**
 * Safely reads a file in Node.js environment
 */
async function readFileInNode(filepath: string): Promise<string> {
  // Use dynamic import to prevent bundling fs and util
  if (typeof window === 'undefined') {
    const fs = await import('fs/promises')
    return fs.readFile(filepath, 'utf8')
  }
  throw new Error('File reading is not supported in browser environment')
}

export async function parsePartialConfig(partialConfig: string | Partial<Configuration> | undefined): Promise<Partial<Configuration> | undefined> {
  if (!partialConfig) {
    return undefined
  }

  if (typeof partialConfig === 'string') {
    try {
      // First try to parse as JSON string
      return JSON.parse(partialConfig)
    } catch {
      // Only try file reading in Node.js environment
      if (typeof window === 'undefined') {
        try {
          const content = await readFileInNode(partialConfig)
          return JSON.parse(content)
        } catch (error) {
          throw new Error(`Failed to parse partialConfig: ${partialConfig}. Must be valid JSON string or path to JSON file. Error: ${error}`)
        }
      } else {
        // In browser, only JSON string parsing is supported
        throw new Error(`Failed to parse partialConfig: ${partialConfig}. Must be valid JSON string in browser environment.`)
      }
    }
  }

  return partialConfig
}