import { Project } from './Project.js';
export declare class Repository {
    id: number;
    projectID: number;
    githubRepoID: number;
    translationPaths: string[];
    name: string;
    fullName: string;
    installationID: number;
    createdAt: string;
    lastModifiedAt: string;
    setCreationDate(): void;
    updateLastModifiedDate(): void;
    project: Project;
}
