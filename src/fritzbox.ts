import * as EventEmitter from 'events';
import { Server } from 'http';
import * as xml from 'fast-xml-parser';
import { getLogger } from './logger';

const logger = getLogger(__dirname, __filename);

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

const ipv6RequestStatic =
  '<s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:X_AVM_DE_GetIPv6Prefix><xmlns:u>urn:schemas-upnp-org:service:WANIPConnection:1</xmlns:u></u:X_AVM_DE_GetIPv6Prefix></s:Body></s:Envelope>';

type IPV6SoapBody = {
  'u:X_AVM_DE_GetIPv6PrefixResponse': {
    NewIPv6Prefix: string;
    NewPrefixLength: string;
    NewValidLifetime: string;
    NewPreferedLifetime: string;
  };
};
type SoapResponse<T> = {
  's:Envelope': {
    's:Body': T;
  };
};
type IPV6SoapResponse = SoapResponse<IPV6SoapBody>;

const endpointUrl = '/igdupnp/control/WANIPConn1';
const parser = new xml.XMLParser();

export async function subscribe(
  fritzboxEndpoint: string,
  ownEndpoint: string,
): Promise<string> {
  // TODO implement
  return '';
}

export async function unsubscribe(fritzboxEndpoint: string, uuid: string) {
  // TODO implement
}

async function getIpV6Prefix(fritzboxBaseUrl: string) {
  const request: RequestInit = {
    method: 'GET',
    body: ipv6RequestStatic,
    headers: {
      SoapAction: `urn:schemas-upnp-org:service:WANIPConnection:1#$X_AVM_DE_GetIPv6Prefix`,
      'Content-Type': 'text/xml; charset="utf-8"',
      'Content-Length': `${ipv6RequestStatic.length}`,
    },
  };
  const res = await fetch(`${fritzboxBaseUrl}${endpointUrl}`, request);
  const body = await res.text();
  logger.debug(`response body:\n${body}`);
  const parsed = parser.parse(body) as IPV6SoapResponse;
  return parsed['s:Envelope']['s:Body']['u:X_AVM_DE_GetIPv6PrefixResponse'];
}

export declare interface IPV6PrefixSubscription {
  on(
    event: 'prefix-changed',
    listener: (prefix: { prefix: string; length: number }) => void,
  ): this;
  on(event: string, listener: Function): this;
}

export class IPV6PrefixSubscription extends EventEmitter {
  #fritzboxBaseUrl: string;
  #ingressIp: string;
  #service?: Server;
  constructor(fritzboxBasrUrl: string) {
    super();
    this.#fritzboxBaseUrl = fritzboxBasrUrl;
    this.#ingressIp = '';
  }
  async changeSubscription(newIngressIp: string) {
    // TODO implement
  }
  async createService(ingressIp: string) {
    // TODO implement
    const prefixResponse = await getIpV6Prefix(this.#fritzboxBaseUrl);
    logger.info(`ipv6 prefix is ${prefixResponse.NewIPv6Prefix}`);
  }
  async stopService() {
    // TODO implement
  }
}
