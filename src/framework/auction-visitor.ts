export function newAuctionVisitor(
    ctx: Context
): Flex.Meter.AuctionVisitor {
    return {
        get: ()=>{
            return ctx.driver.getAuction()
        },
        getSummary: ()=>{
            return ctx.driver.getAuctionSummary()
        }
    }
}
