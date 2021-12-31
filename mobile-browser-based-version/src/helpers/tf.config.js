import * as tf_browser from '@tensorflow/tfjs';
import * as tf_node from '@tensorflow/tfjs-node';
// conditional import tf for nodejs if possible (speed-up benifits)
const tf = global.process.env.CLI ? tf_node : tf_browser;
export default tf;