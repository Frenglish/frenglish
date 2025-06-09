import { Configuration, PartialConfiguration } from './configuration'
import { TranslationResponse, FileContentWithLanguage, RequestTranslationResponse, TranslationStatus } from './translation'

export interface IFrenglishSDK {
  translate(
    content: string[],
    isFullTranslation?: boolean,
    filenames?: string[],
    partialConfig?: PartialConfiguration
  ): Promise<RequestTranslationResponse | undefined>;

  translateString(
    content: string,
    lang: string,
    partialConfig?: PartialConfiguration
  ): Promise<string | string[] | undefined>;

  getTextMap(): Promise<File | null>;

  upload(files: FileContentWithLanguage[]): Promise<void>;

  getSupportedLanguages(): Promise<string[]>;

  getPublicAPIKeyFromDomain(domain: string): Promise<string>;

  getSupportedFileTypes(): Promise<string[]>;

  getProjectSupportedLanguages(): Promise<{
    languages: string[],
    originLanguage: string
  }>;

  getDefaultConfiguration(): Promise<Configuration>;

  getProjectDomain(): Promise<string>;

  getTranslationStatus(translationId: number): Promise<TranslationStatus>;

  getTranslationContent(translationId: number): Promise<TranslationResponse[]>;

  saveGlossaryEntries(entries: any[]): Promise<{ success: boolean }>;

  modifyGlossaryEntries(entries: any[]): Promise<{ success: boolean }>;

  deleteGlossaryEntries(entries: string[], language?: string): Promise<{ success: boolean }>;
}