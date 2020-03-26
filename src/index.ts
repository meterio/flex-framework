import { newThor } from './framework/thor'
import { newVendor } from './framework/vendor'
import { version as flexVersion } from '@meterio/flex/package.json'
import { newDriverGuard } from './framework/driver-guard'

/**
 * Class implements Flex interface
 */
export class Framework implements Flex {
    /**
     * create a wrapper for driver, to validate responses. it should be helpful to make sure driver is properly
     * implemented in development stage.
     * @param driver the driver to be wrapped
     * @param errorHandler optional error handler. If omitted, error message will be printed via console.warn.
     */
    public static guardDriver(
        driver: Flex.Driver,
        errorHandler?: (err: Error) => void
    ) {
        return newDriverGuard(driver, errorHandler)
    }

    public readonly version = flexVersion
    public readonly meter: Flex.Meter
    public readonly vendor: Flex.Vendor

    /**
     * constructor
     * @param driver the driver instance
     */
    constructor(driver: Flex.Driver) {
        this.meter = newThor(driver)
        this.vendor = newVendor(driver)
    }
}

export * from './driver/driver'
export * from './driver/interfaces'
export * from './driver/simple-net'
export * from './driver/simple-wallet'
export * from './driver/options'
