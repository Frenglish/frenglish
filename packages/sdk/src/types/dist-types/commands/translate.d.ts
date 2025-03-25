import { TranslationFileFlatJSON } from '../types/file.js';
import { LLMResponse } from '../types/LLM.js';
import { Configuration } from 'src/db/entities/Configuration.js';
export declare function translateText(text: string, language: string, config: Configuration, fileType: string, isTestMode: boolean, context: string): Promise<LLMResponse>;
export declare function translateOpenAI(jsonString: string, language: string, config: Configuration, fileType: string, context: string): Promise<LLMResponse>;
export declare function batchAndTranslate(translationID: number, filesToTranslate: TranslationFileFlatJSON[], targetLanguage: string, config: Configuration, tokensPerChar: number, maxTokensPerBatchTranslation: number): Promise<TranslationFileFlatJSON[]>;
