// https://developer.chrome.com/articles/hid-examples/
// https://finninday.net/wiki/index.php/Vernier_Go_Temp_USB_device_in_Linux

// https://stackoverflow.com/questions/22946367/converting-twos-complement-output-to-signed-decimal
function twosComplement(val: number) {
  return 0x8000 & val ? (0x7fff & val) - 0x8000 : val;
}

const requestOptions: HIDDeviceRequestOptions = {
  filters: [
    { vendorId: 0x08f7, productId: 0x0002 },
    { vendorId: 0x08f7, productId: 0x0004 },
  ],
};

let device: HIDDevice = null;
let reportId: number;
let isTemp = false;
let isMD = false;

type OctetArray = Int8Array | Uint8Array;

// Util to convert byte to nice hex string
function byteToHex(byte: number) {
  const unsignedByte = byte & 0xff;

  if (unsignedByte < 16) {
    return ` 0x0` + unsignedByte.toString(16);
  } else {
    return ` 0x` + unsignedByte.toString(16);
  }
}

// Util to convert byte array to hex string.
// bytes is an typed array (Int8Array or Uint8Array)
function toHexString(bytes: OctetArray) {
  return Array.from(bytes).map(byteToHex).join(``);
}

function handleDisconnectedDevice(e) {
  console.log("Device disconnected: " + e.device.productName);
  document.getElementById("temp").innerHTML = "Temperature = ?";
}

// commands

// Init command with the extra 0x02 for the MD
// cmd: 1a 02 00 00 00 00 00 00 >>> resp: 9a 1a 00 00 00 00 00 00
const INIT = new Uint8Array([0x1a, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const STATUS = new Uint8Array([0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

// Set measurement period to 100 ms
const PERIOD = new Uint8Array([0x1b, 0x64, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

// 1d 00 04 00 00 00 00 00 >>> 5a 1d 00 00 00 00 00 00
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SET_LED_RED = new Uint8Array([
  0x1d, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const SET_LED_GREEN = new Uint8Array([
  0x1d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

const SET_LED_ORANGE = new Uint8Array([
  0x1d, 0x00, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

// 18 00 00 00 00 00 00 00 >>> 5a 18 00 00 00 00 00 00

// For MD: 0x18, triggerType, lsbyteMeasurementCount, msbyteMeasurementCount, realTimeMeasType, flags, filterType
// The defaults of 0x00 for all of those should work for standard data collection
const START = new Uint8Array([0x18, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const STOP = new Uint8Array([0x19, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

function _writeToDevice(buffer: OctetArray) {
  try {
    device.sendReport(reportId, buffer);
    console.log(`Wrote: `, toHexString(buffer));
  } catch (error) {
    console.log(`Write Failure: ${error}`);
  }
}

// Brute force way to just wait for the command/response to finish from the previous command/response.
// A proper application should wait for the device to return the expected response to the commands,
// and timeout or error as appropriate.
function queueWriteToDevice(buffer: OctetArray, queueTime: number) {
  setTimeout(_writeToDevice, queueTime, buffer);
}

function handleInputReport(e: HIDInputReportEvent) {
  //console.log("handleInputReport:", e);
  const data = new Uint8Array(e.data.buffer);

  if (data[0] == 1) {
    // Measurement
    if (isTemp) {
      const raw = twosComplement(data[2] + (data[3] << 8));
      // this doesn't work too well
      // https://finninday.net/wiki/index.php/Vernier_Go_Temp_USB_device_in_Linux
      // var celcius = rawTemp / 126.74 - 5.4;

      // This works much better and gives exactly the same values as the official app
      // to the nearest 0.1°C (which is the max accuracy displayed in the official app)
      // over the range tested (0.2°C to 84.9°C)
      // https://chrome.google.com/webstore/detail/vernier-graphical-analysi/dncgedbnidfkppmdgfgidcepclnokpkb

      const rawCelcius = 0.0078117735 * raw + 0.4979364513;
      const celcius = Math.round(rawCelcius * 10) / 10;
      console.log("GoTemp conversion:", raw, celcius);
    } else if (isMD) {
      // MD measurements are 4 bytes, little endian
      const raw = data[2] + (data[3] << 8) + (data[4] << 16) + (data[5] << 32);
      const meters = raw * 0.000001;
      console.log("MD conversion:", raw, meters);
    } else {
      console.log("unknown report:", data);
    }
  } else {
    // Response to a command
    console.log("CMD RESP: ", toHexString(data));
  }
}

navigator.hid.addEventListener("disconnect", handleDisconnectedDevice);

export function init() {
  isTemp = false;
  isMD = false;
  navigator.hid.requestDevice(requestOptions).then((devices) => {
    if (devices.length == 0) {
      return;
    }

    devices[0].open().then(() => {
      device = devices[0];
      reportId = device.collections[0].outputReports[0].reportId;
      device.oninputreport = handleInputReport;
      console.log("Opened device: " + device.productName, device);

      switch (device.productId) {
        case 0x02:
          isTemp = true;
          break;
        case 0x04:
          isMD = true;
          break;
        default:
          break;
      }

      // Write Init Command
      queueWriteToDevice(INIT, 10);

      // Set LED State
      queueWriteToDevice(SET_LED_GREEN, 300);

      queueWriteToDevice(PERIOD, 600);

      // Write Start Command
      queueWriteToDevice(START, 1000);

      // After 10 seconds, stop and close
      setTimeout(() => {
        queueWriteToDevice(STOP, 10);
        queueWriteToDevice(SET_LED_ORANGE, 300);
        setTimeout(() => {
          device.close();
        }, 1000);
      }, 10000);
    });
  });
}
