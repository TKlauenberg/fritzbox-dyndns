import * as k8s from '@kubernetes/client-node';
import { EventEmitter } from 'events';
import request from 'request';
import rqDebug from 'request-debug';
import { getLogger } from './logger.js';

const logger = getLogger(import.meta.url);

if (logger.isSillyEnabled()) {
  rqDebug(request, (type, data, r) => {
    console.log(`debug-type: ${JSON.stringify(type)}`);
    console.log(`debug-href: ${JSON.stringify((r as any).uri.href)}`);
  });
}

export declare interface KubeHandler {
  // TODO implement
  on(
    event: 'ingress-changed',
    listener: (ingress: k8s.V1Ingress) => void,
  ): this;
  on(event: string, listener: Function): this;
}

interface IPAddressPool {
  apiVersion: string;
  kind: string;
  metadata: {
    annotations: Record<string, string>;
    creationTimestamp: string;
    generation: number;
    name: string;
    namespace: string;
    resourceVersion: string;
    uid: string;
  };
  spec: {
    addresses: string[];
    autoAssign: boolean;
    avoidBuggyIPs: boolean;
  };
}

export class KubeHandler extends EventEmitter {
  #kc: k8s.KubeConfig;
  #k8sApi: k8s.NetworkingV1Api;
  #k8sCustomApi: k8s.CustomObjectsApi;
  #informer?: k8s.Informer<k8s.V1Ingress>;
  constructor(kc: k8s.KubeConfig) {
    super();
    this.#kc = kc;
    this.#k8sApi = kc.makeApiClient(k8s.NetworkingV1Api);
    this.#k8sCustomApi = kc.makeApiClient(k8s.CustomObjectsApi);
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
      logger.debug(`delete: ${JSON.stringify(ingress)}`);
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
  async changeIpAddressRange(name: string, namespace: string, addressRange: string) {
    // get metalLB ip address pool
    const pool = await this.#k8sCustomApi.getNamespacedCustomObject(
      'metallb.io',
      'v1alpha1',
      namespace,
      'addresspools',
      name,
    );
    // change address range
    (pool.body as IPAddressPool).spec.addresses = [addressRange];
    // update pool
    await this.#k8sCustomApi.replaceNamespacedCustomObject(
      'metallb.io',
      'v1alpha1',
      namespace,
      'addresspools',
      name,
      pool.body,
    );
  }
  async restartDaemonSet(daemonSetName: string, namespace: string) {
    // get api client for daemonset
    const daemonSetApi = this.#kc.makeApiClient(k8s.AppsV1Api);
    // get daemonset
    const daemonset = await daemonSetApi.readNamespacedDaemonSet(
      daemonSetName,
      namespace,
    );
    // change restartedAt to trigger restart
    daemonset.body.spec!.template.metadata!.annotations = {
      ...daemonset.body.spec!.template.metadata!.annotations,
      restartedAt: new Date().toISOString(),
    };
    // update daemonset
    await daemonSetApi.patchNamespacedDaemonSet(
      daemonSetName,
      namespace,
      daemonset.body,
    );

  }
}
