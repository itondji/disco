const fs = require('fs');

import { loadTasks } from '../task_definition/helper';
import { Logger } from '../helpers/logging/logger';
const _ = require('lodash');
/*
 * For command line interface
 */

export function loadTask(taskID) {
  const tasks = loadTasks(true);
  var task = _.filter(tasks, (t) => t.taskID == taskID);
  if (task.size == 0) {
    Logger().error(`Task ${taskID} is not valid`);
    return undefined;
  }
  return task[0];
}

export function loadFiles(dataDir, fileUploadManager) {
  fs.readdir(dataDir, function (err, files) {
    //handling error
    if (err) {
      Logger().error(`Unable to scan data directory: ${err}`);
    }
    //listing all files using forEach
    files.forEach(function (file) {
      fileUploadManager.addFile(URL.createObjectURL(file), file, file.name);
    });
  });
}
