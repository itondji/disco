import { List, Map, Seq, Set } from 'immutable'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
import wrtc from 'wrtc'
import WebSocket from 'ws'
import tf from '@tensorflow/tfjs'

import {
  deserializeWeights,
  isSerializedVariable,
  SerializedVariable,
  serializeWeights
} from './serialization'
import { Client } from './client'
import { Task } from '@/logic/task_definition/base/task'
import { TrainingInformant } from '@/logic/training/training_informant'

type Weights = tf.LayerVariable[]
type Message = { epoch: number, weights: SerializedVariable[] }

function isMessage (data: unknown): data is Message {
  if (typeof data !== 'object') {
    return false
  } if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('epoch', 'weights'))) {
    return false
  }
  // TODO do not cast
  const obj = data as { epoch: unknown, weights: unknown }

  if (typeof obj.epoch !== 'number') {
    return false
  } if (!Array.isArray(obj.weights)) {
    return false
  }

  if (!obj.weights.every(isSerializedVariable)) {
    return false
  }

  return true
}

// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class DecentralisedClient extends Client {
  private server?: WebSocket;
  private ourself?: SimplePeer.Instance;
  // TODO use peer name, signals can be different for the same peer
  private peers = Map<SimplePeer.SignalData, SimplePeer.Instance>();

  private weights = Map<SimplePeer.Instance, List<Weights | undefined>>()

  constructor (serverURL: string, task: Task, password: string) {
    super(serverURL, task)

    // TODO add peer config { url: 'turn:34.77.172.69:3478', credential: 'deai', username: 'deai' }

    if (password !== '') {
      // TODO use tweetnacl.secretbox
      throw new Error('TODO: missing authentication support')
    }

    if (task.trainingInformation?.threshold !== undefined) {
      throw new Error('no support for threshold')
    }
  }

  connectNewPeer (signal: SimplePeer.SignalData): SimplePeer.Instance {
    const peer = new SimplePeer({ initiator: true })

    peer.signal(signal)

    peer.on('data', (data) => {
      const message = msgpack.decode(data)
      if (!isMessage(message)) {
        throw new Error(`invalid message received from ${peer}`)
      }

      if (this.weights.get(peer)?.get(message.epoch) !== undefined) {
        throw new Error(`weights from ${peer} already received`)
      }
      this.weights.set(peer,
        this.weights.get(peer, List<Weights>())
          .set(message.epoch, deserializeWeights(message.weights)))
    })

    return peer
  }

  connectServer (url: URL): Promise<WebSocket> {
    console.log(`url: ${url}`)

    const ws = new WebSocket(url)

    ws.on('message', (data: unknown) => {
      if (!Array.isArray(data)) {
        throw new Error('not an array')
      }

      // TODO check validity of elements
      const signals = List<SimplePeer.SignalData>(data)

      const newPeers = Map(signals.map((signal) => {
        let peer = this.peers.get(signal)
        if (peer === undefined) {
          peer = this.connectNewPeer(signal)
        }
        return [signal, peer]
      }))

      this.peers
        .filter((_, signal) => !newPeers.has(signal))
        .valueSeq()
        .forEach((peer) => peer.destroy())
      this.peers = newPeers
    })

    return new Promise((resolve, reject) => {
      ws.on('error', (err) => reject(new Error(`connect server: ${err}`)))
      ws.on('open', () => resolve(ws))
    })
  }

  /**
   * Initialize the connection to the peers and to the other nodes.
   */
  async connect () {
    // TODO move to args
    const serverURL = new URL(this.serverURL)

    console.log('connect server >>')
    this.server = await this.connectServer(serverURL)
    console.log('connect server <<')

    const ourself = new SimplePeer({ initiator: true, wrtc })
    ourself.on('signal', this.server.send)

    this.ourself = await new Promise((resolve, reject) => {
      ourself.on('error', reject)
      ourself.on('connect', () => resolve(ourself))
    })

    this.ourself.on('data', (data) => {
      if (!isSerializedVariable(data)) {
        throw new Error('received message')
      }
    })
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect () {
    this.peers.forEach((peer) => peer.destroy())
    this.server?.close()
  }

  async onRoundEndCommunication (model: tf.LayersModel, epoch: number, trainingInformant: TrainingInformant): Promise<void> {
    // broadcast our weights
    const message = msgpack.encode({
      epoch: epoch,
      model: await serializeWeights(model.weights)
    })

    this.peers.forEach((peer) => {
      trainingInformant.addMessage(`Sending weights to: ${peer}`)
      trainingInformant.updateWhoReceivedMyModel(peer)

      peer.send(message)
    })

    // get weights from the others
    const getWeights = () =>
      this.weights
        .valueSeq()
        .map((epochesWeights) => epochesWeights.get(epoch))

    const timeoutError = new Error('timeout')
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        const gotAllWeights =
          getWeights().every((weights) => weights !== undefined)

        if (gotAllWeights) {
          clearInterval(interval)
          resolve()
        }
      }, TICK)

      setTimeout(() => {
        clearInterval(interval)
        reject(timeoutError)
      }, MAX_WAIT_PER_ROUND)
    }).catch((err) => {
      if (err !== timeoutError) {
        throw err
      }
    })

    const receivedWeights = getWeights()
      .filter((weights) => weights !== undefined) as Seq.Indexed<Weights>

    // average weights
    trainingInformant.addMessage('Averaging weights')
    trainingInformant.updateNbrUpdatesWithOthers(1)

    // TODO is it really averaging?
    // TODO use tf.layers.average() ?
    receivedWeights
      .reduce((acc, weights) => {
        acc.zip(List(weights)).forEach(([modelWeight, peerWeight]) => modelWeight.write(peerWeight.read()))
        return acc
      }, List(model.weights))
  }

  async onTrainEndCommunication (_: tf.LayersModel, trainingInformant: TrainingInformant): Promise<void> {
    // TODO nothing to do?
    trainingInformant.addMessage('Training finished.')
  }
}
