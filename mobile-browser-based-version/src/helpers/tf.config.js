import * as tf_browser from '@tensorflow/tfjs';
import * as tf_node from '@tensorflow/tfjs-node';

const tf = global.process.env.CLI ? tf_node : tf_browser;
export default tf;
