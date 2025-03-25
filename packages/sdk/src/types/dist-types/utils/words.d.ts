import { FlatJSON } from 'src/types/json.js';
export declare function countWords(text: string, lang: string): Promise<number>;
export declare function countWordsFlatJson(entries: FlatJSON[], lang: string): Promise<number>;
