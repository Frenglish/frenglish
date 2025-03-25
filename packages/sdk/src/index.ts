// src/index.ts
import { FRENGLISH_BACKEND_URL } from '@frenglish/utils';
import { createFrenglishClient } from './trpc';

/**
 * Creates a Frenglish SDK instance configured with the provided API key.
 */
export const FrenglishSDK = (apiKey: string) => {
  const client = createFrenglishClient(`${FRENGLISH_BACKEND_URL}`, apiKey);
  
  return {
    translate: (input: { projectID: number; content: string[]; filenames?: string[]; isFullTranslation?: boolean; partialConfig?: any }) =>
      client.translation.requestTranslation.mutate({ ...input, projectID: input.projectID }),

    translateString: (input: { projectID: number; content: string; lang: string; partialConfig?: any }) =>
      client.translation.requestTranslationString.mutate({ ...input }),

    getTranslationStatus: (input: { projectID: number; translationId: number }) =>
      client.translation.getStatus.query(input),

    getTranslationContent: (input: { projectID: number; translationId: number }) =>
      client.translation.getTranslation.query(input),

    getDefaultConfiguration: (input: { projectID: number }) =>
      client.configuration.getDefaultConfiguration.query(input),

    getProjectSupportedLanguages: (input: { projectID: number }) =>
      client.configuration.getProjectSupportedLanguages.query(input),

    getSupportedFileTypes: () =>
      client.translation.getSupportedFileTypes.query(),

    getSupportedLanguages: () =>
      client.translation.getSupportedLanguages.query(),

    getProjectDomain: (input: { projectID: number }) =>
      client.project.getDomainUrl.query(input),

    registerWebhook: (input: { projectID: number; webhookUrl: string }) =>
      client.webhook.registerWebhook.mutate(input),

    upload: (input: { projectID: number; files: any[] }) =>
      client.translation.uploadFiles.mutate(input),

    getPublicAPIKeyFromDomain: (input: { domainURL: string }) =>
      client.project.getPublicAPIKeyFromDomain.query(input),
  };
};

export type FrenglishSDK = ReturnType<typeof FrenglishSDK>;
