import { BrowserDeviceSpecifier, StringKeyedObject } from "../core-types";
import { BrowserDeviceManager } from "../manager";
import { HidDeviceDriver, HidHandledDevice } from "../substrates/hid";

// Product name 'USB Gamepad '
// https://www.amazon.co.uk/dp/B09VCJ5Q6X
const kVendorId = 0x0079;
const kProductId = 0x0011;

class DanceMat_Device extends HidHandledDevice {
  acceptInputReport(event: HIDInputReportEvent): Array<StringKeyedObject> {
    const bs0 = event.data.getUint8(4);
    const bs1 = event.data.getUint8(5);
    const bs2 = event.data.getUint8(6);

    const center = (bs0 & 0x80) === 0x80;

    const west = (bs1 && 0x10) === 0x10;
    const south = (bs1 && 0x20) === 0x20;
    const north = (bs1 && 0x40) === 0x40;
    const east = (bs1 && 0x80) === 0x80;

    const southEast = (bs2 && 0x01) === 0x01;
    const southWest = (bs2 && 0x02) === 0x02;

    const select = (bs2 && 0x10) === 0x10;
    const start = (bs2 && 0x20) === 0x20;

    return [
      { center, west, south, north, east, southEast, southWest, select, start },
    ];
  }
}

class DanceMat_Driver extends HidDeviceDriver {
  canProvide(spec: BrowserDeviceSpecifier) {
    // TODO: Do this properly, once decided on spec format.
    return spec === "Dance Mat";
  }

  canHandleDevice(
    device: HIDDevice,
    _specifier: BrowserDeviceSpecifier
  ): boolean {
    return device.vendorId === kVendorId && device.productId === kProductId;
  }

  filtersFromSpecifier(
    _specifier: BrowserDeviceSpecifier
  ): Array<HIDDeviceFilter> {
    return [{ vendorId: kVendorId, productId: kProductId }];
  }

  deviceClass() {
    return DanceMat_Device;
  }
}

export function register(manager: BrowserDeviceManager) {
  manager.registerDriver(new DanceMat_Driver());
}
