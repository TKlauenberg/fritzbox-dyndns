import * as k8s from '@kubernetes/client-node';
import config from 'config';
import { updateHostname as updateHostnameDyndns } from './dyndns.js';
import { IPV6PrefixSubscription } from './fritzbox.js';
import { KubeHandler } from './kubernetes.js';
import { getLogger } from './logger.js';

const logger = getLogger(import.meta.url);

const state = {
  ipV6Cidr: '',
  ownIngressName: config.get('kubernetes.ingress.name') as string,
  ownIngressNamespace: config.get('kubernetes.ingress.namespace') as string,
  ownIngressIpAddress: '',
};

const kc = new k8s.KubeConfig();
kc.loadFromCluster();

const k8sApi = kc.makeApiClient(k8s.NetworkingV1Api);

const prefixSubscription = new IPV6PrefixSubscription(
  config.get('fritzbox.endpoint'),
);

const watch = new k8s.Watch(kc);
const kubeHandler = new KubeHandler(
  k8sApi,
  watch,
  state.ownIngressName,
  state.ownIngressNamespace,
);

const updateHostname = (host: string, ip: string) =>
  updateHostnameDyndns(
    config.get('dyndns.user'),
    config.get('dyndns.password'),
    config.get('dyndns.endpoint'),
    host,
    ip,
  );


/**
 * create kubernetes and fritzbox objects
 * create event listeners
 */
function createNewIpAddressRange(prefix: string, length: number): string {
  logger.error('method "createNewIpAddressRange" not implemented');
  // TODO implement
  return '';
}
// prefixSubscription event handlers
prefixSubscription.on('prefix-changed', (prefix) => {
  const ipAddressRange = createNewIpAddressRange(prefix.prefix, prefix.length);
  logger.info(`new addressrange is: ${ipAddressRange}`);
  kubeHandler.changeIpAddressRange(ipAddressRange);
});

// kubeHandler helper functions
function getIp(
  ingress: k8s.V1Ingress,
): { ip: string; port: number } | undefined {
  // TODO implement
  logger.error('method "getIp" not implemented');
  return undefined;
}
function getHostname(ingress: k8s.V1Ingress): string | undefined {
  // TODO implement
  logger.error('method "getHostname" not implemented');
  return undefined;
}
function isDomainManaged(ingress: k8s.V1Ingress): boolean {
  // TODO implement
  logger.error('method "isDomainManaged" not implemented');
  return true;
}

function isIngressSubscriptionIngress(ingress: k8s.V1Ingress): boolean {
  return (
    ingress.metadata?.name == state.ownIngressName &&
    ingress.metadata?.namespace == state.ownIngressNamespace
  );
}
function hasIngressIpchanges(ingress: k8s.V1Ingress): boolean {
  logger.error('method "hasIngressIpchanges" not implemented');
  // TODO implement
  return true;
}
function isIngressUsedForDynDNS(ingress: k8s.V1Ingress): boolean {
  logger.error('method "isIngressUsedForDynDNS" not implemented');
  // TODO iplement
  return true;
}
// kubeHandler event listeners
kubeHandler.on('ingress-changed', async (ingress) => {
  logger.debug(
    `ingress-changed for ingress ${ingress.metadata?.namespace}/${ingress.metadata?.name}`,
  );
  if (isIngressSubscriptionIngress(ingress) && hasIngressIpchanges(ingress)) {
    const ip = getIp(ingress);
    if (ip === undefined) {
      logger.warn(
        `could not get ip from ingress ${ingress.metadata?.namespace}/${ingress.metadata?.name}`,
      );
      return;
    }
    await prefixSubscription.changeSubscription(ip.ip, ip.port);
  } else if (isIngressUsedForDynDNS(ingress)) {
    const ip = getIp(ingress);
    const hostname = getHostname(ingress);
    if (ip === undefined) {
      logger.error(
        `could not get ip of ingress ${ingress.metadata?.namespace}/${ingress.metadata?.name}`,
      );
    } else if (hostname === undefined) {
      logger.error(
        `could not get hostname of ingress ${ingress.metadata?.namespace}/${ingress.metadata?.name}`,
      );
    } else {
      await updateHostname(hostname, ip.ip);
    }
  }
});

async function initialize() {
  // log information about logging configuration
  logger.info(`loglevel: ${config.get('loglevel')}`);
  /**
   * 1. wait for ingress to be ready
   * 2. start service
   */
  await prefixSubscription.createService();
  await kubeHandler.init();
}
initialize();
