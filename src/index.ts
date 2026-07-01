import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { renderDiagram } from './pipeline.js';

function main(): void {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help') || args.length === 0) {
    printUsage();
    process.exit(0);
  }

  const inputPath = args[0];
  const outputIndex = args.indexOf('-o');
  const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : undefined;

  let yamlSource: string;
  try {
    yamlSource = readFileSync(inputPath, 'utf-8');
  } catch (e) {
    process.stderr.write(`Error reading file: ${inputPath}\n`);
    process.exit(1);
  }

  const result = renderDiagram(yamlSource);

  if (!result.success) {
    for (const err of result.errors!) {
      process.stderr.write(`${err.message}\n`);
    }
    process.exit(1);
  }

  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, result.svg!);
  } else {
    process.stdout.write(result.svg!);
  }
}

function printUsage(): void {
  process.stdout.write(`Usage: diagram-render <input.yaml> [options]

Options:
  -o <file>   Write SVG to file (default: stdout)
  -h, --help  Show this help
`);
}

main();
