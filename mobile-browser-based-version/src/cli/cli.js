import { TrainingSetup } from '../helpers/training/training_setup.js';
import { loadTask, loadFiles } from './helper.js';
import { logger } from '../helpers/logging/logger.js';
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
  Logger().success('Welcome to DeAI !');
  const task = loadTask(argv.task);
  const trainingSetup = new TrainingSetup(task, 'deai', false, logger);
  trainingSetup.connect();
  loadFiles(argv.dataDir, trainingSetup.fileUploadManager);
  await trainingSetup.joinTraining(argv.distributed);
  trainingSetup.disconnect();
}
