import { WordpressConfig, DefaultWebsiteConfig } from 'src/types/project.js';
export declare class Project {
    id: number;
    name: string;
    isTestIntegrationMode: boolean;
    webhookUrls: string[];
    domain: string;
    integrationConfig: WordpressConfig | DefaultWebsiteConfig | null;
    isActive: boolean;
    lastModifiedAt: string;
    createdAt: string;
    privateApiKey: string;
    publicApiKey: string;
    domainKeys: string[];
    useSubdomains: boolean;
    integrationType: string;
    setCreationDate(): void;
    updateLastModifiedDate(): void;
    private generateAndEncryptApiKey;
}
