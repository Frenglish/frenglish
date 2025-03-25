import { DataSource } from 'typeorm';
import { File } from '../entities/File.js';
export declare class FileService {
    private fileRepository;
    constructor(dataSource: DataSource);
    createFile(newFile: Partial<File>): Promise<File>;
    updateFile(updatedFile: Partial<File>): Promise<File>;
    deleteFileById(id: number): Promise<void>;
    findFileById(fileID: number): Promise<File | null>;
    findFilesByProjectId(projectID: number): Promise<File[]>;
    findLatestFile(projectID: number, fileId: string, language: string): Promise<File | null>;
    findLatestFileNoLang(projectID: number, fileId: string): Promise<File | null>;
    findFilesByTranslationID(translationId: number): Promise<File[]>;
    findLatestProjectTextMap(projectID: number, isTestFile?: boolean): Promise<File | null>;
    findLatestTranslatedFile(projectID: number, fileId: string, originS3Version: string, language: string): Promise<File | null>;
    findFileByS3Version(projectID: number, fileId: string, s3Version: string): Promise<File | null>;
    findFileByHash(projectID: number, fileId: string, contentHash: string): Promise<File | null>;
    clearFiles(): Promise<void>;
}
