import { Net } from './interfaces';
import { PromInt, InterruptedError } from './promint';
import { Cache } from './cache';
import { blake2b256 } from '@meterio/devkit/dist/cry/blake2b';
import { sleep } from './common';
import { options } from './options';

/** class implements Flex.Driver leaves out Vendor related methods */
export class DriverNoVendor implements Flex.Driver {
  public head: Flex.Meter.Status['head'];

  private headResolvers = [] as Array<() => void>;
  private readonly int = new PromInt();
  private readonly cache = new Cache();

  constructor(
    private readonly net: Net,
    readonly genesis: Flex.Meter.Block,
    initialHead?: Flex.Meter.Status['head']
  ) {
    if (initialHead) {
      this.head = initialHead;
    } else {
      this.head = {
        id: genesis.id,
        number: genesis.number,
        timestamp: genesis.timestamp,
        parentID: genesis.parentID,
        epoch: genesis.epoch,
      };
    }
    this.headTrackerLoop();
  }

  // close the driver to prevent mem leak
  public close() {
    this.int.interrupt();
  }

  // implementations
  public pollHead() {
    return this.int.wrap(
      new Promise<Flex.Meter.Status['head']>((resolve) => {
        this.headResolvers.push(() => resolve(this.head));
      })
    );
  }

  public getBlock(revision: string | number) {
    return this.cache.getBlock(revision, () =>
      this.httpGet(`blocks/${revision}`)
    );
  }
  public getTransaction(id: string) {
    return this.cache.getTx(id, () =>
      this.httpGet(`transactions/${id}`, { head: this.head.id })
    );
  }
  public getReceipt(id: string) {
    return this.cache.getReceipt(id, () =>
      this.httpGet(`transactions/${id}/receipt`, { head: this.head.id })
    );
  }
  public getAccount(addr: string, revision: string) {
    return this.cache.getAccount(addr, revision, () =>
      this.httpGet(`accounts/${addr}`, { revision })
    );
  }
  public getCandidates() {
    return this.cache.getCandidates(() => this.httpGet(`staking/candidates`));
  }
  public getBuckets() {
    return this.cache.getBuckets(() => this.httpGet(`staking/buckets`));
  }
  public getStakeholders() {
    return this.cache.getStakeholders(() =>
      this.httpGet(`staking/stakeholders`)
    );
  }
  public getAuction() {
    return this.cache.getAuction(() => this.httpGet(`auction/present`));
  }
  public getAuctionSummaries() {
    return this.cache.getAuctionSummaries(() =>
      this.httpGet(`auction/summaries`)
    );
  }

  public getCode(addr: string, revision: string) {
    return this.cache.getTied(`code-${addr}`, revision, () =>
      this.httpGet(`accounts/${addr}/code`, { revision })
    );
  }
  public getStorage(addr: string, key: string, revision: string) {
    return this.cache.getTied(`storage-${addr}-${key}`, revision, () =>
      this.httpGet(`accounts/${addr}/storage/${key}`, { revision })
    );
  }
  public explain(
    arg: Flex.Driver.ExplainArg,
    revision: string,
    cacheTies?: string[]
  ) {
    const cacheKey = `explain-${blake2b256(JSON.stringify(arg)).toString(
      'hex'
    )}`;
    return this.cache.getTied(
      cacheKey,
      revision,
      () => this.httpPost('accounts/*', arg, { revision }),
      cacheTies
    );
  }
  public filterEventLogs(arg: Flex.Driver.FilterEventLogsArg) {
    const cacheKey = `event-${blake2b256(JSON.stringify(arg)).toString('hex')}`;
    return this.cache.getTied(cacheKey, this.head.id, () =>
      this.httpPost('logs/event', arg)
    );
  }
  public filterTransferLogs(arg: Flex.Driver.FilterTransferLogsArg) {
    const cacheKey = `transfer-${blake2b256(JSON.stringify(arg)).toString(
      'hex'
    )}`;
    return this.cache.getTied(cacheKey, this.head.id, () =>
      this.httpPost('logs/transfer', arg)
    );
  }
  public signTx(
    msg: Flex.Driver.SignTxArg,
    option: Flex.Driver.SignTxOption
  ): Promise<Flex.Driver.SignTxResult> {
    throw new Error('not implemented');
  }
  public signCert(
    msg: Flex.Driver.SignCertArg,
    options: Flex.Driver.SignCertOption
  ): Promise<Flex.Driver.SignCertResult> {
    throw new Error(' not implemented');
  }
  public isAddressOwned(addr: string): Promise<boolean> {
    return Promise.resolve(false);
  }
  //////
  protected httpGet(path: string, query?: Record<string, string>) {
    return this.net.http('GET', path, {
      query,
      validateResponseHeader: this.headerValidator,
    });
  }

  protected httpPost(path: string, body: any, query?: Record<string, string>) {
    return this.net.http('POST', path, {
      query,
      body,
      validateResponseHeader: this.headerValidator,
    });
  }

  private get headerValidator() {
    return (headers: Record<string, string>) => {
      const xgid = headers['x-genesis-id'];
      if (xgid && xgid !== this.genesis.id) {
        throw new Error(`responded 'x-genesis-id' not matched`);
      }
    };
  }

  private emitNewHead() {
    const resolvers = this.headResolvers;
    this.headResolvers = [];
    resolvers.forEach((r) => r());
  }

  private async headTrackerLoop() {
    for (;;) {
      try {
        const best = await this.int.wrap<Flex.Meter.Block>(
          this.httpGet('blocks/best')
        );
        if (best.id !== this.head.id && best.number >= this.head.number) {
          this.head = {
            id: best.id,
            number: best.number,
            timestamp: best.timestamp,
            parentID: best.parentID,
            epoch: best.epoch,
          };
          this.cache.handleNewBlock(this.head, undefined, best);
          this.emitNewHead();

          // if (Date.now() - this.head.timestamp * 1000 < 60 * 1000) {
          // nearly synced
          // triggerWs++
          // }
        }
      } catch (err) {
        // triggerWs = 0
        if (!options.disableErrorLog) {
          // tslint:disable-next-line: no-console
          console.warn('headTracker(http):', err);
        }
        if (err instanceof InterruptedError) {
          break;
        }
      }

      try {
        await this.int.wrap(sleep(8 * 1000));
      } catch {
        break;
      }
    }
  }
}

interface Beat {
  number: number;
  id: string;
  parentID: string;
  timestamp: number;
  bloom: string;
  k: number;
  txsFeatures?: number;
  obsolete: boolean;
}
