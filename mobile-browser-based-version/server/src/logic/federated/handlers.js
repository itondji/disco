import path from 'path';
import fs from 'fs';
import msgpack from 'msgpack-lite';
import * as config from '../../../server.config.js';
import {
  averageWeights,
  assignWeightsToModel,
} from '../../helpers/tfjs_helpers.js';
import { tasks } from '../../tasks/tasks.js';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-node';

const REQUEST_TYPES = Object.freeze({
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  SELECTION_STATUS: 'selection-status',
  AGGREGATION_STATUS: 'aggregation-status',
  POST_WEIGHTS: 'post-weights',
  GET_WEIGHTS: 'get-weights',
  POST_METADATA: 'post-metadata',
  GET_METADATA: 'get-metadata',
  GET_TASKS: 'get-tasks',
  INTEROPERABILITY_STATUS: 'interoperability-status',
  POST_INTEROPERABILITY: 'post-interoperability',
  GET_INTEROPERABILITY: 'get-interoperability',
});
/**
 * Fraction of client gradients required on the final step of a round
 * to proceed to the aggregation step.
 */
const AGGREGATION_THRESHOLD = 0.8;
/**
 * Absolute number of selected clients required to start the next round.
 */
const ROUND_THRESHOLD = 2;
/**
 * Once a certain threshold has been hit, leave a small time window (in ms) for
 * late clients to join the next round.
 */
const ROUND_COUNTDOWN = 1000 * 10;
/**
 * Once a certain threshold has been hit, leave a small time window (in ms) for
 * late clients to contribute to the round's aggregated model.
 */
const AGGREGATION_COUNTDOWN = 1000 * 3;
/**
 * Clients that didn't emit any API request within this time delay (in ms) are
 * considered as idle and are consequently removed from the required data
 * structures.
 */
const IDLE_DELAY = 1000 * 10;
/**
 * Same as IDLE_DELAY, except longer for clients that recently connected and thus
 * are not critical nodes (i.e. training nodes).
 */
const NEW_CLIENT_IDLE_DELAY = 1000 * 60;
/**
 * Contains the model weights received from clients for a given task and round.
 * Stored by task ID, round number and client ID.
 */
const weightsMap = new Map();
/**
 * Contains the interoperability parameters received from clients for a given task and round.
 * Stored by task ID, round number and client ID.
 */
const interoperabilityParametersMap = new Map();
/**
 * Contains metadata used for training by clients for a given task and round.
 * Stored by task ID, round number and client ID.
 */
const metadataMap = new Map();
/**
 * Contains all successful requests made to the server. An entry consists of:
 * - a timestamp corresponding to the time at which the request was made
 * - the client ID used to make the request
 * - the task ID for which the request was made
 * - the round at which the request was made
 * - the request type
 */
const logs = [];
/**
 * Contains client IDs currently connected to one of the server.
 * Disconnected clients should always be removed from this set
 */
const clients = new Set();
/**
 * Contains client IDs and their amount of recently emitted API requests.
 * This allows us to check whether clients were active within a certain time interval
 * and thus remove possibly AFK clients.
 */
const activeClients = new Map();
/**
 * Contains client IDs selected for the current round. Maps a task ID to a set of
 * selected clients. Disconnected clients should always be removed from the
 * corresponding set of selected clients.
 */
const selectedClients = new Map();
/**
 * Contains client IDs queued for the next round's selection. Maps a task ID to a set
 * of queued clients. Disconnected clients should always be removed from the
 * corresponding set of queued set.
 */
const selectedClientsQueue = new Map();
/**
 * Maps a task to a status object. Currently provides the round number and
 * round status for each task.
 */
const tasksStatus = new Map();
/**
 * Initialize the data structures declared above.
 */
tasks.forEach((task) => {
  selectedClients.set(task.taskID, new Set());
  selectedClientsQueue.set(task.taskID, new Set());
  tasksStatus.set(task.taskID, { isRoundPending: false, round: 0 });
});

/**
 * Verifies that the given POST request is correctly formatted. Its body must
 * contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * The client must already be connected to the specified task before making any
 * subsequent POST requests related to training.
 * @param {Request} request received from client
 */
