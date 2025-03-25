import { BatchedTranslationFiles } from '../types/file.js';
import { FlatJSON } from '../types/json.js';
import { LLMResponse } from '../types/LLM.js';
import { Configuration } from 'src/db/entities/Configuration.js';
export declare function reflectTranslation(content: string, targetLanguage: string, config: Configuration, fileType: string, isTestMode: boolean, context: string): Promise<LLMResponse>;
export declare function reflectTranslationOpenAI(content: string, targetLanguage: string, config: Configuration, fileType: string, context: string): Promise<LLMResponse>;
export declare function batchAndReflect(translationID: number, batchedFilesForReview: BatchedTranslationFiles, reviewsPerBatch: FlatJSON[], targetLanguage: string, config: Configuration): Promise<import("../types/file.js").TranslationFileFlatJSON[]>;
