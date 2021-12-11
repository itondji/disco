const fs = require('fs');

import { TrainingInformant } from '../../../helpers/training/decentralised/training_informant';
import { getClient } from '../../../helpers/communication/helpers';
import { TrainingManager } from '../../../helpers/training/training_manager';
import { FileUploadManager } from '../../../helpers/data_validation/file_upload_manager';
import { saveWorkingModel } from '../../../helpers/memory/helpers';

class TrainingSetup {
  constructor(task, platform, useIndexedDB, getLogger) {
    // task can either be a json or string corresponding to the taskID
    this.task = typeof task === 'object' ? task : this.loadTask(task);

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

  async connect() {
    // Create the training manager
    this.trainingManager = new TrainingManager(
      this.Task,
      this.client,
      this.trainingInformant,
      this.useIndexedDB
    );
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

  async joinTraining(distributed) {
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
        let processedDataset = await this.dataPreprocessing(filesElement);
        this.getLogger().success(
          `Data preprocessing has finished and training has started`
        );
        this.trainingManager.trainModel(processedDataset, distributed);
      }
    }
  }
}

export default TrainingSetup;