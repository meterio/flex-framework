export function newAuctionVisitor(ctx: Context): Flex.Meter.AuctionVisitor {
  return {
    get: () => {
      return ctx.driver.getAuction();
    },
    getSummaries: () => {
      return ctx.driver.getAuctionSummaries();
    },
  };
}
