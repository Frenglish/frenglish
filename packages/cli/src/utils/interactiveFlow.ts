import inquirer from 'inquirer';
import fs from 'fs';
import os from 'os';
import path from 'path';
import chalk from 'chalk';
import { FrenglishSDK, getUserProjects, createProject } from '@frenglish/sdk';
import { translate } from './translate.js';
import { PartialConfiguration, Project } from '@frenglish/utils';
import { loadLocalConfig, saveLocalConfig } from './localFrenglishConfig.js';

const TOKEN_PATH = path.join(os.homedir(), '.frenglish', 'config.json');

function loadToken(): { accessToken: string; auth0Id: string; } | null {
  try {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    return { accessToken: tokenData.access_token as string, auth0Id: tokenData.auth0Id as string };
  } catch {
    console.error(chalk.red('❌ Failed to load token. Please run `frenglish login` again.'));
    return null;
  }
}

function validatePath(pathStr: string): boolean {
  try {
    const absolutePath = pathStr.startsWith('./') ? path.resolve(process.cwd(), pathStr.slice(2)) : pathStr;
    return fs.existsSync(absolutePath);
  } catch {
    return false;
  }
}

export async function runGuidedTranslationFlow() {
  const tokenData = loadToken();
  if (!tokenData) return;
  const { accessToken, auth0Id } = tokenData;

  // Fetch existing projects
  console.log("accessToken", accessToken);
  console.log("auth0Id", auth0Id);
  const { projects } = await getUserProjects(accessToken, auth0Id);
  console.log("projects", projects);
  const cliProjects = projects.filter((p: any) => p.integrationType === 'cli_sdk');

  let config: PartialConfiguration = {};
  let selectedTranslationProject: Project | null = null;
  let isNewProject = true;

  if (cliProjects.length > 0) {
    console.log(chalk.cyan('\n📦 Found existing CLI SDK projects\n'));
    const { useExisting } = await inquirer.prompt([
      {
        type: 'list',
        name: 'useExisting',
        message: chalk.yellow('What would you like to do?'),
        choices: [
          { name: '✨ Create a new project', value: false },
          { name: '📂 Use an existing project', value: true },
        ],
      },
    ]);

    isNewProject = !useExisting;

    if (useExisting) {
      console.log(chalk.cyan('\n📋 Available Projects:\n'));
      const { selectedId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedId',
          message: chalk.yellow('Select a project:'),
          choices: cliProjects.map((p: any) => ({
            name: `${chalk.blue(p.name)} ${chalk.gray(`(ID: ${p.id})`)}`,
            value: p.id,
          })),
        },
      ]);

      const selectedProject = cliProjects.find((p: any) => p.id === selectedId);
      selectedTranslationProject = selectedProject as Project;
      const apiKey = selectedProject.privateApiKey;

      const sdk = FrenglishSDK(apiKey);
      const defaultConfig = await sdk.getDefaultConfiguration();

      console.log(chalk.cyan('\n📄 Project Configuration:\n'));
      console.log(chalk.gray(JSON.stringify(defaultConfig, null, 2)));

      const { confirmConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmConfig',
          message: chalk.yellow('Use this configuration?'),
          default: true,
        },
      ]);

      if (!confirmConfig) {
        config = await modifyConfiguration(sdk, defaultConfig);
      } else {
        config = defaultConfig;
      }

      let isConfigConfirmed = false;
      while (!isConfigConfirmed) {
        console.log(chalk.cyan('\n📋 Review Configuration:\n'));
        console.log(chalk.gray(JSON.stringify(config, null, 2)));

        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: chalk.yellow('What would you like to do?'),
            choices: [
              { name: '✅ Confirm and update web dashboard', value: 'confirm' },
              { name: '⚙️  Modify configuration', value: 'modify' }
            ]
          }
        ]);

        if (action === 'confirm') {
          isConfigConfirmed = true;
          await sdk.updateConfiguration({ ...config });
        } else {
          config = await modifyConfiguration(sdk, config);
        }
      }
      console.log(chalk.green('\n✨ Configuration updated successfully!\n'));
      console.log(chalk.gray(JSON.stringify(config, null, 2)));
      // Save config locally
      const localConfig = loadLocalConfig();
      const configToSave = {
            ...localConfig,
            ...config,
      };
      saveLocalConfig(configToSave);
    }
  }

  if (isNewProject) {
    console.log(chalk.cyan('\n🚀 Creating New Project\n'));

    const { teams } = await getUserProjects(accessToken, auth0Id);
    let teamID: number;
    if (teams.length === 1) {
      teamID = teams[0].id;
    } else {
      console.log(chalk.cyan('\n👥 Select a team to create the project in:\n'));
      teams.forEach((team, index) => {
        console.log(chalk.gray(`${index + 1}. ${team.name}`));
      });
      
      const { team: teamSelection } = await inquirer.prompt([
        {
          type: 'list',
          name: 'team',
          message: chalk.yellow('Select a team:'),
          choices: teams.map((team, index) => ({
            name: `${chalk.blue(team.name)} ${chalk.gray(`(ID: ${team.id})`)}`,
            value: index + 1
          }))
        }
      ]);

      teamID = teams[teamSelection - 1].id;
    }

    const newProjectResponse = await createProject(accessToken, auth0Id, teamID);
    const newProject = newProjectResponse.project;
    selectedTranslationProject = newProject as Project;

    console.log(chalk.green('\n✨ Project created successfully!'));
    console.log(chalk.blue(`   Name: ${newProject.name}`));

    const sdk = FrenglishSDK(newProject.privateApiKey);
    config = await runProjectConfigWizard(sdk);

    let isConfigConfirmed = false;
    while (!isConfigConfirmed) {
      console.log(chalk.cyan('\n📋 Review Configuration:\n'));
      console.log(chalk.gray(JSON.stringify(config, null, 2)));

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: chalk.yellow('What would you like to do?'),
          choices: [
            { name: '✅ Confirm and update web dashboard', value: 'confirm' },
            { name: '⚙️  Modify configuration', value: 'modify' }
          ]
        }
      ]);

      if (action === 'confirm') {
        isConfigConfirmed = true;
        await sdk.updateConfiguration({ ...config });
      } else {
        config = await modifyConfiguration(sdk, config);
      }
    }
    const updatedConfig = await sdk.updateConfiguration({ ...config });
    console.log(chalk.green('\n✨ Configuration updated successfully!\n'));
    console.log(chalk.gray(JSON.stringify(updatedConfig, null, 2)));

    // Save config locally
    const localConfig = loadLocalConfig();
    const configToSave = {
        ...localConfig,
        ...updatedConfig,
    };
    saveLocalConfig(configToSave);
  }

  const { translateNow } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'translateNow',
      message: chalk.yellow('Would you like to generate translations now?'),
      default: true,
    },
  ]);

  if (translateNow) {
    if (!selectedTranslationProject) {
      throw new Error('No project selected');
    }
    await runTranslationWizard(config, selectedTranslationProject);
  }

  console.log(chalk.cyan('\n🎉 Setup Complete! Available commands:\n'));
  console.log(chalk.blue('   • frenglish translate'));
  console.log(chalk.blue('   • frenglish upload'));
  console.log(chalk.blue('   • frenglish config push\n'));
}

