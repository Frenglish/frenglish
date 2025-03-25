declare class Cache<T> {
    private cache;
    private ttl;
    private cleanupInterval;
    private intervalId;
    constructor(ttlMinutes: number, cleanupIntervalMinutes?: number);
    private startCleanupInterval;
    private cleanupExpiredItems;
    set(key: string, value: T): void;
    get(key: string): T | null;
    clear(): void;
}
export declare function createCache<T>(ttlMinutes: number, cleanupIntervalMinutes?: number): Cache<T>;
export { Cache };
