import * as V from 'validator-ts'
import * as R from './rules'

export function newDriverGuard(
    driver: Flex.Driver,
    errHandler?: (err: Error) => void
): Flex.Driver {

    const test = <T>(obj: T, scheme: V.Scheme<T>, path: string) => {
        try {
            V.validate(obj, scheme, path)
        } catch (err) {
            if (errHandler) {
                errHandler(err)
            } else {
                // tslint:disable-next-line:no-console
                console.warn(`Flex-Driver[MALFORMED RESPONSE]: ${err.message}`)
            }
        }
        return obj
    }

    const genesis = test(driver.genesis, blockScheme, 'genesis')
    return {
        genesis,
        get head() {
            return test(driver.head, headScheme, 'head')
        },
        pollHead() {
            return driver.pollHead()
                .then(h => test(h, headScheme, 'getHead()'))
        },
        getBlock(revision) {
            return driver.getBlock(revision)
                .then(b => b ? test(b, blockScheme, 'getBlock()') : b)
        },
        getCandidates(){
            return driver.getCandidates().then(cs=>cs ? cs.map(c=>test(c, candidateScheme, 'getCandidate()')):cs)
        },
        getBuckets(){
            return driver.getBuckets().then(bs=>bs? bs.map(b=>test(b, bucketScheme, 'getBuckets()')):bs)
        },
        getStakeholders(){
            return driver.getStakeholders().then(ss=>ss ? ss.map(s=>test(s, stakeholderScheme, 'getStakeholders()')):ss)
        },
        getAuction(){
            return driver.getAuction().then(a=>a ? test(a, auctionScheme, 'getAuction()'):a)
        },
        getAuctionSummary(){
            return driver.getAuctionSummary().then(summary=>summary ? test(summary, auctionSummaryScheme, 'getAuctionSummary()'):summary)
        },
 
        getTransaction(id) {
            return driver.getTransaction(id)
                .then(tx => tx ? test(tx, txScheme, 'getTransaction()') : tx)
        },
        getReceipt(id) {
            return driver.getReceipt(id)
                .then(r => r ? test(r, receiptScheme, 'getReceipt()') : r)
        },
        getAccount(addr: string, revision: string): Promise<Flex.Meter.Account> {
            return driver.getAccount(addr, revision)
                .then(a => test(a, {
                    balance: R.hexString,
                    energy: R.hexString,
                    boundbalance: R.hexString,
                    boundenergy: R.hexString,
                    hasCode: R.bool
                }, 'getAccount()'))
        },
        getCode(addr: string, revision: string): Promise<Flex.Meter.Code> {
            return driver.getCode(addr, revision)
                .then(c => test(c, {
                    code: R.bytes
                }, 'getCode()'))
        },
        getStorage(addr: string, key: string, revision: string) {
            return driver.getStorage(addr, key, revision)
                .then(s => test(s, {
                    value: R.bytes32
                }, 'getStorage()'))
        },
        explain(arg, revision) {
            return driver.explain(arg, revision)
                .then(r => test(r, [vmOutputScheme], 'explain()'))
        },
        filterEventLogs(arg) {
            return driver.filterEventLogs(arg)
                .then(r => test(r, [eventWithMetaScheme], 'filterEventLogs()'))
        },
        filterTransferLogs(arg) {
            return driver.filterTransferLogs(arg)
                .then(r => test(r, [transferWithMetaScheme], 'filterTransferLogs()'))
        },
        signTx(msg, option) {
            return driver.signTx(msg, {
                ...option,
                delegationHandler: option.delegationHandler ?
                    unsigned => {
                        test(unsigned, {
                            raw: R.bytes,
                            origin: R.address
                        }, 'delegationHandler.arg')
                        return option.delegationHandler!(unsigned)
                    } : undefined
            })
                .then(r => test(r, {
                    txid: R.bytes32,
                    signer: R.address
                }, 'signTx()'))
        },
        signCert(msg, option) {
            return driver.signCert(msg, option)
                .then(r => test(r, {
                    annex: {
                        domain: R.string,
                        timestamp: R.uint64,
                        signer: R.address
                    },
                    signature: v => R.isHexBytes(v, 65) ? '' : 'expected 65 bytes'
                }, 'signCert()'))
        },
        isAddressOwned(addr) {
            return driver.isAddressOwned(addr)
                .then(r => test(r, R.bool, 'isAddressOwned()'))
        }
    }
}

const headScheme: V.Scheme<Flex.Meter.Status['head']> = {
    id: R.bytes32,
    number: R.uint32,
    timestamp: R.uint64,
    parentID: R.bytes32
}

const memberScheme : V.Scheme<Flex.Meter.CommitteeMember> = {
    index: R.uint32,
    pubKey: R.string,
    netAddr: R.string
}

const qcScheme : V.Scheme<Flex.Meter.QuorumCert> = {
    qcHeight: R.uint64,
    qcRound: R.uint64,
    voterBitArrayStr: R.string,
    epochID: R.uint64,
}

