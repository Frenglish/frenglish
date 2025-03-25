import { Filter } from "src/types/configuration.js";
export declare function fetchFromS3(uuid: string, versionID: string): Promise<string | Buffer>;
export declare function uploadToS3(fileId: string, content: string | Buffer, projectID: number, language: string, originS3Version?: string, filters?: Filter): Promise<any>;
export declare function clearS3Cache(): void;
