import * as tf from '@tensorflow/tfjs';
import path from 'path';
import * as config from './indexedb.config.js';

async function _getModelMetadata(taskID, modelName, modelType) {
  let key = config.INDEXEDDB_SCHEME.concat(
    path.join(modelType, taskID, modelName)
  );
  return await tf.io.listModels().then((models) => models[key] ?? false);
}

async function _getModel(taskID, modelName, modelType) {
  return await tf.loadLayersModel(
    config.INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName))
  );
}

async function _deleteModel(taskID, modelName, modelType) {
  await tf.io.removeModel(
    config.INDEXEDDB_SCHEME.concat(path.join(modelType, taskID, modelName))
  );
}
