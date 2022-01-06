import * as env from './browser_env.js';
import * as config from './cli.config.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { deai } from './deai/handler.js';
import { feai } from './feai/handler.js';

yargs(hideBin(process.argv))
  .command({
    command: 'train [type] <task> <dataDir> <outDir>',
    describe: 'Train your model using the DeAI module',
    builder: (yargs) => {
      yargs
        .positional('task', {
          type: 'string',
          describe: 'Selected task',
        })
        .positional('dataDir', {
          type: 'string',
          describe: 'Directory containing the Training set',
        })
        .positional('type', {
          type: 'string',
          describe: 'Type of training',
        })
        .choices('type', ['decentralised', 'federated', 'local'])
        .default('type', 'decentralised');
    },
    handler: handler,
  })
  .help().argv;

function handler(argv) {
  switch (argv.type) {
    case 'decentralised':
      return deai(argv);
    case 'federated':
      return feai(argv);
    case 'local':
      return deai(argv, false);
  }
}
