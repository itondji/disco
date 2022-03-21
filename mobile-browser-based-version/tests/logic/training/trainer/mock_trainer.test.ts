/* eslint-disable no-unused-vars */
import { TrainingInformant } from '../../../../src/logic/training/training_informant'
import { LocalTrainer } from '../../../../src/logic/training/trainer/local_trainer'
import { expect } from 'chai'
import * as fs from 'fs'
import * as tf from '@tensorflow/tfjs'
import * as tfnode from '@tensorflow/tfjs-node'
import { RoundTracker } from '../../../../src/logic/training/trainer/round_tracker'
import { TrainingInformation } from '../../../../src/logic/task_definition/base/task'
import { ImageTask } from '../../../../src/logic/task_definition/image/image_task'
import { getModel } from './model.test'

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

async function loadImages (folderPath: string) {
  const files = await readdir(folderPath)
  const images: tf.Tensor3D[] = []
  const keepOnly = 0.1
  for (let i = 0; i < files.length * keepOnly; i++) {
    const filePath = folderPath + '/' + files[i]
    const tensor = tensorFromImagePath(filePath)
    images.push(tensor)
  }
  return images
}

async function loadData (age: string, label: number) {
  const folderPath = rootDataPath + age
  const images = await loadImages(folderPath)
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

async function getData () {
  let images: tf.Tensor3D[] = []
  let labels: number[] = []
  const numberOfClasses = 2

  const ages = await readdir(rootDataPath)

  const labelCount = { 0: 0, 1: 0 }

  for (let i = 0; i < ages.length; i++) {
    const label = ageToLabelMap(ages[i])
    if (label !== -1) {
      const age = ages[i]
      const data = await loadData(age, label)
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

// Model

describe('train local test', () => { // the tests container
  it('shuffle test', async () => {
    const a = [1, 2, 3, 4, 5, 6]
    const b = [1, 2, 3, 4, 5, 6]
    shuffle(a, b)
    expect(a).to.eql(b)
  })

  it('train', async () => {
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
    const data = await getData()

    const model = await tf.loadLayersModel('file://./tests/logic/training/trainer/model_federated/model.json')

    const optimizer = tf.train.adam()
    model.compile({
      optimizer: optimizer,
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })
    //   const model = getModel(imageWidth, imageHeight, imageChannels, data.numberOfClasses)

    const trainSize = data.size * 1 - trainingInformation.validationSplit
    const roundTracker = new RoundTracker(roundDuration, trainSize, batchSize)
    const localTrainer = new LocalTrainer(task, trainingInformant, false, roundTracker, model)

    await localTrainer.trainModel(data)

    // await model.save('file://./tests/logic/training/trainer/model')
  }).timeout(1500000000000000)
})
