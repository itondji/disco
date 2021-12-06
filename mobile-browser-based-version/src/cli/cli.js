require('yargs')
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
  console.log('hello', argv.task, 'welcome to deai!');
}
