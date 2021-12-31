import { TrainingInformant } from './decentralised/training_informant.js';
import { TrainingManager } from './training_manager.js';
import { getClient } from '../communication/helpers.js';
import { FileUploadManager } from '../data_validation/file_upload_manager.js';
import { getTaskInfo } from '../task_definition/helper.js';

export class Trainer {
  constructor(task, platform, useIndexedDB, logger) {
    // task can either be a json or string corresponding to the taskID
    this.task = task;

    this.isConnected = false;
    this.useIndexedDB = useIndexedDB;
    this.logger = logger;
    // Manager that returns feedbacks when training
    this.trainingInformant = new TrainingInformant(10, this.task.taskID);
    // Manager for the file uploading process
    this.fileUploadManager = new FileUploadManager(this.nbrClasses, this);
    // Take care of communication processes
    this.client = getClient(
      platform,
      this.task,
      null //this.$store.getters.password(this.Id)
    );
    // Assist with the training loop
    this.trainingManager = new TrainingManager(
      this.task,
      this.client,
      this.trainingInformant,
      this.useIndexedDB
    );
  }

  setIndexedDB(newValue) {
    this.useIndexedDB = newValue;
  }

  async connect(useIndexedDB) {
    this.setIndexedDB(useIndexedDB);
    // Create the training manager
    this.trainingManager = new TrainingManager(
      this.task,
      this.client,
      this.trainingInformant,
      this.useIndexedDB
    );
    // Connect to centralized server
    this.isConnected = await this.client.connect();
    if (this.isConnected) {
      this.logger.success(
        'Succesfully connected to server. Distributed training available.'
      );
    } else {
      console.log('Error in connecting');
      this.logger.error(
        'Failed to connect to server. Fallback to training alone.'
      );
    }
  }

  disconnect() {
    this.client.disconnect();
  }

  async joinTraining(distributed, context) {
    if (distributed && !this.isConnected) {
      this.logger.error('Distributed training is not available.');
      return;
    }
    const nbrFiles = this.fileUploadManager.numberOfFiles();
    // Check that the user indeed gave a file
    if (nbrFiles == 0) {
      this.logger.error(`Training aborted. No uploaded file given as input.`);
    } else {
      // Assume we only read the first file
      this.logger.success(
        `Thank you for your contribution. Data preprocessing has started`
      );
      const filesElement =
        nbrFiles > 1
          ? this.fileUploadManager.getFilesList()
          : this.fileUploadManager.getFirstFile();
      var statusValidation = { accepted: true };
      // get task  specific information (preprocessing steps, precheck function)
      const taskInfo = getTaskInfo(this.task.trainingInformation.dataType);
      if (taskInfo.precheckData) {
        // data checking is optional
        statusValidation = await taskInfo.precheckData(
          filesElement,
          this.task.trainingInformation
        );
      }
      if (!statusValidation.accepted) {
        // print error message
        this.logger.error(
          `Invalid input format : Number of data points with valid format: ${statusValidation.nr_accepted} out of ${nbrFiles}`
        );
      } else {
        // preprocess data
        const processedDataset = await taskInfo.dataPreprocessing(
          this.task,
          filesElement,
          context
        );
        this.logger.success(
          `Data preprocessing has finished and training has started`
        );
        this.trainingManager.trainModel(processedDataset, distributed);
      }
    }
  }
}

export default Trainer;
