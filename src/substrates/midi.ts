// also see https://www.onlinemusictools.com/webmiditest/ for nice simple demo
// and https://jazz-soft.net/download/web-midi/web-midi-test.html

function processMessage(msg: MIDIMessageEvent) {
  const data = msg.data;
  const command = data[0];
  switch (command) {
    case 128: // note released (not returned by Alesis Q Mini)
    case 144: // note pressed/released
      if (data[2] == 0 || command == 128) {
        console.log("note = " + getNoteName(data[1]) + " released");
      } else {
        // 60 = Middle C
        console.log(
          "note = " + getNoteName(data[1]) + " velocity = " + data[2]
        );
      }
      break;
    case 176: // Alesis Q Mini
      if (data[1] == 7) {
        console.log("volume set to " + data[2] + "/127");
      } else if (data[1] == 1) {
        // "MOD" Modulation button returns higher and higher values the longer it's pressed
        // then back to 0 when released
        console.log("Modulation set to " + data[2] + "/127");
      } else if (data[1] == 64) {
        // "SUST" Sustain button - toggles on/off
        console.log("Sustain " + (data[2] == 0 ? "off" : "on"));
      } else {
        console.log(msg.data);
      }
      break;
    case 224: // Alesis Q Mini
      // <PB button starts at 64 and returns lower and lower values down to 0
      // PB> button starts at 64 and returns higher and higher values up to 127
      // both return to 64 when released
      console.log("Pitch bend set to " + data[2]);
      break;
    default:
      console.log("Unknown command", msg.data);
      break;
  }
}

let webMidi: MIDIAccess;
let midiInputs = [];
let midiOutputs = [];

navigator.requestMIDIAccess().then((midiAccess) => {
  webMidi = midiAccess;
  webMidi.onstatechange = newMidiDevice;
  newMidiDevice();
});

function getNoteName(noteNumber: number) {
  if (noteNumber < 21) {
    // below A0, no name
    return "MIDI Note " + noteNumber;
  }
  const octave = Math.trunc(noteNumber / 12) - 1;
  noteNumber -= 21;
  const notes = [
    "A",
    "A#",
    "B",
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
  ];
  const name = notes[noteNumber % 12];
  return name + octave;
}

function newMidiDevice() {
  if (webMidi.outputs.size) {
    webMidi.outputs.forEach(function (midiOutput) {
      midiOutputs.push(midiOutput);
      console.log(
        "MIDI Output device " + midiOutput.name + " " + midiOutput.version
      );
      // play Middle C loud
      //midiOutput.send([144, 60, 127]);*/
    });
  } else {
    console.log("no MIDI Output device detected");
  }
  if (webMidi.inputs.size) {
    webMidi.inputs.forEach(function (midiInput) {
      midiInputs.push(midiInput);
      console.log(
        "MIDI Input device " + midiInput.name + " " + midiInput.version
      );
      midiInput.onmidimessage = (msg) =>
        processMessage(msg as MIDIMessageEvent);
    });
  } else {
    console.log("no MIDI Output device detected");
  }
}

export function register() {
  // TODO
}
