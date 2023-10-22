# How to use the library

## Create a `BrowserDeviceManager`

Webapps use this library by first creating a `BrowserDeviceManager`.
The preferred way to do this is to call the function
`createBrowserDeviceManager()`, which provides a
`BrowserDeviceManager` with the existing drivers already registered.

``` javascript
const browserDeviceManager = createBrowserDeviceManager();
```

## Get a `BrowserDeviceSession` from the `BrowserDeviceManager`

Access to individual browser-accessible devices happens through a
`BrowserDeviceSession`.  To obtain one:

``` javascript
const browserDeviceSession = browserDeviceManager.createSession("main session");
```

The string argument is a display name, intended for diagnostic
purposes, but not currently used.

## Ask the session to provide a `DeviceLeaseChannel` on a device

This is an asynchronous process, and sometimes involves asking the
user for permission to access a particular device.  It must be done in
response to a user gesture, e.g., clicking on a button.

``` javascript
const joystick = await browserDeviceSession.tryProvideLease("Attack III");
```

The _try_ indicates that this method returns `null` if it is not
possible to provide such a device.

> The argument is a _specifier_.  Currently there is a fixed list of
> recognised strings.  A proper design of the concept and meaning of
> a specifier is not yet done.

If the session can provide such a device, `joystick` will be a
`DeviceLeaseChannel`, which is an object which can transport
information from and to the device.  Information from the device
consists of reports such as the current position of a joystick or the
current temperature.  Information to the device consists of commands
such as to turn on a particular LED.

In creating such a lease, the library registers suitable event
handlers to be notified of reports from the device and store them in a
queue ready for retrieval by the webapp; see next.

## Periodically retrieve reports from the device

On a schedule at the discretion of the webapp, fetch any reports from
the device.  This is a synchronous operation:

``` javascript
const reports = joystick.drainReports();
```

The verb _drain_ indicates that the webapp has now taken ownership of
the reports and emptied the internal queue.

## Process reports from the device

The returned `reports` value is an array of objects, whose properties
depend on the device.  For example, a jopystick might provide a report
with number-valued `x` and `y` properties.

## Send commands to the device

(Not yet implemented.)

To control the device, tell it to accept a command:

``` javascript
joystick.acceptCommand(command);
```

The argument `command` is a plain object, whose properties are
interpreted according to the specifics of the device.  For example, an
RGB LED might accept commands of the form `{r: 255, g: 128, b: 0}`.

## Close the session when finished

To release all leased devices for use by another session, close your
session:

``` javascript
browserDeviceSession.close();
```
