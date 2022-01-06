import { Trainer } from '../../training/trainer.js';
import { loadTask, loadFiles } from '../helper.js';
import { logger } from '../../logging/logger.js';
import _ from 'lodash';

export async function deai(argv) {
  logger.success('Welcome to DeAI !');
  // only load required task
  const task = await loadTask(argv.task);
  const trainer = new Trainer(task, 'deai', false, logger, );
  trainer.connect();
  // add all files in specified data directory in the file upload manager
  loadFiles(argv.dataDir, trainer.fileUploadManager);
  const context = { headers: [] };
  task.displayInformation.headers.forEach((item) => {
    context.headers.push({ id: item, userHeader: item });
  });
  await trainer.joinTraining(argv.distributed && trainer.isConnected, context);
  trainer.disconnect();
}
