import { Project } from './Project.js';
import { Rule } from 'src/types/frenglish.js';
import { Filter, ExcludedTranslationBlock, LanguageSelector } from 'src/types/configuration.js';
export declare class Configuration {
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
    keyFilters: Filter;
    createdAt: string | null;
    lastModifiedAt: string | null;
    setCreationDate(): void;
    updateLastModifiedDate(): void;
    project: Project;
}
