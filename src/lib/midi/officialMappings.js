// Official pre-built controller mappings shipped with CROSSCUE.
// Available to all users in the Mapping Library → Official section.
//
// Profiles are generated from real preset files (Mixxx XML, Traktor TSI)
// using the existing import adapters, ensuring accurate MIDI bindings.

import { importMixxx } from './mixxxImporter';
import { createProfile, createEntry, genId } from './mappingProfile';

// ── Pioneer DDJ-200 (Mixxx preset) ─────────────────────────────
// 2-deck USB/Bluetooth MIDI controller.
// Source: Dan Giddins, Frank Breitling — Mixxx community preset.
const DDJ_200_MIXXX_XML = `<?xml version='1.0' encoding='utf-8'?>
<MixxxControllerPreset schemaVersion="1" mixxxVersion="2.0.0+">
  <info>
    <name>Pioneer DDJ-200</name>
    <author>Dan Giddins, Frank Breitling</author>
    <description>2-deck USB and Bluetooth MIDI controller.</description>
  </info>
  <controller id="DDJ-200">
    <controls>
      <control><group>[Master]</group><key>crossfader</key><description>Master crossfader</description><status>0xB6</status><midino>0x1F</midino><options><soft-takeover/><fourteen-bit-msb/></options></control>
      <control><group>[Master]</group><key>crossfader</key><description>Master crossfader</description><status>0xB6</status><midino>0x3F</midino><options><soft-takeover/><fourteen-bit-lsb/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.play</key><description>Deck 1: Play</description><status>0x90</status><midino>0x0B</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.play</key><description>Deck 2: Play</description><status>0x91</status><midino>0x0B</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.cueDefault</key><description>Deck 1: Cue</description><status>0x90</status><midino>0x0C</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.cueDefault</key><description>Deck 2: Cue</description><status>0x91</status><midino>0x0C</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.syncEnabled</key><description>Deck 1: Sync</description><status>0x90</status><midino>0x58</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.syncEnabled</key><description>Deck 2: Sync</description><status>0x91</status><midino>0x58</midino><options><script-binding/></options></control>
      <control><group>[EqualizerRack1_[Channel1]_Effect1]</group><key>DDJ200.eq</key><description>Deck 1: Low EQ</description><status>0xB0</status><midino>0x0F</midino><options><script-binding/></options></control>
      <control><group>[EqualizerRack1_[Channel1]_Effect1]</group><key>DDJ200.eq</key><description>Deck 1: Mid EQ</description><status>0xB0</status><midino>0x0B</midino><options><script-binding/></options></control>
      <control><group>[EqualizerRack1_[Channel1]_Effect1]</group><key>DDJ200.eq</key><description>Deck 1: High EQ</description><status>0xB0</status><midino>0x07</midino><options><script-binding/></options></control>
      <control><group>[EqualizerRack1_[Channel2]_Effect1]</group><key>DDJ200.eq</key><description>Deck 2: Low EQ</description><status>0xB1</status><midino>0x0F</midino><options><script-binding/></options></control>
      <control><group>[EqualizerRack1_[Channel2]_Effect1]</group><key>DDJ200.eq</key><description>Deck 2: Mid EQ</description><status>0xB1</status><midino>0x0B</midino><options><script-binding/></options></control>
      <control><group>[EqualizerRack1_[Channel2]_Effect1]</group><key>DDJ200.eq</key><description>Deck 2: High EQ</description><status>0xB1</status><midino>0x07</midino><options><script-binding/></options></control>
      <control><group>[QuickEffectRack1_[Channel1]]</group><key>DDJ200.super1</key><description>Deck 1: Filter</description><status>0xB6</status><midino>0x17</midino><options><script-binding/></options></control>
      <control><group>[QuickEffectRack1_[Channel2]]</group><key>DDJ200.super1</key><description>Deck 2: Filter</description><status>0xB6</status><midino>0x1B</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.volumeMSB</key><description>Deck 1: Volume (CC 19)</description><status>0xB0</status><midino>0x13</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.volumeAlt</key><description>Deck 1: Volume (CC 51)</description><status>0xB0</status><midino>0x33</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.volumeMSB</key><description>Deck 2: Volume (CC 19)</description><status>0xB1</status><midino>0x13</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.volumeAlt</key><description>Deck 2: Volume (CC 51)</description><status>0xB1</status><midino>0x33</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.rateMSB</key><description>Deck 1: Pitch (CC 0)</description><status>0xB0</status><midino>0x00</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.rateHardware</key><description>Deck 1: Pitch (CC 32)</description><status>0xB0</status><midino>0x20</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.rateMSB</key><description>Deck 2: Pitch (CC 0)</description><status>0xB1</status><midino>0x00</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.rateHardware</key><description>Deck 2: Pitch (CC 32)</description><status>0xB1</status><midino>0x20</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 1, Deck 1</description><status>0x97</status><midino>0x00</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 2, Deck 1</description><status>0x97</status><midino>0x01</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 3, Deck 1</description><status>0x97</status><midino>0x02</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 4, Deck 1</description><status>0x97</status><midino>0x03</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 5, Deck 1</description><status>0x97</status><midino>0x04</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 6, Deck 1</description><status>0x97</status><midino>0x05</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 7, Deck 1</description><status>0x97</status><midino>0x06</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 8, Deck 1</description><status>0x97</status><midino>0x07</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 1, Deck 2</description><status>0x98</status><midino>0x00</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 2, Deck 2</description><status>0x98</status><midino>0x01</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 3, Deck 2</description><status>0x98</status><midino>0x02</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 4, Deck 2</description><status>0x98</status><midino>0x03</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 5, Deck 2</description><status>0x98</status><midino>0x04</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 6, Deck 2</description><status>0x98</status><midino>0x05</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 7, Deck 2</description><status>0x98</status><midino>0x06</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.hotcueNActivate</key><description>Hotcue 8, Deck 2</description><status>0x98</status><midino>0x07</midino><options><script-binding/></options></control>
      <control><group>[AutoDJ]</group><key>enabled</key><description>Toggle Auto DJ</description><status>0x96</status><midino>0x59</midino><options><normal/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.jog</key><description>Deck 1: Jog</description><status>0xB0</status><midino>0x21</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.scratch</key><description>Deck 1: Scratch</description><status>0xB0</status><midino>0x22</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.jog</key><description>Deck 2: Jog</description><status>0xB1</status><midino>0x21</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.scratch</key><description>Deck 2: Scratch</description><status>0xB1</status><midino>0x22</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.shiftLeft</key><description>Deck 1: Shift</description><status>0x90</status><midino>0x3F</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.shiftRight</key><description>Deck 2: Shift</description><status>0x91</status><midino>0x3F</midino><options><script-binding/></options></control>
      <control><group>[Channel1]</group><key>DDJ200.pfl</key><description>Deck 1: Headphone</description><status>0x90</status><midino>0x54</midino><options><script-binding/></options></control>
      <control><group>[Channel2]</group><key>DDJ200.pfl</key><description>Deck 2: Headphone</description><status>0x91</status><midino>0x54</midino><options><script-binding/></options></control>
    </controls>
  </controller>
</MixxxControllerPreset>`;

