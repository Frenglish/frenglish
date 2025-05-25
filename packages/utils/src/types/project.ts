export interface Project {
    id: number
    name: string
    isTestIntegrationMode: boolean
    webhookUrls?: string[]
    domain?: string
    integrationConfig?: WordpressConfig | DefaultWebsiteConfig | null
    isActive: boolean
    lastModifiedAt: string
    createdAt: string
    privateApiKey: string
    publicApiKey: string
    domainKeys?: string[]
    useSubdomains: boolean
    integrationType: string
    includedUrlPaths?: string[]
    excludedUrlPaths?: string[]
  }

export interface WordpressConfig {
    websiteIntegrationType: 'wordpress';
    apiKey: string;
  }

export interface ProjectResponse {
    project: Project;
}

export interface DefaultWebsiteConfig {
    websiteIntegrationType: 'nextjs' | 'webflow' | 'squarespace' | 'salesforce' | 'other';
    isTXT1DNSValidated: boolean;
    isTXT2DNSValidated: boolean;
    isReverseProxyDNSValidated: boolean;
    previewUrl: string;
    cloudflareCustomHostnameID: string;
    cloudflareRouteID: string;
    cloudflareTxtRecord1Name: string;
    cloudflareTxtRecord1Value: string;
    cloudflareTxtRecord2Name: string;
    cloudflareTxtRecord2Value: string;
    cloudflareOriginServerProxy: string;
  }