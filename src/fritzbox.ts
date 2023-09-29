import config from 'config';
import DigestClient from 'digest-fetch';
import { EventEmitter } from 'events';
import * as xml from 'fast-xml-parser';
import { Server } from 'http';
import Koa from 'koa';
import Router from 'koa-router';
import { getLogger } from './logger.js';

const logger = getLogger(import.meta.url);

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

function propertyIsExternalIPv6Address(
  property: Property | Property[],
): property is ExternalIPv6Address {
  return (property as any).ExternalIPv6Address !== undefined;
}

const ipv6RequestStatic =
  '<?xml version="1.0"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><u:X_AVM_DE_GetIPv6Prefix xmlns:u="urn:schemas-upnp-org:service:WANIPConnection:1"></u:X_AVM_DE_GetIPv6Prefix></s:Body></s:Envelope>';

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
const parser = new xml.XMLParser({
  attributeNamePrefix: '@',
  ignoreAttributes: false,
});

async function subscribe(
  fritzboxEndpoint: string,
  ownEndpoint: string,
  client: DigestClient,
): Promise<string> {
  logger.debug(`subscribe(${fritzboxEndpoint}, ${ownEndpoint})`);
  const url = `${fritzboxEndpoint}${endpointUrl}`;
  logger.debug(`subscribe url: ${url}`);
  const headers = {
    CALLBACK: `<${ownEndpoint}>`,
    NT: 'upnp:event',
    TIMEOUT: (60 * 60 * 24 * 7).toString(),
  };
  logger.debug(`subscribe request: ${JSON.stringify(headers)}`);
  const result = await client.fetch(url, { headers, method: 'SUBSCRIBE' });
  if (!result.ok) {
    throw new Error(`error response: ${result.status}, ${await result.text()}`);
  }
  logger.debug(`subscribe response: ${result.status}`);
  logger.debug(`sid: ${result.headers.get('sid')}`);
  return result.headers.get('sid')!;
}

async function unsubscribe(fritzboxEndpoint: string, uuid: string) {
  logger.error('method "unsubscribe" not implemented');
  // TODO implement
}

async function getIpV6Prefix(fritzboxBaseUrl: string) {
  const request: RequestInit = {
    method: 'POST',
    body: ipv6RequestStatic,
    headers: {
      SoapAction: `urn:schemas-upnp-org:service:WANIPConnection:1#X_AVM_DE_GetIPv6Prefix`,
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
  emit(
    event: 'prefix-changed',
    prefix: { prefix: string; length: number },
  ): boolean;
}

export class IPV6PrefixSubscription extends EventEmitter {
  #fritzboxBaseUrl: string;
  #subscriptionUuid: string;
  #service?: Server;
  #currentIpv6Network: string;
  #currentPrefixLength: number;
  #client: DigestClient;
  constructor(fritzboxBasrUrl: string) {
    super();
    this.#fritzboxBaseUrl = fritzboxBasrUrl;
    this.#subscriptionUuid = '';
    this.#currentIpv6Network = '';
    this.#currentPrefixLength = 0;
    const username = config.get('fritzbox.username') as string;
    const password = config.get('fritzbox.password') as string;
    this.#client = new DigestClient(username, password, {
      logger,
      cnonceSize: 48,
    });
  }
  /**
   * Change the event subscription to the fritzbox.
   * If no current subscription is present then create first subscription.
   * @param ip ip address of kubernetes ingress
   */
  async changeSubscription(ip: string) {
    logger.debug(`changeSubscription(${ip})`);
    if (this.#subscriptionUuid !== '') {
      await unsubscribe(this.#fritzboxBaseUrl, this.#subscriptionUuid);
    }
    const ownEndpoint = `http://${ip}`;
    this.#subscriptionUuid = await subscribe(
      this.#fritzboxBaseUrl,
      ownEndpoint,
      this.#client,
    );
    if (logger.isDebugEnabled()) {
      logger.debug(`subscriptionUuid: ${this.#subscriptionUuid}`);
    }
  }
  async #handlePropertyChange(propertyOrProperties: Property | Property[]) {
    // array check
    if (Array.isArray(propertyOrProperties)) {
      for (const property of propertyOrProperties) {
        this.#handlePropertyChange(property);
      }
    } else {
      if (propertyIsExternalIPv6Address(propertyOrProperties)) {
        const ipV6Prefix = await getIpV6Prefix(this.#fritzboxBaseUrl);
        if (this.#currentIpv6Network !== ipV6Prefix.NewIPv6Prefix) {
          logger.info(`current ipv6 prefix has changed.`);
          if (logger.isDebugEnabled()) {
            logger.debug(
              `current network: ${this.#currentIpv6Network}, new network: ${
                ipV6Prefix.NewIPv6Prefix
              }`,
            );
            logger.debug(
              `current prefix: ${this.#currentPrefixLength}, new prefix: ${
                ipV6Prefix.NewPrefixLength
              }`,
            );
          }
        }
        const hasListeners = this.emit('prefix-changed', {
          prefix: ipV6Prefix.NewIPv6Prefix,
          length: Number.parseInt(ipV6Prefix.NewPrefixLength),
        });
        if (!hasListeners) {
          logger.error('prefix changed but there is no listener!');
        }
      }
    }
  }
  async createService() {
    const app = new Koa();
    const router = new Router();

    // add kubernetes health endpoint
    router.get('/health', (ctx) => {
      logger.silly('health endpoint called');
      ctx.body = 'ok';
      ctx.status = 200;
    });

    // fritzbox subscription endpoint
    router.all('/', async (ctx) => {
      // Handle the webhook request here
      logger.debug('Received webhook request');
      if (logger.isDebugEnabled()) {
        // log request origin ip address
        logger.debug(`ip: ${ctx.request.ip}`);
        logger.debug(`method: ${ctx.request.method}`);
        logger.debug(`rawBody: ${JSON.stringify(ctx.request.rawBody)}`);
        logger.debug(`body: ${JSON.stringify(ctx.request.body)}`);
      }
      if (ctx.request.rawBody === undefined) {
        logger.debug('kubernetes ping or request without body');
        ctx.status = 200;
        ctx.body = 'ping received successfully';
        return;
      }
      const data = parser.parse(ctx.request.rawBody) as PropertySetObj;
      const propertyOrProperties = data['e:propertyset']['e:property'];
      this.#handlePropertyChange(propertyOrProperties);

      ctx.status = 200;
      ctx.body = 'Webhook received successfully';
    });
    app.use(router.routes()).use(router.allowedMethods());
    this.#service = app.listen(config.get('service.port'));
  }
  async stopService() {
    if (this.#service === undefined) {
      logger.error('service is stopped before it was initialized!');
      return;
    }
    this.#service.close();
    this.#service.closeAllConnections();
  }
}
