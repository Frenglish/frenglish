import { Project } from './Project.js';
export declare class File {
    id: number;
    projectID: number;
    fileId: string;
    s3Version: string;
    originLanguageS3Version: string;
    language: string;
    isProjectTextMap: boolean;
    isTestFile: boolean;
    createdAt: Date;
    lastModifiedAt: Date;
    project: Project;
    contentHash: string;
    getUUID(): string;
    getURL(): string;
}
