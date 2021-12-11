const fs = require('fs');

import { TrainingInformant } from './decentralised/training_informant';
import { TrainingManager } from './training_manager';
import { getClient } from '../communication/helpers';
import { FileUploadManager } from '../data_validation/file_upload_manager';
import { getTaskInfo } from '../../task_definition/helper.js';

export class TrainingSetup {
  constructor(task, platform, useIndexedDB, getLogger) {
    // task can either be a json or string corresponding to the taskID
    this.task = task;

    this.isConnected = false;
    this.useIndexedDB = useIndexedDB;
    this.getLogger = getLogger;
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
    console.log(this.trainingManager);
    // Connect to centralized server
    this.isConnected = await this.client.connect();
    if (this.isConnected) {
      this.getLogger().success(
        'Succesfully connected to server. Distributed training available.'
      );
    } else {
      console.log('Error in connecting');
      this.getLogger().error(
        'Failed to connect to server. Fallback to training alone.'
      );
    }
  }

  disconnect() {
    this.client.disconnect();
  }

  async joinTraining(distributed, context) {
    if (distributed && !this.isConnected) {
      this.getLogger().error('Distributed training is not available.');
      return;
    }
    const nbrFiles = this.fileUploadManager.numberOfFiles();
    // Check that the user indeed gave a file
    if (nbrFiles == 0) {
      this.getLogger().error(
        `Training aborted. No uploaded file given as input.`
      );
    } else {
      // Assume we only read the first file
      this.getLogger().success(
        `Thank you for your contribution. Data preprocessing has started`
      );
      const filesElement =
        nbrFiles > 1
          ? this.fileUploadManager.getFilesList()
          : this.fileUploadManager.getFirstFile();
      var statusValidation = { accepted: true };
      if (this.precheckData) {
        // data checking is optional
        statusValidation = await this.precheckData(
          filesElement,
          this.Task.trainingInformation
        );
      }
      if (!statusValidation.accepted) {
        // print error message
        this.getLogger().error(
          `Invalid input format : Number of data points with valid format: ${statusValidation.nr_accepted} out of ${nbrFiles}`
        );
      } else {
        // preprocess data
        const dataPreprocessing = getTaskInfo(
          this.task.trainingInformation.dataType
        ).dataPreprocessing;
        const processedDataset = await dataPreprocessing(
          this.task,
          filesElement,
          context
        );
        this.getLogger().success(
          `Data preprocessing has finished and training has started`
        );
        this.trainingManager.trainModel(processedDataset, distributed);
      }
    }
  }
}

export default TrainingSetup;
