/** Connex driver interface */
declare namespace Connex {
    interface Driver {
        readonly genesis: Meter.Block
        /** current known head */
        readonly head: Meter.Status['head']

        /**
         * poll new head
         * rejected only when driver closed
         */
        pollHead(): Promise<Meter.Status['head']>

        getBlock(revision: string | number): Promise<Meter.Block | null>
        getTransaction(id: string): Promise<Meter.Transaction | null>
        getReceipt(id: string): Promise<Meter.Receipt | null>

        getAccount(addr: string, revision: string): Promise<Meter.Account>
        getCode(addr: string, revision: string): Promise<Meter.Code>
        getStorage(addr: string, key: string, revision: string): Promise<Meter.Storage>
        getCandidates(): Promise<Meter.Candidate[]>
        getBuckets(): Promise<Meter.Bucket[]>
        getStakeholders(): Promise<Meter.Stakeholder[]>
        getAuction(): Promise<Meter.Auction>
        getAuctionSummary(): Promise<Meter.AuctionSummary>

        explain(arg: Driver.ExplainArg, revision: string, cacheTies?: string[]): Promise<Meter.VMOutput[]>

        filterEventLogs(arg: Driver.FilterEventLogsArg): Promise<Meter.Event[]>
        filterTransferLogs(arg: Driver.FilterTransferLogsArg): Promise<Meter.Transfer[]>

        // vendor methods
        signTx(msg: Driver.SignTxArg, options: Driver.SignTxOption): Promise<Driver.SignTxResult>
        signCert(msg: Driver.SignCertArg, option: Driver.SignCertOption): Promise<Driver.SignCertResult>
        isAddressOwned(addr: string): Promise<boolean>
    }

    namespace Driver {
        type ExplainArg = {
            clauses: Array<{
                to: string | null
                value: string
                data: string
            }>,
            caller?: string
            gas?: number
            gasPrice?: string
        }

        type FilterEventLogsArg = {
            range: Meter.Filter.Range
            options: {
                offset: number
                limit: number
            }
            criteriaSet: Meter.Event.Criteria[]
            order: 'asc' | 'desc'
        }

        type FilterTransferLogsArg = {
            range: Meter.Filter.Range
            options: {
                offset: number
                limit: number
            }
            criteriaSet: Meter.Transfer.Criteria[]
            order: 'asc' | 'desc'
        }

        type SignTxArg = Array<{
            to: string | null
            value: string
            data: string
            comment?: string
            abi?: object
        }>
        type SignTxOption = {
            signer?: string
            gas?: number
            dependsOn?: string
            link?: string
            comment?: string
            delegationHandler?: Vendor.DelegationHandler
        }
        type SignTxResult = Vendor.TxResponse

        type SignCertArg = Vendor.CertMessage
        type SignCertOption = {
            signer?: string
            link?: string
        }
        type SignCertResult = Vendor.CertResponse
    }
}