#!/usr/bin/env node

/**
 * Frenglish CLI - Entry point for translation and upload commands.
 *
 * Provides a command-line interface for translating and uploading localization files
 * using the Frenglish SDK.
 */
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'
import dotenv from 'dotenv'
import path from 'path'
import chalk from 'chalk'
import { translate } from './utils/translate.js'
import { upload } from './utils/upload.js'
import { login } from './utils/login.js'
import { loadLocalConfig } from './utils/localFrenglishConfig.js'

// Load environment variables from .env file in current working directory
dotenv.config({ path: path.join(process.cwd(), '.env') })

const frenglishConfig = loadLocalConfig();

const highlight = chalk.yellow;
const commandColor = chalk.green;
const commentColor = chalk.gray;
const optionColor = chalk.cyan;

yargs(hideBin(process.argv))
  .scriptName('frenglish')
  .usage(`\n${highlight('Usage:')} frenglish <command> [options]`)
  .command({
    command: 'login',
    describe: commentColor('Authenticate and start interactive flow'),
    handler: async () => {
      await login()
    }
  })
  .command({
    command: 'translate',
    describe: commentColor('Translate files based on your translation path'),
    builder: (yargs) =>
      yargs
        .option('apiKey', {
          type: 'string',
          description: commentColor('Frenglish API key (or set via FRENGLISH_API_KEY)'),
          default: process.env.FRENGLISH_API_KEY,
        })
        .option('path', {
          type: 'string',
          description: commentColor('Custom path for translation'),
          default: frenglishConfig.TRANSLATION_PATH || process.env.TRANSLATION_PATH,
        })
        .option('isFullTranslation', {
          type: 'boolean',
          description: commentColor('Perform a full translation'),
          default: false,
        })
        .option('partialConfig', {
          type: 'string',
          description: commentColor('Partial config as JSON string or file path'),
          coerce: (arg) => {
            if (!arg) return undefined;
            try { return JSON.parse(arg); } catch {
              try { return JSON.parse(fs.readFileSync(arg, 'utf8')); } catch {
                throw new Error(`Invalid partialConfig: ${arg}`);
              }
            }
          },
        }),
    handler: (argv) => {
      if (!argv.apiKey) {
        throw new Error('API key is required. Provide it via --apiKey or FRENGLISH_API_KEY environment variable')
      }
      translate(argv.apiKey, argv.path, argv.isFullTranslation, argv.partialConfig)
    },
  })
  .command({
    command: 'upload',
    describe: commentColor('Upload files for translation'),
    builder: (yargs) =>
      yargs.option('path', {
        type: 'string',
        description: commentColor('Custom path for uploading'),
        default: frenglishConfig.TRANSLATION_PATH || process.env.TRANSLATION_PATH,
      }),
    handler: (argv) => upload(argv.path),
  })
  .demandCommand(1, chalk.red('Please specify at least one command.'))
  .alias('h', 'help')
  .alias('v', 'version')
  .epilog(`For more information, visit ${highlight('https://www.frenglish.ai')}`)
  .wrap(null)
  .help()
  .showHelpOnFail(true)
  .example(
    `${commandColor('frenglish translate ') + optionColor(' ')}`,
     commentColor('Translate files using default path from .env (TRANSLATION_PATH)')
  )
  .example(
    `${commandColor('frenglish translate ') + optionColor('--path ./custom/path')}`,
    commentColor('Translate files from a custom path')
  )
  .example(
    `${commandColor('frenglish translate ') + optionColor('--apiKey your_api_key')}`,
    commentColor('Translate files using a specific API key')
  )
  .example(
    `${commandColor('frenglish translate ') + optionColor('--isFullTranslation=true')}`,
    commentColor('Perform a full translation on all files in default path')
  )
  .example(
    `${commandColor('frenglish translate ') + optionColor('--partialConfig=\'{"targetLanguages":["fr","es"]}\'')}`,
    commentColor('Translate files with custom configuration')
  )
  .example(
    `${commandColor('frenglish translate ') + optionColor('--partialConfig="./config.json"')}`,
    commentColor('Translate files using a JSON configuration file')
  )
  .example(
    `${commandColor('frenglish upload ') + optionColor('--path ./custom/path')}`,
    commentColor('Upload files from a custom path')
  )
  .parse();