export interface Invitation {
    id: number;
    code: string;
    codeURL: string;
    teamID: number;
    email: string;
    inviterName: string;
    isRedeemed: boolean;
    isCancelled: boolean;
    expiresAt: string
}