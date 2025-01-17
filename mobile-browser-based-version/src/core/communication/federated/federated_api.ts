import axios from 'axios'
import * as tf from '@tensorflow/tfjs'

function serverUrl () {
  // We place this in a function since during a test script the env is not defined
  return process.env.VUE_APP_FEAI_SERVER
}

export async function connect (taskID: string, clientID: string) {
  return await axios.get(serverUrl().concat(`connect/${taskID}/${clientID}`))
}

export async function disconnect (taskID: string, clientID: string) {
  return await axios.get(serverUrl().concat(`disconnect/${taskID}/${clientID}`))
}

export async function queryLogs (taskID: string, round: number, clientID: string) {
  const params = []
  if (taskID !== undefined) params.push(`task=${taskID}`)
  if (round !== undefined) params.push(`round=${round}`)
  if (clientID !== undefined) params.push(`id=${clientID}`)
  const query = params.join('&')
  return await axios.get(serverUrl().concat(`logs?${query}`))
}

export async function postWeights (taskID: string, clientID: string, weights, round: number) {
  const url = serverUrl().concat(`weights/${taskID}/${clientID}`)
  return await axios({
    method: 'post',
    url: url,
    data: {
      weights: weights,
      round: round
    }
  })
}

export async function getRound (taskID: string, clientID: string) {
  const url = serverUrl().concat(`round/${taskID}/${clientID}`)
  return await axios.get(url)
}

/**
 * Gets the latest model of taskId from the server. On the server side, the request_handlers.ts updates the model
 * of taskId after each new round (i.e the buffer is full) by averaging the weights in the buffer and storing them
 * in the server; these weights are being fetched by getLatestModel.
 * @param taskId
 * @returns
 */
export async function getLatestModel (taskId: string) {
  const url = serverUrl().concat(`tasks/${taskId}/model.json`)
  const latestModel = await tf.loadLayersModel(url)
  return latestModel
}

export async function postMetadata (
  taskID: string,
  round: number,
  clientID: string,
  metadataID: string,
  metadata: string
) {
  const url = serverUrl().concat(`metadata/${metadataID}/${taskID}/${round}/${clientID}`)
  return await axios({
    method: 'post',
    url: url,
    data: {
      metadataID: metadata
    }
  })
}

export async function getMetadataMap (taskID: string, round: number, clientID: string, metadataID: string) {
  return await axios.get(
    serverUrl().concat(`metadata/${metadataID}/${taskID}/${round}/${clientID}`)
  )
}
