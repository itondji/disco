/* eslint-disable no-unused-vars */
import { Client } from '../../../../src/logic/communication/client'
import { TrainingInformant } from '../../../../src/logic/training/training_informant'
import { LocalTrainer } from '../../../../src/logic/training/trainer/local_trainer'
import { AsyncWeightsBuffer } from '../../../../server/src/logic/federated/async_weights_buffer'
import { expect } from 'chai'
import { logger } from '../../../../src/logic/logging/console_logger'
import * as fs from 'fs'
import * as tf from '@tensorflow/tfjs'
import * as tfnode from '@tensorflow/tfjs-node'
import { RoundTracker } from '../../../../src/logic/training/trainer/round_tracker'
import { Task, TrainingInformation } from '../../../../src/logic/task_definition/base/task'
import { ImageTask } from '../../../../src/logic/task_definition/image/image_task'
import { TaskHelper } from '../../../../src/logic/task_definition/base/task_helper'
import { getModel } from './model.test'

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
  ])
  return tensor
}

async function readdir (folder: string) {
  const files = await fs.promises.readdir(folder)
  return files.filter((file) => file !== '.DS_Store')
}

async function loadImages (folderPath: string) {
  const files = await readdir(folderPath)
  const images: tf.Tensor3D[] = []
  for (let i = 0; i < files.length; i++) {
    const filePath = folderPath + '/' + files[i]
    const tensor = tensorFromImagePath(filePath)
    images.push(tensor)
  }
  return images
}

async function loadData (age: string, index: number) {
  const folderPath = rootDataPath + age
  const images = await loadImages(folderPath)
  const labels = Array(images.length).fill(index)

  return { images: images, labels: labels }
}

async function getData () {
  let images: tf.Tensor3D[] = []
  let labels: number[] = []
  const ages = ['001', '016', '031', '046']
  const numberOfClasses = ages.length
  const mapLabelsToAge = {}

  for (let i = 0; i < ages.length; i++) {
    const age = ages[i]
    const data = await loadData(age, i)
    images = images.concat(data.images)
    labels = labels.concat(data.labels)
    mapLabelsToAge[i] = age
  }

  console.log('Map of labels -> ages', mapLabelsToAge)

  // Shuffle data
  shuffle(images, labels)

  // Stack images into one big matrix
  const Xtrain = tf.stack(images)

  // One hot encodings formatting
  const ytrain = tf.oneHot(tf.tensor1d(labels).toInt(), numberOfClasses)

  return { Xtrain: Xtrain, ytrain: ytrain, mapLabelsToAge: mapLabelsToAge, numberOfClasses: ages.length }
}

// Model

describe('train test', () => { // the tests container
  it('shuffle test', async () => {
    const a = [1, 2, 3, 4, 5, 6]
    const b = [1, 2, 3, 4, 5, 6]
    shuffle(a, b)
    expect(a).to.eql(b)
  })
  //   it('read data', async () => {
  //     const data = await getData()

  //     const tens = data.Xtrain.arraySync()[0]// .dataSync()
  //     // console.log(tens)
  //     // Need to cast?
  //     const tensor = tf.image.resizeBilinear(tens, [32, 32])
  //   })

  it('train', async () => {
    const imageWidth = 32
    const imageHeight = 32
    const imageChannels = 3
    const trainingInformant = new TrainingInformant(1, 'face')
    const roundDuration = 1
    const trainSize = 100
    const batchSize = 1
    const roundTracker = new RoundTracker(roundDuration, trainSize, batchSize)
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
    const data = await getData()
    const numOutputClasses = 3
    const model = getModel(imageWidth, imageHeight, imageChannels, data.numberOfClasses)

    const localTrainer = new LocalTrainer(task, trainingInformant, false, roundTracker, model)

    await localTrainer.trainModel(data)

    // const tens = data.Xtrain.arraySync()[0]// .dataSync()
    // console.log('TENS:')
    // // console.log(tens)
    // // Need to cast?
    // const tensor = tf.image.resizeBilinear(tens, [32, 32])
    // console.log(tensor)
  }).timeout(1500000000000)
})
