/* eslint-disable no-unused-vars */
import { Client } from '../../../../src/logic/communication/client'
import { TrainingInformant } from '../../../../src/logic/training/training_informant'
import { DistributedTrainer } from '../../../../src/logic/training/trainer/distributed_trainer'
import { AsyncWeightsBuffer } from '../../../../server/src/logic/federated/async_weights_buffer'
import { expect } from 'chai'
import * as fs from 'fs'
import * as tf from '@tensorflow/tfjs'
import * as tfnode from '@tensorflow/tfjs-node'
import { RoundTracker } from '../../../../src/logic/training/trainer/round_tracker'
import { Task, TrainingInformation } from '../../../../src/logic/task_definition/base/task'
import { ImageTask } from '../../../../src/logic/task_definition/image/image_task'

let SHARED_WEIGHTS: tf.LayerVariable[] = []

function getSharedWeights () {
  return SHARED_WEIGHTS.map((layer) => layer.read())
}

export class MockServer {
    asyncWeightsBuffer: AsyncWeightsBuffer

    async aggregateAndStoreWeights (weights: tf.LayerVariable[][]) {
      const firstWeight = weights[0].map((layer) => new tf.LayerVariable(tf.clone(layer.read())))

      for (let layer = 0; layer < weights.length; layer++) {
        for (let i = 1; i < weights.length; i++) {
          const w = weights[i][layer].read()
          const addition = w.add(firstWeight[layer].read())
          firstWeight[layer].write(addition)
        }
        const normalised = firstWeight[layer].read().div(weights.length)
        firstWeight[layer].write(normalised)
      }

      SHARED_WEIGHTS = firstWeight

      console.log('aggregateAndStoreWeights')
    }

    constructor () {
      const bufferSize = 3
      this.asyncWeightsBuffer = new AsyncWeightsBuffer('mockTaskId', bufferSize, this.aggregateAndStoreWeights)
    }
}

const mockServer = new MockServer()

export class MockFederatedClient extends Client {
    id: string
    constructor (serverURL: string, task: Task, id: string) {
      super(serverURL, task)
      this.id = id
    }

    connect (epochs?: number): Promise<any> {
      throw new Error('Method not implemented.')
    }

    disconnect (): Promise<any> {
      throw new Error('Method not implemented.')
    }

    async onTrainEndCommunication (model: any, trainingInformant: TrainingInformant): Promise<void> {
      console.log('on train end: Method not implemented.')
    }

    async onRoundEndCommunication (model: tf.LayersModel, round: number, trainingInformant: TrainingInformant): Promise<void> {
      console.log(`ROUND END: ${round}, ID:${this.id}`)
      await mockServer.asyncWeightsBuffer.add(this.id, model.weights, round)
      if (mockServer.asyncWeightsBuffer.round > 0) {
        model.setWeights(getSharedWeights())
      }
    //   this.id = this.id + '-'
    }
}

function shuffle (array: any[], arrayTwo: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = array[i]
    array[i] = array[j]
    array[j] = temp

    const tempTwo = arrayTwo[i]
    arrayTwo[i] = arrayTwo[j]
    arrayTwo[j] = tempTwo
  }
}

const rootDataPath = '../../face_age/face_age/'
const RESIZED_IMAGE_H = 32
const RESIZED_IMAGE_W = 32

function tensorFromImagePath (filePath: string) {
  const imageBuffer = fs.readFileSync(filePath)
  let tensor = tfnode.node.decodeImage(imageBuffer) as tf.Tensor3D
  tensor = tf.image.resizeBilinear(tensor, [
    RESIZED_IMAGE_H, RESIZED_IMAGE_W
  ]).div(tf.scalar(255))
  return tensor
}

async function readdir (folder: string) {
  const files = await fs.promises.readdir(folder)
  return files.filter((file) => file !== '.DS_Store')
}

const USER_WIDTH = 0.05
function userDataInterval (user: string) {
  if (user === '1') {
    return 0.05
  } else if (user === '2') {
    return 0.1
  }
  return 0.15
}

