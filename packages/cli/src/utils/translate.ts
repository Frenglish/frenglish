/**
 * Translates files using the Frenglish SDK.
 * Reads all eligible files in a given directory and sends them for translation,
 * saving the results to disk by language.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { FrenglishSDK } from '@frenglish/sdk'
import { readFiles } from '@frenglish/utils'
import { PartialConfiguration } from '@frenglish/utils'
import dotenv from 'dotenv'
import { printFrenglishBanner } from './styling.js'
import { loadLocalConfig } from './localFrenglishConfig.js'

// Load environment variables from the project root
dotenv.config({ path: path.join(process.cwd(), '.env') })

// Load local config first, then fall back to environment variables
const localConfig = loadLocalConfig()
const TRANSLATION_PATH = localConfig.TRANSLATION_PATH || process.env.TRANSLATION_PATH!
const EXCLUDED_TRANSLATION_PATH = localConfig.EXCLUDED_TRANSLATION_PATH || 
  (process.env.EXCLUDED_TRANSLATION_PATH
    ? JSON.parse(process.env.EXCLUDED_TRANSLATION_PATH.replace(/'/g, '"'))
    : [])
const TRANSLATION_OUTPUT_PATH = localConfig.TRANSLATION_OUTPUT_PATH || 
  process.env.TRANSLATION_OUTPUT_PATH || 
  TRANSLATION_PATH

/**
 * Recursively finds all files in a directory that match the supported file types
 */
async function findFilesRecursively(
  dir: string,
  supportedFileTypes: string[],
  excludePath: string[]
): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  // System files to always exclude
  const systemFiles = ['.DS_Store', 'Thumbs.db', '.git', '.svn', 'node_modules']

  // Filter out empty string from supported types
  const validFileTypes = supportedFileTypes.filter(type => type.length > 0)

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    
    // Skip system files and excluded paths
    if (systemFiles.includes(entry.name) || excludePath.some(excluded => fullPath.includes(excluded))) {
      continue
    }

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      const subFiles = await findFilesRecursively(fullPath, validFileTypes, excludePath)
      files.push(...subFiles)
    } else if (entry.isFile()) {
      // Check if file extension is supported (without the dot)
      const ext = path.extname(entry.name).toLowerCase().replace('.', '')
      if (ext && validFileTypes.includes(ext)) {
        files.push(fullPath)
      }
    }
  }

  return files
}

/**
 * Translates localization files in the specified directory using the Frenglish API.
 * Files are read from the translation path and written to language-specific folders
 * in the translation output path, maintaining the exact same directory structure.
 *
 * @param apiKey - The Frenglish API key for authentication
 * @param customPath - Path to the files to translate (defaults to TRANSLATION_PATH)
 * @param isFullTranslation - Whether to perform a full translation or only changes
 * @param partialConfig - Optional custom configuration to override project defaults
 * @param excludePath - Optional list of paths to exclude from translation
 */
export async function translate(
  apiKey: string,
  customPath: string = TRANSLATION_PATH,
  isFullTranslation: boolean = false,
  partialConfig: PartialConfiguration = {},
  excludePath: string[] = EXCLUDED_TRANSLATION_PATH
) {
  try {
    console.log('Starting translation process...')
    console.log(`Reading files from: ${customPath}`)
    console.log(`Output will be written to: ${TRANSLATION_OUTPUT_PATH}`)

    if (!apiKey) {
      throw new Error('API key is required')
    }

    const frenglish = FrenglishSDK(apiKey)
    const supportedFileTypes = await frenglish.getSupportedFileTypes()
    const supportedLanguages = await frenglish.getSupportedLanguages()
    // Ensure we set the project status to active to allow translations
    await frenglish.setProjectActiveStatus(true)

    // Find all files recursively in the translation path
    const filesToTranslate = await findFilesRecursively(customPath, supportedFileTypes, excludePath)

    // Filter out files that are in language-specific directories
    const filteredFiles = filesToTranslate.filter(file => {
      const relativePath = path.relative(customPath, file)
      const pathParts = relativePath.split(path.sep)
      // Skip if any part of the path matches a supported language code
      return !pathParts.some(part => supportedLanguages.includes(part.toLowerCase()))
    })

    if (filteredFiles.length === 0) {
      console.log('\nNo files found to translate.')
      return
    }

    const fileContents = await readFiles(filteredFiles)

    if (fileContents.length === 0) {
      console.log('No valid files to translate after reading.')
      return
    }

    // Get relative paths for all files
    const fileIDs = filteredFiles.map(file => 
      path.relative(customPath, file)
    )

    const contents = fileContents.map((file) => file.content)

    printFrenglishBanner('Frenglish.ai', '🌍 TRANSLATE - Localized. Simplified.', fileIDs);

    // Group files by type for separate processing
    const filesByType = fileIDs.reduce((acc, fileId, index) => {
      const ext = path.extname(fileId).toLowerCase().replace('.', '')
      if (!acc[ext]) {
        acc[ext] = { ids: [], contents: [] }
      }
      acc[ext].ids.push(fileId)
      acc[ext].contents.push(contents[index])
      return acc
    }, {} as Record<string, { ids: string[], contents: string[] }>)

    // Process each file type separately
    for (const [fileType, files] of Object.entries(filesByType)) {
      try {        
        const translationResponse = await frenglish.translate(
          files.contents,
          isFullTranslation,
          files.ids,
          partialConfig
        )

        if (translationResponse?.content) {
          for (const languageData of translationResponse.content) {
            // Create language-specific output directory
            const languageOutputDir = path.join(TRANSLATION_OUTPUT_PATH, languageData.language)
            await fs.mkdir(languageOutputDir, { recursive: true })
            console.log(`Created output directory for ${languageData.language}: ${languageOutputDir}`)

            for (const translatedFile of languageData.files) {
              const originalFile = files.ids.find((f) => f === translatedFile.fileId)
              if (originalFile) {
                // Create the full output path maintaining the original structure
                const translatedFilePath = path.join(languageOutputDir, originalFile)
                await fs.mkdir(path.dirname(translatedFilePath), { recursive: true })

                if (translatedFile.content.length > 0) {
                  await fs.writeFile(translatedFilePath, translatedFile.content, 'utf8')
                  console.log(`Translated file written: ${translatedFilePath}`)
                } else {
                  console.warn(`Empty content for file: ${translatedFile.fileId}. Skipping.`)
                }
              } else {
                console.warn(`Original file not found for translated file: ${translatedFile.fileId}`)
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error processing ${fileType} files:`, error)
        console.log(`Skipping remaining ${fileType} files and continuing with other file types...`)
      }
    }
  } catch (error) {
    console.error('Translation failed:', error)
  }
}
