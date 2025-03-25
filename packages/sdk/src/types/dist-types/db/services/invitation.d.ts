import { DataSource } from 'typeorm';
import { Invitation } from '../entities/Invitation.js';
import { InvitationResponse } from 'src/types/subscription.js';
export declare class InvitationService {
    private invitationRepository;
    constructor(dataSource: DataSource);
    createInvitation(teamID: number, expiresAt?: string): Promise<InvitationResponse>;
    findByCode(code: string): Promise<Invitation | null>;
    updateInvitation(updatedInvitation: Partial<Invitation>): Promise<Invitation>;
    findActiveTeamInvitations(teamID: number): Promise<Invitation[]>;
    acceptInvitation(code: string, userId: number): Promise<{
        success: boolean;
        message: string;
        invitation?: Invitation;
    }>;
    cancelInvitation(code: string): Promise<Invitation>;
    findById(id: number): Promise<Invitation | null>;
    findTeamInvitations(teamID: number): Promise<Invitation[]>;
    deleteInvitation(id: number): Promise<void>;
    clearInvitations(): Promise<void>;
}