async function loadImages (folderPath: string, user: string) {
  const files = await readdir(folderPath)
  const images: tf.Tensor3D[] = []
  const trainAloneSize = 0.1
  const keepOnly = trainAloneSize + userDataInterval(user)
  const offset = userDataInterval(user) - USER_WIDTH
  const startAt = Math.ceil(files.length * (trainAloneSize + offset))
  for (let i = startAt; i < files.length * keepOnly; i++) {
    const filePath = folderPath + '/' + files[i]
    const tensor = tensorFromImagePath(filePath)
    images.push(tensor)
  }
  return images
}

async function loadData (age: string, label: number, user: string) {
  const folderPath = rootDataPath + age
  const images = await loadImages(folderPath, user)
  const labels = Array(images.length).fill(label)

  return { images: images, labels: labels }
}

function ageToLabelMap (ageString: string) {
  const age = +ageString
  if (age > 6 && age <= 14) {
    return 0
  } else if (age > 20 && age <= 26) {
    return 1
  }

  return -1
}

async function getData (user: string) {
  let images: tf.Tensor3D[] = []
  let labels: number[] = []
  const numberOfClasses = 2

  const ages = await readdir(rootDataPath)

  const labelCount = { 0: 0, 1: 0 }

  for (let i = 0; i < ages.length; i++) {
    const label = ageToLabelMap(ages[i])
    if (label !== -1) {
      const age = ages[i]
      const data = await loadData(age, label, user)
      images = images.concat(data.images)
      labels = labels.concat(data.labels)
      console.log(`age: ${age}, label: ${label}, size: ${data.images.length}`)
      labelCount[label] += data.images.length
    }
  }

  console.log(labelCount)

  // Shuffle data
  shuffle(images, labels)
  console.log(labels)

  const size = labels.length

  // Stack images into one big matrix
  const Xtrain = tf.stack(images)

  // One hot encodings formatting
  const ytrain = tf.oneHot(tf.tensor1d(labels).toInt(), numberOfClasses)

  return { Xtrain: Xtrain, ytrain: ytrain, numberOfClasses: numberOfClasses, size: size }
}

async function runUser (user: string) {
  const imageWidth = 32
  const imageHeight = 32
  const imageChannels = 3
  const trainingInformant = new TrainingInformant(1, 'face')
  const roundDuration = 1
  const batchSize = 4

  const task = new ImageTask('face', '', '')

  // training info
  const trainingInformation = new TrainingInformation()
  trainingInformation.RESIZED_IMAGE_H = imageHeight
  trainingInformation.RESIZED_IMAGE_W = imageWidth
  trainingInformation.validationSplit = 0.3
  trainingInformation.batchSize = batchSize
  trainingInformation.epochs = 10
  trainingInformation.preprocessFunctions = []

  task.trainingInformation = trainingInformation

  // Model
  const data = await getData(user)
  const model = await tf.loadLayersModel('file://./tests/logic/training/trainer/model/model.json')

  const optimizer = tf.train.adam()
  model.compile({
    optimizer: optimizer,
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  })

  // getModel(imageWidth, imageHeight, imageChannels, data.numberOfClasses)

  const trainSize = data.size * 1 - trainingInformation.validationSplit
  const roundTracker = new RoundTracker(roundDuration, trainSize, batchSize)
  const client = new MockFederatedClient('serverUrl', task, 'user' + user)
  const distributedTrainer = new DistributedTrainer(task, trainingInformant, false, roundTracker, model, client)

  await distributedTrainer.trainModel(data)
}

// Model

describe('train federated test', () => { // the tests container
  it('shuffle test', async () => {
    const a = [1, 2, 3, 4, 5, 6]
    const b = [1, 2, 3, 4, 5, 6]
    shuffle(a, b)
    expect(a).to.eql(b)
  })

  it('train', async () => {
    runUser('1')
    runUser('2')
    await runUser('3')
  }).timeout(1500000000000000)
})
