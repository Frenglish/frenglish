import { DataSource } from 'typeorm';
import { Team } from '../entities/Team.js';
export declare class TeamService {
    private teamRepository;
    constructor(dataSource: DataSource);
    createTeam(newTeam: Partial<Team>): Promise<Team>;
    findTeamByProjectId(projectId: number): Promise<Team | null>;
    updateTeam(updatedTeam: Partial<Team>): Promise<Team>;
    deleteTeamById(id: number): Promise<void>;
    addUserToTeam(teamId: number, userId: number): Promise<Team>;
    removeUserFromTeam(teamId: number, userId: number): Promise<Team>;
    addProjectToTeam(teamId: number, projectId: number): Promise<Team>;
    removeProjectFromTeam(teamId: number, projectId: number): Promise<Team>;
    findTeamById(teamId: number): Promise<Team | null>;
    findTeamsByUserId(userId: number): Promise<Team[]>;
    findProjectIdsByTeamId(teamId: number): Promise<number[] | null>;
    findUserIdsByTeamId(teamId: number): Promise<number[] | null>;
    clearTeams(): Promise<void>;
    findTeamBySubscriptionId(subscriptionId: number): Promise<Team | null>;
    findEmailsByTeamId(teamId: number): Promise<string[]>;
}
