import * as figletImport from 'figlet';
import chalk from 'chalk';

// Normalize CommonJS vs ESM for figlet.
const figlet = (
  (figletImport as any).default ?? figletImport
) as typeof figletImport;

type FigletOptions = Parameters<typeof figlet.textSync>[1];
type FigletFont = FigletOptions extends { font?: infer F } ? F : string;

export function printFrenglishBanner(
  mainText: string = 'Frenglish.ai',
  subtitle: string = '🌍 TRANSLATE - Localized. Simplified.',
  files: string[] = [],
  font: FigletFont = 'Standard'
) {
  const bannerLines: string[] = figlet
    .textSync(mainText, {
      font,
      horizontalLayout: 'default',
    })
    .split('\n');

  const colors = [
    chalk.magenta,
    chalk.cyan,
    chalk.blueBright,
    chalk.greenBright,
  ];

  console.log('\n');

  bannerLines.forEach((line: string, i: number) => {
    const color = colors[i % colors.length];
    console.log(color(line));
  });

  if (subtitle) {
    console.log(chalk.yellowBright(`\n${subtitle}\n`));
  }

  if (files.length > 0) {
    console.log(
      chalk.cyanBright(`📁 Files to translate (${files.length}):\n`)
    );
    files.forEach((file: string) => {
      console.log('  ' + chalk.gray('•'), chalk.white(file));
    });
  }
}
