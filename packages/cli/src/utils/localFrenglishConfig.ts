import fs from 'fs';
import chalk from 'chalk';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'frenglish.config.json');

export function loadLocalConfig(): any {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      }
      return {};
    } catch (error) {
      console.error(chalk.red('❌ Failed to load local configuration file'));
      return {};
    }
  }
  
export function saveLocalConfig(config: any) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log(chalk.green('\n✨ Local configuration saved to:'));
      console.log(chalk.blue(`   ${CONFIG_PATH}\n`));
    } catch (error) {
      console.error(chalk.red('❌ Failed to save local configuration file'));
    }
  }
  