import * as k8s from '@kubernetes/client-node';
import { EventEmitter } from 'events';
import request from 'request';
import rqDebug from 'request-debug';
import { getLogger } from './logger.js';

rqDebug(request, (type, data, r) => {
  console.log(`debug-type: ${JSON.stringify(type)}`);
  console.log(`debug-href: ${JSON.stringify((r as any).uri.href)}`);
});

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
  #kc: k8s.KubeConfig;
  #k8sApi: k8s.NetworkingV1Api;
  #informer?: k8s.Informer<k8s.V1Ingress>;
  constructor(kc: k8s.KubeConfig) {
    super();
    this.#kc = kc;
    this.#k8sApi = kc.makeApiClient(k8s.NetworkingV1Api);
  }
  async init() {
    const listFn = () => this.#k8sApi.listIngressForAllNamespaces();
    this.#informer = k8s.makeInformer(
      this.#kc,
      `/apis/networking.k8s.io/v1/ingresses`,
      listFn,
    );
    this.#informer.on('add', (ingress: k8s.V1Ingress) => {
      logger.debug(`add: ${JSON.stringify(ingress)}`);
      this.emit('ingress-changed', ingress);
    });
    this.#informer.on('change', (ingress: k8s.V1Ingress) => {
      logger.debug(`change: ${JSON.stringify(ingress)}`);
      this.emit('ingress-changed', ingress);
    });
    this.#informer.on('update', (ingress: k8s.V1Ingress) => {
      logger.debug(`update: ${JSON.stringify(ingress)}`);
      this.emit('ingress-changed', ingress);
    });
    this.#informer.on('delete', (ingress: k8s.V1Ingress) => {
      logger.debug(`delete: ${JSON.stringify(ingress)}`)
      this.emit('ingress-changed', ingress);
    });
    this.#informer.on('error', (err: k8s.V1Pod) => {
      console.error(err);
      // Restart informer after 5sec
      setTimeout(() => {
        this.#informer!.start();
      }, 5000);
    });
    await this.#informer.start();
  }
  async dispose() {
    this.#informer?.stop();
  }
  async changeIpAddressRange(addressRange: string) {
    logger.error('method "changeIpAddressRange" not implemented');
    // TODO implement
  }
}
