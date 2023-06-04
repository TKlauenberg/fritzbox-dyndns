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
    // TODO implement
  }
  async getIngressIpAddress(
    name: string,
    namespace: string,
  ): Promise<string | undefined> {
    const ingress = await this.#k8sApi.readNamespacedIngress(name, namespace);
    const loadBalancerIngress = ingress.body.status?.loadBalancer?.ingress;
    if (loadBalancerIngress == undefined || loadBalancerIngress.length === 0) {
      logger.warn(`no ip address found for ingress ${namespace}/${name}`);
      return undefined;
    }
    const ip = loadBalancerIngress[0].ip;
    logger.info(`ip address is of ingress ${namespace}/${name} is ${ip}`);
    return ip;
  }
}
