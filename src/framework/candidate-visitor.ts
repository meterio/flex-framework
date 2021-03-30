export function newCandidateVisitor(
  ctx: Context,
  addr: string
): Flex.Meter.CandidateVisitor {
  return {
    get address() {
      return addr;
    },
    get: () => ctx.driver.getCandidate(addr),
  };
}
