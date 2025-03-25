export declare class Team {
    id: number;
    name: string;
    admins: number[];
    userIds: number[];
    projectIds: number[];
    lastModifiedAt: string;
    createdAt: string;
    setCreationDate(): void;
    updateLastModifiedDate(): void;
}
