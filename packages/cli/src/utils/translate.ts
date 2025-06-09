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
const TRANSLATION_PATH = localConfig.TRANSLATION_PATH
const EXCLUDED_TRANSLATION_PATH = localConfig.EXCLUDED_TRANSLATION_PATH || []
const TRANSLATION_OUTPUT_PATH = localConfig.TRANSLATION_OUTPUT_PATH || TRANSLATION_PATH

/**
 * Recursively finds all files in a directory that match the supported file types
 */
async function findFilesRecursively(
  dir: string,
  supportedFileTypes: string[],
  excludePath: string[] = []
): Promise<string[]> {
  const files: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  // System files to always exclude
  const systemFiles = ['.DS_Store', 'Thumbs.db', '.git', '.svn', 'node_modules']

  // Filter out empty string from supported types
  const validFileTypes = supportedFileTypes.filter(type => type.length > 0)

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    // Skip system files and excluded paths (only check excludePath if it has items)
    if (systemFiles.includes(entry.name) || (excludePath?.length > 0 && excludePath.some(excluded => fullPath.includes(excluded)))) {
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
    console.log(`Processing path: ${customPath}`)
    console.log(`Output will be written to: ${TRANSLATION_OUTPUT_PATH}`)

    if (!apiKey) {
      throw new Error('API key is required')
    }

    // Resolve the output path to an absolute path for reliable relative calculations later
    const absoluteTranslationOutputPath = path.resolve(process.cwd(), TRANSLATION_OUTPUT_PATH)
    const absoluteCustomPath = path.resolve(process.cwd(), customPath)

    const frenglish = FrenglishSDK(apiKey)
    const supportedFileTypes = await frenglish.getSupportedFileTypes()
    const supportedLanguages = await frenglish.getSupportedLanguages()
    await frenglish.setProjectActiveStatus(true)

    let filesToProcess: string[] = [] // Will contain absolute paths or paths relative to CWD

    try {
      const stats = await fs.stat(customPath)

      if (stats.isDirectory()) {
        console.log(`Provided path is a directory. Searching for translatable files...`)
        filesToProcess = await findFilesRecursively(absoluteCustomPath, supportedFileTypes, excludePath) // Use absolute path
      } else if (stats.isFile()) {
        const ext = path.extname(absoluteCustomPath).toLowerCase().replace('.', '')
        const isSupported = ext && supportedFileTypes.includes(ext)
        // Check exclusion against absolute path for consistency
        const isExcluded = excludePath.some(excluded => absoluteCustomPath.includes(path.resolve(process.cwd(), excluded)))

        if (isSupported && !isExcluded) {
          filesToProcess = [absoluteCustomPath] // Store the absolute path
        } else {
          if (!isSupported) console.warn(`Skipping file ${absoluteCustomPath}: Unsupported file type "${ext}". Supported types: ${supportedFileTypes.join(', ')}`)
          if (isExcluded) console.warn(`Skipping file ${absoluteCustomPath}: Path is excluded.`)
          filesToProcess = []
        }
      } else {
        console.warn(`Provided path ${customPath} exists but is neither a file nor a directory. Skipping.`)
        filesToProcess = []
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(`Error: The specified path "${customPath}" does not exist.`)
      } else {
        console.error(`Error accessing path "${customPath}":`, error)
      }
      return
    }

    // Filter out files that are already in language-specific directories (relative to project root)
    const filteredFiles = filesToProcess.filter(fileAbsolutePath => {
      const relativePathFromCwd = path.relative(process.cwd(), fileAbsolutePath)
      const pathParts = relativePathFromCwd.split(path.sep)
      const directoryParts = pathParts.slice(0, -1)

      // If the file is within the explicitly provided customPath, it should always be processed as a source file.
      // This handles cases where customPath itself is a language-specific directory (e.g., src/locales/en)
      if (fileAbsolutePath.startsWith(absoluteCustomPath)) {
        return true;
      }

      // For files outside the customPath (e.g., if customPath was a parent directory like 'src/locales'
      // and contained both 'en' and 'fr' subdirectories), filter out files that are already
      // in language-specific output directories to avoid re-processing translated files as source input.
      return !directoryParts.some(part => supportedLanguages.includes(part.toLowerCase()))
    })

    if (filteredFiles.length === 0) {
      console.log('\nNo eligible files found to translate after filtering.')
      return
    }

    // Read files using the absolute paths stored in filteredFiles
    const fileContents = await readFiles(filteredFiles)

    if (fileContents.length === 0) {
      console.log('No valid files to translate after reading content.')
      return
    }

    // Generate file IDs relative to CWD for the API request, as originally intended
    const fileIDs = filteredFiles.map(absolutePath =>
      path.relative(process.cwd(), absolutePath)
    )

    const contents = fileContents.map((file) => file.content)

    printFrenglishBanner('Frenglish.ai', '🌍 TRANSLATE - Localized. Simplified.', fileIDs)

    const filesByType = fileIDs.reduce((acc, fileId, index) => {
      const ext = path.extname(fileId).toLowerCase().replace('.', '')
      if (!acc[ext]) {
        acc[ext] = { ids: [], contents: [], absolutePaths: [] }
      }
      acc[ext].ids.push(fileId)
      acc[ext].contents.push(contents[index])
      acc[ext].absolutePaths.push(filteredFiles[index])
      return acc
    }, {} as Record<string, { ids: string[], contents: string[], absolutePaths: string[] }>)

    for (const [fileType, files] of Object.entries(filesByType)) {
      console.log(`\nProcessing ${files.ids.length} file(s) of type: ${fileType}`)
      try {
        const translationResponse = await frenglish.translate(
          files.contents,
          isFullTranslation,
          files.ids,
          partialConfig
        )

        const outdatedFileResponse = await frenglish.getOutdatedFiles()
        const allTranslationResponses = [...translationResponse.content, ...outdatedFileResponse]

        if (allTranslationResponses && allTranslationResponses.length > 0) {
          console.log(`Received translations/updates for ${allTranslationResponses.length} language(s).`)
          for (const languageData of allTranslationResponses) {
            if (!languageData.files || languageData.files.length === 0) {
              console.log(`No files to update for language: ${languageData.language}`)
              continue
            }

            const languageOutputDir = path.join(absoluteTranslationOutputPath, languageData.language)
            console.log(`\nProcessing translations for language: ${languageData.language}`)
            console.log(`Target language directory: ${languageOutputDir}`)

            for (const translatedFile of languageData.files) {
              const originalFileIndex = files.ids.findIndex(id => id === translatedFile.fileId)
              if (originalFileIndex === -1) {
                console.warn(`  -> Original absolute path not found in current batch for translated file ID: ${translatedFile.fileId}. This might happen if the file came from the 'outdated' check.`)
                continue
              }
              const originalFileAbsolutePath = files.absolutePaths[originalFileIndex]
              const relativePathToPreserve = path.relative(absoluteCustomPath, originalFileAbsolutePath)

              if (relativePathToPreserve && !relativePathToPreserve.startsWith('..') && relativePathToPreserve !== '.') {
                // Construct the full final path for the translated file
                // Example: path.join('/abs/path/to/src/locales/ko', 'intros/test.json')
                const translatedFilePath = path.join(languageOutputDir, relativePathToPreserve)
                await fs.mkdir(path.dirname(translatedFilePath), { recursive: true })

                if (translatedFile.content && translatedFile.content.length > 0) {
                  await fs.writeFile(translatedFilePath, translatedFile.content, 'utf8')
                  console.log(`  -> Translated file written: ${path.relative(process.cwd(), translatedFilePath)}`)
                } else {
                  console.warn(`  -> Empty content received for file: ${translatedFile.fileId} (${languageData.language}). Skipping write.`)
                }
              } else {
                console.warn(`  -> Could not determine a valid relative path for: ${originalFileAbsolutePath} within base ${absoluteTranslationOutputPath}. Skipping file ID: ${translatedFile.fileId}. Relative path calculated: "${relativePathToPreserve}"`)
              }
            }
          }
        } else {
          console.log(`No new translations or updates received for ${fileType} files.`)
        }
      } catch (error) {
        console.error(`\nError processing ${fileType} files:`, error)
      }
    }
    console.log('\n 🎉 Translation process finished 🎉')

  } catch (error) {
    console.error('\nTranslation failed:', error)
  }
}