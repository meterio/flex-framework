export function newStakingVisitor(
    ctx: Context
): Flex.Meter.StakingVisitor {
    return {
        getCandidates: () => {
            return ctx.driver.getCandidates()
        },
        getBuckets: () => {
            return ctx.driver.getBuckets()
        },
        getStakeholders: ()=> {
            return ctx.driver.getStakeholders()
        }
    }
}