const blockScheme: V.Scheme<Flex.Meter.Block> = {
    id: R.bytes32,
    number: R.uint32,
    size: R.uint32,
    parentID: R.bytes32,
    timestamp: R.uint64,
    gasLimit: R.uint64,
    beneficiary: R.address,
    gasUsed: R.uint64,
    totalScore: R.uint64,
    txsRoot: R.bytes32,
    stateRoot: R.bytes32,
    receiptsRoot: R.bytes32,
    signer: R.address,
    isTrunk: R.bool,
    transactions: [R.bytes32],
    lastKBlockHeight: R.uint32,
    committee: [memberScheme],
    qc: qcScheme,
    nonce: R.uint64,
}

const txScheme: V.Scheme<Flex.Meter.Transaction> = {
    id: R.bytes32,
    chainTag: R.uint8,
    blockRef: R.bytes8,
    expiration: R.uint32,
    gasPriceCoef: R.uint8,
    gas: R.uint64,
    origin: R.address,
    nonce: R.hexString,
    dependsOn: V.nullable(R.bytes32),
    size: R.uint32,
    clauses: [{
        to: V.nullable(R.address),
        value: R.hexString,
        token: R.uint32,
        data: R.bytes
    }],
    meta: {
        blockID: R.bytes32,
        blockNumber: R.uint32,
        blockTimestamp: R.uint64
    }
}

const logMetaScheme: V.Scheme<Flex.Meter.LogMeta> = {
    blockID: R.bytes32,
    blockNumber: R.uint32,
    blockTimestamp: R.uint64,
    txID: R.bytes32,
    txOrigin: R.address,
}

const eventScheme: V.Scheme<Flex.Meter.Event> = {
    address: R.address,
    topics: [R.bytes32],
    data: R.bytes,
    meta: () => '',
    decoded: () => ''
}
const eventWithMetaScheme: V.Scheme<Flex.Meter.Event> = {
    ...eventScheme,
    meta: logMetaScheme
}

const transferScheme: V.Scheme<Flex.Meter.Transfer> = {
    sender: R.address,
    recipient: R.address,
    amount: R.hexString,
    meta: () => '',
}

const transferWithMetaScheme: V.Scheme<Flex.Meter.Transfer> = {
    ...transferScheme,
    meta: logMetaScheme
}

const receiptScheme: V.Scheme<Flex.Meter.Receipt> = {
    gasUsed: R.uint64,
    gasPayer: R.address,
    paid: R.hexString,
    reward: R.hexString,
    reverted: R.bool,
    outputs: [{
        contractAddress: V.nullable(R.address),
        events: [eventScheme],
        transfers: [transferScheme]
    }],
    meta: {
        blockID: R.bytes32,
        blockNumber: R.uint32,
        blockTimestamp: R.uint64,
        txID: R.bytes32,
        txOrigin: R.address
    }
}

const vmOutputScheme: V.Scheme<Flex.Meter.VMOutput> = {
    data: R.bytes,
    vmError: R.string,
    gasUsed: R.uint64,
    reverted: R.bool,
    events: [{
        address: R.address,
        topics: [R.bytes32],
        data: R.bytes,
        meta: () => '',
        decoded: () => ''
    }],
    transfers: [{
        sender: R.address,
        recipient: R.address,
        amount: R.hexString,
        meta: () => '',
    }],
    decoded: () => ''
}

const candidateScheme: V.Scheme<Flex.Meter.Candidate> = {
    name: R.string,
    addr: R.string,
    pubKey: R.string,
    ipAddr: R.string,
    port: R.uint32,
    totalVotes: R.string,
    buckets: [R.string],
}

const stakeholderScheme: V.Scheme<Flex.Meter.Stakeholder> = {
    holder: R.string,
    totalStake: R.string,
    buckets: [R.string]
}

const bucketScheme: V.Scheme<Flex.Meter.Bucket> = {
    id:R.string,
    owner:R.string,
    value:R.string,
    token:R.uint32,
    createTime:R.string,
    unbounded: R.bool,
    candidate:R.string,
    option:R.uint32,
    rate: R.uint32,
    bonusVotes: R.string,
    totalVotes: R.string,
}

const auctionTxScheme: V.Scheme<Flex.Meter.AuctionTx> = {
    addr: R.string,
    amount: R.string,
    count: R.uint64,
    nonce: R.uint64,
    lastTime: R.uint64,
}

const auctionScheme: V.Scheme<Flex.Meter.Auction> = {
    auctionID: R.string,
    startHeight: R.uint64,
    endHeight: R.uint64,
    releasedMTRG: R.string,
    reservedPrice: R.string,
    createTime: R.uint64,
    receivedMTR: R.string,
    auctionTxs: [auctionTxScheme],
}

const auctionSummaryScheme: V.Scheme<Flex.Meter.AuctionSummary> = {
    auctionID: R.string,
    startHeight: R.uint64,
    endHeight: R.uint64,
    releasedMTRG: R.string,
    reservedPrice: R.string,
    createTime: R.uint64,
    receivedMTR: R.string,
    actualPrice: R.string,
    leftoverMTRG:  R.string,
}
