import * as LRU from 'lru-cache'
import { Bloom } from 'meter-devkit/dist/bloom'
import BigNumber from 'bignumber.js'

const WINDOW_LEN = 12

type Slot = Connex.Meter.Status['head'] & {
    bloom?: Bloom
    block?: Connex.Meter.Block

    accounts: Map<string, Account>
    txs: Map<string, Connex.Meter.Transaction>
    receipts: Map<string, Connex.Meter.Receipt>
    tied: Map<string, any>
}

export class Cache {
    private readonly irreversible = {
        blocks: new LRU<string | number, Connex.Meter.Block>(256),
        txs: new LRU<string, Connex.Meter.Transaction>(512),
        receipts: new LRU<string, Connex.Meter.Receipt>(512)
    }
    private readonly window: Slot[] = [];

    private candidatesUpdatedHeight: number = 0;
    private candidates: Connex.Meter.Candidate[] = [];
    private bucketsUpdatedHeight: number = 0;
    private buckets: Connex.Meter.Bucket[] = [];
    private stakeholdersUpdatedHeight: number = 0;
    private stakeholders: Connex.Meter.Stakeholder[] = [];
    private auctionUpdatedHeight: number = 0;
    private auction: Connex.Meter.Auction| null = null;
    private auctionSummaryUpdatedHeight: number = 0;
    private auctionSummary: Connex.Meter.AuctionSummary|null = null;

    public handleNewBlock(
        head: Connex.Meter.Status['head'],
        bloom?: { bits: string, k: number },
        block?: Connex.Meter.Block
    ) {
        while (this.window.length > 0) {
            const top = this.window[this.window.length - 1]
            if (top.id === head.id) {
                return
            }
            if (top.id === head.parentID) {
                break
            }
            this.window.pop()
        }

        this.window.push({
            ...head,
            bloom: bloom ? new Bloom(bloom.k, Buffer.from(bloom.bits.slice(2), 'hex')) : undefined,
            block,
            accounts: new Map(),
            txs: new Map(),
            receipts: new Map(),
            tied: new Map(),
        })

        // shift out old slots and move cached items into frozen cache
        while (this.window.length > WINDOW_LEN) {
            const bottom = this.window.shift()!

            bottom.txs.forEach((v, k) => this.irreversible.txs.set(k, v))
            bottom.receipts.forEach((v, k) => this.irreversible.receipts.set(k, v))
            if (bottom.block) {
                this.irreversible.blocks.set(bottom.block.id, bottom.block)
                this.irreversible.blocks.set(bottom.block.number, bottom.block)
            }
        }
    }

    public async getBlock(
        revision: string | number,
        fetch: () => Promise<Connex.Meter.Block | null>
    ) {
        let block = this.irreversible.blocks.get(revision) || null
        if (block) {
            return block
        }

        const { slot } = this.findSlot(revision)

        if (slot && slot.block) {
            return slot.block
        }

        block = await fetch()
        if (block) {
            if (slot && slot.id === block.id) {
                slot.block = block
            }

            if (this.isIrreversible(block.number)) {
                this.irreversible.blocks.set(block.id, block)
                if (block.isTrunk) {
                    this.irreversible.blocks.set(block.number, block)
                }
            }
        }
        return block
    }

    public async getCandidates(
        fetch: () => Promise<Connex.Meter.Candidate[]>
    ) {
        let currHeight = 0
        if (this.window.length>0){
            const top = this.window[this.window.length-1];
            currHeight = top.number;
            if (top.number <= this.candidatesUpdatedHeight){
                return this.candidates;
            }
        }

        let candidateList = await fetch()
        if (candidateList) {
            this.candidates = candidateList;
            this.candidatesUpdatedHeight = currHeight;
        }

        return candidateList
    }

    public async getBuckets(
        fetch: () => Promise<Connex.Meter.Bucket[]>
    ) {
        let currHeight = 0
        if (this.window.length>0){
            const top = this.window[this.window.length-1];
            currHeight = top.number;
            if (top.number <= this.candidatesUpdatedHeight){
                return this.buckets;
            }
        }

        let bucketList = await fetch()
        if (bucketList) {
            this.buckets = bucketList;
            this.bucketsUpdatedHeight = currHeight;
        }

        return bucketList
    }

    public async getStakeholders(
        fetch: () => Promise<Connex.Meter.Stakeholder[]>
    ) {
        let currHeight = 0
        if (this.window.length>0){
            const top = this.window[this.window.length-1];
            currHeight = top.number;
            if (top.number <= this.stakeholdersUpdatedHeight){
                return this.stakeholders;
            }
        }

        let stakeholderList = await fetch()
        if (stakeholderList) {
            this.stakeholders = stakeholderList;
            this.stakeholdersUpdatedHeight = currHeight;
        }

        return stakeholderList
    }

    public async getAuction(
        fetch: () => Promise<Connex.Meter.Auction>
    ) {
        let currHeight = 0
        if (this.window.length>0){
            const top = this.window[this.window.length-1];
            currHeight = top.number;
            if (top.number <= this.stakeholdersUpdatedHeight){
                if (this.auction!=null){
                    return this.auction;
                }
            }
        }

        let curAuction = await fetch()
        if (curAuction) {
            this.auction = curAuction;
            this.auctionUpdatedHeight = currHeight;
        }

        return curAuction
    }

