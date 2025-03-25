import { Project } from './Project.js';
import { TranslationStatus, TranslationType } from 'src/types/translation.js';
import { S3File } from 'src/types/s3.js';
export declare class Translation {
    id: number;
    projectID: number;
    status: TranslationStatus;
    numberOfWords: number;
    numberOfTokens: number;
    translationTimeInSeconds?: number;
    statusReason?: string;
    s3Files: S3File[];
    configurationID: number;
    metadata: string;
    translationType: TranslationType;
    isTextMapOnly: boolean;
    createdAt: string;
    lastModifiedAt: string;
    setCreationDate(): void;
    updateLastModifiedDate(): void;
    project: Project;
}
