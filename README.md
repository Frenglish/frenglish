# Frenglish SDK

```bash
                                     _____                     _ _     _            _ 
                                    |  ___| __ ___ _ __   __ _| (_)___| |__    __ _(_)
                                    | |_ | '__/ _ \ '_ \ / _` | | / __| '_ \  / _` | |
                                    |  _|| | |  __/ | | | (_| | | \__ \ | | || (_| | |
                                    |_|  |_|  \___|_| |_|\__, |_|_|___/_| |_(_)__,_|_|
                                                         |___/                      
```  

A comprehensive translation management system for your applications. The Frenglish SDK provides tools for managing translations, handling multiple languages, and integrating with the Frenglish.ai service.

## Packages

### [@frenglish/cli](./packages/cli)
A command-line interface for managing translations and interacting with Frenglish.ai.

**Features:**
- Interactive project setup and configuration
- File-based translation management
- Directory navigation for file selection
- Test mode for development
- Local configuration management

**Installation:**
```bash
npm install -g @frenglish/cli
```

### [@frenglish/sdk](./packages/sdk)
The core SDK for programmatic integration with Frenglish.ai.

**Features:**
- Translation management
- Project configuration
- File handling
- Language support
- Test mode

**Installation:**
```bash
npm install @frenglish/sdk
```

### [@frenglish/utils](./packages/utils)
Shared utilities and types used across the Frenglish ecosystem.

**Features:**
- File management utilities
- Configuration parsing
- Type definitions
- Common helper functions

**Installation:**
```bash
npm install @frenglish/utils
```

## Quick Start

### Using the CLI

```bash
# Login to Frenglish.ai
frenglish login

# Create a new project
frenglish translate

# Upload files for translation
frenglish upload

# Push configuration changes
frenglish config push
```

### Using the SDK

```typescript
import { FrenglishSDK } from '@frenglish/sdk';

const sdk = FrenglishSDK('your_api_key');

// Translate content
const result = await sdk.translate(
  ['Hello world'],
  false,
  ['welcome.txt']
);
```

## Project Structure

```
frenglish-sdk/
├── packages/
│   ├── cli/          # Command-line interface
│   ├── sdk/          # Core SDK
│   └── utils/        # Shared utilities
├── examples/         # Usage examples
└── docs/            # Documentation
```

## Features

- **Multi-language Support**: Handle translations for multiple languages
- **File-based Translation**: Support for various file types and structures
- **Configuration Management**: Flexible configuration options
- **Test Mode**: Development and testing capabilities
- **Type Safety**: Full TypeScript support
- **Interactive CLI**: User-friendly command-line interface

## Getting Started

1. **Install the CLI**
   ```bash
   npm install -g @frenglish/cli
   ```

2. **Login to Frenglish.ai**
   ```bash
   frenglish login
   ```

3. **Create a Project**
   ```bash
   frenglish translate
   ```

4. **Start Translating**
   - Use the CLI for interactive translation
   - Or integrate the SDK into your application

## Development

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Setup
```bash
# Clone the repository
git clone https://github.com/frenglish/frenglish-sdk.git

# Install dependencies
npm install

# Build packages
npm run build
```

### Running Tests
```bash
npm test
```

## Documentation

- [CLI Documentation](./packages/cli/README.md)
- [SDK Documentation](./packages/sdk/README.md)
- [Utils Documentation](./packages/utils/README.md)

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## Support

- Website: [https://www.frenglish.ai](https://www.frenglish.ai)
- Email: support@frenglish.ai
- Documentation: [https://docs.frenglish.ai](https://docs.frenglish.ai)

## License

MIT License - see [LICENSE](LICENSE) for details