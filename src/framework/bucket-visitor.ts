export function newBucketVisitor(
  ctx: Context,
  id: string
): Flex.Meter.BucketVisitor {
  return {
    get id() {
      return id;
    },
    get: () => ctx.driver.getBucket(id),
  };
}
