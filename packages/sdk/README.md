# Frenglish SDK
```bash
                                     _____                     _ _     _            _ 
                                    |  ___| __ ___ _ __   __ _| (_)___| |__    __ _(_)
                                    | |_ | '__/ _ \ '_ \ / _` | | / __| '_ \  / _` | |
                                    |  _|| | |  __/ | | | (_| | | \__ \ | | || (_| | |
                                    |_|  |_|  \___|_| |_|\__, |_|_|___/_| |_(_)__,_|_|
                                                         |___/                      
```  

A powerful SDK for integrating Frenglish.ai's translation services into your applications. This SDK provides a flexible and robust way to handle translations programmatically. By initializing the frenglish SDK with your private key, it will contain all the information about your translation configuration (rules, origin language, target languages, etc).

## Installation

```bash
npm install @frenglish/sdk
```

## Quick Start

```typescript
import { FrenglishSDK } from '@frenglish/sdk';

// Initialize the SDK with your API key
const sdk = FrenglishSDK('your_api_key');

// Example: Translate content
async function translateContent() {
  try {
    const result = await sdk.translate(
      ['Hello world', 'Welcome to our app'],
      true, // isFullTranslation
      ['welcome.txt', 'greeting.txt']
    );
    console.log('Translation result:', result);
  } catch (error) {
    console.error('Translation failed:', error);
  }
}
```

## Core Features

### Translation

```typescript
// Translate multiple strings
const result = await sdk.translate(
  content: string[],           // Array of content to translate
  isFullTranslation?: boolean, // Whether to perform a full translation
  filenames?: string[],        // Optional filenames for the content
  partialConfig?: PartialConfiguration // Optional configuration overrides
);

// Translate a single string
const translated = await sdk.translateString(
  content: string | string[],            // String or string[] to translate
  lang: string,                          // Target language code
  isFullTranslation?: boolean,           // Whether to perform a full translation
  partialConfig?: PartialConfiguration.
);
```

### Project Management

```typescript
// Get project information
const project = await sdk.getProjectInformation();

// Update project name
await sdk.updateProjectName('New Project Name');

// Toggle project active status
await sdk.setProjectActiveStatus(true);

// Toggle test mode
await sdk.setTestMode(true);
```

### Configuration

```typescript
// Get default configuration
const config = await sdk.getDefaultConfiguration();

// Update configuration
await sdk.updateConfiguration({
  originLanguage: 'en',
  languages: ['fr', 'es'],
  rules: 'Use a casual tone'
});

// Get supported languages
const languages = await sdk.getSupportedLanguages();

// Get supported file types
const fileTypes = await sdk.getSupportedFileTypes();
```

### File Management

```typescript
// Upload files for translation
const uploadResult = await sdk.upload([
  {
    content: 'Hello world',
    language: 'en'
  }
]);

// Get project's text map
const textMap = await sdk.getTextMap();
```

## SDK Methods Reference

### Translation Methods

1. **translate**
   - Description: Translates multiple strings or content blocks to all configured target languages
   - Parameters:
     - `content`: string[] - Array of content to translate
     - `isFullTranslation`: boolean (optional) - Whether to perform a full translation
     - `filenames`: string[] (optional) - Filenames for the content
     - `partialConfig`: PartialConfiguration (optional) - Configuration overrides
   - Returns: Promise<{ translationId: number, content: TranslationResponse[] }>

2. **translateString**
   - Description: Translates a single string to a specific target language
   - Parameters:
     - `content`: string | string [] - Single string to translate or an array of strings to translate
     - `lang`: string - Target language code
     - `partialConfig`: PartialConfiguration (optional) - Configuration overrides
   - Returns: Promise<string | string[] | undefined>

3. **getTranslationStatus**
   - Description: Checks the current status of a translation request (e.g., completed, in progress, cancelled)
   - Parameters:
     - `translationId`: number - ID of the translation to check
   - Returns: Promise<TranslationStatus>

4. **getTranslationContent**
   - Description: Retrieves the translated content for a completed translation
   - Parameters:
     - `translationId`: number - ID of the translation to retrieve
   - Returns: Promise<TranslationResponse[]>

### Project Management Methods

1. **getProjectInformation**
   - Description: Retrieves detailed information about the current project
   - Returns: Promise<Project>

2. **updateProjectName**
   - Description: Updates the name of the current project
   - Parameters:
     - `updatedProjectName`: string - New project name
   - Returns: Promise<Project>

3. **setProjectActiveStatus**
   - Description: Enables or disables the project's active status
   - Parameters:
     - `isActive`: boolean - New active status
   - Returns: Promise<Project>

4. **setTestMode**
   - Description: Toggles test mode for the project, useful for testing without consuming API credits
   - Parameters:
     - `isTestMode`: boolean - New test mode status
   - Returns: Promise<Project>

### Configuration Methods

1. **getDefaultConfiguration**
   - Description: Retrieves the default configuration settings for the project
   - Returns: Promise<Configuration>

2. **updateConfiguration**
   - Description: Updates the project's configuration settings
   - Parameters:
     - `partiallyUpdatedConfig`: PartialConfiguration - Configuration updates
   - Returns: Promise<Configuration>

3. **getProjectSupportedLanguages**
   - Description: Gets the list of languages supported by the project and the origin language
   - Returns: Promise<{ languages: string[], originLanguage: string }>

4. **getSupportedLanguages**
   - Description: Gets all languages supported by the Frenglish service
   - Returns: Promise<string[]>

5. **getSupportedFileTypes**
   - Description: Gets all file types that can be processed for translation
   - Returns: Promise<string[]>

### File Management Methods

1. **upload**
   - Description: Uploads files for translation, typically used as base files to compare against
   - Parameters:
     - `files`: FileContentWithLanguage[] - Array of files to upload
   - Returns: Promise<{ message: string, originFilesInfo: Array<{ fileId: string, originS3Version: string }> }>

2. **getTextMap**
   - Description: Retrieves the project's text map, which contains mappings of text content for consistency
   - Returns: Promise<{ content: FlatJSON[] } | null>

### Domain Management Methods

1. **getProjectDomain**
   - Description: Gets the domain URL associated with the current project
   - Returns: Promise<string>

2. **getPublicAPIKeyFromDomain**
   - Description: Retrieves the public API key associated with a given domain
   - Parameters:
     - `domainURL`: string - Domain URL to get API key for
   - Returns: Promise<string>

## Configuration Types

```typescript
interface PartialConfiguration {
  originLanguage?: string;
  languages?: string[];
  rules?: string;
  languageSpecificRules?: Record<string, string>;
  // ... other configuration options
}
```

## Error Handling

The SDK throws errors for various scenarios. Always wrap SDK calls in try-catch blocks to help you debug the issues:

```typescript
try {
  const result = await sdk.translate(['Hello world']);
} catch (error) {
  if (error.message.includes('cancelled')) {
    // Handle cancellation
  } else if (error.message.includes('unsupported')) {
    // Handle unsupported language
  } else {
    // Handle other errors
  }
}
```

## Best Practices

1. **API Key Management**
   - Store your API key securely
   - Use environment variables for sensitive data
   - Never commit API keys to version control

2. **Translation Strategy**
   - Use `isFullTranslation: false` for incremental updates
   - Use `isFullTranslation: true` when you want to overwrite existing translations
   - Consider using the text map for consistency

3. **Error Handling**
   - Implement proper error handling for all SDK calls
   - Log errors appropriately
   - Implement retry logic for transient failures

4. **Configuration**
   - Use partial configuration to override specific settings
   - Keep configuration consistent across your application
   - Use language-specific rules when needed

## Examples

### Basic Translation

```typescript
const sdk = FrenglishSDK(process.env.FRENGLISH_API_KEY);

async function translateContent() {
  try {
    const result = await sdk.translate(
      ['Welcome to our app', 'Please sign in'],
      false,
      ['welcome.txt', 'signin.txt']
    );
    console.log('Translation complete:', result);
  } catch (error) {
    console.error('Translation failed:', error);
  }
}
```

## Support

For more information, visit [https://www.frenglish.ai](https://www.frenglish.ai) or email us at support@frenglish.ai