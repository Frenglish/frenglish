import { FlatJSON } from "./json.js";
import { LLMType } from "./LLM.js";
export type ReflectionMode = 'backTranslation' | 'review';
export type Rule = {
    language: string;
    rules: string;
};
export interface AdminTranslationConfig {
    tokensPerChar: number;
    maxTokensPerBatchTranslation: number;
    maxTokensPerBatchReview: number;
    LLM: LLMType;
    reflectionMode: ReflectionMode;
    supportedLanguages: string[];
}
export interface Translation {
    content: FlatJSON[];
    review: Review[] | null;
}
interface IssueDetail {
    info: string;
    corrections: string[];
}
export interface ReviewCategory {
    score: number;
    issues: IssueDetail[];
}
export interface Review {
    accuracy: ReviewCategory;
    consistency: ReviewCategory;
    grammarAndSyntax: ReviewCategory;
    clarity: ReviewCategory;
    styleAndTone: ReviewCategory;
    fluencyAndNaturalness: ReviewCategory;
    culturalAppropriateness: ReviewCategory;
    localConventionsAndStandards: ReviewCategory;
}
export {};
