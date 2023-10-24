# Experimental library for browser-accessible hardware

Design notes and other documentation are in `doc/`.

## Development tools

The provided example (in `example/`) demonstrates usage and is
intended to be helpful while developing drivers for new devices.

### Development environment set-up

This library is developed with v18 of node.js.

Install required dependencies with

``` shell
npm install
```

or (to fetch the latest version once installed)

``` shell
npm update
```

and then you should be able to do

``` shell
npm run build
cd output
npx http-server
```

and visit `http://localhost:8080/` in your browser.

ESLint is installed; you can do `npx eslint src/**/*.ts` to run it.
