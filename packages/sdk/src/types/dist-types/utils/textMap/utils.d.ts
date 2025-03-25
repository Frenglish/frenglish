import { FlatJSON } from "src/types/json.js";
import { FilesTextMap, TextMap, TranslationFileFlatJSON } from "src/types/file.js";
import { TranslationResponse } from "src/types/api.js";
export declare function toTextMap(content: FlatJSON[], language: string): TextMap;
export declare function filesToTextMap(files: TranslationFileFlatJSON[], language: string): FilesTextMap;
export declare function fromTextMap(textMap: FlatJSON[], pathMap: FlatJSON[], language: string): FlatJSON[];
export declare function castTextMapLanguage(textMap: FlatJSON[], newLang: string): any[];
export declare function transformTextMapToTranslationResponse(textMap: FlatJSON[], originLanguage: string): TranslationResponse[];
/**
 * Does the inverse of transformTextMapToTranslationResponse:
 *
 * For each { language, files: [{fileId: 'text-map', content: JSON.stringify({ originText: translatedText })}] },
 * we produce FlatJSON entries like:
 *   {
 *     path: [hash(originText), language],
 *     value: translatedText
 *   }
 */
export declare function transformTranslationResponseToTextMap(translationResponses: TranslationResponse[]): FlatJSON[];
/**
 * Compare the textmap’s entries to the set of required languages
 * and build a partial array with only the entries that are missing
 * the translation in `targetLang`.
 */
export declare function buildMissingTextMap(textMap: FlatJSON[], originLang: string, targetLang: string): FlatJSON[];
