import { DataSource } from 'typeorm';
import { KnowledgeBase } from '../entities/KnowledgeBase.js';
export declare class KnowledgeBaseService {
    private knowledgeBaseRepository;
    constructor(dataSource: DataSource);
    createKnowledgeBase(knowledgeBaseData: Partial<KnowledgeBase>): Promise<KnowledgeBase>;
    findById(id: number): Promise<KnowledgeBase | null>;
    findByProjectId(projectId: number): Promise<KnowledgeBase[]>;
    removeKnowledgeBase(id: number): Promise<void>;
    findKnowledgeBaseByFileName(projectId: number, fileName: string): Promise<KnowledgeBase | null>;
    updateStatus(id: number, status: 'pending' | 'processing' | 'failed' | 'success', errorMessage?: string): Promise<KnowledgeBase | null>;
    updateKnowledgeBase(updatedKnowledgeBase: Partial<KnowledgeBase>): Promise<KnowledgeBase>;
    clearKnowledgeBases(): Promise<void>;
}
