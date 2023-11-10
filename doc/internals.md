# Library internals

The return types are simplified in the section headings here.  The
methods are often asynchronous and some of them can also return null
under some conditions.


## Writing a new driver

A driver author must write two related classes:

* a subclass of `BrowserDeviceDriver`; that subclass must implement
  the method `tryProvideDevice()`, which returns an instance of:
* a subclass of `BrowserHandledDevice`; that subclass must implement
  the `sendMessage()` method, and also use the provided base-class
  method `BrowserHandledDevice.enqueueReports()` to store reports
  ready for retrieval by the user.

Although conceptually this work is done for each driver individually,
in practice there is a lot of common logic between all HID drivers,
and similarly between all Bluetooth LE drivers.  Therefore there is an
intermediate layer of _substrates_, each of which contains the logic
for dealing with a particular communication mechanism (currently, HID
and Bluetooth are implemented; others should fit into the general
design).  These take the form of base classes from which individual
drivers are derived.  E.g., `Attack3_Driver` is a subclass of
`HidDeviceDriver` which in turn is a subclass of
`BrowserDeviceDriver`, and likewise `Attack3_Device` is a subclass of
`HidHandledDevice` which in turn is a subclass of
`BrowserHandledDevice`.


## Operation of `tryProvideLease(⋯): DeviceLeaseChannel`

The session just chains to the manager.  The manager:

Asks each registered driver in turn to try to provide a device
matching the specifier, via the driver's `tryProvideDevice()` method.
The manager uses the first `BrowserHandledDevice` (as opposed to
`null`) it gets from a driver.  The manager then creates a lease
within the calling session for that device.  If no drivers can provide
a device, return `null`.


## `tryProvideDevice(⋯): BrowserHandledDevice`

This relies on various methods which must be implemented by
subclasses.  The intermediate classes for HID and Bluetooth substrates
do so as follows.

### Methods common to HID and Bluetooth LE drivers

* `canProvide(specifier): boolean` — can this driver, in general,
  provide a device matching the specifier?
* `canHandleDevice(device, specifier): boolean` — can this driver
  handle this particular device, given that the request was for
  something matching the given specifier?
* `deviceClass(): HandledDeviceConstructor` — instances of what
  JavaScript class should be created to handle particular concrete
  devices under this driver?

(The `HandledDeviceConstructor` type is different for the two
substrates.  It deals with HID devices or Bluetooth LE devices as
appropriate.)

### HID `tryProvideDevice(⋯)`

Checks whether the user has already given permission for a device
satisfying the specifier, and returns a _handled device_ wrapping it
if so.  Otherwise, ask the user for permission to use a suitable
device.

Relies on the following methods which the particular driver subclass
must implement:

* `filtersFromSpecifier(specifier): Array<HIDDeviceFilter>` — what HID
  filters should be used to find devices which this driver can handle,
  under the given specifier?

Some more details are in the docstrings for this method.

### Bluetooth LE `tryProvideDevice(⋯)`

It seems we ought to be able to use a device which the user has
already given permission for and which is in radio range, but this was
unreliable in practice.  Instead the browser always asks the user to
grant permission to a device.

Relies on the following methods:

* `handledCharacteristics(): Array<ScopedCharacteristics>` — what
  Bluetooth characteristics does this driver handle (expressed as an
  array of (service-UUID, array-of-characteristic-UUIDs) pairs)?
* `namePrefix(): string` — what name prefix should be used to find
  devices which this driver can handle?

Some more details are in the docstrings for these methods.

## `BrowserHandledDevice` subclasses

From the user's point of view, they only use a `BrowserHandledDevice`
via its `DeviceLeaseChannel` interface.  Implementors can call the
method `enqueueReports()` to store reports which the user will in due
course retrieve via `drainReports()`.
