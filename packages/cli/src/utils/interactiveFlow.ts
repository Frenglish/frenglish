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

interface ExtendedConfiguration extends PartialConfiguration {
  projectName?: string;
}

function loadToken(): { accessToken: string; auth0Id: string; email: string; name: string; } | null {
  try {
    const tokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    return { 
      accessToken: tokenData.access_token as string, 
      auth0Id: tokenData.auth0Id as string,
      email: tokenData.email as string,
      name: tokenData.name as string
    };
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

async function selectTeam(teams: any[]): Promise<number> {
  if (teams.length === 1) {
    return teams[0].id;
  }

  console.log(chalk.cyan('\n👥 Select the team you want to use:\n'));
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

  return teams[teamSelection - 1].id;
}

export async function runGuidedTranslationFlow() {
  try {
    const tokenData = loadToken();
    if (!tokenData) return;
    const { accessToken, auth0Id, email, name } = tokenData;

    // Fetch existing projects
    console.log(chalk.cyan(`\n👋 Welcome ${name}!`));
    
    const { projects, teams } = await getUserProjects(accessToken, auth0Id, email, name);
    const cliProjects = projects.filter((p: any) => p.integrationType === 'cli_sdk');

    let config: ExtendedConfiguration = {};
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
            { name: '📂 Use an existing project', value: true },
            { name: '✨ Create a new project', value: false },
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
            choices: cliProjects.map((p: any) => {
              const team = teams.find(t => t.projectIds.includes(p.id));
              const teamName = team ? team.name : '';
              return {
                name: `${chalk.blue(p.name)} ${chalk.gray(`(Team: ${teamName})`)} ${chalk.gray(`(ID: ${p.id})`)}`,
                value: p.id,
              };
            }),
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

      const teamID = await selectTeam(teams);

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
          if (config.projectName) {
            await sdk.updateProjectName(config.projectName);
          }
        } else {
          config = await modifyConfiguration(sdk, config);
        }
      }
      const updatedConfig = await sdk.updateConfiguration({ ...config });
      if (config.projectName) {
        await sdk.updateProjectName(config.projectName);
      }
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('User force closed')) {
      console.log(chalk.yellow('\n\n👋 Exiting Frenglish CLI... Have a great day!'));
      process.exit(0);
    }
    // Re-throw other errors
    throw error;
  }
}

async function runProjectConfigWizard(sdk: FrenglishSDK) {
  try {
    const languages = await sdk.getSupportedLanguages();    
    const project = await sdk.getProjectInformation();
    const localConfig = loadLocalConfig();
    
    // First get the project name and languages
    const initialConfig = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: '[Required] Enter a name for your project:',
        default: project.name || 'My Project',
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
      }
    ]);

    // Get translation path first
    const TRANSLATION_PATH = await selectPath(
      '[Required] Select or enter path to your source files:',
      localConfig.TRANSLATION_PATH || './'
    );

    // Then get output path, defaulting to translation path
    const TRANSLATION_OUTPUT_PATH = await selectPath(
      '[Required] Select or enter path where translated files should go:',
      TRANSLATION_PATH || localConfig.TRANSLATION_OUTPUT_PATH || './'
    );

    // Get remaining config options
    const remainingConfig = await inquirer.prompt([
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
    for (const lang of initialConfig.languages) {
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

    const config = {
      ...initialConfig,
      TRANSLATION_PATH,
      TRANSLATION_OUTPUT_PATH,
      ...remainingConfig,
      languageSpecificRules: languageRules
    };

    // Save to local config
    const updatedConfig = {
      ...localConfig,
      projectName: config.projectName
    };
    saveLocalConfig(updatedConfig);

    return config;
  } catch (error) {
    if (error instanceof Error && error.message.includes('User force closed')) {
      console.log(chalk.yellow('\n\n👋 Exiting Frenglish CLI... Have a great day!'));
      process.exit(0);
    }
    throw error;
  }
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
  try {
    const validation = validateConfiguration(config);
    const sdk = FrenglishSDK(selectedProject.privateApiKey);
    
    if (!validation.isValid) {
      console.log(chalk.red('\n❌ Configuration validation failed. Missing required fields:'));
      validation.missingFields.forEach(field => {
        console.log(chalk.cyan(`   • ${field}`));
      });
      console.log(`\n`)
      const { fixConfig } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'fixConfig',
          message: chalk.yellow('Would you like to fix the configuration now?'),
          default: true,
        },
      ]);

      // Go over fixes and let user select
      if (fixConfig) {
        const sdk = FrenglishSDK(selectedProject.privateApiKey);
        const languages = await sdk.getSupportedLanguages();
      
        // Iterate through each missing field sequentially
        for (const field of validation.missingFields) {
          switch (field) {
            case 'Origin Language': {
              const { originLanguage } = await inquirer.prompt([
                {
                  type: 'list',
                  name: 'originLanguage',
                  message: '[Required] What is your origin language?',
                  choices: languages.map(lang => ({ name: lang, value: lang })),
                }
              ]);
              config.originLanguage = originLanguage;
              break;
            }
            case 'Target Languages': {
              const { languages: targetLanguages } = await inquirer.prompt([
                {
                  type: 'checkbox',
                  name: 'languages',
                  message: '[Required] Select target languages:',
                  choices: languages.map(lang => ({ name: lang, value: lang })),
                }
              ]);
              config.languages = targetLanguages;
              break;
            }
            case 'Translation Path': {
              // Use your selectPath function to get a path sequentially
              const translationPath = await selectPath(
                '[Required] Select or enter path to your source files:',
                './'
              );
              config.TRANSLATION_PATH = translationPath;
              break;
            }
            case 'Translation Output Path': {
              const outputPath = await selectPath(
                '[Required] Select or enter path where translated files should go:',
                './'
              );
              config.TRANSLATION_OUTPUT_PATH = outputPath;
              break;
            }
            default:
              break;
          }
        }
      
        saveLocalConfig(config);
        await sdk.updateConfiguration({ ...config });
        if (config.projectName) {
          await sdk.updateProjectName(config.projectName);
        }
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

    const { useMockData } = await inquirer.prompt([
      {
        type: 'list',
        name: 'useMockData',
        message: chalk.yellow('Would you like to use mock data for testing?'),
        choices: [
          { name: '🎯 Generate real translations', value: false },
          { name: '🧪 Use mock data for testing', value: true },
        ],
      },
    ]);

    if (useMockData) {
      await sdk.setTestMode(true);
      console.log(chalk.yellow('\n🧪 Test mode enabled - using mock data for translations\n'));
    } else{
      await sdk.setTestMode(false);
      console.log(chalk.yellow('\n🎯 Test mode disabled - using real translations\n'));
    }
  
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
        localConfig.EXCLUDED_TRANSLATION_PATH
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
  } catch (error) {
    if (error instanceof Error && error.message.includes('User force closed')) {
      console.log(chalk.yellow('\n\n👋 Exiting Frenglish CLI... Have a great day!'));
      process.exit(0);
    }
    throw error;
  }
}

