import * as env from './browser_env.js';
import * as config from './cli.config.js';
import { Trainer } from '../training/trainer.js';
import { loadTask, loadFiles } from './helper.js';
import { logger } from '../logging/logger.js';
import _ from 'lodash';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

yargs(hideBin(process.argv))
  .command({
    command: 'train <task> <dataDir> [distributed]',
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
        .positional('distributed', {
          type: 'boolean',
          describe: 'Training decentralised (or local)',
        })
        .default('distributed', true);
    },
    handler: deai,
  })
  .help().argv;

async function deai(argv) {
  logger.success('Welcome to DeAI !');
  const task = await loadTask(argv.task);
  const trainer = new Trainer(task, 'deai', false, logger);
  trainer.connect();
  loadFiles(argv.dataDir, trainer.fileUploadManager);
  const context = { headers: [] };
  task.displayInformation.headers.forEach((item) => {
    context.headers.push({ id: item, userHeader: item });
  });
  await trainer.joinTraining(argv.distributed && trainer.isConnected, context);
  trainer.disconnect();
}
