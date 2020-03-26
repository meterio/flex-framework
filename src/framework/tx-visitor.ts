export function newTxVisitor(
    ctx: Context,
    id: string
): Flex.Meter.TransactionVisitor {
    return {
        get id() {
            return id
        },
        get: () => ctx.driver.getTransaction(id),
        getReceipt: () => ctx.driver.getReceipt(id)
    }
}
