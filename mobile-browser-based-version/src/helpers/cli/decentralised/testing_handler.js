import { Tester } from '../../testing/tester.js';
import { loadTask, loadFiles, storeFiles } from '../helper.js';
import { logger } from '../../logging/logger.js';
import _ from 'lodash';

export async function testDecentralised(argv) {
  logger.success('[Test] Welcome to DeAI !');
  // only load required task
  const task = await loadTask(argv.task);
  const tester = new Tester(task, logger);
  // add all files in specified data directory in the file upload manager
  loadFiles(argv.dataDir, tester.fileUploadManager);
  // test model
  tester.testModel((csvContent) => {
    storeFiles(argv.outDir, csvContent, 'predictions.csv');
    this.logger.success(`Predictions have been stored.`);
  });
}
