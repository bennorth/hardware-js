const SERVICE_UUID_TX = "4a5c0001-0000-0000-0000-5c1e741f1c00";
const CHARACTERISTIC_TX = "4a5c0001-0002-0000-0000-5c1e741f1c00";
const SERVICE_UUID_RX = "4a5c0000-0000-0000-0000-5c1e741f1c00";
const CHARACTERISTIC_RX = "4a5c0000-0003-0000-0000-5c1e741f1c00";

const namePrefix = "Temperature 127-228>";

let serviceTX: BluetoothRemoteGATTService;
let serviceRX: BluetoothRemoteGATTService;
let device: BluetoothDevice;
let characteristicTX: BluetoothRemoteGATTCharacteristic;
let characteristicRX: BluetoothRemoteGATTCharacteristic;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleDisconnect() {
  console.log("Connection lost. Device disconnected.");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function disconnectFromDevice() {
  if (device && device.gatt.connected) {
    device.gatt.disconnect();
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function forgetDevice() {
  if (device) {
    device.forget();
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function discoverDevices() {
  console.log("discoverDevices");

  // name is eg "Pico 28:CD:C1:0B:EA:62"
  const filters = [{ namePrefix }];
  let options: RequestDeviceOptions = {
    filters,
    optionalServices: [SERVICE_UUID_TX, SERVICE_UUID_RX],
  };
  device = await navigator.bluetooth.requestDevice(options);
  console.log("> Name:" + device.name);
  console.log("> Id:" + device.id);
  console.log(device);
  await connectToDevice(device);
  console.log("Notifications have been started.");
}

async function connectToDevice(device: BluetoothDevice) {
  device.addEventListener("gattserverdisconnected", onDisconnected);
  console.log("Connecting to GATT Server...");
  const server = await device.gatt.connect();
  console.log("Getting TX Service...");
  serviceTX = await server.getPrimaryService(SERVICE_UUID_TX);
  console.log("Getting TX Characteristic...");
  characteristicTX = await serviceTX.getCharacteristic(CHARACTERISTIC_TX);
  console.log("Getting RX Service...");
  serviceRX = await server.getPrimaryService(SERVICE_UUID_RX);
  console.log("Getting RX Characteristic...");
  characteristicRX = await serviceRX.getCharacteristic(CHARACTERISTIC_RX);
  characteristicRX.addEventListener("characteristicvaluechanged", handleData);
  console.log("Enabling notifications...");
  await characteristicRX.startNotifications();
  console.log("Connected to " + device.name);
  requestTemperature();
}

function sendCommand(message: Array<number>) {
  console.log("sending message ", message);
  characteristicTX.writeValue(new Uint8Array(message));
}

function requestTemperature() {
  sendCommand([0x05, 0x02]);
  // auto update every 1000ms
  setTimeout(requestTemperature, 1000);
}
/* Calibration values
	c00005 206e = 28.7 28192
c00005 646d = 28.2 28004
c00005 8c6c = 27.7 27788
c00005 9c4a = 4.4 19100
c00005 5c4b = 4.9 19292
c00005 9c4b = 5.0 19356
c00005 b44b = 5.1 19380
c00005 6cad = 72.2 44396

NameTag="UncalTemperature" UnitType="DegC" Equation="([0]/172.463)-40" Internal="1"/>
 Equation="(([1]/65536)*165)-40"
*/
function handleData(event: Event) {
  const target = event.target as BluetoothRemoteGATTCharacteristic;
  const data = new Uint8Array(target.value.buffer);
  console.log(data);
  if (data.length == 5) {
    if (data[0] == 0xc0 && data[1] == 0x00 && data[2] == 0x05) {
      //var temp = ((data[4] * 256 + data[3]) - 17468.82) / 373.01;
      const temp = (data[4] * 256 + data[3] - 16981) / 390;
      console.log("Temperature = " + temp.toFixed(1) + "°C");
    }
  }
}

function onDisconnected(event: Event) {
  const device = event.target as BluetoothDevice;
  console.log(`Device ${device.name} is disconnected.`);
}

// https://docs.google.com/document/d/1RF4D-60cQJWR1LoQeLBxxigrxJwYS8nLOE0qWmBF1eo/edit
// try to connect to existing device
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getPermittedBluetoothDevices() {
  let devices = await navigator.bluetooth.getDevices();
  for (let device0 of devices) {
    // Start a scan for each device before connecting to check that they're in
    // range.
    let abortController = new AbortController();
    await device0.watchAdvertisements({
      signal: abortController.signal,
    });
    device0.addEventListener("advertisementreceived", async (evt) => {
      // Stop the scan to conserve power on mobile devices.
      abortController.abort();
      // Advertisement data can be read from |evt|.
      /*
      let deviceName = evt.name;
      let uuids = evt.uuids;
      let appearance = evt.appearance;
      let pathloss = evt.txPower - evt.rssi;
      let manufacturerData = evt.manufacturerData;
      let serviceData = evt.serviceData;
      */
      if (evt.device.name.startsWith(namePrefix)) {
        console.log("Found previously connected device " + device0.name);
        // At this point, we know that the device is in range, and we can attempt
        // to connect to it.
        device = evt.device;
        await connectToDevice(device);
      } else {
        console.log(
          "Ignoring device " +
            device0.name +
            " as it doesn't start with " +
            namePrefix
        );
      }
    });
  }
}

export function register() {
  // TODO
}