// Generate the DDJ-200 profile from the embedded Mixxx preset.
const buildDdj200Profile = () => {
  const result = importMixxx(DDJ_200_MIXXX_XML);
  return createProfile(
    {
      id: 'official-ddj-200',
      name: 'Pioneer DDJ-200',
      manufacturer: 'Pioneer',
      model: 'DDJ-200',
      author: 'CROSSCUE',
      version: '1.0',
      description: 'Official mapping for Pioneer DDJ-200 (2-deck USB/Bluetooth controller). Generated from Mixxx community preset.',
      sourceFormat: 'mixxx',
      sourceApplication: 'Mixxx',
      status: 'tested',
    },
    result.entries
  );
};

// DDJ-200 User Learned Mapping Profile (as learned by DJ on hardware)
export const buildDdj200LearnedProfile = () => {
  const entries = [
    // Deck A Transports & Pads
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'noteon', number: 11, mode: 'toggle', target: 'PLAY A', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'noteon', number: 12, mode: 'momentary', target: 'CUE A', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'noteon', number: 88, mode: 'toggle', target: 'SYNC A', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 33, mode: 'continuous', target: 'JOG A', controlType: 'jog', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 34, mode: 'continuous', target: 'JOG A', controlType: 'jog', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'noteon', number: 54, mode: 'momentary', target: 'JOG TOUCH A', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 0, mode: 'continuous', target: 'PITCH A', controlType: 'pitch', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 32, mode: 'continuous', target: 'PITCH A', controlType: 'pitch', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 7, mode: 'continuous', target: 'HIGH A', controlType: 'knob', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 11, mode: 'continuous', target: 'MID A', controlType: 'knob', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 15, mode: 'continuous', target: 'LOW A', controlType: 'knob', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 7, type: 'cc', number: 23, mode: 'continuous', target: 'FILTER A', controlType: 'knob', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 19, mode: 'continuous', target: 'CHANNEL FADER A', controlType: 'fader', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 51, mode: 'continuous', target: 'CHANNEL FADER A', controlType: 'fader', status: 'supported' },
    
    // Sampler A Pads (Channel 8)
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 8, type: 'noteon', number: 0, mode: 'trigger', target: 'SAMPLER A PAD 1', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 8, type: 'noteon', number: 1, mode: 'trigger', target: 'SAMPLER A PAD 2', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 8, type: 'noteon', number: 2, mode: 'trigger', target: 'SAMPLER A PAD 3', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 8, type: 'noteon', number: 3, mode: 'trigger', target: 'SAMPLER A PAD 4', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 8, type: 'noteon', number: 4, mode: 'trigger', target: 'SAMPLER A PAD 5', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 8, type: 'noteon', number: 5, mode: 'trigger', target: 'SAMPLER A PAD 6', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 8, type: 'noteon', number: 6, mode: 'trigger', target: 'SAMPLER A PAD 7', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 8, type: 'noteon', number: 7, mode: 'trigger', target: 'SAMPLER A PAD 8', controlType: 'button', status: 'supported' },

    // Deck B Transports & Controls
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'noteon', number: 11, mode: 'toggle', target: 'PLAY B', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'noteon', number: 12, mode: 'momentary', target: 'CUE B', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'noteon', number: 88, mode: 'toggle', target: 'SYNC B', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'cc', number: 33, mode: 'continuous', target: 'JOG B', controlType: 'jog', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'cc', number: 34, mode: 'continuous', target: 'JOG B', controlType: 'jog', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'noteon', number: 54, mode: 'momentary', target: 'JOG TOUCH B', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'cc', number: 0, mode: 'continuous', target: 'PITCH B', controlType: 'pitch', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'cc', number: 32, mode: 'continuous', target: 'PITCH B', controlType: 'pitch', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'cc', number: 7, mode: 'continuous', target: 'HIGH B', controlType: 'knob', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'cc', number: 11, mode: 'continuous', target: 'MID B', controlType: 'knob', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'cc', number: 15, mode: 'continuous', target: 'LOW B', controlType: 'knob', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 7, type: 'cc', number: 24, mode: 'continuous', target: 'FILTER B', controlType: 'knob', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'cc', number: 19, mode: 'continuous', target: 'CHANNEL FADER B', controlType: 'fader', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 2, type: 'cc', number: 51, mode: 'continuous', target: 'CHANNEL FADER B', controlType: 'fader', status: 'supported' },

    // Sampler B Pads (Channel 10)
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 10, type: 'noteon', number: 0, mode: 'trigger', target: 'SAMPLER B PAD 1', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 10, type: 'noteon', number: 1, mode: 'trigger', target: 'SAMPLER B PAD 2', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 10, type: 'noteon', number: 2, mode: 'trigger', target: 'SAMPLER B PAD 3', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 10, type: 'noteon', number: 3, mode: 'trigger', target: 'SAMPLER B PAD 4', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 10, type: 'noteon', number: 4, mode: 'trigger', target: 'SAMPLER B PAD 5', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 10, type: 'noteon', number: 5, mode: 'trigger', target: 'SAMPLER B PAD 6', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 10, type: 'noteon', number: 6, mode: 'trigger', target: 'SAMPLER B PAD 7', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 10, type: 'noteon', number: 7, mode: 'trigger', target: 'SAMPLER B PAD 8', controlType: 'button', status: 'supported' },

    // Mixer & Master
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 1, type: 'cc', number: 33, mode: 'continuous', target: 'CROSSFADER', controlType: 'fader', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 7, type: 'noteon', number: 99, mode: 'toggle', target: 'CUE / MASTER MIX', controlType: 'button', status: 'supported' },
    { deviceId: '*', deviceName: 'Pioneer DDJ-200', channel: 7, type: 'noteon', number: 89, mode: 'toggle', target: 'AUTO DJ', controlType: 'button', status: 'supported' }
  ].map(e => createEntry(e));

  return createProfile(
    {
      id: 'official-ddj-200-learned',
      name: 'Pioneer DDJ-200 (Learned Complete)',
      manufacturer: 'Pioneer',
      model: 'DDJ-200',
      author: 'CROSSCUE DJ Community',
      version: '1.2',
      description: 'Пълен обучен хардуерен мапинг за Pioneer DDJ-200 включващ EQ, филтри, Sampler падове, кросфейдър и Auto DJ.',
      status: 'tested',
      sourceFormat: 'manual',
      sourceApplication: 'CROSSCUE'
    },
    entries
  );
};

// ── All official profiles ──────────────────────────────────────
export const getOfficialProfiles = () => {
  try {
    return [buildDdj200Profile(), buildDdj200LearnedProfile()];
  } catch {
    return [];
  }
};