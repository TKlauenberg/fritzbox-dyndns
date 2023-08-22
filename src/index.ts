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
if (logger.isDebugEnabled()) {
  logger.debug(`users: ${JSON.stringify(kc.getUsers())}`);
  logger.debug(JSON.stringify(kc.clusters));
  logger.debug(JSON.stringify(kc.users));
}

const prefixSubscription = new IPV6PrefixSubscription(
  config.get('fritzbox.endpoint'),
);

const kubeHandler = new KubeHandler(kc);

const updateHostname = (hosts: string[], ip: string) =>
  hosts.forEach((host) =>
    updateHostnameDyndns(
      config.get('dyndns.user'),
      config.get('dyndns.password'),
      config.get('dyndns.endpoint'),
      host,
      ip,
    ),
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
function getIp(ingress: k8s.V1Ingress): string | undefined {
  return ingress.status?.loadBalancer?.ingress?.[0]?.ip;
}

function getServicePort(
  ingress: k8s.V1Ingress,
  serviceName: string,
): number | undefined {
  const rules = ingress.spec?.rules;
  if (rules === undefined) {
    return undefined;
  }
  const services = rules
    .flatMap((rule) => rule.http?.paths?.map((path) => path.backend.service))
    .filter((service) => service !== undefined);
  const service = services.find((service) => service?.name === serviceName);
  return service?.port?.number;
}

function getHostname(
  ingress: k8s.V1Ingress,
): (string | undefined)[] | undefined {
  return ingress.spec?.rules
    ?.map((rule) => rule.host)
    .filter((host) => host !== undefined);
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
    const port = getServicePort(
      ingress,
      config.get('kubernetes.ingress.name') as string,
    );
    if (port === undefined) {
      logger.warn(
        `could not get port from ingress ${ingress.metadata?.namespace}/${ingress.metadata?.name}`,
      );
      return;
    }
    await prefixSubscription.changeSubscription(ip, port);
  } else if (isIngressUsedForDynDNS(ingress)) {
    const ip = getIp(ingress);
    const hostnames = getHostname(ingress);
    if (ip === undefined) {
      logger.error(
        `could not get ip of ingress ${ingress.metadata?.namespace}/${ingress.metadata?.name}`,
      );
    } else if (hostnames === undefined) {
      logger.error(
        `could not get hostname of ingress ${ingress.metadata?.namespace}/${ingress.metadata?.name}`,
      );
    } else {
      const filtered = hostnames.filter(
        (hostname) => hostname !== undefined,
      ) as string[];
      await updateHostname(filtered, ip);
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
