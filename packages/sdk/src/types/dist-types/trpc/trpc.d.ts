export declare const appRouter: import("@trpc/server/dist/unstable-core-do-not-import").BuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server/dist/unstable-core-do-not-import").DefaultErrorShape;
    transformer: false;
}, import("@trpc/server/dist/unstable-core-do-not-import").DecorateCreateRouterOptions<{
    configuration: import("@trpc/server/dist/unstable-core-do-not-import").BuiltRouter<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server/dist/unstable-core-do-not-import").DefaultErrorShape;
        transformer: false;
    }, import("@trpc/server/dist/unstable-core-do-not-import").DecorateCreateRouterOptions<{
        getDefaultConfiguration: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
            };
            output: import("../db/entities/Configuration").Configuration;
        }>;
        getProjectSupportedLanguages: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
            };
            output: {
                languages: string[];
                originLanguage: string;
            };
        }>;
        updateTranslationConfig: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectID?: number;
                partiallyUpdatedConfig?: any;
            };
            output: import("../db/entities/Configuration").Configuration;
        }>;
    }>>;
    project: import("@trpc/server/dist/unstable-core-do-not-import").BuiltRouter<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server/dist/unstable-core-do-not-import").DefaultErrorShape;
        transformer: false;
    }, import("@trpc/server/dist/unstable-core-do-not-import").DecorateCreateRouterOptions<{
        getProject: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
            };
            output: import("../db/entities/Project").Project;
        }>;
        getDomainUrl: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
            };
            output: string;
        }>;
        getPublicAPIKeyFromDomain: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                domainURL?: string;
            };
            output: string;
        }>;
        requestTextMap: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
            };
            output: FlatJSON[];
        }>;
        getProjectTextMap: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
            };
            output: TranslationResponse[];
        }>;
        saveTextMap: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectID?: number;
                translations?: string;
            };
            output: {
                success: boolean;
            };
        }>;
        getTeamProjects: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                teamID?: number;
            };
            output: import("../db/entities/Project").Project[];
        }>;
        deleteTextMapEntries: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                entries?: {
                    key?: string;
                    value?: string;
                }[];
                language?: string;
                projectID?: number;
            };
            output: any;
        }>;
        testModeStatus: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
            };
            output: {
                isTestMode: boolean;
            };
        }>;
        previewTranslation: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
            };
            output: {
                previewUrl: string;
            };
        }>;
    }>>;
    translation: import("@trpc/server/dist/unstable-core-do-not-import").BuiltRouter<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server/dist/unstable-core-do-not-import").DefaultErrorShape;
        transformer: false;
    }, import("@trpc/server/dist/unstable-core-do-not-import").DecorateCreateRouterOptions<{
        getStatus: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
                translationId?: number;
            };
            output: import("../types/api").TranslationStatusResponse;
        }>;
        getTranslation: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
                translationId?: number;
            };
            output: TranslationResponse[];
        }>;
        requestTranslation: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content?: string[];
                projectID?: number;
                filenames?: string[];
                isFullTranslation?: boolean;
                partialConfig?: Record<string, any>;
            };
            output: import("../types/api").RequestTranslationResponse;
        }>;
        requestTranslationString: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                content?: string;
                lang?: string;
                projectID?: number;
                partialConfig?: Record<string, any>;
            };
            output: import("../types/api").RequestTranslationResponse;
        }>;
        getTranslationStates: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
                dateRange?: string;
            };
            output: {
                id: number;
                status: TranslationStatus;
                reason: string;
                createdAt: string;
                translationTimeInSeconds: number;
                numberOfWords: number;
            }[];
        }>;
        uploadFiles: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectID?: number;
                files?: {
                    content?: string;
                    language?: string;
                    fileId?: string;
                }[];
            };
            output: {
                message: string;
                originFilesInfo: {
                    fileId: string;
                    originS3Version: any;
                }[];
            };
        }>;
        requestMissingTranslation: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectID?: number;
                partialConfig?: Record<string, any>;
            };
            output: import("../types/api").RequestTranslationResponse;
        }>;
        getTranslationFiles: import("@trpc/server").TRPCQueryProcedure<{
            input: {
                projectID?: number;
            };
            output: {
                fileName: any;
                translationId: number;
                status: TranslationStatus;
                date: string;
            }[];
        }>;
        getSupportedLanguages: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: any;
        }>;
        getSupportedFileTypes: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: string[];
        }>;
    }>>;
    webhook: import("@trpc/server/dist/unstable-core-do-not-import").BuiltRouter<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server/dist/unstable-core-do-not-import").DefaultErrorShape;
        transformer: false;
    }, import("@trpc/server/dist/unstable-core-do-not-import").DecorateCreateRouterOptions<{
        registerWebhook: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                projectID?: number;
                webhookUrl?: string;
            };
            output: {
                success: boolean;
            };
        }>;
    }>>;
}>>;
export type AppRouter = typeof appRouter;
export declare const publicProcedure: import("@trpc/server/dist/unstable-core-do-not-import").ProcedureBuilder<object, object, object, typeof import("@trpc/server/dist/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/dist/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/dist/unstable-core-do-not-import").unsetMarker, typeof import("@trpc/server/dist/unstable-core-do-not-import").unsetMarker, false>;
