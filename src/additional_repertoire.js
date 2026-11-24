/**
 * Concert Grand Piano Solo Repertoire — Authentic Urtext MIDI Editions + Modern Solos
 *
 * 19 authentic public-domain classical MIDI performances (Bernd Krueger / piano-midi.de,
 * Mutopia Project, MidiWorld, BitMidi) with real velocity dynamics, rubato, and CC64 sustain
 * pedal, lazily unpacked on selection from `./classical_midi_scores.js`, plus 2 modern
 * neoclassical concert solo arrangements — synchronized to the full 88-key (A0–C8, MIDI 21–108)
 * 3D Concert Grand action, damper lift, HD scrolling engraved score, and 30-zone Salamander engine.
 */

import { getRealMidiMeta, unpackRealMidiScore } from "./classical_midi_scores.js";

function createRealMidiPiece(meta) {
  const midiMeta = getRealMidiMeta(meta.id);
  const durationSec = midiMeta ? midiMeta.durationSec : 180;
  const bpm = midiMeta ? midiMeta.bpm : meta.bpm || 96;
  const totalBeats = Number(((durationSec * bpm) / 60).toFixed(1));

  return {
    ...meta,
    playbackMode: "sampled",
    audioUrl: null,
    tuningA4: 440.0,
    durationSec,
    bpm,
    totalBeats,
    get alignedNotes() {
      const unpacked = unpackRealMidiScore(meta.id);
      return unpacked ? unpacked.alignedNotes : [];
    },
    get kneePedal() {
      const unpacked = unpackRealMidiScore(meta.id);
      return unpacked ? unpacked.kneePedal : [];
    },
  };
}

