import * as tf from '@tensorflow/tfjs';
import path from 'path';
import * as config from './localfs.config.js';

async function _getModel(taskID, modelName, modelType) {
  return await tf.loadLayersModel(
    config.SCHEME.concat(path.join(modelType, taskID, modelName))
  );
}

async function _deleteModel(taskID, modelName, modelType) {
  await tf.io.removeModel(
    config.SCHEME.concat(path.join(modelType, taskID, modelName))
  );
}
