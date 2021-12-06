const fs = require('fs');

import { TrainingInformant } from '../../../helpers/training/decentralised/training_informant';
import { getClient } from '../../../helpers/communication/helpers';
import { TrainingManager } from '../../../helpers/training/training_manager';
import { FileUploadManager } from '../../../helpers/data_validation/file_upload_manager';
import { saveWorkingModel } from '../../../helpers/memory/helpers';

class SetupTraining {
  constructor(taskID, dataDir,platform) {
    this.task = this.loadTask(taskID);
    this.dataDir = dataDir;

    this.isConnected = false;
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
      false, //indexedDB
    );
  }

  async connect() {
    this.isConnected = await this.client.connect();
    if (!this.isConnected) {
      //error
    }
  }

  loadTask(taskID) {
    return { taskID: 'titanic' };
  }

  loadFiles() {
    fs.readdir(this.dataDir, function (err, files) {
      //handling error
      if (err) {
        return console.log('Unable to scan directory: ' + err);
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

  stop() {
    this.client.disconnect();
  }
}
