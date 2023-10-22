import { BrowserDeviceSpecifier, StringKeyedObject } from "../core-types";
import { BrowserDeviceDriver } from "../driver-interfaces";
import { BrowserHandledDevice } from "./common";
import { BrowserDeviceManager } from "../manager";

// Subclasses:
//
// BleDeviceDriver : BrowserDeviceDriver
// BleHandledDevice : BrowserHandledDevice
//
// Concrete Bluetooth device drivers must implemented subclasses of
// those.

export class BleHandledDevice extends BrowserHandledDevice {
  // Private use only:
  constructor(readonly device_: BluetoothDevice) {
    super();
  }

  browserDevice(): BluetoothDevice {
    return this.device_;
  }

  closeBrowserDevice(): void {
    // TODO: Can we do anything if no gatt?
    this.device_.gatt?.disconnect();
  }

  ////////////////////////////////////////////////////////////////////////
  // Concrete device implementations must implement the following.
  //
  acceptCharacteristicValue(
    _serviceUuid: BluetoothServiceUUID,
    _charUuid: BluetoothCharacteristicUUID,
    _value: DataView
  ): Array<StringKeyedObject> {
    throw new Error(
      "BleHandledDevice.acceptCharacteristicValue(): not implemented"
    );
  }
  ////////////////////////////////////////////////////////////////////////
}

export type ScopedCharacteristics = {
  serviceUuid: BluetoothServiceUUID;
  charUuids: Array<BluetoothCharacteristicUUID>;
};

type HandledDeviceConstructor = new (
  device: BluetoothDevice
) => BleHandledDevice;

export class BleDeviceDriver implements BrowserDeviceDriver {
  ////////////////////////////////////////////////////////////////////////
  // Concrete device drivers must implement the following.
  //
  canProvide(_specifier: BrowserDeviceSpecifier): boolean {
    throw this._notImplementedError("canProvide");
  }
  //
  canHandleDevice(
    _device: BluetoothDevice,
    _specifier: BrowserDeviceSpecifier
  ): boolean {
    throw this._notImplementedError("canHandleDevice");
  }
  //
  deviceClass(): HandledDeviceConstructor {
    throw this._notImplementedError("deviceClass");
  }
  //
  handledCharacteristics(): Array<ScopedCharacteristics> {
    throw this._notImplementedError("handledCharacteristics");
  }
  //
  namePrefix(): string {
    throw this._notImplementedError("namePrefix");
  }
  ////////////////////////////////////////////////////////////////////////

  /** Compute and return an array holding the service-Uuids which this
   * device is interested in.  TODO: Is this nested structure the best
   * way to represent this? */
  handledServiceUuids(): Array<BluetoothServiceUUID> {
    console.log("handledServices()", this, this.handledCharacteristics);
    // Use set in case some services appear more than once.
    const serviceUuids = new Set(
      this.handledCharacteristics().map((x) => x.serviceUuid)
    );
    return Array.from(serviceUuids);
  }

  /** Construct a new event listener for the given characteristic under
   * the given service on the given device.  The listener uses the
   * `handledDevice` to translate the characteristic value into an array
   * of normalised objects. */
  newCharValueListener(
    handledDevice: BleHandledDevice,
    serviceUuid: BluetoothServiceUUID,
    charUuid: BluetoothCharacteristicUUID
  ) {
    console.log("constructing event listener for ble-device", handledDevice);
    return (event: Event) => {
      console.log("driver listener", event);
      if (event.target == null) {
        return;
      }

      const target = event.target as BluetoothRemoteGATTCharacteristic;
      if (target.value == null) {
        return;
      }

      handledDevice.enqueueReports(
        handledDevice.acceptCharacteristicValue(
          serviceUuid,
          charUuid,
          target.value
        )
      );
    };
  }

