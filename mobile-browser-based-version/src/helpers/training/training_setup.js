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

  async connect() {
    this.isConnected = await this.client.connect();
    if (!this.isConnected) {
      //error
    }
  }

  disconnect() {
    this.client.disconnect();
  }

  async joinTraining(
    distributed,
    onConnectionError,
    onFileError,
    onPreCheckError
  ) {
    if (distributed && !this.isConnected && onConnectionError) {
      onConnectionError();
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

      console.log(this.fileUploadManager);
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
  /*
   * For command line interface
   */

  loadTask(taskID) {
    return { taskID: taskID };
  }

  loadFiles(dataDir) {
    fs.readdir(dataDir, function (err, files) {
      //handling error
      if (err) {
        this.getLogger(`Unable to scan data directory: ${err}`);
      }
      //listing all files using forEach
      files.forEach(function (file) {
        // Do whatever you want to do with the file
        this.fileUploadManager.addFile(
          URL.createObjectURL(file),
          file,
          file.name
        );
      });
    });
  }
}
