import dotenv from 'dotenv';
import { FrenglishSDK } from '@frenglish/sdk';
import {
  findLanguageFilesToTranslate,
  readFiles,
  validateFiles,
  getRelativePath,
  FileContentWithLanguage,
} from '@frenglish/utils';

dotenv.config();

const TRANSLATION_PATH = process.env.TRANSLATION_PATH!;
const FRENGLISH_API_KEY = process.env.FRENGLISH_API_KEY;
const EXCLUDED_TRANSLATION_PATH = process.env.EXCLUDED_TRANSLATION_PATH
  ? JSON.parse(process.env.EXCLUDED_TRANSLATION_PATH.replace(/'/g, '"'))
  : [];

/**
 * Uploads translation source files to Frenglish to serve as the base for future comparisons.
 *
 * @param customPath - Path to the folder with source files.
 * @param excludePath - Array of paths to exclude from upload.
 */
export async function upload(
  customPath: string = TRANSLATION_PATH,
  excludePath: string[] = EXCLUDED_TRANSLATION_PATH,
) {
  try {
    if (!FRENGLISH_API_KEY) {
      throw new Error('FRENGLISH_API_KEY environment variable is not set');
    }

    const frenglish = FrenglishSDK(FRENGLISH_API_KEY);
    const supportedLanguages = await frenglish.getSupportedLanguages();
    const supportedFileTypes = await frenglish.getSupportedFileTypes();
    const projectLanguages = await frenglish.getProjectSupportedLanguages();

    const languageFiles = await findLanguageFilesToTranslate(
      customPath,
      projectLanguages.originLanguage,
      supportedLanguages,
      supportedFileTypes,
      excludePath,
    );

    const filesToUpload: FileContentWithLanguage[] = [];

    for (const [language, files] of languageFiles.entries()) {
      if (supportedLanguages.includes(language)) {
        const fileContents = await readFiles(files);
        const validatedFiles = fileContents
          .map((file) => ({
            ...file,
            language,
            fileId: getRelativePath(customPath, file.fileId, supportedLanguages),
          }))
          .filter((file): file is typeof file & { fileId: string } => file.fileId !== undefined);

        if (!validateFiles(validatedFiles)) {
          console.warn('Some files are invalid');
        }

        filesToUpload.push(...validatedFiles);
      } else {
        console.log(`Skipping unsupported language: ${language}`);
      }
    }

    if (filesToUpload.length === 0) {
      console.log('No valid files to upload.');
      return;
    }

    console.log('Uploading files:');
    filesToUpload.forEach((file) => console.log(`- ${file.fileId}`));

    try {
      await frenglish.upload({ files: filesToUpload });
      console.log(`${filesToUpload.length} files uploaded successfully`);
    } catch (uploadError) {
      console.error('Error uploading files:', uploadError);
    }

    console.log('All files processed');
  } catch (error) {
    console.error('Error during upload:', error);
  }
}
