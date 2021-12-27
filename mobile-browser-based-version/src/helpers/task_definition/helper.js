import { CsvTask } from './csv_task.js';
import { ImageTask } from './image_task.js';
import { checkData } from '../data_validation/helpers_image_tasks.js';
import * as config from './task.config.js';
import _ from 'lodash';

function getTaskInfo(name) {
  switch (name) {
    case config.CSV_TASK:
      return {
        frameClass: CsvTask,
        dataPreprocessing: function (task, filesElement, context) {
          return new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onload = async (e) => {
              // Preprocess the data and get object of the form {accepted: True/False, Xtrain: training data, ytrain: lavels}
              var processedData = await task.dataPreprocessing(
                e,
                context.headers
              );
              resolve(processedData);
            };
            reader.readAsText(filesElement);
          });
        },
        predictionsToCsv: async function (predictions, context) {
          let pred = predictions.join('\n');
          const csvContent = context.classColumn + '\n' + pred;
          return csvContent;
        },
      };
    case config.IMAGE_TASK:
      return {
        frameClass: ImageTask,
        dataPreprocessing: function (task, filesElement, context) {
          return new Promise((resolve, reject) => {
            let processedData = task.dataPreprocessing(filesElement);
            resolve(processedData);
          });
        },
        preCheckData: checkData,
        predictionsToCsv: async function (predictions, context) {
          let pred = '';
          let header_length = 0;
          for (const [id, prediction] of Object.entries(predictions)) {
            header_length = prediction.length;
            pred += `id,${prediction
              .map((dict) => dict['className'] + ',' + dict['probability'])
              .join(',')} \n`;
          }
          let header = 'id,';
          for (let i = 1; i <= header_length; ++i) {
            header += `top ${i},probability${i != header_length ? ',' : '\n'}`;
          }
          const csvContent = header + pred;
          return csvContent;
        },
      };
    default:
      console.log('No task object available');
      break;
  }
}

function createTaskClass(task) {
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

async function loadTasks(convert = false) {
  let tasksURL = process.env.VUE_APP_DEAI_SERVER.concat('tasks');
  let rawTasks = await fetch(tasksURL).then((response) => response.json());
  return convert ? _.map(rawTasks, createTaskClass) : rawTasks;
}

export { getTaskInfo, createTaskClass, loadTasks };
