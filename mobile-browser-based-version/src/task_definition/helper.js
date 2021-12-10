import { CsvTask } from './csv_task';
import { ImageTask } from './image_task';
import _ from 'lodash';

function getTaskClass(name) {
  switch (name) {
    case 'csv':
      return CsvTask;
    case 'image':
      return ImageTask;
    default:
      console.log('No task object available');
      break;
  }
}

function createTaskClass(task) {
  let TaskClass = getTaskClass(task.trainingInformation.dataType);
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
