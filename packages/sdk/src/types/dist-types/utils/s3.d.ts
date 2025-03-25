import { S3File } from "src/types/s3.js";
import { Translation } from "src/db/entities/Translation.js";
import { TranslationResponse } from "src/types/api.js";
import { TranslationType } from "src/types/translation.js";
export declare function fetchFilesContent(s3Files: S3File[], projectID: number, throwOnEmpty?: boolean): Promise<TranslationFileFlatJSON[]>;
export declare function fetchFileContent(s3File: S3File, projectID: number, throwOnEmpty?: boolean): Promise<{
    flat: import("../types/json.js").FlatJSON[];
    raw: string | Buffer;
}>;
export declare function fetchLatestTranslatedTextmap(projectID: number, targetLanguage?: string): Promise<import("../types/json.js").FlatJSON[]>;
export declare function fetchTranslationContent(translation: Translation): Promise<TranslationResponse[]>;
export declare function uploadToS3AndTranslate(fileIDs: string[], content: (string | Buffer)[], projectID: number, language: string, configurationID: number, metadata?: any, translationType?: TranslationType): Promise<{
    uploadedFiles: any[];
    translationRequest: any;
}>;
/**
 * Validates the structure of the UUID.
 * Expected format: {projectID}/{language}/{fileID}
 *
 * - projectID: One or more digits.
 * - language: Two to three lowercase letters, optionally followed by hyphen and two to three lowercase letters.
 * - fileID: One or more characters.
 *
 * @param uuid - The UUID to validate.
 * @returns boolean - True if valid, throws an error if invalid.
 */
export declare function validateUUID(uuid: string): boolean;
