import { FlatJSON } from '../types/json.js';
import { LLMResponse } from '../types/LLM.js';
export declare function learnTranslationMock(): Promise<LLMResponse>;
export declare function countWordsFlatJsonMock(entries: FlatJSON[]): number;
/**
 * Mocks a translation by inserting "language-translated" for normal text,
 * and doing cell-by-cell transforms for table rows.
 */
export declare function translateMock(jsonString: string, language: string): Promise<LLMResponse>;
/**
 * Reflects the "translation" by inserting "MOCKDATA + ..." for normal text,
 * and similarly handling table rows cell-by-cell.
 * Also retains the "keep every second entry" logic from before.
 */
export declare function reflectTranslationMock(content: string, targetLanguage: string): Promise<LLMResponse>;
export declare function reviewTranslationMock(): LLMResponse;
export declare const reviewExample: {
    accuracy: {
        score: number;
        issues: {
            info: string;
            corrections: string[];
        }[];
    };
    consistency: {
        score: number;
        issues: {
            info: string;
            corrections: string[];
        }[];
    };
    grammarAndSyntax: {
        score: number;
        issues: {
            info: string;
            corrections: string[];
        }[];
    };
    clarity: {
        score: number;
        issues: any[];
    };
    styleAndTone: {
        score: number;
        issues: any[];
    };
    fluencyAndNaturalness: {
        score: number;
        issues: any[];
    };
    culturalAppropriateness: {
        score: number;
        issues: any[];
    };
    localConventionsAndStandards: {
        score: number;
        issues: any[];
    };
};
