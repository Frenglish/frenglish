import { RequestTranslationResponse, TranslationStatusResponse } from '../../types/api';
export declare const translationRouter: import("@trpc/server/dist/unstable-core-do-not-import").BuiltRouter<{
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
        output: TranslationStatusResponse;
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
        output: RequestTranslationResponse;
    }>;
    requestTranslationString: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            content?: string;
            lang?: string;
            projectID?: number;
            partialConfig?: Record<string, any>;
        };
        output: RequestTranslationResponse;
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
        output: RequestTranslationResponse;
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