async function runProjectConfigWizard(sdk: FrenglishSDK) {
    const languages = await sdk.getSupportedLanguages();    
    // First get the basic project info
    const basicConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: '[Required] Enter a name for your project:',
        default: 'My Project',
      },
      {
        type: 'list',
        name: 'originLanguage',
        message: '[Required] What is your origin language?',
        choices: languages.map(lang => ({ name: lang, value: lang })),
      },
      {
        type: 'checkbox',
        name: 'languages',
        message: '[Required] Select target languages:',
        choices: languages.map(lang => ({ name: lang, value: lang })),
      },
      {
        type: 'input',
        name: 'TRANSLATION_PATH',
        message: '[Required] Path to your source files:',
        default: './src',
      },
      {
        type: 'input',
        name: 'TRANSLATION_OUTPUT_PATH',
        message: '[Required] Where should translated files go?',
        default: './i18n',
      },
      {
        type: 'input',
        name: 'rules',
        message: '[Optional] General rules for the translation:',
        default: 'Use a casual and friendly tone.',
      },
      {
        type: 'input',
        name: 'EXCLUDED_TRANSLATION_PATH',
        message: '[Optional] Array of paths to files to exclude from translation:',
        default: '[../path/to/excluded/files, ../path2/to/excluded/files]',
      },
    ]);

    // Then get language-specific rules for each selected target language
    const languageRules: Record<string, string> = {};
    for (const lang of basicConfig.languages) {
      const { rule } = await inquirer.prompt([
        {
          type: 'input',
          name: 'rule',
          message: `[Optional] Specific rules for ${lang} translation:`,
          default: 'Use a casual and friendly tone.',
        }
      ]);
      languageRules[lang] = rule;
    }

    return {
      ...basicConfig,
      languageSpecificRules: languageRules
    };
}

