import { Pinecone } from "@pinecone-database/pinecone";
export declare function initializePinecone(): Pinecone;
export declare function createPineconeIndex(projectId: number): Promise<void>;
export declare function storeEmbeddingsInPinecone(document: string, projectId: number, fileName: string): Promise<void>;
export declare function removeEmbeddingsFromPinecone(projectId: number, fileName: string): Promise<void>;
export declare function retrieveRelevantContext(projectId: number, textToTranslate: string, maxResults?: number): Promise<string>;
export declare function createIndex(indexName: string): Promise<void>;
export declare function getPineconeIndexName(projectID: number): string;
