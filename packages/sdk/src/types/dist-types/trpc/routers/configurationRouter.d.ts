export declare const configurationRouter: import("@trpc/server/dist/unstable-core-do-not-import.js").BuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server/dist/unstable-core-do-not-import.js").DefaultErrorShape;
    transformer: false;
}, import("@trpc/server/dist/unstable-core-do-not-import.js").DecorateCreateRouterOptions<{
    getDefaultConfiguration: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectID?: number;
        };
        output: import("../../db/entities/Configuration.js").Configuration;
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
        output: import("../../db/entities/Configuration.js").Configuration;
    }>;
}>>;
