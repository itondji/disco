import { CsvTask } from './csv/csv_task.js';
import { ImageTask } from './image/image_task.js';
import { CsvTaskHelper } from './csv/helper.js';
import { ImageTaskHelper } from './image/helper.js';

export const CSV_TASK = 'csv';
export const IMAGE_TASK = 'image';
export const ALL_TASKS = [CSV_TASK, IMAGE_TASK];

export const TASK_INFO = {
  csv: {
    frameClass: CsvTask,
    helperClass: CsvTaskHelper,
  },
  image: {
    frameClass: ImageTask,
    helperClass: ImageTaskHelper,
  },
};
