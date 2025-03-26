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
import { PartialConfiguration } from '@frenglish/utils'
import { translate } from './utils/translate'
import { upload } from './utils/upload'

yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .command({
    command: 'translate',
    describe: 'Translate files based on your translation path',
    builder: (yargs) =>
      yargs
        .option('path', {
          type: 'string',
          description: 'Specify a custom path for translation',
          default: process.env.TRANSLATION_PATH,
        })
        .option('isFullTranslation', {
          type: 'boolean',
          description: 'Perform a full translation',
          default: false,
        })
        .option('partialConfig', {
          type: 'string',
          description: 'Partial configuration as a JSON string or file path',
          coerce: (arg: string) => {
            if (!arg) return undefined

            try {
              return JSON.parse(arg)
            } catch {
              try {
                const content = fs.readFileSync(arg, 'utf8')
                return JSON.parse(content)
              } catch {
                throw new Error(
                  `Failed to parse partialConfig: ${arg}. Must be valid JSON or a path to a JSON file.`
                )
              }
            }
          },
        }),
    handler: (argv) => {
      translate(argv.path, argv.isFullTranslation, argv.partialConfig as PartialConfiguration)
    },
  })
  .command(
    'upload',
    'Upload files for translation',
    (yargs) =>
      yargs.option('path', {
        type: 'string',
        description: 'Specify custom path for uploading files',
        default: process.env.TRANSLATION_PATH,
      }),
    (argv) => {
      upload(argv.path as string)
    }
  )
  .demandCommand(1, 'You need at least one command before moving on')
  .help('help')
  .alias('help', 'h')
  .alias('version', 'v')
  .example('$0 translate', 'Translate files using the default path in your .env file (TRANSLATION_PATH)')
  .example('$0 translate --path ./custom/path', 'Translate files from a custom path')
  .example('$0 upload', 'Upload files using the default path')
  .example('$0 upload --path ./custom/path', 'Upload files from a custom path')
  .example('$0 translate --isFullTranslation=true', 'Perform a full translation on all files in directory specified by TRANSLATION_PATH')
  .example('$0 translate --path "./custom/path" --isFullTranslation=true', 'Perform a full translation on files in a custom directory')
  .example('$0 translate --partialConfig=\'{"targetLanguages":["fr","es"]}\'', 'Translate files with custom configuration')
  .example('$0 translate --partialConfig="./src/configs/translationConfig.json"', 'Translate files using configuration from a JSON file')
  .epilog('For more information, visit https://www.frenglish.ai')
  .wrap(yargs.terminalWidth())
  .parse()