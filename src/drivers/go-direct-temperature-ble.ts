import * as GD from "./go-direct-temperature-vendor";

function _calculateChecksum(buf: Uint8Array) {
  const length = buf[1];
  let checksum = -1 * buf[3];

  for (let i = 0; i < length; ++i) {
    checksum += buf[i];
    checksum &= 0xff;
  }

  return checksum;
}

const nextRollingCounter = (() => {
  let rollingCounter = 255;
  return () => {
    rollingCounter -= 1;
    return rollingCounter;
  };
})();

// header 4 bytes starting 0x58
// result 1 byte length, 4 bytes header, command
function constructCommand(command: Uint8Array) {
  // This could be made more efficient by making _calculateChecksum()
  // ignore the first Uint8 of the array it's given.

  // 4 for header
  const commandLength = 4 + command.length;

  let resultBody = new Uint8Array(commandLength);
  resultBody.set([
    0x58,
    commandLength,
    nextRollingCounter(),
    0 /*checksum placeholder */,
  ]);

  resultBody.set(command, 4);
  resultBody[3] = _calculateChecksum(resultBody);

  let fullResult = new Uint8Array(commandLength + 1);
  fullResult[0] = commandLength;
  fullResult.set(resultBody, 1);

  return fullResult;
}

function getStartMeasurementCommand(channelMask: number): Uint8Array {
  return new Uint8Array([
    0x18,
    0xff,
    0x01,
    (channelMask >> 0) & 0xff,
    (channelMask >> 8) & 0xff,
    (channelMask >> 16) & 0xff,
    (channelMask >> 24) & 0xff,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
  ]);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getMeasurementPeriodCommand(
  measurementPeriodMicroseconds: number
): Uint8Array {
  // 32 + (161<<8) + (7<<16) + (0<<24) = 500,000 microseconds
  return new Uint8Array([
    0x1b,
    0xff,
    0x00,
    (measurementPeriodMicroseconds >> 0) & 0xff, // eg 32
    (measurementPeriodMicroseconds >> 8) & 0xff, // eg 161
    (measurementPeriodMicroseconds >> 16) & 0xff, // eg 7
    (measurementPeriodMicroseconds >> 24) & 0xff, //eg 0
    0x00,
    0x00,
    0x00,
    0x00,
  ]);
}

// https://git.theluyuan.com/luyuan/scratch-vm/commit/522b5e1a8e0783defa6cc89d588c4c19c0cbfb18.diff
const SERVICE = "d91714ef-28b9-4f91-ba16-f0d9a604f112";
const CHARACTERISTIC_COMMAND = "f4bf14a6-c7d5-4b6d-8aa8-df1a7c83adcb";
const CHARACTERISTIC_RESPONSE = "b41e6675-a329-40e0-aa01-44d2f444babe";
let services: Array<BluetoothRemoteGATTService> = [];

function handleDisconnectedDevice(e) {
  console.log("Device disconnected: " + e.device.productName);
}

const nonZero = (x: number) => x !== 0;
const decoder = new TextDecoder("utf-8");

function handleInputReport(e) {
  console.log(e);
  // WebHID
  // should be length 64
  // first byte = how many bytes that follow are relevant (probably!?!)
  //var data = new Uint8Array(e.data.buffer);
  // Web Bluetooth

  let data = new Uint8Array(e.currentTarget.value.buffer);
  // add dummy value at start (to make it consistent with WebHID)
  const arrayOne = new Uint8Array([data.length]);
  const arrayTwo = data;
  const mergedArray = new Uint8Array(arrayOne.length + arrayTwo.length);
  mergedArray.set(arrayOne);
  mergedArray.set(arrayTwo, arrayOne.length);
  data = mergedArray;

  //console.log("response", data, data[5], e.data.getUint8(5), e.data.getUint16(10,true));
  switch (data[5]) {
    case GD.measurementType.NORMAL_REAL32: {
      const response = new DataView(data.buffer);
      console.log("NORMAL_REAL32", response.getFloat32(10, true));
      break;
    }
    case GD.measurementType.WIDE_REAL32:
      console.log("WIDE_REAL32");
      break;
    case GD.measurementType.APERIODIC_REAL32:
      console.log("APERIODIC_REAL32");
      break;
    case GD.measurementType.SINGLE_CHANNEL_REAL32:
      console.log("SINGLE_CHANNEL_REAL32");
      break;
    case GD.measurementType.SINGLE_CHANNEL_INT32:
      console.log("SINGLE_CHANNEL_INT32");
      break;
    case GD.measurementType.APERIODIC_INT32:
      console.log("APERIODIC_INT32");
      break;
    case GD.measurementType.START_TIME:
      console.log("START_TIME");
      break;
    case GD.measurementType.DROPPED:
      console.log("DROPPED");
      break;
    case GD.measurementType.PERIOD:
      console.log("PERIOD");
      break;
    case 85: {
      console.log("GET_INFO", data);
      // OrderCode offset = 6 (header+cmd+counter)
      // Ordercode length = 16
      const orderCode = decoder.decode(
        new Uint8Array(data.slice(6, 6 + 16)).filter(nonZero)
      );
      // SerialNumber offset = 22 (OrderCode offset + Ordercode length)
      // SerialNumber length = 16
      const serialNumber = decoder.decode(
        new Uint8Array(data.slice(22, 22 + 16)).filter(nonZero)
      );
      // DeviceName offset = 38 (SerialNumber offset + SerialNumber length)
      // DeviceName length = 32
      const name = decoder.decode(
        new Uint8Array(data.slice(38, 38 + 32)).filter(nonZero)
      );
      console.log("GET_INFO:", orderCode, serialNumber, name);
      break;
    }
    case 80: {
      console.log("GET_SENSOR_INFO", data);
      const response = new DataView(new Uint8Array(data).buffer);
      console.log("sensorId", response.getUint32(2, true));
      console.log("type", response.getUint8(6)); // 0 = Real64 or 1 = Int32
      console.log("mode", response.getUint8(7)); // 0 = Periodic, 1 = Aperiodic
      console.log("minValue", response.getFloat64(108, true));
      console.log("maxValue", response.getFloat64(116, true));
      console.log("uncertainty", response.getFloat64(100, true));
      console.log("minPeriod", response.getUint32(124, true) / 1000);
      console.log(
        "maxPeriod",
        ((response.getUint32(132, true) << 32) +
          response.getUint32(128, true)) /
          1000
      );
      console.log("typicalPeriod", response.getUint32(136, true) / 1000);
      console.log("granularity", response.getUint32(140, true) / 1000);
      console.log("number", response.getUint8(0));
      // sensorDescription offset = 14 (6 bytes (header+cmd+counter) + 8 bytes (other fields))
      // sensorDescription length = 60
      console.log(
        "name",
        decoder.decode(new Uint8Array(response.buffer, 14, 60).filter(nonZero))
      );
      // sensorUnit offset = 74 (sensorDescription offset + sensorDescription length)
      // sensorUnit length = 32
      console.log(
        "unit",
        decoder.decode(new Uint8Array(response.buffer, 74, 32).filter(nonZero))
      );
      console.log("mutalExclusionMask", response.getUint32(144, true));
      break;
    }
    default:
      console.log("unknown event", data[5], data);
  }
}

navigator.hid.addEventListener("disconnect", handleDisconnectedDevice);
let commands = [];
//commands.push([25, 0x58, 25, 254, 63, 26, 165, 74, 6, 73, 7, 72, 8, 71, 9, 70, 10, 69, 11, 68, 12, 67, 13, 66, 14]);
// COMPULSORY, don't get sent data without this
commands.push(constructCommand(GD.commands.INIT));
// not sure what this is, seems too short (no checksum). Ignore
//commands.push([5, 0x58, 5, 253]);
//commands.push(constructCommand(GET_INFO));
//commands.push([5, 0x58, 5, 252, 174, 0x55]);
//commands.push(constructCommand(GET_DEFAULT_SENSORS_MASK));
//commands.push([5, 0x58, 5, 251, 174, 0x56]);
//commands.push(constructCommand(GET_SENSOR_IDS));
//commands.push([5, 0x58, 5, 250, 168, 0x51]);
//commands.push(constructCommand(getSensorInfoCommand(1/* TODO what is this? */)));
//commands.push([6, 0x58, 6, 249, 168, 0x50, 1]);
//commands.push(constructCommand(getMeasurementPeriodCommand(500000)));
//commands.push([15, 0x58, 15, 248, 65, 0x1b, 255, 0, 32, 161, 7, 0, 0, 0, 0, 0]);
// COMPULSORY, don't get sent data without this
commands.push(
  constructCommand(
    getStartMeasurementCommand(1 /* channelMask TODO, 1 = temperature? */)
  )
);
//commands.push([19, 0x58, 19, 247, 124, 0x18, 255, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
function sendCommands() {
  // remove first element
  let command = commands.shift();
  if (command) {
    // WebHID
    //device.sendReport(0, new Uint8Array(command)).then((response) => {
    //    // for Go Direct don't get anything useful in response
    // keep sending util stack empty
    //    sendCommands();
    //});
    // Web Bluetooth
    // remove first byte
    command.shift();
    const service = services[0];
    service.getCharacteristic(CHARACTERISTIC_COMMAND).then((characteristic) => {
      characteristic.writeValue(new Uint8Array(command));
      console.log("message sent ", command);
      // keep sending util stack empty
      // TODO: should really wait for response from first command
      window.setTimeout(sendCommands, 100);
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function init() {
  //let outputReportId = 0x01;
  //let outputReport = new Uint8Array([42]);
  navigator.bluetooth
    .requestDevice({
      filters: [
        {
          namePrefix: "GDX",
        },
      ],
      optionalServices: [SERVICE],
    })
    .then((device0) => {
      const device = device0;
      console.log("connected to " + device.name);
      device.gatt
        .connect()
        .then((server) => {
          return server.getPrimaryService(SERVICE);
        })
        .then((service) => {
          console.log("Getting Characteristics...", service);
          services.push(service);
          return service.getCharacteristics();
        })
        .then((characteristics) => {
          console.log(
            "characteristics",
            characteristics,
            characteristics.length
          );
          for (let i = 0; i < characteristics.length; i++) {
            let characteristic = characteristics[i];
            switch (characteristic.uuid) {
              case CHARACTERISTIC_COMMAND:
                // Store for future use?
                // window.deviceCommand = characteristic;
                break;
              case CHARACTERISTIC_RESPONSE:
                // Store for future use?
                // window.deviceResponse = characteristic;
                characteristic.addEventListener(
                  "characteristicvaluechanged",
                  function (event) {
                    handleInputReport(event);
                  }
                );
                characteristic.startNotifications().then(() => {
                  console.log("started OK");
                  sendCommands();
                });
                console.log("listener added");
                break;
              default:
                console.log("No case found for " + characteristic.uuid);
            }
          }
        });
    });
}
// https://stackoverflow.com/questions/22946367/converting-twos-complement-output-to-signed-decimal
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function twosComplement(val) {
  return 0x8000 & val ? (0x7fff & val) - 0x8000 : val;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function sendMessage(message: Array<number>) {
  // WebHID protocol sends length as first byte
  // Bluetooth doesn't - remove it
  message.shift();
  const service = services[0];
  service.getCharacteristic(CHARACTERISTIC_COMMAND).then((characteristic) => {
    characteristic.writeValue(new Uint8Array(message));
    console.log("message sent ", message);
  });
}

export function register() {
  // TODO
}
