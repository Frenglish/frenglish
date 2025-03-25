import { Translation } from "../db/entities/Translation.js";
export declare function processTranslationRequest(translation: Translation): Promise<void>;
export declare function processUnfinishedTranslations(): Promise<void>;