  /** Set up listeners for updates of all characteristic values of
   * interest to the given `device`.  */
  async connectCharacteristicValueListeners(handledDevice: BleHandledDevice) {
    const device = handledDevice.browserDevice();
    console.log("connectCharacteristicValueListeners(): awaiting connect()");
    const server = await device.gatt?.connect();
    console.log("connectCharacteristicValueListeners(): connect() done");
    if (server == null) {
      throw new Error("BleDeviceDriver(): could not connect to gatt");
    }

    const abortSignal = handledDevice.eventListenerAbortController.signal;
    for (const { serviceUuid, charUuids } of this.handledCharacteristics()) {
      // TODO: Check what error we get if the device doesn't offer this
      // service.  This really shouldn't happen, because we included
      // these services as a filter in our requestDevice() call.
      const service = await server.getPrimaryService(serviceUuid);
      console.log("got service", service, "for", serviceUuid);
      for (const charUuid of charUuids) {
        // TODO: Where should we handle the NotFoundError which gets
        // thrown if the service does not have this characteristic?
        const characteristic = await service.getCharacteristic(charUuid);
        console.log("got char", characteristic, "for", charUuid);

        if (characteristic.properties.notify) {
          const listener = this.newCharValueListener(
            handledDevice,
            serviceUuid,
            charUuid
          );

          // After quite a bit of experimentation, the evidence is quite
          // strong that different event listeners can usually not be
          // added while notifications are running.  It seems that
          // sometimes just waiting a while lets you add an event
          // listener but not always.

          // TODO: Work out if there's something better we can do with
          // signal.  TypeScript thinks there is no overload of
          // addEventListener("characteristicvaluechanged", ...) which
          // takes an options arg.
          abortSignal.addEventListener("abort", () =>
            characteristic.removeEventListener(
              "characteristicvaluechanged",
              listener
            )
          );

          await characteristic.stopNotifications();
          characteristic.addEventListener(
            "characteristicvaluechanged",
            listener
          );
          await characteristic.startNotifications();
        }
      }
    }
  }

  /** (Internal use.)  Construct a handled-BLE-device for the given raw
   * bluetooth device. */
  async createHandledDevice(
    device: BluetoothDevice
  ): Promise<BleHandledDevice> {
    const deviceClass = this.deviceClass();
    const handledDevice = new deviceClass(device);
    await this.connectCharacteristicValueListeners(handledDevice);
    return handledDevice;
  }

  async tryProvideDevice(
    _manager: BrowserDeviceManager,
    specifier: BrowserDeviceSpecifier
  ): Promise<BleHandledDevice | null> {
    console.log("BLE tryProvideDevice()", specifier);
    if (!this.canProvide(specifier)) {
      console.log("can't provide");
      return null;
    }

    // We did experiment with using navigator.bluetooth.getDevices() to
    // find a device the user has already permitted us to access, and
    // then connect to that device.  However, this did not work
    // reliably, so for now we are accepting that the user will
    // encounter the pop-up permissions dialog when using a BT device.

    // eslint-disable-next-line no-constant-condition
    while (true) {
      console.log("attempting requestDevice()");

      // Accept devices which either provide the right services or have
      // the right name-prefix.
      const filters = [
        { services: this.handledServiceUuids() },
        { namePrefix: this.namePrefix() },
      ];
      const optionalServices = this.handledServiceUuids();
      const requestOptions = { filters, optionalServices };
      const rawDevice = await navigator.bluetooth.requestDevice(requestOptions);

      console.log("working with rawDevice", rawDevice);

      // TODO: Is this the right test for "this device is in use?"
      if (rawDevice.gatt && !rawDevice.gatt.connected) {
        console.log("============= returning available rawDevice", rawDevice);
        return await this.createHandledDevice(rawDevice);
      }

      // Someone else has the device open.
      return null;
    }
  }

  /** Whether the given `device` has a `name` which starts with this
   * device-driver's `namePrefix()`.  Intended to be useful for
   * subclasses' `canHandleDevice()` implementations. */
  hasThisNamePrefix(device: BluetoothDevice): boolean {
    const name = device.name ?? "";
    return name.startsWith(this.namePrefix());
  }

  _notImplementedError(methodName: string) {
    return new Error(`BleDeviceDriver.${methodName}(): not implemented`);
  }
}
