/* eslint-disable no-unused-vars */
import { Client } from '../../../../src/logic/communication/client'
import { TrainingInformant } from '../../../../src/logic/training/training_informant'
import { AsyncWeightsBuffer } from '../../../../server/src/logic/federated/async_weights_buffer'
import { expect } from 'chai'
import { logger } from '../../../../src/logic/logging/console_logger'
import * as fs from 'fs'
import * as tf from '@tensorflow/tfjs'
import * as tfnode from '@tensorflow/tfjs-node'

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
const IMAGE_HEIGHT = 200
const IMAGE_WIDTH = 200

function tensorFromImagePath (filePath: string) {
  const imageBuffer = fs.readFileSync(filePath)
  return tfnode.node.decodeImage(imageBuffer) as tf.Tensor3D
}

async function readdir (folder: string) {
  const files = await fs.promises.readdir(folder)
  return files.filter((file) => file !== '.DS_Store')
}

async function loadImages (folderPath: string) {
  const files = await readdir(folderPath)
  const images: tf.Tensor3D[] = []
  for (let i = 0; i < 2; i++) {
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
  const ages = ['001', '018', '060']
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
  const Ytrain = tf.oneHot(tf.tensor1d(labels).toInt(), numberOfClasses)

  return { Xtrain: Xtrain, Ytrain: Ytrain, mapLabelsToAge: mapLabelsToAge }
}

describe('train test', () => { // the tests container
  it('shuffle test', async () => {
    const a = [1, 2, 3, 4, 5, 6]
    const b = [1, 2, 3, 4, 5, 6]
    shuffle(a, b)
    expect(a).to.eql(b)
  })
  it('read data', async () => {
    const data = await getData()
    console.log(data.Xtrain)
    console.log(data.Ytrain.arraySync())
  })
})