const PITCH_CLASS_BASE = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function noteToMidi(note) {
  if (typeof note === "number") return Math.round(note);
  const m = /^([A-Ga-g])(##|#|bb|b)?(-?\d)$/.exec(String(note).trim());
  if (!m) throw new Error(`Invalid note name: ${note}`);
  const base = PITCH_CLASS_BASE[m[1].toUpperCase()];
  const acc = m[2] === "##" ? 2 : m[2] === "#" ? 1 : m[2] === "bb" ? -2 : m[2] === "b" ? -1 : 0;
  const oct = parseInt(m[3], 10);
  return (oct + 1) * 12 + base + acc;
}

/**
 * Piecewise tempo & rubato score builder for modern solo piano arrangements.
 */
class ScoreBuilder {
  constructor(initialBpm = 120) {
    this.tempoChanges = [{ beat: 0, bpm: initialBpm }];
    this.rawNotes = [];
    this.rawPedals = [];
    this.leadInSec = 0.35;
  }

  setTempo(beat, bpm) {
    this.tempoChanges.push({ beat, bpm });
    this.tempoChanges.sort((a, b) => a.beat - b.beat);
  }

  beatToSec(targetBeat) {
    const bTarget = Math.max(0, targetBeat);
    let sec = this.leadInSec;
    for (let i = 0; i < this.tempoChanges.length; i++) {
      const cur = this.tempoChanges[i];
      const next = this.tempoChanges[i + 1];
      if (bTarget <= cur.beat) break;
      const segEnd = next ? Math.min(bTarget, next.beat) : bTarget;
      if (segEnd > cur.beat) {
        sec += ((segEnd - cur.beat) * 60.0) / cur.bpm;
      }
      if (!next || bTarget <= next.beat) break;
    }
    return sec;
  }

  note(beat, durBeats, pitch, vel = 0.64, hand = "RH") {
    const midi = noteToMidi(pitch);
    const v = Math.max(0.16, Math.min(0.92, vel));
    this.rawNotes.push({ beat, durBeats: Math.max(0.05, durBeats), midi, vel: v, hand });
  }

  chord(beat, durBeats, pitches, vel = 0.58, hand = "LH", rollBeats = 0.0) {
    for (let i = 0; i < pitches.length; i++) {
      const b = beat + i * rollBeats;
      const d = Math.max(0.06, durBeats - i * rollBeats * 0.45);
      const v = vel * (i === 0 ? 1.0 : 0.93);
      this.note(b, d, pitches[i], v, hand);
    }
  }

  pedal(startBeat, endBeat) {
    if (endBeat > startBeat + 0.02) {
      this.rawPedals.push([startBeat, endBeat]);
    }
  }

  build(meta) {
    let maxBeat = 0;
    let maxSec = 0;
    const alignedNotes = this.rawNotes
      .map((n) => {
        const t = this.beatToSec(n.beat);
        const tEnd = this.beatToSec(n.beat + n.durBeats);
        const dur = Math.max(0.055, tEnd - t);
        if (n.beat + n.durBeats > maxBeat) maxBeat = n.beat + n.durBeats;
        if (tEnd > maxSec) maxSec = tEnd;
        return [
          Number(t.toFixed(4)),
          Number(dur.toFixed(4)),
          Number(n.beat.toFixed(3)),
          Number(n.durBeats.toFixed(3)),
          n.midi,
          Number(n.vel.toFixed(3)),
          n.hand,
        ];
      })
      .sort((a, b) => a[0] - b[0] || a[4] - b[4]);

    const kneePedal = this.rawPedals
      .map(([b0, b1]) => [
        Number(this.beatToSec(b0).toFixed(4)),
        Number(this.beatToSec(b1).toFixed(4)),
      ])
      .sort((a, b) => a[0] - b[0]);

    return {
      ...meta,
      playbackMode: "sampled",
      audioUrl: null,
      durationSec: Number((maxSec + 2.0).toFixed(2)),
      totalBeats: Number(maxBeat.toFixed(1)),
      alignedNotes,
      kneePedal,
    };
  }
}

// ============================================================================
// MODERN SOLO 1: SILO & STEVEN CRANBERRY — MEANINGFUL LOVE
// ============================================================================
function buildMeaningfulLove() {
  const s = new ScoreBuilder(82);
  let b = 0;

  const prog = [
    { bass: ["B1", "F#2", "B2", "D3", "F#3", "C#4"], pedal: 3.88 },
    { bass: ["G1", "D2", "G2", "B2", "D3", "F#3"], pedal: 3.88 },
    { bass: ["D2", "A2", "D3", "F#3", "A3", "C#4"], pedal: 3.88 },
    { bass: ["A1", "E2", "A2", "C#3", "E3", "B3"], pedal: 3.88 },
  ];

  const chorusProg = [
    { bass: ["B1", "F#2", "B2", "D3", "F#3", "B3"], rhHarm: "D4" },
    { bass: ["G1", "D2", "G2", "B2", "D3", "G3"], rhHarm: "B3" },
    { bass: ["D2", "A2", "D3", "F#3", "A3", "D4"], rhHarm: "F#4" },
    { bass: ["F#1", "C#2", "F#2", "A#2", "C#3", "E3"], rhHarm: "C#4" },
  ];

  for (let rep = 0; rep < 2; rep++) {
    for (let m = 0; m < 4; m++) {
      const ch = prog[m];
      s.pedal(b, b + ch.pedal);
      const pattern = [0, 1, 2, 3, 4, 3, 5, 4];
      for (let i = 0; i < 8; i++) {
        s.note(b + i * 0.5, 0.85, ch.bass[pattern[i]], i === 0 ? 0.48 : 0.34 + (i % 2) * 0.03, "LH");
      }
      if (m === 0) {
        s.note(b + 1.0, 1.6, "F#5", 0.48 + rep * 0.04, "RH");
        s.note(b + 2.5, 1.4, "E5", 0.44 + rep * 0.04, "RH");
      } else if (m === 1) {
        s.note(b + 0.0, 1.6, "D5", 0.48 + rep * 0.04, "RH");
        s.note(b + 2.0, 1.6, "B4", 0.43 + rep * 0.04, "RH");
      } else if (m === 2) {
        s.note(b + 0.5, 1.5, "A4", 0.45 + rep * 0.04, "RH");
        s.note(b + 2.0, 1.0, "D5", 0.49 + rep * 0.04, "RH");
        s.note(b + 3.0, 0.95, "E5", 0.51 + rep * 0.04, "RH");
      } else {
        s.note(b + 0.0, 2.0, "F#5", 0.52 + rep * 0.04, "RH");
        s.note(b + 2.5, 1.4, rep === 0 ? "E5" : "C#5", 0.46 + rep * 0.04, "RH");
      }
      b += 4.0;
    }
  }

  const verseMelody = [
    [[0.0, 1.25, "F#5", 0.60], [1.25, 0.75, "E5", 0.55], [2.0, 1.0, "D5", 0.58], [3.0, 0.5, "C#5", 0.53], [3.5, 0.5, "D5", 0.56]],
    [[0.0, 1.5, "B4", 0.58], [1.5, 0.5, "A4", 0.52], [2.0, 1.0, "B4", 0.56], [3.0, 1.0, "D5", 0.60]],
    [[0.0, 1.25, "F#5", 0.62], [1.25, 0.75, "E5", 0.56], [2.0, 1.25, "D5", 0.58], [3.25, 0.75, "A4", 0.52]],
    [[0.0, 1.75, "E5", 0.60], [1.75, 0.75, "D5", 0.55], [2.5, 1.4, "C#5", 0.53]],
    [[0.0, 1.0, "F#5", 0.64], [1.0, 0.5, "G5", 0.60], [1.5, 0.5, "F#5", 0.58], [2.0, 1.0, "E5", 0.62], [3.0, 1.0, "D5", 0.60]],
    [[0.0, 1.0, "D5", 0.62], [1.0, 0.5, "E5", 0.58], [1.5, 1.5, "F#5", 0.66], [3.0, 1.0, "A5", 0.68]],
    [[0.0, 1.5, "A5", 0.68], [1.5, 0.5, "F#5", 0.60], [2.0, 1.0, "E5", 0.60], [3.0, 1.0, "D5", 0.58]],
    [[0.0, 1.5, "E5", 0.62], [1.5, 0.5, "D5", 0.56], [2.0, 1.2, "C#5", 0.56], [3.25, 0.75, "B4", 0.54]],
  ];

  const playVerse = (enrich = false) => {
    for (let i = 0; i < verseMelody.length; i++) {
      const ch = prog[i % 4];
      s.pedal(b, b + ch.pedal);
      const lhPat = [0, 1, 2, 3, 4, 5, 4, 3];
      for (let k = 0; k < 8; k++) {
        s.note(b + k * 0.5, 0.85, ch.bass[lhPat[k]], k === 0 ? (enrich ? 0.58 : 0.54) : 0.39 + (k === 4 ? 0.05 : 0), "LH");
      }
      for (const [off, dur, pitch, vel] of verseMelody[i]) {
        const vv = enrich ? vel + 0.05 : vel;
        s.note(b + off, dur, pitch, vv, "RH");
        if (off === 0.0) s.note(b + off, dur * 0.92, ch.bass[3], vv * 0.66, "RH");
        if (enrich && dur >= 1.25 && noteToMidi(pitch) >= 74) {
          s.note(b + off, dur * 0.9, noteToMidi(pitch) - 12, vv * 0.68, "RH");
        }
      }
      b += 4.0;
    }
  };

  const chorusMelody = [
    [[0.0, 1.0, "B5", 0.70], [1.0, 0.5, "A5", 0.64], [1.5, 0.5, "F#5", 0.62], [2.0, 1.25, "E5", 0.66], [3.25, 0.75, "D5", 0.62]],
    [[0.0, 1.5, "D5", 0.66], [1.5, 0.5, "E5", 0.62], [2.0, 1.25, "F#5", 0.68], [3.25, 0.75, "D5", 0.62]],
    [[0.0, 1.25, "A5", 0.72], [1.25, 0.75, "F#5", 0.65], [2.0, 1.0, "E5", 0.66], [3.0, 1.0, "D5", 0.64]],
    [[0.0, 1.5, "C#5", 0.64], [1.5, 0.5, "D5", 0.62], [2.0, 1.25, "E5", 0.66], [3.25, 0.75, "F#5", 0.68]],
    [[0.0, 1.25, "B5", 0.74], [1.25, 0.75, "A5", 0.68], [2.0, 1.0, "F#5", 0.70], [3.0, 0.5, "E5", 0.64], [3.5, 0.5, "F#5", 0.66]],
    [[0.0, 1.5, "G5", 0.72], [1.5, 0.5, "F#5", 0.66], [2.0, 1.25, "E5", 0.66], [3.25, 0.75, "D5", 0.62]],
    [[0.0, 1.5, "F#5", 0.70], [1.5, 0.5, "E5", 0.64], [2.0, 1.25, "D5", 0.64], [3.25, 0.75, "B4", 0.58]],
    [[0.0, 2.0, "C#5", 0.62], [2.0, 1.8, "A4", 0.56]],
  ];

  const playChorus = (grandClimax = false) => {
    for (let i = 0; i < chorusMelody.length; i++) {
      const ch = chorusProg[i % 4];
      s.pedal(b, b + 3.88);
      const seq = [0, 1, 2, 3, 4, 5, 4, 3];
      for (let k = 0; k < 8; k++) {
        s.note(b + k * 0.5, 0.92, ch.bass[seq[k]], k === 0 ? (grandClimax ? 0.70 : 0.62) : (grandClimax ? 0.48 : 0.43), "LH");
      }
      for (const [off, dur, pitch, vel] of chorusMelody[i]) {
        const mTop = noteToMidi(pitch);
        const vv = grandClimax ? Math.min(0.84, vel + 0.08) : vel;
        s.note(b + off, dur, mTop, vv, "RH");
        if (mTop >= 74 && (grandClimax || dur >= 1.0)) {
          s.note(b + off, dur * 0.95, mTop - 12, vv * 0.76, "RH");
        } else if (off === 0.0) {
          s.note(b + off, dur * 0.9, ch.rhHarm, vv * 0.64, "RH");
        }
      }
      b += 4.0;
    }
  };

  s.setTempo(b, 85);
  playVerse(false);
  s.setTempo(b, 88);
  playChorus(false);

  s.setTempo(b, 80);
  for (let m = 0; m < 4; m++) {
    const ch = prog[m];
    s.pedal(b, b + 3.85);
    s.chord(b, 3.6, [ch.bass[0], ch.bass[2], ch.bass[4]], 0.46, "LH", 0.12);
    s.note(b + 1.0, 1.5, m % 2 === 0 ? "F#6" : "D6", 0.44, "RH");
    s.note(b + 2.5, 1.4, m % 2 === 0 ? "E6" : "B5", 0.40, "RH");
    b += 4.0;
  }

  s.setTempo(b, 86);
  playVerse(true);

  const bridge = [
    { bass: ["E1", "B1", "E2", "G2", "B2", "F#3"], mel: [[0, 1.5, "G5", 0.66], [1.5, 0.5, "F#5", 0.62], [2.0, 1.25, "E5", 0.64], [3.25, 0.75, "D5", 0.60]] },
    { bass: ["F#1", "C#2", "F#2", "A2", "C#3", "E3"], mel: [[0, 1.5, "A5", 0.70], [1.5, 0.5, "G5", 0.66], [2.0, 1.25, "F#5", 0.68], [3.25, 0.75, "E5", 0.64]] },
    { bass: ["G1", "D2", "G2", "B2", "D3", "F#3"], mel: [[0, 1.5, "B5", 0.74], [1.5, 0.5, "A5", 0.70], [2.0, 1.25, "G5", 0.72], [3.25, 0.75, "F#5", 0.70]] },
    { bass: ["A1", "E2", "A2", "C#3", "E3", "A3"], mel: [[0, 1.5, "A5", 0.76], [1.5, 0.5, "B5", 0.74], [2.0, 2.0, "C#6", 0.78]] },
  ];
  s.setTempo(b, 89);
  for (const br of bridge) {
    s.pedal(b, b + 3.88);
    const seq = [0, 1, 2, 3, 4, 5, 4, 3];
    for (let k = 0; k < 8; k++) {
      s.note(b + k * 0.5, 0.85, br.bass[seq[k]], k === 0 ? 0.64 : 0.45, "LH");
    }
    for (const [off, dur, pitch, vel] of br.mel) {
      s.note(b + off, dur, pitch, vel, "RH");
      s.note(b + off, dur * 0.92, noteToMidi(pitch) - 12, vel * 0.74, "RH");
    }
    b += 4.0;
  }

  s.setTempo(b, 89);
  playChorus(true);

  s.setTempo(b, 78);
  const soloReflect = [
    { ch: prog[0], rh: [[0.0, 1.5, "D5", 0.56], [1.5, 0.5, "E5", 0.52], [2.0, 1.0, "F#5", 0.58], [3.0, 1.0, "B5", 0.54]] },
    { ch: prog[1], rh: [[0.0, 1.5, "A5", 0.58], [1.5, 0.5, "G5", 0.54], [2.0, 1.5, "F#5", 0.56], [3.5, 0.5, "D5", 0.50]] },
    { ch: prog[2], rh: [[0.0, 1.5, "E5", 0.58], [1.5, 0.5, "F#5", 0.56], [2.0, 1.0, "A5", 0.62], [3.0, 1.0, "F#5", 0.56]] },
    { ch: prog[3], rh: [[0.0, 2.0, "E5", 0.56], [2.0, 1.0, "C#5", 0.52], [3.0, 1.0, "D5", 0.54]] },
  ];
  for (let rep = 0; rep < 2; rep++) {
    for (const sr of soloReflect) {
      s.pedal(b, b + 3.88);
      const seq = [0, 1, 2, 3, 4, 5, 4, 3];
      for (let k = 0; k < 8; k++) {
        s.note(b + k * 0.5, 0.9, sr.ch.bass[seq[k]], k === 0 ? 0.52 : 0.36 + rep * 0.03, "LH");
      }
      for (const [off, dur, pitch, vel] of sr.rh) {
        const vv = vel + rep * 0.05;
        s.note(b + off, dur, pitch, vv, "RH");
        if (rep === 1 && off === 0) s.note(b + off, dur * 0.9, noteToMidi(pitch) - 12, vv * 0.7, "RH");
      }
      b += 4.0;
    }
  }

  s.setTempo(b, 87);
  for (let i = 0; i < chorusMelody.length; i++) {
    const ch = chorusProg[i % 4];
    s.pedal(b, b + 3.88);
    const seq = [0, 1, 2, 3, 4, 5, 4, 3];
    for (let k = 0; k < 8; k++) {
      s.note(b + k * 0.5, 0.92, noteToMidi(ch.bass[seq[k]]) + 2, k === 0 ? 0.72 : 0.50, "LH");
    }
    for (const [off, dur, pitch, vel] of chorusMelody[i]) {
      const mTop = Math.min(96, noteToMidi(pitch) + 2);
      const vv = Math.min(0.86, vel + 0.10);
      s.note(b + off, dur, mTop, vv, "RH");
      s.note(b + off, dur * 0.94, mTop - 12, vv * 0.78, "RH");
    }
    b += 4.0;
  }

  s.setTempo(b, 80);
  for (let m = 0; m < 4; m++) {
    const ch = prog[m];
    s.pedal(b, b + 3.88);
    for (let k = 0; k < 8; k++) {
      const pat = [0, 1, 2, 3, 4, 3, 2, 1];
      s.note(b + k * 0.5, 0.9, ch.bass[pat[k]], k === 0 ? 0.52 : 0.36, "LH");
    }
    s.note(b + 0.0, 2.0, m % 2 === 0 ? "F#5" : "D5", 0.54, "RH");
    s.note(b + 2.0, 1.8, m % 2 === 0 ? "E5" : "B4", 0.48, "RH");
    b += 4.0;
  }

  s.setTempo(b, 78);
  for (let m = 0; m < 8; m++) {
    const ch = prog[m % 4];
    if (m === 4) s.setTempo(b, 70);
    if (m === 7) s.setTempo(b, 58);
    const fade = 1.0 - m * 0.06;
    s.pedal(b, b + (m === 7 ? 5.6 : 3.88));
    const pat = [0, 1, 2, 3, 4, 5];
    for (let k = 0; k < 6; k++) {
      s.note(b + k * 0.65, 1.3, ch.bass[pat[k]], (k === 0 ? 0.48 : 0.34) * fade, "LH");
    }
    if (m % 4 === 0) {
      s.note(b + 0.0, 1.8, "F#5", 0.54 * fade, "RH");
      s.note(b + 2.0, 1.8, "E5", 0.48 * fade, "RH");
    } else if (m % 4 === 1) {
      s.note(b + 0.0, 2.0, "D5", 0.50 * fade, "RH");
      s.note(b + 2.0, 1.8, "B4", 0.44 * fade, "RH");
    } else if (m % 4 === 2) {
      s.note(b + 0.0, 2.0, "F#5", 0.48 * fade, "RH");
      s.note(b + 2.0, 1.8, "E5", 0.42 * fade, "RH");
    } else if (m === 3) {
      s.note(b + 0.0, 2.2, "C#5", 0.46 * fade, "RH");
      s.note(b + 2.2, 1.6, "D5", 0.42 * fade, "RH");
    } else {
      s.chord(b + 0.0, 5.2, ["B3", "D4", "F#4", "C#5", "D5"], 0.42, "RH", 0.16);
    }
    b += m === 7 ? 5.6 : 4.0;
  }

  return s.build({
    id: "silo_meaningful_love",
    code: "MOD-ML",
    composer: "Silo & Steven Cranberry · Solo Piano Arr.",
    title: "Meaningful Love — Concert Piano Solo",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Interactive Arrangement",
    tuningA4: 440.0,
    year: "Modern Piano Ballad · B Minor",
    keySignature: "B Minor · 4/4",
    bpm: 84,
    historicalNote:
      "Full concert solo piano arrangement of Meaningful Love in B minor, flowing from a hushed rubato intro through lush ninth chords and a soaring octave climax.",
  });
}

// ============================================================================
// MODERN SOLO 2: SHUICHI SAKAMOTO — DROWNING LOVE ("Chasing Kou")
// ============================================================================
function buildDrowningLove() {
  const s = new ScoreBuilder(114);
  let b = 0;

  const progA = [
    ["Bb1", "F2", "Bb2", "Db3", "F3", "Bb3"],
    ["Gb1", "Db2", "Gb2", "Bb2", "Db3", "Gb3"],
    ["Db2", "Ab2", "Db3", "F3", "Ab3", "Db4"],
    ["Ab1", "Eb2", "Ab2", "C3", "Eb3", "Ab3"],
    ["Bb1", "F2", "Bb2", "Db3", "F3", "Bb3"],
    ["Gb1", "Db2", "Gb2", "Bb2", "Db3", "Gb3"],
    ["Eb2", "Bb2", "Eb3", "Gb3", "Bb3", "Eb4"],
    ["F1", "C2", "F2", "A2", "C3", "Eb3"],
  ];

  const themeA = [
    [[0.0, 1.0, "F5", 0.64], [1.0, 0.5, "Eb5", 0.58], [1.5, 0.5, "Db5", 0.60], [2.0, 1.0, "C5", 0.58], [3.0, 1.0, "Bb4", 0.56]],
    [[0.0, 1.0, "Db5", 0.60], [1.0, 0.5, "Eb5", 0.58], [1.5, 1.0, "F5", 0.66], [2.5, 0.5, "Gb5", 0.62], [3.0, 1.0, "F5", 0.60]],
    [[0.0, 1.25, "Ab5", 0.68], [1.25, 0.75, "Gb5", 0.62], [2.0, 1.0, "F5", 0.64], [3.0, 0.5, "Eb5", 0.58], [3.5, 0.5, "Db5", 0.58]],
    [[0.0, 1.75, "Eb5", 0.64], [1.75, 0.75, "F5", 0.62], [2.5, 0.75, "Eb5", 0.58], [3.25, 0.75, "C5", 0.55]],
    [[0.0, 0.75, "F5", 0.66], [0.75, 0.75, "Eb5", 0.62], [1.5, 0.5, "Db5", 0.62], [2.0, 1.0, "F5", 0.68], [3.0, 1.0, "Bb5", 0.72]],
    [[0.0, 1.0, "Bb5", 0.72], [1.0, 0.5, "Ab5", 0.66], [1.5, 0.5, "Gb5", 0.66], [2.0, 1.0, "F5", 0.66], [3.0, 1.0, "Db5", 0.62]],
    [[0.0, 1.0, "Gb5", 0.68], [1.0, 0.5, "F5", 0.64], [1.5, 0.5, "Eb5", 0.64], [2.0, 1.0, "Db5", 0.62], [3.0, 1.0, "C5", 0.60]],
    [[0.0, 1.5, "C5", 0.64], [1.5, 0.5, "Db5", 0.62], [2.0, 1.0, "C5", 0.64], [3.0, 1.0, "A4", 0.62]],
  ];

  const bridgeProg = [
    { bass: ["E2", "B2", "E3", "G#3", "B3", "E4"], mel: [[0.0, 1.0, "G#5", 0.68], [1.0, 0.5, "F#5", 0.64], [1.5, 0.5, "E5", 0.64], [2.0, 1.0, "B4", 0.60], [3.0, 1.0, "E5", 0.64]] },
    { bass: ["B1", "F#2", "B2", "D#3", "F#3", "B3"], mel: [[0.0, 1.25, "F#5", 0.70], [1.25, 0.75, "G#5", 0.66], [2.0, 1.0, "A5", 0.70], [3.0, 1.0, "G#5", 0.66]] },
    { bass: ["C#2", "G#2", "C#3", "E3", "G#3", "C#4"], mel: [[0.0, 1.0, "G#5", 0.70], [1.0, 0.5, "F#5", 0.64], [1.5, 0.5, "E5", 0.64], [2.0, 1.0, "D#5", 0.62], [3.0, 1.0, "E5", 0.64]] },
    { bass: ["F1", "C2", "F2", "A2", "C3", "F3"], mel: [[0.0, 1.0, "F5", 0.70], [1.0, 0.5, "Eb5", 0.66], [1.5, 0.5, "Db5", 0.66], [2.0, 1.0, "C5", 0.66], [3.0, 0.5, "Db5", 0.64], [3.5, 0.5, "Eb5", 0.68]] },
  ];

  for (let m = 0; m < 8; m++) {
    const ch = progA[m % 4];
    s.pedal(b, b + 3.88);
    const seq = [0, 1, 2, 3, 4, 3, 2, 1];
    for (let k = 0; k < 8; k++) {
      s.note(b + k * 0.5, 0.78, ch[seq[k]], k === 0 ? 0.54 : 0.38 + (k % 2) * 0.03, "LH");
    }
    const topPair = m % 2 === 0 ? ["F5", "Db5"] : ["Eb5", "Bb4"];
    for (let k = 0; k < 4; k++) {
      s.note(b + k * 1.0, 0.9, topPair[k % 2], 0.44 + (m >= 4 ? 0.05 : 0), "RH");
    }
    b += 4.0;
  }

  const playThemeA = ({ octaves = false, velBoost = 0, drivingLH = false } = {}) => {
    for (let i = 0; i < themeA.length; i++) {
      const ch = progA[i];
      s.pedal(b, b + 3.88);
      const seq = drivingLH ? [0, 2, 3, 4, 5, 4, 3, 2] : [0, 1, 2, 3, 4, 5, 4, 3];
      for (let k = 0; k < 8; k++) {
        s.note(b + k * 0.5, 0.78, ch[seq[k]], k === 0 ? 0.58 + velBoost * 0.8 : 0.42 + velBoost * 0.6 + (k === 4 ? 0.05 : 0), "LH");
        if (drivingLH && k === 0) s.note(b, 0.85, noteToMidi(ch[0]) + 12, 0.62 + velBoost * 0.5, "LH");
      }
      for (const [off, dur, pitch, vel] of themeA[i]) {
        const mTop = noteToMidi(pitch);
        const vv = Math.min(0.86, vel + velBoost);
        s.note(b + off, dur, mTop, vv, "RH");
        if (octaves) s.note(b + off, dur * 0.92, mTop - 12, vv * 0.78, "RH");
      }
      b += 4.0;
    }
  };

  playThemeA({ octaves: false, velBoost: 0.0 });
  playThemeA({ octaves: false, velBoost: 0.05, drivingLH: true });

  s.setTempo(b, 118);
  for (let rep = 0; rep < 2; rep++) {
    for (const br of bridgeProg) {
      s.pedal(b, b + 3.88);
      const seq = [0, 1, 2, 3, 4, 5, 4, 3];
      for (let k = 0; k < 8; k++) s.note(b + k * 0.5, 0.78, br.bass[seq[k]], k === 0 ? 0.64 : 0.46, "LH");
      for (const [off, dur, pitch, vel] of br.mel) {
        const vv = vel + rep * 0.05;
        s.note(b + off, dur, pitch, vv, "RH");
        s.note(b + off, dur * 0.92, noteToMidi(pitch) - 12, vv * 0.74, "RH");
      }
      b += 4.0;
    }
  }

  s.setTempo(b, 121);
  playThemeA({ octaves: true, velBoost: 0.10, drivingLH: true });

  s.setTempo(b, 104);
  for (let m = 0; m < 8; m++) {
    const ch = progA[m];
    s.pedal(b, b + 3.88);
    s.chord(b, 3.6, [ch[0], ch[2], ch[4]], 0.45, "LH", 0.12);
    const bellNotes = m % 2 === 0 ? ["F6", "Eb6", "Db6", "C6"] : ["Bb5", "Db6", "F6", "Eb6"];
    for (let k = 0; k < 4; k++) s.note(b + k * 1.0, 1.2, bellNotes[k], 0.44 + (m >= 4 ? 0.05 : 0), "RH");
    b += 4.0;
  }

  s.setTempo(b, 116);
  for (let m = 0; m < 8; m++) {
    const ch = progA[m];
    s.pedal(b, b + 3.88);
    const grow = 0.46 + (m / 8) * 0.22;
    const seq = [0, 1, 2, 3, 4, 5, 4, 3];
    for (let k = 0; k < 8; k++) s.note(b + k * 0.5, 0.72, ch[seq[k]], k === 0 ? grow + 0.08 : grow * 0.82, "LH");
    for (let k = 0; k < 4; k++) {
      s.note(b + k * 1.0, 0.9, ch[3 + (k % 3)], grow * 0.9, "RH");
      s.note(b + k * 1.0 + 0.5, 0.5, noteToMidi(ch[5]) + 12, grow * 0.85, "RH");
    }
    b += 4.0;
  }

  s.setTempo(b, 120);
  playThemeA({ octaves: true, velBoost: 0.11, drivingLH: true });

  s.setTempo(b, 116);
  for (let rep = 0; rep < 2; rep++) {
    for (const br of bridgeProg) {
      s.pedal(b, b + 3.88);
      const seq = [0, 2, 3, 4, 5, 4, 3, 2];
      for (let k = 0; k < 8; k++) s.note(b + k * 0.5, 0.82, br.bass[seq[k]], k === 0 ? 0.68 : 0.48, "LH");
      for (const [off, dur, pitch, vel] of br.mel) {
        const vv = Math.min(0.86, vel + 0.08 + rep * 0.03);
        s.note(b + off, dur, pitch, vv, "RH");
        s.note(b + off, dur * 0.92, noteToMidi(pitch) - 12, vv * 0.78, "RH");
      }
      b += 4.0;
    }
  }

  s.setTempo(b, 106);
  playThemeA({ octaves: false, velBoost: -0.02, drivingLH: false });
  s.setTempo(b, 118);
  playThemeA({ octaves: true, velBoost: 0.14, drivingLH: true });

  s.setTempo(b, 102);
  s.setTempo(b + 16.0, 82);
  for (let m = 0; m < 8; m++) {
    const ch = progA[m === 7 ? 0 : m % 4];
    const fade = 1.0 - m * 0.07;
    s.pedal(b, b + (m === 7 ? 5.6 : 3.88));
    const pat = [0, 1, 2, 3, 4, 3];
    for (let k = 0; k < 6; k++) s.note(b + k * 0.65, 1.1, ch[pat[k]], (k === 0 ? 0.50 : 0.34) * fade, "LH");
    if (m % 4 === 0) {
      s.note(b + 0.0, 1.5, "F5", 0.52 * fade, "RH");
      s.note(b + 1.5, 1.0, "Eb5", 0.46 * fade, "RH");
      s.note(b + 2.5, 1.4, "Db5", 0.44 * fade, "RH");
    } else if (m % 4 === 1) {
      s.note(b + 0.0, 2.0, "Bb4", 0.46 * fade, "RH");
      s.note(b + 2.0, 1.8, "Db5", 0.44 * fade, "RH");
    } else if (m % 4 === 2) {
      s.note(b + 0.0, 2.0, "C5", 0.44 * fade, "RH");
      s.note(b + 2.0, 1.8, "Ab4", 0.40 * fade, "RH");
    } else if (m === 3) {
      s.note(b + 0.0, 2.4, "Bb4", 0.44 * fade, "RH");
    } else {
      s.chord(b + 0.0, 5.2, ["Bb3", "Db4", "F4", "Bb4", "F5"], 0.42, "RH", 0.16);
    }
    b += m === 7 ? 5.6 : 4.0;
  }

  return s.build({
    id: "sakamoto_drowning_love_chasing_kou",
    code: "OST-DL",
    composer: "Shuichi (Hidekazu) Sakamoto · Oboreru Knife",
    title: "Drowning Love — \"Chasing Kou\" (コウを追いかけて)",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Interactive Arrangement",
    tuningA4: 440.0,
    year: "2016 · Film Score Piano Solo",
    keySignature: "B♭ Minor · 4/4",
    bpm: 116,
    historicalNote:
      "Full cinematic piano solo of Chasing Kou from Drowning Love, weaving shimmering coastal arpeggios, an E-major sunlit bridge, and a sweeping octave climax.",
  });
}

// ============================================================================
// AUTHENTIC PUBLIC-DOMAIN CLASSICAL MIDI REPERTOIRE (19 Urtext Performances)
// ============================================================================
const CLASSICAL_MIDI_CATALOG = [
  createRealMidiPiece({
    id: "beethoven_fur_elise_woo59",
    code: "LVB-FE",
    composer: "Ludwig van Beethoven (1770–1827)",
    title: "Bagatelle No. 25 in A Minor, WoO 59 — \"Für Elise\"",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1810 · Bagatelle in A Minor",
    keySignature: "A Minor · 3/8",
    historicalNote:
      "Authentic concert MIDI performance of Beethoven's complete Für Elise (WoO 59), preserving exact phrasing, F-major episode, stormy bass pedal-point, and rubato.",
  }),
  createRealMidiPiece({
    id: "beethoven_moonlight_sonata_op27_no2",
    code: "LVB-27",
    composer: "Ludwig van Beethoven (1770–1827)",
    title: "Piano Sonata No. 14 in C♯ Minor, Op. 27 No. 2 — I. Adagio sostenuto",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1801 · Sonata quasi una fantasia",
    keySignature: "C♯ Minor · 4/4",
    historicalNote:
      "Complete authentic performance of the first movement of Beethoven's Moonlight Sonata with true three-layer voicing and continuous sustain pedal resonance.",
  }),
  createRealMidiPiece({
    id: "chopin_nocturne_op9_no2",
    code: "CHOP-9",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Nocturne in E♭ Major, Op. 9 No. 2",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Concert MIDI",
    year: "1831 · Parisian Salon Nocturne",
    keySignature: "E♭ Major · 12/8",
    historicalNote:
      "Expressive concert MIDI edition of Chopin's Nocturne Op. 9 No. 2 with authentic bel canto ornaments, filigree trills, and whispered final cadenza.",
  }),
  createRealMidiPiece({
    id: "liszt_la_campanella_s141_no3",
    code: "LISZT-C",
    composer: "Franz Liszt (1811–1886) · After N. Paganini",
    title: "Grandes études de Paganini, S. 141 No. 3 — \"La Campanella\"",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1851 · Concert Étude in G♯ Minor",
    keySignature: "G♯ Minor · 6/8",
    historicalNote:
      "Complete virtuoso Urtext MIDI performance (4,144 notes) of Liszt's La Campanella — opening D♯ bell leaps, crystalline chromatic runs, trills, and prestissimo coda.",
  }),
  createRealMidiPiece({
    id: "chopin_winter_wind_op25_no11",
    code: "CHOP-25",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Étude in A Minor, Op. 25 No. 11 — \"Winter Wind\"",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1836 · Concert Étude",
    keySignature: "A Minor · 4/4",
    historicalNote:
      "Complete concert performance (3,172 notes) of Chopin's Winter Wind Étude — solemn Lento chorale erupting into full 88-key chromatic sextuplet cascades.",
  }),
  createRealMidiPiece({
    id: "mozart_fantasia_d_minor_k397",
    code: "MOZ-397",
    composer: "Wolfgang Amadeus Mozart (1756–1791)",
    title: "Fantasia in D Minor, K. 397",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Mutopia Urtext MIDI",
    year: "1782 · Vienna",
    keySignature: "D Minor · 4/4",
    historicalNote:
      "Complete Urtext MIDI edition of Mozart's brooding D-minor Fantasia K. 397, spanning the hushed Andante arpeggios, tragic Adagio, Presto cadenzas, and D-major Allegretto.",
  }),
  createRealMidiPiece({
    id: "bach_prelude_c_major_bwv846",
    code: "BACH-846",
    composer: "Johann Sebastian Bach (1685–1750)",
    title: "Prelude in C Major, BWV 846 (The Well-Tempered Clavier, Book I)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1722 · Köthen",
    keySignature: "C Major · 4/4",
    historicalNote:
      "Authentic concert MIDI performance of all 35 luminous measures of Bach's Prelude in C Major, BWV 846.",
  }),
  createRealMidiPiece({
    id: "mozart_sonata_11_k331_mvt1",
    code: "MOZ-331I",
    composer: "Wolfgang Amadeus Mozart (1756–1791)",
    title: "Piano Sonata No. 11 in A Major, K. 331 — I. Andante grazioso & 6 Variations",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1783 · Vienna / Salzburg",
    keySignature: "A Major · 6/8",
    historicalNote:
      "Complete concert performance of the beloved opening movement of Mozart's Sonata K. 331: the pastoral Siciliana theme in A major followed by all six contrasting variations.",
  }),
  createRealMidiPiece({
    id: "schumann_traumerei_op15_no7",
    code: "SCH-15",
    composer: "Robert Schumann (1810–1856)",
    title: "Träumerei (Dreaming) — Kinderszenen, Op. 15 No. 7",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1838 · Leipzig",
    keySignature: "F Major · 4/4",
    historicalNote:
      "Authentic lyrical performance of Schumann's iconic Träumerei from Scenes from Childhood, unfolding four-voice romantic polyphony with tender rubato.",
  }),
  createRealMidiPiece({
    id: "chopin_prelude_e_minor_op28_no4",
    code: "CHOP-28",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Prelude No. 4 in E Minor, Op. 28 (Largo)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1838–1839 · Valldemossa, Mallorca",
    keySignature: "E Minor · 2/2",
    historicalNote:
      "Complete authentic performance of Chopin's haunting E-minor Prelude Op. 28 No. 4, played at his own funeral — built on chromatic descending sighing harmonies.",
  }),
  createRealMidiPiece({
    id: "debussy_fille_aux_cheveux_de_lin",
    code: "DEB-FL",
    composer: "Claude Debussy (1862–1918)",
    title: "La fille aux cheveux de lin (Préludes, Book I No. 8)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Concert MIDI",
    year: "1910 · Paris",
    keySignature: "G♭ Major · 3/4",
    historicalNote:
      "Expressive full performance of Debussy's poetic The Girl with the Flaxen Hair in G-flat major, floating gently on pentatonic melodies and luminous modal harmonies.",
  }),
  createRealMidiPiece({
    id: "liszt_consolation_no3_s172",
    code: "LISZT-C3",
    composer: "Franz Liszt (1811–1886)",
    title: "Consolation No. 3 in D♭ Major, S. 172 (Lento placido)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Mutopia Urtext MIDI",
    year: "1849–1850 · Weimar",
    keySignature: "D♭ Major · 4/4",
    historicalNote:
      "Complete Urtext performance of Liszt's serene Consolation No. 3 in D-flat major, weaving a singing Chopin-inspired cantilena above flowing arpeggiated accompaniment.",
  }),
  createRealMidiPiece({
    id: "bach_air_on_g_string_bwv1068",
    code: "BACH-AIR",
    composer: "Johann Sebastian Bach (1685–1750)",
    title: "Air on the G String (Orchestral Suite No. 3 in D Major, BWV 1068)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Mutopia Urtext MIDI",
    year: "c. 1730 · Leipzig",
    keySignature: "D Major · 4/4",
    historicalNote:
      "Noble solo piano edition of Bach's timeless Air from Orchestral Suite No. 3, balancing the soaring soprano melody against a walking octave baroque bass.",
  }),
  createRealMidiPiece({
    id: "debussy_clair_de_lune",
    code: "DEB-CL",
    composer: "Claude Debussy (1862–1918)",
    title: "Clair de Lune (Suite bergamasque, L. 75 No. 3)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1890 / rev. 1905 · Paris",
    keySignature: "D♭ Major · 9/8",
    historicalNote:
      "Complete authentic performance of Debussy's Clair de Lune in D-flat major — shimmering impressionist rubato, flowing 9/8 arpeggios, and hushed moonlit coda.",
  }),
  createRealMidiPiece({
    id: "rachmaninoff_prelude_c_sharp_minor_op3_no2",
    code: "RACH-3",
    composer: "Sergei Rachmaninoff (1873–1943)",
    title: "Prelude in C♯ Minor, Op. 3 No. 2 — \"The Bells of Moscow\"",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1892 · Moscow",
    keySignature: "C♯ Minor · 4/4",
    historicalNote:
      "Complete concert performance of Rachmaninoff's monumental C-sharp minor Prelude, featuring deep 88-key bass bells, stormy Agitato, and massive four-staff climax.",
  }),
  createRealMidiPiece({
    id: "tchaikovsky_june_barcarolle_op37a_no6",
    code: "TCH-JUN",
    composer: "Pyotr Ilyich Tchaikovsky (1840–1893)",
    title: "The Seasons, Op. 37a — No. 6 June: Barcarolle",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1876 · Moscow",
    keySignature: "G Minor · 4/4",
    historicalNote:
      "Complete lyrical concert performance of Tchaikovsky's beloved June Barcarolle — wistful G-minor gondolier song, radiant G-major Poco più mosso, and tender coda.",
  }),
  createRealMidiPiece({
    id: "satie_gymnopedie_no1",
    code: "SAT-G1",
    composer: "Erik Satie (1866–1925)",
    title: "Gymnopédie No. 1 (Lent et douloureux)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Mutopia Urtext MIDI",
    year: "1888 · Montmartre, Paris",
    keySignature: "D Major · 3/4",
    historicalNote:
      "Authentic Urtext performance of Satie's iconic Gymnopédie No. 1 with gently swaying major-seventh chords and timeless minimalist poise.",
  }),
  createRealMidiPiece({
    id: "mozart_rondo_alla_turca_k331",
    code: "MOZ-TUR",
    composer: "Wolfgang Amadeus Mozart (1756–1791)",
    title: "Piano Sonata No. 11 in A Major, K. 331 — III. Rondo Alla Turca",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger MIDI",
    year: "1783 · Vienna",
    keySignature: "A Minor · 2/4",
    historicalNote:
      "Complete sparkling performance of Mozart's Turkish March (2,819 notes) with authentic Janissary rolled bass chords and dazzling A-major coda.",
  }),
  createRealMidiPiece({
    id: "chopin_waltz_c_sharp_minor_op64_no2",
    code: "CHOP-W64",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Waltz in C♯ Minor, Op. 64 No. 2",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Concert MIDI",
    year: "1847 · Paris",
    keySignature: "C♯ Minor · 3/4",
    historicalNote:
      "Expressive concert MIDI performance of Chopin's Waltz Op. 64 No. 2 — melancholic salon grace, silky Più mosso eighth-note runs, and radiant D-flat major Trio.",
  }),
];

export const ADDITIONAL_REPERTOIRE = [
  ...CLASSICAL_MIDI_CATALOG,
  buildDrowningLove(),
  buildMeaningfulLove(),
];
