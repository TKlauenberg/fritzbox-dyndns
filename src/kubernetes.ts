import * as k8s from '@kubernetes/client-node';
import { EventEmitter } from 'events';
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
  #watch: k8s.Watch;
  #ingressName: string;
  #namespace: string;
  #watchRequest?: k8s.RequestResult;
  constructor(
    k8sApi: k8s.NetworkingV1Api,
    watch: k8s.Watch,
    name: string,
    namespace: string,
  ) {
    super();
    this.#k8sApi = k8sApi;
    this.#watch = watch;
    this.#ingressName = name;
    this.#namespace = namespace;
  }
  async init() {
    const req = await this.#watch.watch(
      `apis/networking.k8s.io/v1/ingresses`,
      {},
      (type, obj) => {
        logger.info('ingress changed');
        const ingress = obj as k8s.V1Ingress;
        logger.debug(
          `ingress changed with name: ${ingress.metadata?.namespace}:${ingress.metadata?.name}`,
        );
        this.emit('ingress-changed', ingress);
      },
      (err) => {
        logger.error(`error in watch: ${JSON.stringify(err)}`);
      },
    );
    logger.info('initialized watch');
    this.#watchRequest = req;
  }
  async dispose() {
    if (this.#watchRequest != undefined) {
      this.#watchRequest.abort();
    }
  }
  async changeIpAddressRange(addressRange: string) {
    logger.error('method "changeIpAddressRange" not implemented');
    // TODO implement
  }
  // async getIngressIpAddress(
  //   name: string,
  //   namespace: string,
  //   timeout: number,
  // ): Promise<{ ip: string; port: number } | undefined> {
  //   try {
  //     const ingress = await this.#k8sApi.readNamespacedIngress(name, namespace);
  //     if (ingress.response.statusCode != 200) {
  //       logger.warn(`no ip address found for ingress ${namespace}/${name}`);
  //       if (logger.isDebugEnabled()) {
  //         logger.debug(`response: ${JSON.stringify(ingress)}`);
  //       }
  //       return undefined;
  //     }
  //     let loadBalancerIngress = ingress.body.status?.loadBalancer?.ingress;
  //     if (loadBalancerIngress == undefined) {
  //       const { promise, cancel } = createCancelablePromise<void>(
  //         timeout * 1000,
  //       );
  //       const timeoutPromise = new Promise<string | null>((resolve) => {
  //         setTimeout(() => {
  //           this.#watch.abort();
  //           resolve(null);
  //         }, timeoutSeconds * 1000);
  //       });
  //       const req = await this.#watch.watch(
  //         'apis/networking.k8s.io/v1/namespaces/${namespace}/ingresses',
  //       );
  //       return undefined;
  //     }
  //     const ip = loadBalancerIngress[0].ip;
  //     const port = loadBalancerIngress[0].ports![0].port;
  //     logger.info(`ip address is of ingress ${namespace}/${name} is ${ip}`);
  //     if (ip == undefined || port == undefined) {
  //       throw new Error(`ip or port is undefined! ip: ${ip}, port: ${port}`);
  //     }
  //     return { ip, port };
  //   } catch (error) {
  //     if (error instanceof k8s.HttpError) {
  //       logger.error(JSON.stringify(error.body));
  //     }
  //     logger.error('error occured at reading ingress');
  //     return undefined;
  //   }
  // }
}