async function modifyConfiguration(sdk: FrenglishSDK, config: any) {
  const languages = await sdk.getSupportedLanguages();
  const localConfig = loadLocalConfig();
  const defaultConfig = await sdk.getDefaultConfiguration();
  const project = await sdk.getProjectInformation();
  
  // Merge configs and ensure projectName is set
  config = { 
    ...defaultConfig, 
    ...config, 
    projectName: config.projectName || project.name 
  };

  // Save project name to local config if not already there
  if (!localConfig.projectName) {
    localConfig.projectName = project.name;
    saveLocalConfig(localConfig);
  }

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
    if (config.projectName) {
      await sdk.updateProjectName(config.projectName);
      // Update local config with new project name
      localConfig.projectName = config.projectName;
      saveLocalConfig(localConfig);
    }
  } else {
    const promptConfig: any = {
      type: fieldToModify === 'languages' ? 'checkbox' : 
            fieldToModify === 'originLanguage' ? 'list' : 'input',
      name: 'value',
      message: chalk.yellow(`Enter value for ${chalk.blue(fieldToModify)}:`),
      default: config[fieldToModify] || localConfig[fieldToModify]
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
          promptConfig.default = './';
          break;
        case 'TRANSLATION_OUTPUT_PATH':
          promptConfig.default = './';
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
      let defaultPath = config[fieldToModify] || localConfig[fieldToModify];
      if (!defaultPath) {
        const otherField = fieldToModify === 'TRANSLATION_PATH' ? 'TRANSLATION_OUTPUT_PATH' : 'TRANSLATION_PATH';
        defaultPath = config[otherField] || localConfig[otherField] || './src';
      }

      const value = await selectPath(
        `Select or enter value for ${chalk.blue(fieldToModify)}:`,
        defaultPath
      );

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
    // Update local config, ensuring projectName is included
    const updatedConfig = { 
      ...localConfig,
      ...config,
      projectName: config.projectName || project.name
    };
    saveLocalConfig(updatedConfig);
    
    if (config.projectName) {
      await sdk.updateProjectName(config.projectName);
    }
  }
  return config;
}

async function getDirectoryContents(basePath = './'): Promise<{ name: string; value: string; }[]> {
  const paths = [
    { name: `✅ Select Current Path (${chalk.gray(basePath)})`, value: '__CONFIRM__' },
    { name: '⬅️  ../ (Go up one level)', value: '../' },
    { name: `📝 Input custom path`, value: '__CUSTOM__' }
  ];

  try {
    const resolvedPath = path.resolve(process.cwd(), basePath);
    const entries = await fs.promises.readdir(resolvedPath, { withFileTypes: true });
    
    // Add directories first
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: `  📁 ${entry.name}/`,
        value: path.join(basePath, entry.name, '/')
      }));
    
    // Then add files
    const files = entries
      .filter(entry => entry.isFile())
      .map(entry => ({
        name: `  📄 ${entry.name}`,
        value: path.join(basePath, entry.name)
      }));

    return [...paths, ...directories, ...files];
  } catch {
    return paths
  }
}

async function selectPath(message: string, defaultPath?: string): Promise<string> {
  let currentPath = defaultPath || './';
  
  while (true) {
    const choices = await getDirectoryContents(currentPath);
    
    const { selected } = await inquirer.prompt([{
      type: 'list',
      name: 'selected',
      message: `${message}\nCurrent path: ${currentPath}`,
      choices,
      default: defaultPath
    }]);

    if (selected === '__CONFIRM__') {
      const { confirmPath } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirmPath',
        message: chalk.yellow(`Select `) + chalk.cyan(`${currentPath}?`),
        default: true
      }]);

      if (confirmPath) {
        return currentPath
      } 
    }

    if (selected === '__CUSTOM__') {
      const { customPath } = await inquirer.prompt([{
        type: 'input',
        name: 'customPath',
        message: 'Enter custom path:',
        default: currentPath
      }]);
      return customPath;
    }

    if (selected === '../') {
      currentPath = path.join(currentPath, '../');
      continue;
    }

    if (selected.endsWith('/')) {
      currentPath = selected;
      continue;
    }
  }
}