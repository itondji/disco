import fs from 'fs';
import _ from 'lodash';
import task_helper from '../task_definition/helper.js';
const { loadTasks } = task_helper;
import logger from '../helpers/logging/logger.js';
/*
 * For command line interface
 */

function loadTask(taskID) {
  const tasks = loadTasks(true);
  var task = _.filter(tasks, (t) => t.taskID == taskID);
  if (task.size == 0) {
    logger.error(`Task ${taskID} is not valid`);
    return undefined;
  }
  return task[0];
}

function loadFiles(dataDir, fileUploadManager) {
  fs.readdir(dataDir, function (err, files) {
    //handling error
    if (err) {
      logger.error(`Unable to scan data directory: ${err}`);
    }
    //listing all files using forEach
    files.forEach(function (file) {
      fileUploadManager.addFile(URL.createObjectURL(file), file, file.name);
    });
  });
}

export { loadTask, loadFiles };
