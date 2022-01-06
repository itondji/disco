import * as config from './indexedb.config.js';
import { Memory } from '../memory.js';

export const memory = new Memory(config);
