import { FilesTextMap, TranslationFileFlatJSON } from 'src/types/file.js';
import { S3File } from 'src/types/s3.js';
import { Filter } from 'src/types/configuration.js';
import { TranslationType } from 'src/types/translation.js';
export declare function changeFilePathLanguage(filePath: string, originLanguage: string, targetLanguage: string): string;
export declare function isAlreadyTranslated(projectID: number, s3Files: S3File[], originLanguage: string, languages: string[], translationType?: TranslationType): Promise<boolean>;
export declare function prepareTranslation(newContent: TranslationFileFlatJSON[], projectID: number, originLanguage: string, targetLanguage: string, translationType?: TranslationType, filters?: Filter): Promise<{
    filesToTranslate: TranslationFileFlatJSON[];
    filesTextMap: FilesTextMap;
}>;
export declare function extractTextFromFile(file: Express.Multer.File): Promise<string>;
export declare function splitDocumentIntoChunks(text: string, chunkSize?: number): string[];
