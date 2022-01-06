import { Trainer } from '../../training/trainer.js';
import { loadTask, loadFiles } from '../helper.js';
import { logger } from '../../logging/logger.js';
import _ from 'lodash';

export async function trainDecentralised(argv, useDecentralised) {
  logger.success('Welcome to DeAI !');
  // only load required task
  const task = await loadTask(argv.task);
  const trainer = new Trainer(task, 'deai', false, logger);
  trainer.connect();
  // add all files in specified data directory in the file upload manager
  loadFiles(argv.dataDir, trainer.fileUploadManager);
  await trainer.joinTraining(useDecentralised && trainer.isConnected);
  trainer.disconnect();
}
