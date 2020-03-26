# Flex Framework

[![npm version](https://badge.fury.io/js/%40vechain%2Fflex-framework.svg)](https://badge.fury.io/js/%40vechain%2Fflex-framework)

Flex Framework is a library implements Flex interface. 
It helps various wallet instances offer consistent Flex interface to VeChain DApps.

## Installation

```sh
npm i @vechain/flex-framework
```

## Usage

To create framework instance, Flex.Driver needs to be implemented

```typescript
import { Framework } from '@vechain/flex-framework'
import '@vechain/flex.driver'

class MyDriver implements Flex.Driver {
    // implementations
}

const driver = new MyDriver()

// it's suggested in development mode, which is helpful to diagnose driver implementation.
// const framework = new Framework(Framework.guardDriver(driver))

const framework = new Framework(driver)

// here `framework` is the ready-to-use Flex instance object
```

## See also

### Driver implementations:

* NodeJS - [flex.driver-nodejs](https://github.com/vechain/flex.driver-nodejs)

### Flex playground

* [flex repl](https://github.com/vechain/flex-repl)
