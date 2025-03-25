import { DataSource } from 'typeorm';
import { User } from '../entities/User.js';
export declare class UserService {
    private userRepository;
    constructor(dataSource: DataSource);
    createUser(newUser: Partial<User>): Promise<User>;
    updateUser(updatedUser: Partial<User>): Promise<User>;
    deleteUserById(id: number): Promise<void>;
    clearUsers(): Promise<void>;
    findUserById(userId: number): Promise<User | null>;
    findUserByAuth0Id(auth0Id: string): Promise<User | null>;
    findUserByEmail(email: string): Promise<User | null>;
    findUserByName(name: string): Promise<User | null>;
    findAllUsers(): Promise<User[]>;
    findAuth0IdByName(name: string): Promise<string | null>;
    addUserToZohoCRM({ email, userName, teamName }: {
        email: string;
        userName: string;
        teamName: string;
    }): Promise<any>;
    getNewAccessToken(): Promise<any>;
    getZohoAuthUrl(): Promise<string>;
}
