import * as EventEmitter from "events";
import { Server } from "http";

type PossibleConnectionTypes = { PossibleConnectionTypes: string };
type ConnectionStatus = { ConnectionStatus: string };
type ExternalIPAddress = { ExternalIPAddress: string };
type ExternalIPv6Address = { ExternalIPv6Address: string };
type PortMappingNumberOfEntries = { PortMappingNumberOfEntries: string };

type PropertySetObj = { 'e:propertyset': PropertySet };

type PropertySet = {
  'e:property': Property | Property[];
};

type Property =
  | PossibleConnectionTypes
  | ConnectionStatus
  | ExternalIPAddress
  | ExternalIPv6Address
  | PortMappingNumberOfEntries;

type IPV6SoapRequest = {
  's:Envelope': {
    '@s:encodingStyle': 'http://schemas.xmlsoap.org/soap/encoding/';
    '@xmlns:s': 'http://schemas.xmlsoap.org/soap/envelope/';
    's:Body': {
      'u:X_AVM_DE_GetIPv6Prefix': {
        'xmlns:u': 'urn:schemas-upnp-org:service:WANIPConnection:1';
      };
    };
  };
};

type IPV6SoapResponse = {
  's:Envelope': {
    's:Body': {
      'u:X_AVM_DE_GetIPv6PrefixResponse': {
        'NewIPv6Prefix': string;
        'NewPrefixLength': string;
        'NewValidLifetime': string;
        'NewPreferedLifetime': string;
      };
    };
  };
};

export async function subscribe(fritzboxEndpoint: string, ownEndpoint: string): Promise<string> {
  // TODO implement
  return "";
}

export async function unsubscribe(fritzboxEndpoint: string, uuid: string) {
  // TODO implement
}

export declare interface IPV6PraefixSubscription{
  on(event: 'praefix-changed', listener: (praefix: {praefix: string, length: number}) => void): this;
  on(event: string, listener: Function): this;
}

export class IPV6PraefixSubscription extends EventEmitter{
  #fritzboxBaseUrl: string;
  #ingressIp: string;
  #service?: Server;
  constructor(fritzboxBasrUrl: string) {
    super();
    this.#fritzboxBaseUrl = fritzboxBasrUrl;
    this.#ingressIp = '';
    this.#createService();
  }
  async changeSubscription(newIngressIp: string) {
    // TODO implement
  }
  async #createService() {
    // TODO implement
  }
  async stopService() {
    // TODO implement
  }
}
