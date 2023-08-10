import { EventEmitter } from 'events';
import * as k8s from '@kubernetes/client-node';
import { getLogger } from './logger.js';

const logger = getLogger(import.meta.url);

export declare interface KubeHandler {
  // TODO implement
  on(
    event: 'ingress-changed',
    listener: (ingress: k8s.V1Ingress) => void,
  ): this;
  on(event: string, listener: Function): this;
}

export class KubeHandler extends EventEmitter {
  #k8sApi: k8s.NetworkingV1Api;
  constructor(k8sApi: k8s.NetworkingV1Api) {
    super();
    this.#k8sApi = k8sApi;
  }
  async changeIpAddressRange(addressRange: string) {
    logger.crit('method "changeIpAddressRange" not implemented');
    // TODO implement
  }
  async getIngressIpAddress(
    name: string,
    namespace: string,
  ): Promise<{ ip: string; port: number } | undefined> {
    try {
      const ingress = await this.#k8sApi.readNamespacedIngress(name, namespace);const loadBalancerIngress = ingress.body.status?.loadBalancer?.ingress;
    if (loadBalancerIngress == undefined || loadBalancerIngress.length === 0) {
      logger.warn(`no ip address found for ingress ${namespace}/${name}`);
      return undefined;
    }
    const ip = loadBalancerIngress[0].ip;
    const port = loadBalancerIngress[0].ports![0].port;
    logger.info(`ip address is of ingress ${namespace}/${name} is ${ip}`);
    if (ip == undefined || port == undefined) {
      throw new Error(`ip or port is undefined! ip: ${ip}, port: ${port}`);
    }
    return { ip, port };
    } catch (error) {
      if (error instanceof k8s.HttpError) {
        logger.error(JSON.stringify(error.body));
      }
      logger.error('error occured at reading ingress');
      return undefined;
    }

  }
}
