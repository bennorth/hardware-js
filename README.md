# Experimental library for browser-accessible hardware

Design notes are in `src/`.

## Development tools

The provided example (in `example/`) demonstrates usage and is
intended to be helpful while developing drivers for new devices.

### Development environment set-up

This library is developed with v18 of node.js.

Install required dependencies with

``` shell
npm install
```

and then you should be able to do

``` shell
npm run build
cd output
npx http-server
```

and visit `http://localhost:8080/` in your browser.
