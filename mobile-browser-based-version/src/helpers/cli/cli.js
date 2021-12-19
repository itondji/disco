import { Trainer } from '../training/trainer.js';
import { loadTask, loadFiles } from './cli_helper.js';
import { logger } from '../logging/logger.js';
const _ = require('lodash');
const yargs = require('yargs');

yargs
  .scriptName('deai')
  .usage('$0 <cmd> [args]')
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
  const task = loadTask(argv.task);
  const trainer = new Trainer(task, 'deai', false, logger);
  trainer.connect();
  loadFiles(argv.dataDir, trainer.fileUploadManager);
  await trainer.joinTraining(argv.distributed);
  trainer.disconnect();
}
