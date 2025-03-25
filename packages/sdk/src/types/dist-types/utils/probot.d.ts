import { Probot } from 'probot';
export declare function initializeProbotApp(app: Probot): void;
export declare function logInfo(msg: string): void;
export declare function logWarning(msg: string): void;
export declare function logError(msg: string): void;
/** Sends a message or embed to Discord with optional user mentions. */
export declare function sendDiscordMessage(payload: {
    content?: string;
    embeds?: any[];
    allowed_mentions?: any;
}, webhook?: any, pingAll?: boolean): Promise<void>;
/** Logs a translation-related error and sends a detailed embed to Discord. */
export declare function logTranslationError(translationId: number, projectID: number, teamName: string | null, teamId: number | null, projectName: string | null, error: Error): Promise<void>;