function _checkRequest(request) {
  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (!(Number.isInteger(Number(round)) && round >= 0)) {
    return 400;
  }
  if (!(tasksStatus.has(task) && round <= tasksStatus.get(task).round)) {
    return 404;
  }
  if (!clients.has(id)) {
    return 401;
  }
  if (!selectedClients.get(task).has(id)) {
    return 403;
  }
  return 200;
}

function _failRequest(response, type, code) {
  console.log(`${type} failed with code ${code}`);
  response.status(code).send();
}

/**
 * Appends the given request to the server logs.
 * @param {Request} request received from client
 * @param {String} type of the request
 */
function _logsAppend(request, type) {
  const timestamp = new Date();
  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;
  logs.push({
    timestamp: timestamp,
    task: task,
    round: round,
    client: id,
    request: type,
  });
}

function _startNextRound(task, threshold, countdown) {
  let queueSize = selectedClientsQueue.get(task).size;
  if (queueSize >= threshold) {
    setTimeout(() => {
      queueSize = selectedClientsQueue.get(task).size;
      if (queueSize >= threshold && !tasksStatus.get(task).isRoundPending) {
        tasksStatus.get(task).isRoundPending = true;

        console.log('* queue: ', selectedClientsQueue.get(task));
        console.log('* selected clients: ', selectedClients.get(task));

        selectedClients.set(task, new Set([...selectedClientsQueue.get(task)]));
        selectedClientsQueue.get(task).clear();

        console.log('* empty queue: ', selectedClientsQueue.get(task));
        console.log('* new selected clients: ', selectedClients.get(task));
      }
    }, countdown);
  }
}

async function _aggregateWeights(task, round, id) {
  // TODO: check whether this actually works
  const serializedAggregatedWeights = await averageWeights(
    Array.from(weightsMap.get(task).get(round).values())
  );
  /**
   * Save the newly aggregated model to the server's local storage. This
   * is now the model served to clients for the given task. To save the newly
   * aggregated weights, here is the (cumbersome) procedure:
   * 1. create a new TFJS model with the right layers
   * 2. assign the newly aggregated weights to it
   * 3. save the model
   */
  console.log(`Updating ${task} model`);
  const modelFilesPath = config.SAVING_SCHEME.concat(
    path.join(config.MODELS_DIR, task, 'model.json')
  );
  const model = await tf.loadLayersModel(modelFilesPath);
  assignWeightsToModel(model, serializedAggregatedWeights);
  model.save(path.dirname(modelFilesPath));
  /**
   * The round has completed.
   */
  tasksStatus.get(task).isRoundPending = false;
  /**
   * Communicate the correct round to selected clients.
   */
  tasksStatus.get(task).round += 1;
  /**
   * Start next round.
   */
  _startNextRound(task, ROUND_THRESHOLD, ROUND_COUNTDOWN);
}

function _checkForIdleClients(client, delay) {
  setTimeout(() => {
    if (activeClients.has(client)) {
      console.log(`Checking ${client} for activity`);
      if (activeClients.get(client).requests === 0) {
        console.log(`Removing idle client ${client}`);
        clients.delete(client);
        activeClients.delete(client);
        selectedClients.delete(client);
        selectedClientsQueue.delete(client);
      } else {
        activeClients.get(client).requests -= 1;
      }
    }
  }, delay);
}

