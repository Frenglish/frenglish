# Frenglish Utils
```bash
                                     _____                     _ _     _            _ 
                                    |  ___| __ ___ _ __   __ _| (_)___| |__    __ _(_)
                                    | |_ | '__/ _ \ '_ \ / _` | | / __| '_ \  / _` | |
                                    |  _|| | |  __/ | | | (_| | | \__ \ | | || (_| | |
                                    |_|  |_|  \___|_| |_|\__, |_|_|___/_| |_(_)__,_|_|
                                                         |___/                      
```  
A shared utilities package for the Frenglish SDK and CLI tools. This package provides common helper functions and types used across the Frenglish ecosystem.

> **Note**: This package is primarily used internally by the Frenglish SDK and CLI. While it can be used directly, it's recommended to use the main SDK package for most use cases.

## Installation

```bash
npm install @frenglish/utils
```

## Features

### File Management

1. **findLanguageFilesToTranslate**
   - Description: Finds language files in a directory structure by detecting language codes in paths
   - Parameters:
     - `basePath`: string - Base directory to start searching from
     - `originLanguage`: string - Source language code
     - `supportedLanguages`: string[] - Array of supported language codes
     - `supportedFileTypes`: string[] - Array of supported file extensions
     - `excludePath`: string[] (optional) - Paths to exclude from search
   - Returns: Promise<Map<string, string[]>> - Map of language codes to file paths

2. **readFiles**
   - Description: Reads multiple files and returns their contents
   - Parameters:
     - `files`: string[] - Array of file paths to read
   - Returns: Promise<Array<{ fileId: string; content: string }>>

3. **validateFiles**
   - Description: Validates file contents to ensure they meet basic requirements
   - Parameters:
     - `files`: Array<{ fileId: string; content: string }> - Array of files to validate
   - Returns: boolean

4. **getRelativePath**
   - Description: Gets the relative path of a file, handling language-specific paths
   - Parameters:
     - `basePath`: string - Base directory
     - `filePath`: string - File path to process
     - `supportedLanguages`: string[] - Array of supported language codes
     - `excludePaths`: string[] (optional) - Paths to exclude
   - Returns: Promise<string | undefined>

### Configuration Management

1. **parsePartialConfig**
   - Description: Parses configuration from JSON string or file
   - Parameters:
     - `partialConfig`: string | Partial<Configuration> | undefined - Configuration to parse
   - Returns: Promise<Partial<Configuration> | undefined>

## Types

The package exports several TypeScript types used across the Frenglish ecosystem. This package allows you to understand all the Frenglish types for each SDK function:

### Translation Types
- `TranslationResponse` - Response object containing translated content and metadata
- `TranslationStatus` - Enum representing the current status of a translation (e.g., COMPLETED, IN_PROGRESS)
- `CompletedTranslationResponse` - Response object for completed translations
- `FlatJSON` - Type for flattened JSON structures used in translations

### Configuration Types
- `Configuration` - Complete configuration object for a Frenglish project
- `PartialConfiguration` - Type for partial configuration updates

### Project Types
- `Project` - Complete project information including settings and metadata
- `ProjectResponse` - Response object containing project data

### File Types
- `FileContentWithLanguage` - Type for file content with associated language information

## Best Practices

1. **File Path Handling**
   - Use the provided utility functions for consistent path handling
   - Always normalize paths using the provided functions
   - Handle language-specific paths appropriately

2. **Configuration**
   - Use the type-safe configuration interfaces
   - Validate configurations before use
   - Handle partial configurations appropriately

3. **Error Handling**
   - Always check return values for undefined/null
   - Handle file reading errors gracefully
   - Validate file contents before processing

## Support

For more information, visit [https://www.frenglish.ai](https://www.frenglish.ai) or email us at support@frenglish.ai 