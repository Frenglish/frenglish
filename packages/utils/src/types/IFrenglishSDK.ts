import { Configuration, PartialConfiguration } from './configuration'
import { TranslationResponse, FileContentWithLanguage, RequestTranslationResponse, TranslationStatus } from './translation'

export interface IFrenglishSDK {
  translate(
    content: string[],
    isFullTranslation?: boolean,
    filenames?: string[],
    partialConfig?: PartialConfiguration,
    paths?: string[],
    otps?: { wait?: boolean }
  ): Promise<RequestTranslationResponse | undefined>;

  translateString(
    content: string,
    lang: string,
    isFullTranslation?: boolean,
    partialConfig?: PartialConfiguration
  ): Promise<string | string[] | undefined>;

  getTextAndStyleMap(requestedLang: string): Promise<File | null>;

  getTextMap(requestedLang: string): Promise<File | null>;

  getTranslatedFile(requestedLang: string, content: string | Buffer, fileId: string): Promise<string | Buffer>;

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

  getGlossaryEntries(): Promise<TranslationResponse>;

  modifyGlossaryEntries(entries: any[]): Promise<{ success: boolean }>;

  deleteGlossaryEntries(entries: string[], language?: string): Promise<{ success: boolean }>;
}