/**
 * Request handler called when a client sends a GET request asking for the
 * activity history of the server (i.e. the logs). The client is allowed to be
 * more specific by providing a client ID, task ID or round number. Each
 * parameter is optional. It requires no prior connection to the server and is thus
 * publicly available data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function queryLogs(request, response) {
  const task = request.query.task;
  const round = request.query.round;
  const id = request.query.id;

  console.log(`Logs query: task: ${task}, round: ${round}, id: ${id}`);

  response
    .status(200)
    .send(
      logs.filter(
        (entry) =>
          (id ? entry.client === id : true) &&
          (task ? entry.task === task : true) &&
          (round ? entry.round === round : true)
      )
    );
}

export function selectionStatus(request, response) {
  const type = REQUEST_TYPES.SELECTION_STATUS;

  const task = request.params.task;
  const id = request.params.id;

  if (!clients.has(id)) {
    return _failRequest(response, type, 401);
  }
  if (!tasksStatus.has(task)) {
    return _failRequest(response, type, 404);
  }

  _logsAppend(request, type);

  response.status(200);

  console.log(`Client with ID ${id} asked to get selected`);
  console.log('* selected clients: ', selectedClients.get(task));
  console.log('* queued clients: ', selectedClientsQueue.get(task));
  console.log(
    `=> selected? ${selectedClients.get(task).has(id) ? 'yes' : 'no'}`
  );

  if (selectedClients.get(task).has(id)) {
    /**
     * Selection status "2" means the client is selected by the server and can proceed
     * to the next round. The client that emitted the request updates their local round
     * with the one provided by the server.
     */
    response.send({ selected: 2, round: tasksStatus.get(task).round });
  } else if (tasksStatus.get(task).isRoundPending) {
    /**
     * If the round is pending, this means the client that requested
     * to be selected should now wait for weights aggregation from the server.
     * This ensures late clients start their rounds with the most recent model.
     */
    response.send({ selected: 1 });
  } else {
    selectedClientsQueue.get(task).add(id);
    response.send({ selected: 0 });
    _startNextRound(task, ROUND_THRESHOLD, ROUND_COUNTDOWN);
  }
  activeClients.get(id).requests += 1;
  _checkForIdleClients(id, IDLE_DELAY);
}

/**
 * Entry point to the server's API. Any client must go through this connection
 * process before making any subsequent POST requests to the server related to
 * the training of a task or metadata.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function connect(request, response) {
  const type = REQUEST_TYPES.CONNECT;

  const task = request.params.task;
  const id = request.params.id;

  if (!tasksStatus.has(task)) {
    return _failRequest(response, type, 404);
  }
  if (clients.has(id)) {
    return _failRequest(response, type, 401);
  }

  _logsAppend(request, type);

  clients.add(id);
  console.log(`Client with ID ${id} connected to the server`);
  response.status(200).send();

  activeClients.set(id, { requests: 0 });
  _checkForIdleClients(id, NEW_CLIENT_IDLE_DELAY);
}

/**
 * Request handler called when a client sends a GET request notifying the server
 * it is disconnecting from a given task.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 *
 * Further improvement: Automatically disconnect idle clients, i.e. clients
 * with very poor and/or sparse contribution to training in terms of performance
 * and/or weights posting frequency.
 */
export function disconnect(request, response) {
  const type = REQUEST_TYPES.DISCONNECT;

  const task = request.params.task;
  const id = request.params.id;

  if (!(tasksStatus.has(task) && clients.has(id))) {
    return _failRequest(response, type, 404);
  }

  _logsAppend(request, type);

  clients.delete(id);
  activeClients.delete(id);
  selectedClients.get(task).delete(id);
  selectedClientsQueue.get(task).delete(id);

  console.log(`Client with ID ${id} disconnected from the server`);
  response.status(200).send();
}

/**
 * Request handler called when a client sends a GET request containing their
 * individual model weights to the server while training a task. The request is
 * made for a given task and round. The request's body must contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * - the client's weights
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function postWeights(request, response) {
  const type = REQUEST_TYPES.POST_WEIGHTS;

  const code = _checkRequest(request);
  if (code !== 200) {
    return _failRequest(response, type, code);
  }

  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (
    request.body === undefined ||
    request.body.weights === undefined ||
    request.body.weights.data === undefined
  ) {
    return _failRequest(response, type, 400);
  }

  const encodedWeights = request.body.weights;

  _logsAppend(request, type);

  if (!weightsMap.has(task)) {
    weightsMap.set(task, new Map());
  }

  if (!weightsMap.get(task).has(round)) {
    weightsMap.get(task).set(round, new Map());
  }

  /**
   * Check whether the client already sent their local weights for this round.
   */
  if (!weightsMap.get(task).get(round).has(id)) {
    const weights = msgpack.decode(Uint8Array.from(encodedWeights.data));
    weightsMap.get(task).get(round).set(id, weights);
  }
  response.status(200).send();

  activeClients.get(id).requests += 1;
  _checkForIdleClients(id, IDLE_DELAY);

  /**
   * Check whether enough clients sent their local weights to proceed to
   * weights aggregation.
   */
  if (
    weightsMap.get(task).get(round).size >=
    Math.round(selectedClients.get(task).size * AGGREGATION_THRESHOLD)
  ) {
    setTimeout(() => _aggregateWeights(task, round, id), AGGREGATION_COUNTDOWN);
  }
}

