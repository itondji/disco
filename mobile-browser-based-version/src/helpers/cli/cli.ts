import * as env from './browser_env'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { trainDecentralised } from './decentralised/training_handler'
import { trainFederated } from './federated/training_handler'
import { testDecentralised } from './decentralised/testing_handler'
import { testFederated } from './federated/testing_handler'
import { logger } from '../logging/consoleLogger'

console.log(env)
// eslint-disable-next-line no-unused-expressions
yargs(hideBin(process.argv))
  .command({
    command: 'train [type] <task> <dataDir> <outDir>',
    describe: 'Train your model',
    builder: builder,
    handler: trainHandler
  })
  .command({
    command: 'test [type] <task> <dataDir> <outDir>',
    describe: 'Test your model',
    builder: builder,
    handler: testHandler
  })
  .help().argv

function builder (yargs) {
  yargs
    .positional('task', {
      type: 'string',
      describe: 'Selected task'
    })
    .positional('dataDir', {
      type: 'string',
      describe: 'Directory containing the Training set'
    })
    .positional('type', {
      type: 'string',
      describe: 'Type of training'
    })
    .choices('type', ['decentralised', 'federated', 'local'])
    .default('type', 'decentralised')
}

function trainHandler (argv) {
  switch (argv.type) {
    case 'decentralised':
      return trainDecentralised(argv, true)
    case 'federated':
      return trainFederated(argv)
    case 'local':
      return trainDecentralised(argv, false)
  }
  logger.error('Wrong type of training')
}
function testHandler (argv) {
  switch (argv.type) {
    case 'decentralised':
      return testDecentralised(argv, true)
    case 'federated':
      return testFederated(argv)
    case 'local':
      return testDecentralised(argv, false)
  }
  logger.error('Wrong type of training')
}
