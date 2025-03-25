export declare enum TranslationStatus {
    CANCELLED = "CANCELLED",
    QUEUED = "QUEUED",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED"
}
export declare enum ValidationResult {
    VALID = "VALID",
    ALREADY_PROCESSED = "ALREADY_PROCESSED"
}
export interface ValidationResponse {
    isValid: boolean;
    result: ValidationResult;
}
export declare enum TranslationType {
    DEFAULT = "DEFAULT",// Translate new or changed content
    FULL = "FULL",// Translation *everything*
    MISSING = "MISSING"
}
