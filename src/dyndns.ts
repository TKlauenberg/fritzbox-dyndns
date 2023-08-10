import { getLogger } from './logger.js';

const logger = getLogger(import.meta.url);

export async function updateHostname(
  user: string,
  password: string,
  endpoint: string,
  hostname: string,
  ip: string,
) {
  logger.crit('method "updateHostname" not implemented');
  // TODO implement
}
