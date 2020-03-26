export function newBlockVisitor(
    ctx: Context,
    revision: string | number
): Flex.Meter.BlockVisitor {

    return {
        get revision() { return revision },
        get: () => ctx.driver.getBlock(revision)
    }
}
