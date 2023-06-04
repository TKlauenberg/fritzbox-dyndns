import { createLogger, format, transports } from 'winston';
import config from 'config';

const logger = createLogger({
  level: config.get('loglevel'),
  format: format.json(),
  transports: [new transports.Console()],
});

export function getLogger(url: string) {
  return logger.child({ url });
}