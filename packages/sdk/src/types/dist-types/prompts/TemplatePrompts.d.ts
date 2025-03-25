import { Configuration } from "src/db/entities/Configuration.js";
import { Review } from "../types/frenglish.js";
export declare const translatePrompt: (content: string, targetLanguage: string, config: Configuration, fileType: string, context: string) => string;
export declare const reflectBackTranslationPrompt: (content: string, targetLanguage: string, config: Configuration, fileType: string, context: string) => string;
export declare const reflectReviewPrompt: (content: string, targetLanguage: string, config: Configuration, fileType: string, context: string) => string;
export declare const implicitRuleCreationPrompt: (content: string, targetLanguage: string, config: Configuration) => string;
export declare const reviewInfo: Review;
export declare const translationReviewPrompt: (content: string, targetLanguage: string, config: Configuration, fileType: string) => string;
