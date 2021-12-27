import { FileUploadManager } from '../data_validation/file_upload_manager.js';
import { getTaskInfo } from '../task_definition/helper.js';

export class Tester {
  constructor(task, logger) {
    // task can either be a json or string corresponding to the taskID
    this.task = task;
    this.logger = logger;
    // takes care of uploading file process
    this.fileUploadManager = new FileUploadManager(1, this);
  }

  async testModel(downloadPredictions, context) {
    //callback function that downloads the predictions
    const nbrFiles = this.fileUploadManager.numberOfFiles();
    // Check that the user indeed gave a file
    if (nbrFiles == 0) {
      this.logger.error(`Testing aborted. No uploaded file given as input.`);
    } else {
      // Assume we only read the first file
      this.logger.success(
        `Thank you for your contribution. Testing has started`
      );
      var filesElement =
        nbrFiles > 1
          ? this.fileUploadManager.getFilesList()
          : this.fileUploadManager.getFirstFile();
      const taskInfo = getTaskInfo(this.task.trainingInformation.dataType);
      // filtering phase (optional)
      if (context.filterData) {
        // data checking is optional
        filesElement = await context.filterData(
          filesElement,
          this.task.trainingInformation
        );
      }
      // prediction
      const predictions = await context.makePredictions(filesElement, context);
      // reset fileloader
      this.fileUploadManager.clear();
      if (predictions) {
        let csvContent = await taskInfo.predictionsToCsv(predictions, context);
        await downloadPredictions(csvContent);
      }
    }
  }
}

export default Tester;
