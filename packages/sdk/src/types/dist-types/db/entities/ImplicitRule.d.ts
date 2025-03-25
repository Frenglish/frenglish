import { Project } from './Project.js';
export declare class ImplicitRule {
    id: number;
    locale: string;
    rule: string;
    isActive: boolean;
    gitCommitHash: string;
    projectID: number;
    lastModifiedAt: string;
    createdAt: string;
    setCreationDate(): void;
    updateLastModifiedDate(): void;
    project: Project;
}
