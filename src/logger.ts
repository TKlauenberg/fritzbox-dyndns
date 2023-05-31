import { createLogger, format, transports } from 'winston';
import * as config from 'config';

const logger = createLogger({
  level: config.get('loglevel'),
  format: format.json(),
  transports: [new transports.Console()],
});

export function getLogger(dirname: string, filename: string) {
  return logger.child({ dirname, filename });
}
