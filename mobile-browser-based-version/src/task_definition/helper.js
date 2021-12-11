import { CsvTask } from './csv_task';
import { ImageTask } from './image_task';
import * as config from './task.config.js';
import _ from 'lodash';

export function getTaskInfo(name) {
  switch (name) {
    case config.CSV_TASK:
      return {
        frameClass: CsvTask,
        dataPreprocessing: function (task, filesElement) {
          return new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onload = async (e) => {
              // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
              var processedData = await task.dataPreprocessing(e, this.headers);
              resolve(processedData);
            };
            reader.readAsText(filesElement);
          });
        },
      };
    case config.IMAGE_TASK:
      return {
        frameClass: ImageTask,
        dataPreprocessing: function (task, filesElement) {
          return new Promise((resolve, reject) => {
            let processedData = task.dataPreprocessing(filesElement);
            resolve(processedData);
          });
        },
      };
    default:
      console.log('No task object available');
      break;
  }
}

export function createTaskClass(task) {
  let TaskClass = getTaskInfo(task.trainingInformation.dataType).frameClass;
  if (!TaskClass) {
    console.log(`Task ${task.taskID} was not processed`);
    return;
  }
  let newTaskFrame = new TaskClass(
    task.taskID,
    task.displayInformation,
    task.trainingInformation
  );
  return newTaskFrame;
}

export async function loadTasks(convert = false) {
  let tasksURL = process.env.VUE_APP_DEAI_SERVER.concat('tasks');
  let rawTasks = await fetch(tasksURL).then((response) => response.json());
  return convert ? _.map(rawTasks, createTaskClass) : rawTasks;
}
