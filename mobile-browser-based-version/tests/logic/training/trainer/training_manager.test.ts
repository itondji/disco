import { Client } from '../../../../src/logic/communication/client'
import { TrainingInformant } from '../../../../src/logic/training/training_informant'
import { AsyncWeightsBuffer } from '../../../../server/src/logic/federated/async_weights_buffer'
import { expect } from 'chai'
import { loadTasks } from '../../../../src/logic/task_definition/tasks_io'
import { TrainingManager } from '../../../../src/logic/training/training_manager'
import { CsvTaskHelper } from '../../../../src/logic/task_definition/csv/csv_task_helper'
import { CsvTask } from '../../../../src/logic/task_definition/csv/csv_task'
import { logger } from '../../../../src/logic/logging/console_logger'
import { Platform } from '../../../../src/platforms/platform'

import * as fs from 'fs'

const platform = Platform.federated

export class MockServer {
    asyncWeightsBuffer: AsyncWeightsBuffer
}

export class MockFederatedClient extends Client {
  connect (epochs?: number): Promise<any> {
    throw new Error('Method not implemented.')
  }

  disconnect (): Promise<any> {
    throw new Error('Method not implemented.')
  }

  onTrainEndCommunication (model: any, trainingInformant: TrainingInformant): Promise<void> {
    throw new Error('Method not implemented.')
  }

  onRoundEndCommunication (model: any, round: number, trainingInformant: TrainingInformant): Promise<void> {
    throw new Error('Method not implemented.')
  }
}

describe('train test', () => { // the tests container
  it('read file', async () => {
    const filePath = 'example_training_data/titanic.csv'
    const file = fs.readFileSync(filePath, 'utf8')

    const tasks = await loadTasks()
    const task = tasks[0]
    const csvTask = new CsvTask(task.taskID, task.displayInformation, task.trainingInformation)
    const data = await csvTask.dataPreprocessing(file)
    console.log(data.Xtrain)
  })
})
