import * as k8s from '@kubernetes/client-node';
import { IPV6PraefixSubscription } from './fritzbox';
import * as config from 'config';
import { KubeHandler } from './kubernetes';
import { getLogger } from './logger';
import { updateHostname as updateHostnameDyndns } from './dyndns';

const logger = getLogger(__dirname, __filename);

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.NetworkingV1Api);

const praefixSubscription = new IPV6PraefixSubscription(
  config.get('fritzbox.endpoint'),
);
const kubeHandler = new KubeHandler(k8sApi);

const updateHostname = (host: string, ip: string) =>
  updateHostnameDyndns(
    config.get('dyndns.user'),
    config.get('dyndns.password'),
    config.get('dyndns.endpoint'),
    host,
    ip,
  );

const state = {
  ipV6Cidr: '',
  ingressIp: '',
};
/**
 * create kubernetes and fritzbox objects
 * create event listeners
 */
function createNewIpAddressRange(praefix: string, length: number): string {
  // TODO implement
  return '';
}
// praefixSubscription event handlers
praefixSubscription.on('praefix-changed', (praefix) => {
  const ipAddressRange = createNewIpAddressRange(
    praefix.praefix,
    praefix.length,
  );
  logger.info(`new addressrange is: ${ipAddressRange}`);
  kubeHandler.changeIpAddressRange(ipAddressRange);
});

// kubeHandler helper functions
function getIp(ingress: k8s.V1Ingress): string | undefined {
  // TODO implement
  return '';
}
function getHostname(ingress: k8s.V1Ingress): string | undefined {
  // TODO implement
  return '';
}
function isDomainManaged(ingress: k8s.V1Ingress): boolean {
  // TODO implement
  return true;
}

function isIngressSubscriptionIngress(ingress: k8s.V1Ingress): boolean {
  // TODO implement
  return true;
}
function hasIngressIpchanges(ingress: k8s.V1Ingress): boolean {
  // TODO implement
  return true;
}
function isIngressUsedForDynDNS(ingress: k8s.V1Ingress): boolean {
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
    await praefixSubscription.changeSubscription(ip);
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
      updateHostname(hostname, ip);
    }
  }
});

async function initialize() {
  /**
   * 1. wait for ingress to be ready
   * 2. start service
   */
}
