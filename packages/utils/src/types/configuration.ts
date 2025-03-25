export interface Configuration {
    id: number;
    projectID: number;
    originLanguage: string | null;
    languages: string[] | null;
    languageSelector: LanguageSelector | null;
    excludedTranslationBlocks: ExcludedTranslationBlock[] | null;
    rules: string | null;
    knowledgeBaseFiles: string[];
    autoMergeToBaseBranch: boolean;
    rulesPerLanguage: Rule[] | null;
    oneTimeTranslation: boolean;
    keyFilters: Filter | null;
    createdAt: string | null;
    lastModifiedAt: string | null;
}
export type PartialConfiguration = Partial<Configuration>;

export interface LanguageSelector {
    displayFullLanguageName: boolean,
    displayFlags: boolean,
    hideLanguageSelector: boolean,
    customCSS: string,
}

export interface ExcludedTranslationBlockItem {
  id: string;
  selector: string;
  description: string;
}

export interface ExcludedTranslationBlock {
  blocks: ExcludedTranslationBlockItem[];
}

export type Rule = {
    language: string,
    rules: string
  };

export interface Filter {
    includeFilters: string[] | null
    excludeFilters: string[] | null
}