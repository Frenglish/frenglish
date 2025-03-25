import { DataSource } from 'typeorm';
import { ImplicitRule } from '../entities/ImplicitRule.js';
import { FlatJSON } from '../../types/json.js';
export declare class ImplicitRuleService {
    private implicitRuleRepository;
    constructor(dataSource: DataSource);
    disableRules(projectID: number, locale: string, rulesToRemove: string[]): Promise<void>;
    addRules(projectID: number, locale: string, gitCommitHash: string, rulesToAdd: string[]): Promise<void>;
    saveBatchedImplicitRules(batches: FlatJSON[], locale: string, gitCommitHash: string, projectID: number): Promise<void>;
    validateNewRule(newRule: ImplicitRule): Promise<void>;
    findImplicitRuleById(ruleId: number): Promise<ImplicitRule | null>;
    findImplicitRulesByProjectID(projectID: number, onlyActive?: boolean): Promise<ImplicitRule[]>;
    findImplicitRulesByProjectIDByLanguage(projectID: number, language: string, onlyActive?: boolean): Promise<ImplicitRule[]>;
    clearImplicitRules(): Promise<void>;
}
