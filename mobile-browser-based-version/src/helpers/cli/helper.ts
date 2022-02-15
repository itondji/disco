import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { loadTasks } from '../task_definition/helper.js'
import { logger } from '../logging/consoleLogger'
import * as config from './cli.config.js'

/**
 * Loads the single task with the given taskID
 *
 * @param {*} taskID : task identifier
 * @returns the loaded task
 */
async function loadTask (taskID) {
  const tasks = await loadTasks(true)
  const task = _.filter(tasks, (t) => t.taskID === taskID)
  if (task.length === 0) {
    logger.error(`Task ${taskID} is not valid`)
    return undefined
  }
  return task[0]
}

/**
 * Loads all files present in the `dataDirRel` directory and add them to the fileUploadManager
 * @param {*} dataDirRel : directory where the files are located
 * @param {*} fileUploadManager : object to which the file shall be added
 */
function loadFiles (dataDirRel, fileUploadManager) {
  const dataDir = config.DATA_DIR(dataDirRel)
  const fileNames = fs.readdirSync(dataDir)
  if (!fileNames) {
    // handling error
    logger.error('Unable to scan data directory')
  }
  _.forEach(
    // filter unwanted files
    _.filter(fileNames, (f) => !config.FILTER_FILES.has(f)),
    (fileName) => {
      const filePath = path.join(dataDir, fileName)
      // TODO: update code for multiclass classification
      const file = new File(filePath)
      fileUploadManager.addFile(fileName, file, fileName)
    }
  )
}

function storeFiles (outDirRel, fileContent, fileName) {
  const outDir = config.DATA_DIR(outDirRel)
  fs.writeFileSync(fileName, path.join(outDir, fileContent))
}

export { loadTask, loadFiles, storeFiles }
