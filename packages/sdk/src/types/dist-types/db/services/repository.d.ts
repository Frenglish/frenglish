import { DataSource } from 'typeorm';
import { Repository } from '../entities/Repository.js';
import { Team } from '../entities/Team.js';
export declare class RepositoryService {
    private repositoryRepository;
    constructor(dataSource: DataSource);
    createRepository(newRepo: Partial<Repository>, team: Team): Promise<Repository>;
    removeRepositoriesByInstallationId(installationID: number): Promise<void>;
    removeRepositoryByGithubRepoId(githubRepoID: number): Promise<void>;
    findRepositoriesByInstallationId(installationID: number): Promise<Repository[]>;
    clearRepositories(): Promise<void>;
    updateRepository(updatedRepo: Partial<Repository>): Promise<Repository>;
    findRepositoryById(id: number): Promise<Repository | null>;
    findRepositoryByGithubRepoId(githubRepoID: number): Promise<Repository | null>;
    findRepositoryByGithubRepoAndInstallationID(githubRepoID: number, installationID: number): Promise<Repository | null>;
    findRepositoriesByProjectId(projectID: number): Promise<Repository[]>;
    findRepositoryByProjectIdAndGithubRepoId(projectID: number, githubRepoID: number): Promise<Repository | null>;
    findProjectIdByGithubRepoId(githubRepoID: number): Promise<number | null>;
    findInstallationIdByTeam(team: Team): Promise<number | null>;
    findInstallationIdByGithubRepoId(githubRepoID: number): Promise<number | null>;
    authRepoByInstallationID(githubRepoID: number, installationID: number): Promise<Repository>;
    authRepoByProjectID(githubRepoID: number, projectID: number): Promise<Repository>;
}
