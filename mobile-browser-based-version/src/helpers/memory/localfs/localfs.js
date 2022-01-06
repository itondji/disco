import * as tf from '@tensorflow/tfjs';
import path from 'path';
import * as config from './localfs.config.js';
import * as memConfig from '../memory.config.js';
import Memory from '../memory.js';
import {_getModel, _deleteModel } from './helper.js';

export class Localfs extends Memory {
    await model.save('file:///path/to/my-model');

    static async getWorkingModel() {
        throw new Error("Method 'getWorkingModel()' must be implemented.");
      }
      static async updateWorkingModel() {
        throw new Error("Method 'updateWorkingModel()' must be implemented.");
      }
      static async saveWorkingModel() {
        throw new Error("Method 'saveWorkingModel()' must be implemented.");
      }
      static async deleteSavedModel() {
        throw new Error("Method 'deleteSavedModel()' must be implemented.");
      }
      static async loadSavedModel() {
        throw new Error("Method 'loadSavedModel()' must be implemented.");
      }
      static async downloadSavedModel() {
        throw new Error("Method 'downloadSavedModel()' must be implemented.");
      }
  
}