    public async getAuctionSummary(
        fetch: () => Promise<Connex.Meter.AuctionSummary>
    ) {
        let currHeight = 0
        if (this.window.length>0){
            const top = this.window[this.window.length-1];
            currHeight = top.number;
            if (top.number <= this.stakeholdersUpdatedHeight){
                if (this.auctionSummary!=null){
                    return this.auctionSummary;
                }
            }
        }

        let curAuctionSummary = await fetch()
        if (curAuctionSummary) {
            this.auctionSummary = curAuctionSummary;
            this.auctionSummaryUpdatedHeight = currHeight;
        }

        return curAuctionSummary
    }


    public async getTx(
        txid: string,
        fetch: () => Promise<Connex.Meter.Transaction | null>
    ) {
        let tx = this.irreversible.txs.get(txid) || null
        if (tx) {
            return tx
        }

        for (const slot of this.window) {
            tx = slot.txs.get(txid) || null
            if (tx) {
                return tx
            }
        }

        tx = await fetch()
        if (tx) {
            const { slot } = this.findSlot(tx.meta.blockID)
            if (slot) {
                slot.txs.set(txid, tx)
            }
            if (this.isIrreversible(tx.meta.blockNumber)) {
                this.irreversible.txs.set(txid, tx)
            }
        }
        return tx
    }

    public async getReceipt(
        txid: string,
        fetch: () => Promise<Connex.Meter.Receipt | null>
    ) {
        let receipt = this.irreversible.receipts.get(txid) || null
        if (receipt) {
            return receipt
        }

        for (const slot of this.window) {
            receipt = slot.receipts.get(txid) || null
            if (receipt) {
                return receipt
            }
        }

        receipt = await fetch()
        if (receipt) {
            const { slot } = this.findSlot(receipt.meta.blockID)
            if (slot) {
                slot.receipts.set(txid, receipt)
            }
            if (this.isIrreversible(receipt.meta.blockNumber)) {
                this.irreversible.receipts.set(txid, receipt)
            }
        }
        return receipt
    }

    public async getAccount(
        addr: string,
        revision: string,
        fetch: () => Promise<Connex.Meter.Account>
    ) {
        const found = this.findSlot(revision)
        for (let i = found.index; i >= 0; i--) {
            const slot = this.window[i]
            const acc = slot.accounts.get(addr)
            if (acc) {
                if (i !== found.index) {
                    found.slot!.accounts.set(addr, acc)
                }
                return acc.snapshot(found.slot!.timestamp)
            }

            if (!slot.bloom || testBytesHex(slot.bloom, addr)) {
                // account might be dirty
                break
            }
        }
        const accObj = await fetch()
        if (found.slot) {
            found.slot.accounts.set(addr, new Account(accObj, found.slot.timestamp))
        }
        return accObj
    }

    /**
     * get cached entry which is tied to a batch of addresses
     * @param key the cache key
     * @param revision block id where cache bound to
     * @param fetch to fetch value when cache missing
     * @param ties array of tied addresses, as the gist to invalidate cache key. undefined means the key is always
     * invalidated on different revision.
     */
    public async getTied(
        key: string,
        revision: string,
        fetch: () => Promise<any>,
        ties?: string[]
    ) {
        const found = this.findSlot(revision)
        for (let i = found.index; i >= 0; i--) {
            const slot = this.window[i]
            const v = slot.tied.get(key)
            if (v) {
                if (i !== found.index) {
                    found.slot!.tied.set(key, v)
                }
                return v
            }

            if (!slot.bloom || !ties) {
                break
            }

            // if ties.length === 0, never invalidate cache
            if (ties.some(t => testBytesHex(slot.bloom!, t))) {
                // might be dirty
                break
            }
        }
        const value = await fetch()
        if (found.slot) {
            found.slot.tied.set(key, value)
        }
        return value
    }

    private findSlot(revision: string | number) {
        const index = this.window.findIndex(s => s.id === revision || s.number === revision)
        if (index >= 0) {
            return { slot: this.window[index], index }
        }
        return { index }
    }

    private isIrreversible(n: number) {
        if (this.window.length > 0) {
            return n < this.window[this.window.length - 1].number - WINDOW_LEN
        }
        return false
    }
}

function testBytesHex(bloom: Bloom, hex: string) {
    let buf = Buffer.from(hex.slice(2), 'hex')
    const nzIndex = buf.findIndex(v => v !== 0)
    if (nzIndex < 0) {
        buf = Buffer.alloc(0)
    } else {
        buf = buf.slice(nzIndex)
    }
    return bloom.test(buf)
}

const ENERGY_GROWTH_RATE = 5000000000

class Account {
    constructor(readonly obj: Connex.Meter.Account, readonly initTimestamp: number) {
    }

    public snapshot(timestamp: number) {
        return { ...this.obj, energy: this.energyAt(timestamp) }
    }

    private energyAt(timestamp: number) {
        if (timestamp < this.initTimestamp) {
            return this.obj.energy
        }
        return '0x' + new BigNumber(this.obj.balance)
            .times(timestamp - this.initTimestamp)
            .times(ENERGY_GROWTH_RATE)
            .dividedToIntegerBy(1e18)
            .plus(this.obj.energy)
            .toString(16)
    }
}
