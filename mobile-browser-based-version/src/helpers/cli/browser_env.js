import browserEnv from 'browser-env';
import FileAPI from 'file-api';

console.log('aniestaiesrt');
const env = browserEnv(['window', 'navigator']);

// cli environment
global.process.env.CLI = true;
global.process.env.VUE_APP_DEAI_SERVER = 'http://localhost:8080/deai/';
// make File and FileReader classes available for the nodejs app
global.File = FileAPI.File;
global.FileReader = FileAPI.FileReader;

export default env;
