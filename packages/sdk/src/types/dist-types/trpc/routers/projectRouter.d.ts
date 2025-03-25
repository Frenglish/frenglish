export declare const projectRouter: import("@trpc/server/dist/unstable-core-do-not-import").BuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server/dist/unstable-core-do-not-import").DefaultErrorShape;
    transformer: false;
}, import("@trpc/server/dist/unstable-core-do-not-import").DecorateCreateRouterOptions<{
    getProject: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            projectID?: number;
        };
        output: import("../../db/entities/Project").Project;
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
        output: import("../../db/entities/Project").Project[];
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
