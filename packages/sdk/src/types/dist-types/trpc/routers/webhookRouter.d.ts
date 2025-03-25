export declare const webhookRouter: import("@trpc/server/dist/unstable-core-do-not-import").BuiltRouter<{
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
