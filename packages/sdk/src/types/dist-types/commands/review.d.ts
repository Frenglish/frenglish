import { TranslationFileFlatJSON } from '../types/file.js';
import { LLMResponse } from '../types/LLM.js';
import { Configuration } from 'src/db/entities/Configuration.js';
export declare function reviewTranslation(content: string, targetLanguage: string, config: Configuration, fileType: string, isTestMode: boolean, context: string): Promise<LLMResponse>;
export declare function reviewTranslationOpenAI(content: string, targetLanguage: string, config: Configuration, fileType: string, context: string): Promise<LLMResponse>;
export declare function batchAndReview(translationID: number, filesToTranslate: TranslationFileFlatJSON[], filesTranslated: TranslationFileFlatJSON[], targetLanguage: string, config: Configuration, tokensPerChar: number, maxTokensPerBatchReview: number): Promise<{
    batchedFilesForReview: import("../types/file.js").BatchedTranslationFiles;
    reviewsPerBatch: import("../types/json.js").FlatJSON[];
}>;
