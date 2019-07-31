import { createLogger, transports } from 'winston';

export const DEFAULT_LOGGER = Symbol.for('DEFAULT_LOGGER');
const defaultLogger = createLogger({
  transports: [
    new transports.File({
      filename: 'log'
    })
  ]
});

export default defaultLogger;