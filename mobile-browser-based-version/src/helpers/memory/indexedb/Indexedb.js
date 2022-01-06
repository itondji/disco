import * as tf from '@tensorflow/tfjs';
import path from 'path';
import * as config from './indexedb.config.js';
import * as memConfig from '../memory.config.js';
import Memory from '../memory.js';
import { _getModelMetadata, _getModel, _deleteModel } from './helper.js';

/**
 * Helper functions used to load and save TFJS models from IndexedDB. The
 * working model is the model currently being trained for a task. Saved models
 * are models that were explicitly saved to IndexedDB. The two working/ and saved/
 * folders are invisible to the user. The user only interacts with the saved/
 * folder via the model library. The working/ folder is only used by the backend.
 * The working model is loaded from IndexedDB for training (model.fit) only.
 */
export class Indexedb extends Memory {
  /**
   * Fetches metadata on the working model currently saved in IndexedDB.
   * Returns false if the specified model does not exist.
   * @param {String} taskID the working model's corresponding task
   * @param {String} modelName the working model's file name
   */
  static async getWorkingModelMetadata(taskID, modelName) {
    return await _getModelMetadata(taskID, modelName, memConfig.WORKING_MODEL);
  }

  /**
   * Fetches metadata on a model saved to IndexedDB. Returns false if the
   * specified model does not exist.
   * @param {String} taskID the model's corresponding task
   * @param {String} modelName the model's file name
   */
  static async getSavedModelMetadata(taskID, modelName) {
    return await _getModelMetadata(taskID, modelName, memConfig.SAVED_MODEL);
  }

  /**
   * Loads the current working model from IndexedDB and returns it as a fresh
   * TFJS object.
   * @param {String} taskID the working model's corresponding task
   * @param {String} modelName the working model's file name
   */
  static async getWorkingModel(taskID, modelName) {
    return await _getModel(taskID, modelName, memConfig.WORKING_MODEL);
  }

  /**
   * Loads a previously saved model from IndexedDB and returns it as a fresh
   * TFJS object.
   * @param {String} taskID the saved model's corresponding task
   * @param {String} modelName the saved model's file name
   */
  static async getSavedModel(taskID, modelName) {
    return await _getModel(taskID, modelName, memConfig.SAVED_MODEL);
  }

  /**
   * Loads a model from the model library into the current working model. This
   * means copying it from indexeddb://saved/ to indexeddb://workng/.
   * @param {String} taskID the saved model's corresponding task
   * @param {String} modelName the saved model's file name
   */
  static async loadSavedModel(taskID, modelName) {
    await tf.io.copyModel(
      config.INDEXEDDB_SCHEME.concat(
        path.join(memConfig.SAVED_MODEL, taskID, modelName)
      ),
      config.INDEXEDDB_SCHEME.concat(
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
  static async updateWorkingModel(taskID, modelName, model) {
    await model.save(
      config.INDEXEDDB_SCHEME.concat(
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
  static async saveWorkingModel(taskID, modelName) {
    await tf.io.copyModel(
      config.INDEXEDDB_SCHEME.concat(
        path.join(memConfig.WORKING_MODEL, taskID, modelName)
      ),
      config.INDEXEDDB_SCHEME.concat(
        path.join(memConfig.SAVED_MODEL, taskID, modelName)
      )
    );
  }

  /**
   * Removes the working model model from IndexedDB.
   * @param {String} taskID the model's corresponding task
   * @param {String} modelName the model's file name
   */
  static async deleteWorkingModel(taskID, modelName) {
    await _deleteModel(taskID, modelName, memConfig.WORKING_MODEL);
  }

  /**
   * Remove a previously saved model from IndexedDB.
   * @param {String} taskID the model's corresponding task
   * @param {String} modelName the model's file name
   */
  static async deleteSavedModel(taskID, modelName) {
    await _deleteModel(taskID, modelName, memConfig.SAVED_MODEL);
  }

  /**
   * Downloads a previously saved model.
   * @param {String} taskID the saved model's corresponding task
   * @param {String} modelName the saved model's file name
   */
  static async downloadSavedModel(taskID, modelName) {
    await tf.io.copyModel(
      config.INDEXEDDB_SCHEME.concat(
        path.join(memConfig.SAVED_MODEL, taskID, modelName)
      ),
      config.DOWNLOADS_SCHEME.concat(`${taskID}_${modelName}`)
    );
  }

  async _getModelMetadata(taskID, modelName, modelType) {
    let key = config.INDEXEDDB_SCHEME.concat(
      path.join(modelType, taskID, modelName)
    );
    return await tf.io.listModels().then((models) => models[key] ?? false);
  }

  async _getModel(taskID, modelName, modelType) {
    return await tf.loadLayersModel(
      config.INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName))
    );
  }

  async _deleteModel(taskID, modelName, modelType) {
    await tf.io.removeModel(
      config.INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName))
    );
  }
}
