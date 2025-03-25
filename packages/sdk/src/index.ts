// src/index.ts
import { apiRequest } from './utils/api';
import { PartialConfiguration, Configuration } from '@frenglish/utils';
import { FileContentWithLanguage, RequestTranslationResponse, TranslationResponse } from '@frenglish/utils';
import { TranslationStatus } from '@frenglish/utils';
import { parsePartialConfig } from '@frenglish/utils';
import { getTranslationStatus, getTranslationContent } from './utils/translation';

/**
 * Creates a Frenglish SDK instance configured with the provided API key.
 */
export const FrenglishSDK = (apiKey: string) => {
  return {
    // Translation functions
    translate: async (
      content: string[], 
      isFullTranslation: boolean = false, 
      filenames: string[] = [], 
      partialConfig: PartialConfiguration = {}
    ): Promise<{ translationId: number, content: TranslationResponse[] } | undefined> => {
      const POLLING_INTERVAL = 500;
      const MAX_POLLING_TIME = 1800000;
      const startTime = Date.now() - POLLING_INTERVAL;
      const parsedConfig = await parsePartialConfig(partialConfig);

      const data = await apiRequest<RequestTranslationResponse>('/api/translation/request-translation', {
        body: { content, isFullTranslation, filenames, partialConfig: parsedConfig },
        errorContext: 'Failed to request translation',
      });

      while (Date.now() - startTime < MAX_POLLING_TIME) {
        const translationStatus = await getTranslationStatus(data.translationId);
        if (translationStatus === TranslationStatus.COMPLETED) {
          const translationContent = await getTranslationContent(data.translationId);
          return { translationId: data.translationId, content: translationContent };
        } else if (translationStatus === TranslationStatus.CANCELLED) {
          throw new Error('Translation cancelled');
        }

        await new Promise(res => setTimeout(res, POLLING_INTERVAL));
      }
    },

    translateString: async (
      content: string, 
      lang: string, 
      partialConfig: PartialConfiguration = {}
    ): Promise<string | undefined> => {
      const POLLING_INTERVAL = 500;
      const MAX_POLLING_TIME = 1800000;
      const startTime = Date.now() - POLLING_INTERVAL;
      const parsedConfig = await parsePartialConfig(partialConfig);

      const supportedLanguages = await apiRequest<string[]>('/api/translation/supported-languages', {
        errorContext: 'Failed to get supported languages',
      });

      if (!supportedLanguages.includes(lang)) {
        throw new Error(`Language '${lang}' is not supported. Supported languages are: ${supportedLanguages.join(', ')}`);
      }

      const data = await apiRequest<RequestTranslationResponse>('/api/translation/request-translation-string', {
        body: { content, lang, partialConfig: parsedConfig },
        errorContext: 'Failed to request translation string',
      });

      while (Date.now() - startTime < MAX_POLLING_TIME) {
        const translationStatus = await getTranslationStatus(data.translationId);
        if (translationStatus === TranslationStatus.COMPLETED) {
          const content = await getTranslationContent(data.translationId);
          const translatedContent = content[0]?.files[0]?.content;
          if (translatedContent) {
            const parsedContent = JSON.parse(translatedContent as string);
            return Object.values(parsedContent)[0] as string;
          }
          return undefined;
        } else if (translationStatus === TranslationStatus.CANCELLED) {
          throw new Error('Translation cancelled');
        }

        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      }
    },

    getTranslationStatus: async (translationId: number): Promise<TranslationStatus> => {
      const data = await apiRequest<{ status: TranslationStatus }>('/api/translation/get-status', {
        body: { translationId },
        errorContext: 'Failed to get translation status',
      });
      return data.status;
    },

    getTranslationContent: async (translationId: number): Promise<TranslationResponse[]> => {
      return apiRequest<TranslationResponse[]>('/api/translation/get-translation', {
        body: { translationId },
        errorContext: 'Failed to get translation content',
      });
    },

    getTextMap: async (): Promise<{ content: string } | null> => {
      return apiRequest<{ content: string } | null>('/api/project/request-text-map', {
        errorContext: 'Failed to fetch project text map',
      });
    },

    // Configuration functions
    getDefaultConfiguration: async (): Promise<Configuration> => {
      return apiRequest<Configuration>('/api/configuration/get-default-configuration', {
        errorContext: 'Failed to get default configuration',
      });
    },

    getProjectSupportedLanguages: async (): Promise<{ languages: string[], originLanguage: string }> => {
      return apiRequest<{ languages: string[], originLanguage: string }>('/api/configuration/get-project-supported-languages', {
        errorContext: 'Failed to get project supported languages',
      });
    },

    // Project functions
    getProjectDomain: async (): Promise<string> => {
      return apiRequest<string>('/api/project/get-domain-url', {
        errorContext: 'Failed to get project domain',
      });
    },

    getPublicAPIKeyFromDomain: async (domainURL: string): Promise<string> => {
      return apiRequest<string>('/api/project/get-public-api-key-from-domain', {
        body: { domainURL },
        errorContext: 'Failed to get public API key from domain',
      });
    },

    // Translation utility functions
    getSupportedFileTypes: async (): Promise<string[]> => {
      return apiRequest<string[]>('/api/translation/supported-file-types', {
        errorContext: 'Failed to get supported file types',
      });
    },

    getSupportedLanguages: async (): Promise<string[]> => {
      return apiRequest<string[]>('/api/translation/supported-languages', {
        errorContext: 'Failed to get supported languages',
      });
    },

    upload: async (files: FileContentWithLanguage[]): Promise<{ message: string, originFilesInfo: Array<{ fileId: string, originS3Version: string }> }> => {
      return apiRequest('/api/translation/upload-files', {
        body: { files },
        errorContext: 'Failed to upload files',
      });
    },

    // Webhook functions
    registerWebhook: async (webhookUrl: string): Promise<void> => {
      return apiRequest('/api/webhook/register-webhook', {
        body: { webhookUrl },
        errorContext: 'Failed to register webhook',
      });
    },
  };
};

export type FrenglishSDK = ReturnType<typeof FrenglishSDK>;
