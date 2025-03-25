import OpenAI from "openai";
export declare function getOpenAI(): OpenAI;
export declare function askOpenAI(content: string): Promise<OpenAI.Chat.Completions.ChatCompletion & {
    _request_id?: string | null;
}>;
export declare function generateEmbeddings(text: string): Promise<number[]>;
