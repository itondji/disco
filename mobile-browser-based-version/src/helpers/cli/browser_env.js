import browserEnv from 'browser-env';
import FileAPI from 'file-api';
const env = browserEnv(['window', 'navigator']);

global.process.env.VUE_APP_DEAI_SERVER = 'http://localhost:8080/deai/';
global.File = FileAPI.File;
global.FileReader = FileAPI.FileReader;

export default env;
