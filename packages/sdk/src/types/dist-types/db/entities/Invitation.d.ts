export declare class Invitation {
    id: number;
    code: string;
    codeURL: string;
    teamID: number;
    email?: string;
    inviterName?: string;
    isRedeemed: boolean;
    isCancelled: boolean;
    expiresAt?: string;
    lastModifiedAt: string;
    createdAt: string;
    private generateInviteCode;
    setInitialValues(): void;
    updateLastModifiedDate(): void;
}
