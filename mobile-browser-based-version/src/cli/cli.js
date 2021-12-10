import { loadTasks } from '../task_definition/helper';
import { TrainingSetup } from '../helpers/training/training_setup';
import { Logger } from '../helpers/logging/logger';
const _ = require('lodash');
const yargs = require('yargs');

yargs
  .scriptName('deai')
  .usage('$0 <cmd> [args]')
  .command({
    command: 'train <task> <dataDir> [decentralised]',
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
        .positional('decentralised', {
          type: 'boolean',
          describe: 'Training decentralised (or local)',
        })
        .default('decentralised', true);
    },
    handler: deai,
  })
  .help().argv;

function deai(argv) {
  Logger().success('Welcome to DeAI !');
  const tasks = loadTasks(true);
  var task = _.filter(tasks, (t) => t.taskID == argv.task);
  if (task.size == 0) {
    Logger().success(`Task ${argv.task} is not valid`);
  }
  task = task[0];
  const trainingSetup = new TrainingSetup(task, 'deai', false, () => Logger());
}
