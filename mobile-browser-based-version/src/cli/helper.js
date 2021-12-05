const fs = require('fs');

require('yargs')
  .scriptName('deai')
  .usage('$0 <cmd> [args]')
  .command({
    command: 'train <task> <data> [decentralised]',
    describe: 'Train your model using the DeAI module',
    builder: (yargs) => {
      yargs
        .positional('task', {
          type: 'string',
          describe: 'Selected task',
        })
        .positional('data', {
          type: 'string',
          describe: 'Training set',
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
  console.log('hello', argv.task, 'welcome to deai!');
}
