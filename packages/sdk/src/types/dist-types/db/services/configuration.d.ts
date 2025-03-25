import { DataSource } from 'typeorm';
import { Configuration } from '../entities/Configuration.js';
export declare class ConfigurationService {
    private configurationRepository;
    constructor(dataSource: DataSource);
    getDefaultConfigurationsByProjectIds(projectIds: number[]): Promise<Configuration[]>;
    createConfiguration(newConfig: Partial<Configuration>): Promise<Configuration>;
    createOneTimeTranslationConfig(projectID: number, partialConfig?: Partial<Configuration>): Promise<Configuration | Partial<Configuration>>;
    findDefaultConfiguration(projectID: number): Promise<Configuration | null>;
    clearConfigurations(): Promise<void>;
    updateConfiguration(updatedConfig: Partial<Configuration>): Promise<Configuration>;
    findConfigurationById(configurationID: number): Promise<Configuration | null>;
}
