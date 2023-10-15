# Brief notes on HID report descriptors

It should be possible to automatically parse HID reports, which in
theory lets you understand reports from any HID device without having
to write a driver just for it.  This article gives a good overview
from the Linux kernel perspective:

* [Introduction to HID report descriptors](https://www.kernel.org/doc/html/next/hid/hidintro.html)

From that article we can tell that (surprise surprise) not all
manufacturers implement it correctly, so sometimes you have to fudge
round bad reports or descriptors.

The reference docs from the USB people are available here:

* [The USB HID docs](https://www.usb.org/hid)
* In particular: [The HID Usage Tables ("HUT") doc](https://www.usb.org/sites/default/files/hut1_4.pdf)

Here’s the Wireshark code for parsing those descriptors and packets to
give a sense for what’s involved:

* [Wireshark USB HID dissector](https://gitlab.com/wireshark/wireshark/-/blob/master/epan/dissectors/packet-usb-hid.c)

(long, although well over half is tables of strings from the spec
docs).

The browser does a lot of the work of parsing those descriptors from
their binary form, so for example when I plug in the Logitech Attack III
joystick I have, the `HIDDevice` instance I get has

```
device.collections[0].inputReports[0].items
```

as a 3-element array. The elements have quite a lot of properties, but
we can pick out:

```
items[0] = {
  isConstant: false,
  reportCount: 3,
  reportSize: 8,
  logicalMinimum: 0,
  logicalMaximum: 255,
  usages: [65584, 65585, 65586]
}
```

The first 3 (=`reportCount`) values take 8 (=`reportSize`) bits each,
taking on values between 0 (=`logicalMinimum`) and 255
(=`logicalMaximum`), and are for Usages 0x10030 (=65584), 0x10031
(=65585), 0x10032 (=65586). These Usage values are given as 32-bit
values, to be split into two 16-bit values, so 0x10030 is (0x0001,
0x0030), with the high-order half being Usage Page, and low-order half
being Usage within that page.  So here, Usage Page 0x0001 = Generic
Desktop; Usage 0x0030 (of Generic Desktop) = “X”.  The other two are
(Generic Desktop, Y) and (Generic Desktop, Z).  See §3 of [the “HUT”
doc](https://www.usb.org/sites/default/files/hut1_4.pdf) for Usage
Page list, and §4 for Usage list within Generic Desktop.

```
items[1] = {
  isConstant: false,
  reportCount: 11,
  reportSize: 1,
  usageMinimum: 589825,
  usageMaximum: 589835
}
```

The next 11 (=`reportCount`) values take 1 (=`reportSize`) bit each,
and are for Usages between 0x90001 (=589825) and 0x9000b (=589835)
inclusive.  These are all within Usage Page 0x0009 = Button, with
Usages from 0x0001 = “Button 1” up to 0x000b = “Button 11” inclusive.
(See §3 and §12 of the HUT doc.)

```
items[2] = {
  isConstant: true,
  reportCount: 5,
  reportSize: 1,
  usages: []
}
```


The next 5 (=reportCount) values of 1 (=`reportSize`) bit each are not
in fact reporting anything.  They’re constant (=`isConstant`) padding,
bringing the report up to a multiple of 8 bits.  They represent no
Usages.

I haven’t fully delved into the exact semantics of “collections”.