/**
 * Request handler called when a client sends a POST request asking for
 * the averaged model weights stored on server while training a task. The
 * request is made for a given task and round. The request succeeds once
 * CLIENTS_THRESHOLD % of clients sent their individual weights to the server
 * for the given task and round. Every MODEL_SAVE_TIMESTEP rounds into the task,
 * the requested averaged weights are saved under a JSON file at milestones/.
 * The request's body must contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export async function aggregationStatus(request, response) {
  const type = REQUEST_TYPES.AGGREGATION_STATUS;

  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (!clients.has(id)) {
    return _failRequest(response, type, 401);
  }
  if (!tasksStatus.has(task)) {
    return _failRequest(response, type, 404);
  }

  _logsAppend(request, type);

  response.status(200);
  if (!(weightsMap.has(task) && weightsMap.get(task).has(round))) {
    /**
     * If the round has no weights entry, this must come
     * from a late client.
     */
    response.send({ aggregated: 0 });
  } else if (
    !tasksStatus.get(task).isRoundPending &&
    round < tasksStatus.get(task).round
  ) {
    /**
     * If aggregation occured, make the client wait to get selected for next round so
     * it can proceed to other jobs. Does nothing if this is a late client.
     */
    selectedClients.get(task).delete(id);
    response.send({ aggregated: 1 });
  } else if (
    weightsMap.get(task).get(round).size >=
    Math.round(selectedClients.get(task).size * AGGREGATION_THRESHOLD)
  ) {
    /**
     * To avoid any blocking state due to the disconnection of selected clients, allow
     * this request to perform aggregation. This is merely a safeguard. Ideally, this
     * should obviously be performed by the `postWeights` request handler directly, to
     * avoid any unnecesary delay.
     */
    setTimeout(() => _aggregateWeights(task, round, id), AGGREGATION_COUNTDOWN);
    response.send({ aggregated: 0 });
  }
  activeClients.get(id).requests += 1;
  _checkForIdleClients(id, IDLE_DELAY);
}

/**
 * Request handler called when a client sends a POST request containing their
 * individual Interoperability model parameters to the server while training a task.
 * The request is made for a given task. The request's body must contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * - the client's Interoperability Parameters as an array of four arrays.
 * with the following shape :
 * [
 *  [weights of Input layer],
 *  [biases of Input layer],
 *  [weights of Output layer],
 *  [biases of Output layer]
 * ]
 * @param {*} request received from client
 * @param {*} response sent to client
 */
export function postInteroperabilityParameters(request, response) {
  const type = REQUEST_TYPES.POST_INTEROPERABILITY;

  const code = _checkRequest(request);
  if (code !== 200) {
    return _failRequest(response, type, code);
  }

  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (request.body === undefined || request.body.parameters === undefined) {
    return _failRequest(response, type, 400);
  }

  _logsAppend(request, type);

  if (!interoperabilityParametersMap.has(task)) {
    interoperabilityParametersMap.set(task, new Map());
  }

  if (!interoperabilityParametersMap.get(task).has(round)) {
    interoperabilityParametersMap.get(task).set(round, new Map());
  }

  /**
   * Check whether the client already sent their local weights for this round.
   */
  if (!interoperabilityParametersMap.get(task).get(round).has(id)) {
    const parameters = request.body.parameters;
    interoperabilityParametersMap.get(task).get(round).set(id, parameters);
  }
  response
    .status(200)
    .send('Interoperability Parameters successfully received.');
  activeClients.get(id).requests += 1;
  _checkForIdleClients(id, IDLE_DELAY);
}

