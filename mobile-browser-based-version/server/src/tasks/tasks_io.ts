import fs from 'fs'
import { Task } from './task'

let tasks: Task[] = []

function getTasks (config): Task[] {
  // Load tasks only if they have not been yet loaded.
  if (tasks.length > 0) {
    return tasks
  }

  if (!fs.existsSync(config.TASKS_FILE)) {
    throw new Error(`Could not read from tasks file ${config.TASKS_FILE}`)
  }

  const jsonTasks = JSON.parse(
    fs.readFileSync(config.TASKS_FILE) as unknown as string
  )

  tasks = jsonTasks as Task[]

  return tasks
}

function writeNewTask (newTask, modelFile, weightsFile, config) {
  // store results in json file
  fs.writeFile(config.TASKS_FILE, JSON.stringify(tasks), (err) => {
    if (err) console.log('Error writing file:', err)
  })
  // synchronous directory creation so that next call to fs.writeFile doesn't fail.
  fs.mkdirSync(config.TASK_MODEL_DIR(newTask.taskID), { recursive: true })
  fs.writeFile(
    config.TASK_MODEL_FILE(newTask.taskID),
    JSON.stringify(modelFile),
    (err) => {
      if (err) console.log('Error writing file:', err)
    }
  )
  fs.writeFile(
    config.TASK_MODEL_WEIGHTS(newTask.taskID),
    weightsFile,
    (err) => {
      if (err) console.log('Error writing file:', err)
    }
  )
}

export { writeNewTask, getTasks }
