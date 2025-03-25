import { Project } from './Project.js';
export declare class KnowledgeBase {
    id: number;
    projectID: number;
    fileSize: number;
    fileName: string;
    chunkCount: number;
    status: 'pending' | 'processing' | 'failed' | 'success';
    vectorIds?: string[];
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
    project: Project;
}
