/**
 * Translates files using the Frenglish SDK.
 * Reads all eligible files in a given directory and sends them for translation,
 * saving the results to disk by language.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { FrenglishSDK } from '@frenglish/sdk'
import { findLanguageFilesToTranslate, getRelativePath, readFiles } from '@frenglish/utils'
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
 * Translates localization files in the specified directory using the Frenglish API.
 *
 * @param apiKey - The Frenglish API key for authentication
 * @param customPath - Path to the files to translate.
 * @param isFullTranslation - Whether to perform a full translation or only changes.
 * @param partialConfig - Optional custom configuration to override project defaults.
 * @param excludePath - Optional list of paths to exclude from translation.
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

    if (!apiKey) {
      throw new Error('API key is required')
    }

    const frenglish = FrenglishSDK(apiKey)
    const originLanguage = (await frenglish.getDefaultConfiguration()).originLanguage
    const supportedFileTypes = await frenglish.getSupportedFileTypes()
    const supportedLanguages = await frenglish.getSupportedLanguages()
    if (!originLanguage) {
      throw new Error('Origin language not found')
    }
    // Ensure we set the project status to active to allow translations
    await frenglish.setProjectActiveStatus(true)

    const languageFiles = await findLanguageFilesToTranslate(
      customPath,
      originLanguage,
      supportedLanguages,
      supportedFileTypes,
      excludePath
    )

    const filesToTranslate = Array.from(languageFiles.values()).flat()

    if (filesToTranslate.length === 0) {
      console.log('No files found to translate.')
      return
    }

    const fileContents = await readFiles(filesToTranslate)

    if (fileContents.length === 0) {
      console.log('No valid files to translate after reading.')
      return
    }

    const fileIDs = (
      await Promise.all(
        fileContents.map((file) =>
          getRelativePath(customPath, file.fileId, supportedLanguages, excludePath)
        )
      )
    ).filter((path): path is string => path !== undefined)

    const contents = fileContents.map((file) => file.content)

    printFrenglishBanner('Frenglish.ai', '🌍 TRANSLATE - Localized. Simplified.', fileIDs);

    const translationResponse = await frenglish.translate(
      contents,
      isFullTranslation,
      fileIDs,
      partialConfig
    )

    if (translationResponse?.content) {
      for (const languageData of translationResponse.content) {
        for (const translatedFile of languageData.files) {
          const originalFile = fileIDs.find((f) => f === translatedFile.fileId)
          if (originalFile) {
            const translatedFilePath = path.join(TRANSLATION_OUTPUT_PATH, languageData.language, originalFile)
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
    } else {
      console.warn('No content in translation response')
    }
  } catch (error) {
    console.error('Translation failed:', error)
  }
}
