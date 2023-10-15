import { BrowserDeviceSpecifier, StringKeyedObject } from "../core-types";
import { BrowserDeviceManager } from "../manager";
import { HidDeviceDriver, HidHandledDevice } from "../substrates/hid";

const kVendorIdsWithProductIds = [
  {
    // 'Controller (XBOX 360 For Windows)'
    vendorId: 0x045e,
    productId: 0x028e,
  },
  {
    // 'Controller (Xbox One For Windows)'
    vendorId: 0x045e,
    productId: 0x02ff,
  },
];

const kDirections = ["None", "N", "NE", "E", "SE", "S", "SW", "W", "NW"];

class XboxController_Device extends HidHandledDevice {
  acceptInputReport(event: HIDInputReportEvent): Array<StringKeyedObject> {
    const data = new Uint8Array(event.data.buffer);

    const xLeft = data[1] + data[0] / 256;
    const yLeft = data[3] + data[2] / 256;
    const xRight = data[5] + data[4] / 256;
    const yRight = data[7] + data[6] / 256;

    // maybe this works to get separate values
    // https://github.com/ViGEm/ViGEmBus/issues/40#issuecomment-619889180
    const ltMinusRt = data[9];

    // TODO: what is this?
    // (data[8] & 128) == 1;

    const buttonA = (data[10] & 0x01) === 0x01;
    const buttonB = (data[10] & 0x02) === 0x02;
    const buttonX = (data[10] & 0x04) === 0x04;
    const buttonY = (data[10] & 0x08) === 0x08;
    const buttonLB = (data[10] & 0x10) === 0x10;
    const buttonRB = (data[10] & 0x20) === 0x20;
    const buttonView = (data[10] & 0x40) === 0x40;
    const buttonMenu = (data[10] & 0x80) === 0x80;
    const stickLeft = (data[11] & 0x01) === 0x01;
    const stickRight = (data[11] & 0x02) == 0x02;

    const direction = data[11]
      ? kDirections[data[11] / 4] // eg 'Controller (XBOX 360 For Windows)'
      : kDirections[data[12]]; // assume 'Controller (Xbox One For Windows)'

    return [
      {
        xLeft,
        yLeft,
        xRight,
        yRight,
        ltMinusRt,
        buttonA,
        buttonB,
        buttonX,
        buttonY,
        buttonLB,
        buttonRB,
        buttonView,
        buttonMenu,
        stickLeft,
        stickRight,
        direction,
      },
    ];
  }
}

class XboxController_Driver extends HidDeviceDriver {
  canProvide(spec: BrowserDeviceSpecifier) {
    return spec === "Xbox Controller";
  }

  canHandleDevice(
    device: HIDDevice,
    _specifier: BrowserDeviceSpecifier
  ): boolean {
    return kVendorIdsWithProductIds.some(
      (ids) =>
        ids.vendorId === device.vendorId && ids.productId === device.productId
    );
  }

  filtersFromSpecifier(
    _specifier: BrowserDeviceSpecifier
  ): Array<HIDDeviceFilter> {
    return kVendorIdsWithProductIds;
  }

  deviceClass() {
    return XboxController_Device;
  }
}

export function register(manager: BrowserDeviceManager) {
  manager.registerDriver(new XboxController_Driver());
}
