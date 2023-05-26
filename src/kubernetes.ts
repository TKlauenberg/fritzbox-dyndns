import EventEmitter from "events";
import * as k8s from '@kubernetes/client-node';

export declare interface KubeHandler{
  on(event: 'ingress-changed', listener: (ingress: k8s.V1Ingress) => void): this;
  on(event: string, listener: Function): this;
}

export class KubeHandler extends EventEmitter{
  constructor(k8sApi: any) {
    super()
  }
  async changeIpAddressRange(addressRange: string) {

  }
}