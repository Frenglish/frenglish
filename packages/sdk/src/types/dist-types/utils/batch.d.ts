import { BatchedTranslationFiles, TranslationFileFlatJSON } from "../types/file.js";
export declare function batchTranslationFiles(files: TranslationFileFlatJSON[], tokensPerChar: number, maxTokensPerBatch: number): BatchedTranslationFiles;
export declare function reconstructFiles(batchedFiles: BatchedTranslationFiles): TranslationFileFlatJSON[];
export declare function sortTranslationFilesByTokenCount(files: TranslationFileFlatJSON[], tokensPerChar: number): TranslationFileFlatJSON[];
