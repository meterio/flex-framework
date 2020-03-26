import { newThor } from './framework/thor'
import { newVendor } from './framework/vendor'
import { version as connexVersion } from 'simonzgconnex/package.json'
import { newDriverGuard } from './framework/driver-guard'

/**
 * Class implements Connex interface
 */
export class Framework implements Connex {
    /**
     * create a wrapper for driver, to validate responses. it should be helpful to make sure driver is properly
     * implemented in development stage.
     * @param driver the driver to be wrapped
     * @param errorHandler optional error handler. If omitted, error message will be printed via console.warn.
     */
    public static guardDriver(
        driver: Connex.Driver,
        errorHandler?: (err: Error) => void
    ) {
        return newDriverGuard(driver, errorHandler)
    }

    public readonly version = connexVersion
    public readonly meter: Connex.Meter
    public readonly vendor: Connex.Vendor

    /**
     * constructor
     * @param driver the driver instance
     */
    constructor(driver: Connex.Driver) {
        this.meter = newThor(driver)
        this.vendor = newVendor(driver)
    }
}

export * from './driver/driver'
export * from './driver/interfaces'
export * from './driver/simple-net'
export * from './driver/simple-wallet'
export * from './driver/options'
