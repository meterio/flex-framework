
interface Context {
    readonly driver: Connex.Driver
    readonly trackedHead: Connex.Meter.Status['head']
}