/**
 * Request handler called when a client sends a POST request asking for
 * the aggregated Interoperability Parameters of all clients  stored on server while training a task.
 * The request is made for a given task.
 * The aggregation of the parameters has the shape :
 * {
 *  weightsIn : [
 *    {
 *      name : clientId,
 *      data : [weights of Input layer for a given client]
 *    },
 *    [ ... ]
 *  ],
 *   biasesIn : [
 *    {
 *      name : clientId,
 *      data : [biases of Input layer for a given client]
 *    },
 *    [ ... ]
 *  ],
 *  weightsOut : [
 *    {
 *      name : clientId,
 *      data : [weights of Input layer for a given client]
 *    },
 *    [ ... ]
 *  ],
 *   biasesOut : [
 *    {
 *      name : clientId,
 *      data : [biases of Output layer for a given client]
 *    },
 *    [ ... ]
 *  ],
 * }
 * The request's body must contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * @param {*} request from the client
 * @param {*} response sent to the client
 * @returns
 */
export function getInteroperabilityParameters(request, response) {
  const type = REQUEST_TYPES.GET_INTEROPERABILITY;

  const code = _checkRequest(request);
  if (code !== 200) {
    return _failRequest(response, type, code);
  }

  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (
    !(
      interoperabilityParametersMap.has(task) &&
      interoperabilityParametersMap.get(task).has(round)
    )
  ) {
    return _failRequest(response, type, 404);
  }

  _logsAppend(request, type);

  const receivedParameters = interoperabilityParametersMap.get(task).get(round);

  let parameters = {
    weightsIn: [],
    biasesIn: [],
    weightsOut: [],
    biasesOut: [],
  };

  // Generate the heatmap data to send to the clients with respect to all recieved weights.
  receivedParameters.forEach((value, key) => {
    if (value.length == 4) {
      // Set the client names
      let name = key.localeCompare(id) == 0 ? 'You' : key;
      // Normalize clientwise values
      /*
      value = value.map((parameter) => {
        let parameterList = Object.values(parameter);
        let squaredSum = parameterList.reduce((a, b) => a + b * b, 0);
        console.log(key, squaredSum);
        return parameterList.length > 1
          ? parameterList.map((n) => (n * n) / squaredSum)
          : parameterList;
      });
      */
      // Add client data to the parameters
      parameters.weightsIn.push({ name: name, data: Object.values(value[0]) });
      parameters.biasesIn.push({ name: name, data: Object.values(value[1]) });
      parameters.weightsOut.push({ name: name, data: Object.values(value[2]) });
      parameters.biasesOut.push({ name: name, data: Object.values(value[3]) });
    }
  });
  console.log('params', parameters);
  response.status(200).send({ parameters: parameters });

  activeClients.get(id).requests += 1;
  _checkForIdleClients(id, IDLE_DELAY);
}

/**
 * Request handler called when a client sends a POST request asking for
 * the averaged model weights stored on server while training a task. The
 * request is made for a given task and round. The request succeeds once
 * CLIENTS_THRESHOLD % of clients sent their individual weights to the server
 * for the given task and round. Every MODEL_SAVE_TIMESTEP rounds into the task,
 * the requested averaged weights are saved under a JSON file at milestones/.
 * The request's body must contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export async function interopreabilityStatus(request, response) {
  const type = REQUEST_TYPES.INTEROPERABILITY_STATUS;

  const code = _checkRequest(request);
  if (code !== 200) {
    return _failRequest(response, type, code);
  }

  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  /**
   * The task was not trained at all.
   */
  if (
    !tasksStatus.get(task).isRoundPending &&
    tasksStatus.get(task).round === 0
  ) {
    return _failRequest(response, type, 403);
  }
  /**
   * No weight was posted for this task's round.
   */
  if (
    !(
      interoperabilityParametersMap.has(task) &&
      interoperabilityParametersMap.get(task).has(round)
    )
  ) {
    return _failRequest(response, type, 404);
  }

  _logsAppend(request, type);
  /**
   * Check whether the requested round has completed.
   */
  const aggregated =
    interoperabilityParametersMap.get(task).get(round).size ==
    selectedClients.get(task).size;

  response.status(200).send({ aggregated: aggregated });
  activeClients.get(id).requests += 1;
  _checkForIdleClients(id, IDLE_DELAY);
}

