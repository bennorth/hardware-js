# Status of this project

The code here is approximately at "proof of concept" level of
maturity.  Several pieces are only sketched.  The design is outlined
in separate files within `doc/`.

The motivating use-case for this library is to support physical
hardware within the [Python / GeoGebra
system](https://www.geogebra.org/python/).  The API between hardware
devices and the web app client was designed with this in mind, but
should be fairly general.


## Work still to do

There are several areas where this code is incomplete.

### Communication from browser to device

For several devices, we need to be able to send information _to_ them,
as well as receive information from them.  For HID devices, this takes
the form of sending them `OutputReport`s.  For Bluetooth devices,
there is a writeable characteristic (or several).  Sometimes this is
an aspect of the device which the user needs to be able to control,
and sometimes it's purely internal, such as configuring a device, or
requesting a sensor device to send the current reading.

For user-exposed browser-to-device communication, the general design
idea is to support `device.sendMessage(msg)` where `msg` is a
string-keyed object.  The individual device driver is responsible for
decoding that object and communicating with the device.

### Support for additional "substrates"

Currently, there is code to support devices which communicate over:

* Bluetooth LE
* WebHID (although see also below)

There are devices which communicate over other transports, and it
would be good to support those too.  Other mechanisms include:

* WebSerial
* Gamepad
* WebUSB
* WebMIDI

### Explore custom devices

E.g., a Circuit Playground Express with firmware allowing
communication over whichever of serial, HID, or general WebUSB turns
out to be most convenient.

### General HID support

Ideally the code would parse the report descriptors rather than having
hard-coded decoders for individual devices; however, this is not a
trivial undertaking.  See notes in `HID-report-descriptors.md`.

### Define concept of "specifier"

The idea was that the user can ask for "any joystick", or "this
particular heartrate monitor", or "anything connected over serial
which sends GPS messages".  Currently a "specifier" is just a string
which is compared against known literals.

### Reconnect to already-permitted Bluetooth devices

The HID substrate can provide a device from those for which the user
has already given permission, if one meets the requirements.  In
theory, Bluetooth also supports this kind of feature, but as of time of
writing, it requires a feature flag to be turned on in Chrome, and
also seems unreliable on Linux, so was not fully pursued.  See also
the reference in `resources.md`.

### Error handling

Currently, if the session can not provide a lease to a device matching
the specifier, it returns `null`.  Is this reasonable?  Should it
instead throw an error?  In the motivating use case of in-browser
Python integration, what is better for the user: a `None` return value
or an exception?

### Requesting multiple devices

If you request two devices, one after the other, and the user needs to
grant permission for them using the browser's dialog, then the second
request fails because the call to `requestDevice()` isn't directly in
response to a user gesture.

Within the webapp, should we instead have a separate UI step to
_connect_ to a device, which invokes the user-permission dialog?
After doing this, the device is available directly to JavaScript,
which would dodge the problem.

### Testing

This could be tricky.  Do we mock all the different types of error and
device we might get back from the browser?
