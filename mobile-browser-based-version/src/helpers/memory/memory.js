import * as memConfig from './memory.config.js';
import * as tf from '@tensorflow/tfjs';
import path from 'path';
/**
 * Helper functions used to load and save TFJS models from IndexedDB. The
 * working model is the model currently being trained for a task. Saved models
 * are models that were explicitly saved to IndexedDB. The two working/ and saved/
 * folders are invisible to the user. The user only interacts with the saved/
 * folder via the model library. The working/ folder is only used by the backend.
 * The working model is loaded from IndexedDB for training (model.fit) only.
 */
export class Memory {
  constructor(config) {
    this.config = config;
  }

  /**
   * Fetches metadata on the working model currently saved in IndexedDB.
   * Returns false if the specified model does not exist.
   * @param {String} taskID the working model's corresponding task
   * @param {String} modelName the working model's file name
   */
  async getWorkingModelMetadata(taskID, modelName) {
    return await this._getModelMetadata(
      taskID,
      modelName,
      memConfig.WORKING_MODEL
    );
  }

  /**
   * Fetches metadata on a model saved to IndexedDB. Returns false if the
   * specified model does not exist.
   * @param {String} taskID the model's corresponding task
   * @param {String} modelName the model's file name
   */
  async getSavedModelMetadata(taskID, modelName) {
    return await this._getModelMetadata(
      taskID,
      modelName,
      memConfig.SAVED_MODEL
    );
  }

  /**
   * Loads the current working model from IndexedDB and returns it as a fresh
   * TFJS object.
   * @param {String} taskID the working model's corresponding task
   * @param {String} modelName the working model's file name
   */
  async getWorkingModel(taskID, modelName) {
    return await this._getModel(taskID, modelName, memConfig.WORKING_MODEL);
  }

  /**
   * Loads a previously saved model from IndexedDB and returns it as a fresh
   * TFJS object.
   * @param {String} taskID the saved model's corresponding task
   * @param {String} modelName the saved model's file name
   */
  async getSavedModel(taskID, modelName) {
    return await this._getModel(taskID, modelName, memConfig.SAVED_MODEL);
  }

  /**
   * Loads a model from the model library into the current working model. This
   * means copying it from indexeddb://saved/ to indexeddb://workng/.
   * @param {String} taskID the saved model's corresponding task
   * @param {String} modelName the saved model's file name
   */
  async loadSavedModel(taskID, modelName) {
    await tf.io.copyModel(
      this.config.SCHEME.concat(
        path.join(memConfig.SAVED_MODEL, taskID, modelName)
      ),
      this.config.SCHEME.concat(
        path.join(memConfig.WORKING_MODEL, taskID, modelName)
      )
    );
  }

  /**
   * Loads a fresh TFJS model object into the current working model in IndexedDB.
   * @param {String} taskID the working model's corresponding task
   * @param {String} modelName the working model's file name
   * @param {Object} model the fresh model
   */
  async updateWorkingModel(taskID, modelName, model) {
    await model.save(
      this.config.SCHEME.concat(
        path.join(memConfig.WORKING_MODEL, taskID, modelName)
      )
    );
  }

  /**
   * Adds the current working model to the model library. This means copying it
   * from indexeddb://working/ to indexeddb://saved/.
   * @param {String} taskID the working model's corresponding task
   * @param {String} modelName the working model's file name
   */
  async saveWorkingModel(taskID, modelName) {
    await tf.io.copyModel(
      this.config.SCHEME.concat(
        path.join(memConfig.WORKING_MODEL, taskID, modelName)
      ),
      this.config.SCHEME.concat(
        path.join(memConfig.SAVED_MODEL, taskID, modelName)
      )
    );
  }

  /**
   * Removes the working model model from IndexedDB.
   * @param {String} taskID the model's corresponding task
   * @param {String} modelName the model's file name
   */
  async deleteWorkingModel(taskID, modelName) {
    await this._deleteModel(taskID, modelName, memConfig.WORKING_MODEL);
  }

  /**
   * Remove a previously saved model from IndexedDB.
   * @param {String} taskID the model's corresponding task
   * @param {String} modelName the model's file name
   */
  async deleteSavedModel(taskID, modelName) {
    await this._deleteModel(taskID, modelName, memConfig.SAVED_MODEL);
  }

  /**
   * Downloads a previously saved model.
   * @param {String} taskID the saved model's corresponding task
   * @param {String} modelName the saved model's file name
   */
  async downloadSavedModel(taskID, modelName) {
    await tf.io.copyModel(
      this.config.SCHEME.concat(
        path.join(memConfig.SAVED_MODEL, taskID, modelName)
      ),
      this.config.DOWNLOADS_SCHEME.concat(`${taskID}_${modelName}`)
    );
  }

  //********************************************************
  //********************************************************
  //********************************************************

  async _getModelMetadata(taskID, modelName, modelType) {
    let key = this.config.SCHEME.concat(
      path.join(modelType, taskID, modelName)
    );
    return await tf.io.listModels().then((models) => models[key] ?? false);
  }

  async _getModel(taskID, modelName, modelType) {
    return await tf.loadLayersModel(
      this.config.SCHEME.concat(path.join(modelType, taskID, modelName))
    );
  }

  async _deleteModel(taskID, modelName, modelType) {
    await tf.io.removeModel(
      this.config.SCHEME.concat(path.join(modelType, taskID, modelName))
    );
  }
}
