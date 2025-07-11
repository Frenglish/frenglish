import * as fs from 'fs/promises'
import * as path from 'path'
import glob from 'glob-promise'
import { Minimatch } from 'minimatch'

/**
 * Finds language files by detecting where in the path the language code occurs.
 * Retains the full path starting from the provided basePath and includes everything to the right of the language folder.
 *
 * @param basePath - the base directory to start searching from
 * @param supportedLanguages - array of supported language codes (e.g., ['en', 'fr', 'es'])
 * @returns {Promise<Map<string, string[]>>} - a map of language codes to file paths
 */
export async function findLanguageFilesToTranslate(
  basePath: string,
  originLanguage: string,
  supportedLanguages: string[],
  supportedFileTypes: string[],
  excludePath: string[] = []
): Promise<Map<string, string[]>> {
  const languageFiles = new Map<string, string[]>()
  const fileTypes = supportedFileTypes.join(',')
  const pattern = `**/*.{${fileTypes}}`
  const files = await glob(pattern, { cwd: basePath, absolute: true })

  for (const file of files) {
    const relativeToBase = path.relative(basePath, file)

    const shouldExclude = excludePath.some(excludePattern => {
      const normalizedFile = file.replace(/\\/g, '/')
      const normalizedPattern = excludePattern.trim().replace(/\\/g, '/')
      const cleanPattern = normalizedPattern.replace(/[\[\]'"`]/g, '')

      // If pattern contains glob characters (* or **), use minimatch
      if (cleanPattern.includes('*')) {
        return new Minimatch(cleanPattern, {
          dot: true,
          matchBase: true,
          nocase: true
        }).match(normalizedFile)
      }

      // Otherwise, use simple includes for exact path matching
      return normalizedFile.includes(cleanPattern)
    }) || supportedLanguages.some(lang =>
      // Only exclude if path contains any supported language code that isn't the origin language
      lang !== originLanguage &&
      file.toLowerCase().split(path.sep).includes(lang.toLowerCase())
    )

    if (shouldExclude) {
      continue
    }

    const absoluteParts = file.split(path.sep)
    const language = absoluteParts.find((part: string) => supportedLanguages.includes(part.toLowerCase()))
    const fullPath = path.join(basePath, relativeToBase)
    const targetLanguage = language || supportedLanguages[0]
    if (languageFiles.has(targetLanguage)) {
      languageFiles.get(targetLanguage)!.push(fullPath)
    } else {
      languageFiles.set(targetLanguage, [fullPath])
    }
  }

  return languageFiles
}

// Helper function for reading files
export async function readFiles(files: string[]): Promise<Array<{ fileId: string; content: string }>> {
  const fileContents = await Promise.all(
    files.map(async (file) => {
      try {
        const content = await fs.readFile(file, 'utf-8')
        return { fileId: file, content }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error)
        return null
      }
    })
  )

  return fileContents.filter((file): file is { fileId: string; content: string } => file !== null)
}

// Helper function for validating file contents
export function validateFiles(files: Array<{ fileId: string; content: string }>): boolean {
  return files.every(
    (file) => typeof file.fileId === 'string' && file.fileId.length > 0 && file.content.length > 0
  )
}

// Helper function to get the relative path
export async function getRelativePath(basePath: string, filePath: string, supportedLanguages: string[], excludePaths: string[] = []): Promise<string | undefined> {
  const normalizedFilePath = filePath.replace(/\\/g, '/')

  const isExcluded = excludePaths.some(excludePath => {
    const normalizedExcludePath = excludePath.trim().replace(/\\/g, '/')
    return normalizedFilePath.includes(normalizedExcludePath)
  })

  if (isExcluded) return undefined

  // Get the relative path and normalize it
  const fullRelativePath = path.relative(basePath, filePath).replace(/\\/g, '/')
  const parts = fullRelativePath.split('/')

  // Only remove first directory if it's a language code
  const hasLanguagePrefix = parts.length > 1 && supportedLanguages.includes(parts[0].toLowerCase())
  const result = hasLanguagePrefix ? parts.slice(1).join('/') : fullRelativePath

  return result || undefined
}

/**
 * Extracts the leading space, middle text, and trailing space from a text string.
 * @param text - The text string to process
 * @returns An object containing the leading space, middle text, and trailing space
 */
export function extractTextComponents(text: string): {
  leadingSpace: string;
  middleText: string;
  trailingSpace: string;
} {
  const leadingMatch = text.match(/^\s*/)
  const trailingMatch = text.match(/\s*$/)
  const leadingSpace = leadingMatch ? leadingMatch[0] : ''
  const trailingSpace = trailingMatch ? trailingMatch[0] : ''

  const middleText = text.slice(
    leadingSpace.length,
    text.length - trailingSpace.length
  )

  return {
    leadingSpace,
    middleText,
    trailingSpace
  }
}
