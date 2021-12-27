import * as tf from '@tensorflow/tfjs';
import { getWorkingModel } from '../memory/helpers.js';
export class Task {
  constructor(taskID, displayInformation, trainingInformation) {
    this.taskID = taskID;
    this.displayInformation = displayInformation;
    this.trainingInformation = trainingInformation;
  }

  async createModel() {
    // To modularize
    let serverURL = process.env.VUE_APP_DEAI_SERVER;
    let newModel = await tf.loadLayersModel(
      serverURL.concat(`tasks/${this.taskID}/model.json`)
    );
    return newModel;
  }

  // Should not be here
  async getModelFromStorage() {
    return getWorkingModel(this.taskID, this.trainingInformation.modelID);
    /*
    let savePath = 'indexeddb://working_'.concat(
      this.trainingInformation.modelID
    );
    let model = await tf.loadLayersModel(savePath);
    return model;*/
  }
}
