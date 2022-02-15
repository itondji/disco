import { Trainer } from '../../training/trainer'
import { loadTask, loadFiles } from '../helper'
import { logger } from '../../logging/consoleLogger'

export async function trainDecentralised (argv, useDecentralised: Boolean) {
  logger.success('[Train] Welcome to DeAI !')
  // only load required task
  const task = await loadTask(argv.task)
  const trainer = new Trainer(task, 'deai', logger)
  trainer.connectClientToServer()
  // add all files in specified data directory in the file upload manager
  loadFiles(argv.dataDir, trainer.fileUploadManager)
  await trainer.joinTraining(useDecentralised && trainer.isConnected)
  trainer.disconnect()
}
