/**
 * Same properties as Toaster but on the console
 *
 * @class Logger
 */
class Logger {
  success(message) {
    console.log(message, 'color: #28A744');
  }

  error(message) {
    console.log(message, 'color: #e52c10');
  }
}

export const logger = new Logger();
