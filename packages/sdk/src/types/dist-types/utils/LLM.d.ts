import { FlatJSON } from "../types/json.js";
export declare function compressAndCountTokensArray(entries: FlatJSON[], tokensPerChar: number, index?: number): number;
export declare function countTokens(entry: string | FlatJSON, tokensPerChar: number): number;
export declare function countTokensArray(entries: FlatJSON[], tokensPerChar: number): number;