/**
 * Request handler called when a client sends a POST request containing their
 * number of data samples to the server while training a task's model. The
 * request is made for a given task and round. The request's body must contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * - the client's number of data samples
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function postMetadata(request, response) {
  const type = REQUEST_TYPES.POST_METADATA;

  const code = _checkRequest(request);
  if (code !== 200) {
    return _failRequest(response, type, code);
  }

  _logsAppend(request, type);

  const metadata = request.params.metadata;
  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (request.body === undefined || request.body[metadata] === undefined) {
    return _failRequest(response, type, 400);
  }

  if (!metadataMap.has(task)) {
    metadataMap.set(task, new Map());
  }
  if (!metadataMap.get(task).has(round)) {
    metadataMap.get(task).set(round, new Map());
  }
  if (!metadataMap.get(task).get(round).has(id)) {
    metadataMap.get(task).get(round).set(id, new Map());
  }
  if (!metadataMap.get(task).get(round).get(id).has(metadata)) {
    metadataMap
      .get(task)
      .get(round)
      .get(id)
      .set(metadata, request.body[metadata]);
  }
  response.status(200).send();

  activeClients.get(id).requests += 1;
  _checkForIdleClients(id, IDLE_DELAY);
}

/**
 * Request handler called when a client sends a POST request asking the server
 * for the number of data samples held per client for a given task and round.
 * If there is no entry for the given round, sends the most recent entry for
 * each client involved in the task. The request's body must contain:
 * - the client's ID
 * - a timestamp corresponding to the time at which the request was made
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function getMetadataMap(request, response) {
  const type = REQUEST_TYPES.GET_METADATA;

  const code = _checkRequest(request);
  if (code !== 200) {
    return _failRequest(response, type, code);
  }

  const metadata = request.params.metadata;
  const task = request.params.task;
  const round = request.params.round;
  const id = request.params.id;

  if (!(metadataMap.has(task) && round >= 0)) {
    return _failRequest(response, type, 404);
  }

  _logsAppend(request, type);

  /**
   * Find the most recent entry round-wise for the given task (upper bounded
   * by the given round). Allows for sporadic entries in the metadata map.
   */
  const allRounds = Array.from(metadataMap.get(task).keys());
  const latestRound = allRounds.reduce((prev, curr) =>
    prev <= curr && curr <= round ? curr : prev
  );
  /**
   * Fetch the required metadata from the general metadata structure stored
   * server-side and construct the queried metadata's map accordingly. This
   * essentially creates a "ID -> metadata" single-layer map.
   */
  const queriedMetadataMap = new Map();
  for (const [id, entries] of metadataMap.get(task).get(latestRound)) {
    if (entries.has(metadata)) {
      queriedMetadataMap.set(id, entries.get(metadata));
    }
  }

  const metadataMap = msgpack.encode(Array.from(queriedMetadataMap));
  response.status(200).send({ metadata: metadataMap });

  activeClients.get(id).requests += 1;
  _checkForIdleClients(id, IDLE_DELAY);
}

/**
 * Request handler called when a client sends a GET request asking for all the
 * tasks metadata stored in the server's tasks.json file. This is used for
 * generating the client's list of tasks. It requires no prior connection to the
 * server and is thus publicly available data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function getTasksMetadata(request, response) {
  const type = REQUEST_TYPES.GET_TASKS;
  if (fs.existsSync(config.TASKS_FILE)) {
    _logsAppend(request, type);
    console.log(`Serving ${config.TASKS_FILE}`);
    response.status(200).sendFile(config.TASKS_FILE);
  } else {
    _failRequest(response, type, 404);
  }
}

/**
 * Request handler called when a client sends a GET request asking for the
 * TFJS model files of a given task. The files consist of the model's
 * architecture file model.json and its layer weights file weights.bin.
 * It requires no prior connection to the server and is thus publicly available
 * data.
 * @param {Request} request received from client
 * @param {Response} response sent to client
 */
export function getLatestModel(request, response) {
  const type = REQUEST_TYPES.GET_WEIGHTS;

  const task = request.params.task;
  const file = request.params.file;

  if (!tasksStatus.has(task)) {
    return _failRequest(response, type, 404);
  }
  const validModelFiles = new Set(['model.json', 'weights.bin']);
  const modelFile = path.join(config.MODELS_DIR, task, file);
  console.log(`File path: ${modelFile}`);
  if (validModelFiles.has(file) && fs.existsSync(modelFile)) {
    console.log(`${file} download for task ${task} succeeded`);
    response.status(200).sendFile(modelFile);
  } else {
    _failRequest(response, type, 404);
  }
}