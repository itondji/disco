import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { loadTasks } from '../task_definition/helper.js';
import { logger } from '../logging/logger.js';
import * as config from './cli.config.js';

/*
 * For command line interface
 */

async function loadTask(taskID) {
  const tasks = await loadTasks(true);
  var task = _.filter(tasks, (t) => t.taskID == taskID);
  if (task.length == 0) {
    logger.error(`Task ${taskID} is not valid`);
    return undefined;
  }
  return task[0];
}

function loadFiles(dataDirRel, fileUploadManager) {
  const dataDir = config.DATA_DIR(dataDirRel);
  fs.readdir(dataDir, function (err, fileNames) {
    //handling error
    if (err) {
      logger.error(`Unable to scan data directory: ${err}`);
    }
    //listing all files using forEach
    fileNames.forEach(function (fileName) {
      const filePath = path.join(dataDir, fileName);
      const file = fs.readFileSync(filePath);
      //console.log(file);
      //TODO: update code for multiclass classification
      fileUploadManager.addFile(fileName, file, fileName);
    });
  });
}

export { loadTask, loadFiles };
