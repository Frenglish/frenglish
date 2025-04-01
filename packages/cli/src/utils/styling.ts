import figlet from 'figlet';
import chalk from 'chalk';

/**
 * Print a colorful ASCII banner with optional file list below it.
 *
 * @param mainText - Main banner text (default: 'Frenglish')
 * @param subtitle - Subtitle below banner (default: translation slogan)
 * @param files - Optional array of file paths to log below the banner
 * @param font - Figlet font (default: 'Standard')
 */
export function printFrenglishBanner(
  mainText: string = 'Frenglish.ai',
  subtitle: string = '🌍 TRANSLATE - Localized. Simplified.',
  files: string[] = [],
  font: figlet.Fonts = 'Standard'
) {
  const bannerLines = figlet.textSync(mainText, {
    font,
    horizontalLayout: 'default',
  }).split('\n');

  const colors = [chalk.magenta, chalk.cyan, chalk.blueBright, chalk.greenBright];

  console.log('\n');
  bannerLines.forEach((line, i) => {
    const color = colors[i % colors.length];
    console.log(color(line));
  });

  if (subtitle) {
    console.log(chalk.yellowBright(`\n${subtitle}\n`));
  }

  if (files.length > 0) {
    console.log(chalk.cyanBright(`📁 Files to translate (${files.length}):\n`));
    files.forEach((file) => {
      console.log('  ' + chalk.gray('•'), chalk.white(file));
    });
    console.log();
  }
}
