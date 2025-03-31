# Frenglish CLI

A powerful command-line interface for managing translations with Frenglish.ai. This CLI tool helps you manage your translation projects, configure settings, and generate translations for your localization files all in your terminal.

## Features

- 🔐 Secure authentication with Frenglish.ai
- 📦 Project management (create new projects or use existing ones)
- 🌍 Multi-language support
- 📂 Interactive directory navigation for file selection
- ⚙️ Flexible configuration options
- 🔄 Support for both full and incremental translations
- 🧪 Test mode with mock data support
- 💾 Local configuration persistence. All your configuration and project changes will appear the same on Frenglish.ai

## Installation

```bash
npm install -g @frenglish/cli
```

## Usage

### Basic Commands

```bash
# Login to Frenglish.ai
frenglish login

# Translate files
frenglish translate
```

### Translation Options

When running `frenglish translate`, you can use the following options:

```bash
--apiKey <key>           # Frenglish API key (or set via FRENGLISH_API_KEY)
--path <path>           # Custom path for translation
--isFullTranslation     # Perform a full translation (overwrites existing translations)
--partialConfig <json>  # Partial config as JSON string or file path
```

### Configuration

The CLI supports configuration through:
- Interactive prompts
- Local configuration file (`frenglish.config.json`)
- Environment variables
- Command-line arguments

#### Environment Variables [OPTIONAL]

The reason this is optional is because if you don't change your .env file, we will create a frenglish.config.json in your root directory that will store all your configuration settings.

```bash
FRENGLISH_API_KEY=<your_api_key>
TRANSLATION_PATH=<path_to_source_files>
TRANSLATION_OUTPUT_PATH=<path_for_translated_files>
EXCLUDED_TRANSLATION_PATH=<json_array_of_excluded_paths>
```

## Interactive Flow

When you run `frenglish login`, you'll be guided through an interactive setup process [optional] or you may proceed with running Frenglish CLI commands on your own:

1. **Authentication**: Opens your browser for secure login
2. **Project Selection**: Choose to create a new project or use an existing one
3. **Configuration**: Set up your translation preferences:
   - Project name
   - Origin language
   - Target languages
   - Translation paths
   - Translation rules
4. **Translation**: Option to start translation immediately

## Directory Navigation

The CLI provides an intuitive directory navigation interface:
- Use arrow keys to navigate through directories
- Select directories to enter them
- Use "../" to go up one level
- Enter custom paths when needed
- Confirm your selection before proceeding

## Command Examples if you do not want the interactive experience

```bash
# Basic translation with default settings
frenglish translate

# Translation with custom path
frenglish translate --path ./src/locales

# Full translation with custom configuration
frenglish translate --isFullTranslation --partialConfig '{"targetLanguages":["fr","es"]}'

# Translation using a configuration file
frenglish translate --partialConfig "./config.json"
```

## Local Configuration

The CLI saves your configuration in `frenglish.config.json` in your project root. This includes:
- Project name
- Translation paths
- Language settings
- Translation rules

## Support

For more information, visit [https://www.frenglish.ai](https://www.frenglish.ai) 