function validateConfiguration(config: any): { isValid: boolean; missingFields: string[] } {
  const localConfig = loadLocalConfig();
  const requiredFields = [
    { name: 'Origin Language', key: 'originLanguage' },
    { name: 'Target Languages', key: 'languages' },
    { name: 'Translation Path', key: 'TRANSLATION_PATH' },
    { name: 'Translation Output Path', key: 'TRANSLATION_OUTPUT_PATH' }
  ];

  const missingFields = requiredFields
    .filter(field => {
      if (field.key === 'languages') {
        return !config[field.key] || !Array.isArray(config[field.key]) || config[field.key].length === 0;
      }
      // For path-related fields, check both server and local config
      if (field.key === 'TRANSLATION_PATH' || field.key === 'TRANSLATION_OUTPUT_PATH') {
        return !config[field.key] && !localConfig[field.key];
      }
      return !config[field.key];
    })
    .map(field => field.name);

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

async function runTranslationWizard(config: any, selectedProject: Project) {
    const validation = validateConfiguration(config);
    
    if (!validation.isValid) {
      console.log(chalk.red('\n❌ Configuration validation failed. Missing required fields:'));
      validation.missingFields.forEach(field => {
        console.log(chalk.yellow(`   • ${field}`));
      });
      
      const { fixConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'fixConfig',
          message: chalk.yellow('Would you like to fix the configuration now?'),
          default: true,
        },
      ]);

      if (fixConfig) {
        const sdk = FrenglishSDK(selectedProject.privateApiKey);
        const languages = await sdk.getSupportedLanguages();
        
        // Only prompt for missing fields
        const missingFields = validation.missingFields.map(field => {
          switch (field) {
            case 'Origin Language':
              return {
                type: 'list' as const,
                name: 'originLanguage',
                message: '[Required] What is your origin language?',
                choices: languages.map(lang => ({ name: lang, value: lang })),
              };
            case 'Target Languages':
              return {
                type: 'checkbox' as const,
                name: 'languages',
                message: '[Required] Select target languages:',
                choices: languages.map(lang => ({ name: lang, value: lang })),
              };
            case 'Translation Path':
              return {
                type: 'input' as const,
                name: 'TRANSLATION_PATH',
                message: '[Required] Path to your source files:',
                default: './src',
              };
            case 'Translation Output Path':
              return {
                type: 'input' as const,
                name: 'TRANSLATION_OUTPUT_PATH',
                message: '[Required] Where should translated files go?',
                default: './i18n',
              };
            default:
              return null;
          }
        }).filter((q): q is NonNullable<typeof q> => q !== null);

        const missingConfig = await inquirer.prompt(missingFields);
        config = { ...config, ...missingConfig };
        saveLocalConfig(config)
        await sdk.updateConfiguration({ ...config });
      } else {
        throw new Error('❌ Configuration validation failed. Cancelled translation');
      }
    } else {
      console.log(chalk.green('\n✅ Configuration validated'));
    }

    console.log(chalk.cyan('\n🔄 Translation Options:\n'));
    const { isFullTranslation } = await inquirer.prompt([
      {
        type: 'list',
        name: 'isFullTranslation',
        message: chalk.yellow('Select translation type:'),
        choices: [
          { name: '📝 Update - only translate new strings', value: false },
          { name: '🔄 Full - overwrite all existing translations', value: true },
        ],
      },
    ]);
  
    console.log(chalk.cyan('\n🚀 Starting translation process...\n'));
    const loadingChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    const interval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(loadingChars[i])} Translating files...`);
      i = (i + 1) % loadingChars.length;
    }, 100);
  
    try {
      const tokenData = loadToken();
      if (!tokenData) {
        throw new Error('Failed to load token data');
      }
      const apiKey = selectedProject.privateApiKey;
      const localConfig = loadLocalConfig();

      await translate(
        apiKey,
        localConfig.TRANSLATION_PATH || config.TRANSLATION_PATH,
        isFullTranslation,
        config,
        localConfig.EXCLUDED_TRANSLATION_PATH ? JSON.parse(localConfig.EXCLUDED_TRANSLATION_PATH) : []
      );

      clearInterval(interval);
      process.stdout.write('\r');
      console.log(chalk.green('✨ Translation complete!'));
      console.log(chalk.gray('   Files have been translated successfully.\n'));
    } catch (err) {
      clearInterval(interval);
      process.stdout.write('\r');
      console.error(chalk.red('❌ Translation failed'));
      console.error(chalk.red('   Error:'), err);
    }
}

async function modifyConfiguration(sdk: FrenglishSDK, config: any) {
  const languages = await sdk.getSupportedLanguages();
  const localConfig = loadLocalConfig();

  const { fieldToModify } = await inquirer.prompt([
    {
      type: 'list',
      name: 'fieldToModify',
      message: chalk.yellow('Select a field to modify:'),
      choices: [
        { name: '📝 Project Name', value: 'projectName' },
        { name: '🌐 Origin Language', value: 'originLanguage' },
        { name: '🎯 Target Languages', value: 'languages' },
        { name: '📂 Translation Path', value: 'TRANSLATION_PATH' },
        { name: '📤 Translation Output Path', value: 'TRANSLATION_OUTPUT_PATH' },
        { name: '📋 General Rules', value: 'rules' },
        { name: '🚫 Excluded Translation Path', value: 'EXCLUDED_TRANSLATION_PATH' },
        { name: '🌍 Language-specific Rules', value: 'languageRules' }
      ]
    }
  ]);

  if (fieldToModify === 'languageRules') {
    const { targetLang } = await inquirer.prompt([
      {
        type: 'list',
        name: 'targetLang',
        message: chalk.yellow('Select a language to modify its rules:'),
        choices: config.languages.map((lang: string) => ({
          name: chalk.blue(lang),
          value: lang
        }))
      }
    ]);

    const { rule } = await inquirer.prompt([
      {
        type: 'input',
        name: 'rule',
        message: chalk.yellow(`Enter rules for ${chalk.blue(targetLang)}:`),
        default: config.languageSpecificRules[targetLang] || 'Use a casual and friendly tone.'
      }
    ]);

    config.languageSpecificRules[targetLang] = rule;
    await sdk.updateConfiguration({ ...config });
  } else {
    let promptConfig: any = {
      type: fieldToModify === 'languages' ? 'checkbox' : 
            fieldToModify === 'originLanguage' ? 'list' : 'input',
      name: 'value',
      message: chalk.yellow(`Enter value for ${chalk.blue(fieldToModify)}:`),
      default: localConfig[fieldToModify] || config[fieldToModify]
    };

    // Add choices only for language-related fields
    if (fieldToModify === 'languages' || fieldToModify === 'originLanguage') {
      promptConfig.choices = languages.map(lang => ({ name: lang, value: lang }));
    }

    // Set appropriate defaults for specific fields
    if (!promptConfig.default) {
      switch (fieldToModify) {
        case 'projectName':
          promptConfig.default = 'My Project';
          break;
        case 'TRANSLATION_PATH':
          promptConfig.default = './src';
          break;
        case 'TRANSLATION_OUTPUT_PATH':
          promptConfig.default = './i18n';
          break;
        case 'rules':
          promptConfig.default = 'Use a casual and friendly tone.';
          break;
        case 'EXCLUDED_TRANSLATION_PATH':
          promptConfig.default = '[]';
          break;
      }
    }

    const { value } = await inquirer.prompt([promptConfig]);
    
    // Handle special cases for certain fields
    if (fieldToModify === 'EXCLUDED_TRANSLATION_PATH') {
      try {
        const parsedValue = JSON.parse(value);
        config[fieldToModify] = parsedValue;
        localConfig[fieldToModify] = parsedValue;
      } catch {
        config[fieldToModify] = [];
        localConfig[fieldToModify] = [];
      }
    } else if (fieldToModify === 'TRANSLATION_PATH' || fieldToModify === 'TRANSLATION_OUTPUT_PATH') {
      if (!validatePath(value)) {
        console.log(chalk.yellow(`⚠️  Warning: The path "${value}" does not exist. Make sure to create it before running translations.`));
      }
      config[fieldToModify] = value;
      localConfig[fieldToModify] = value;
    } else {
      config[fieldToModify] = value;
      localConfig[fieldToModify] = value;
    }
    
    await sdk.updateConfiguration({ ...config });
    saveLocalConfig(localConfig);
  }
  return config;
}