export function newAuctionVisitor(
    ctx: Context
): Connex.Meter.AuctionVisitor {
    return {
        get: ()=>{
            return ctx.driver.getAuction()
        },
        getSummary: ()=>{
            return ctx.driver.getAuctionSummary()
        }
    }
}
