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
  const s = new ScoreBuilder(76);
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
  const s = new ScoreBuilder(106);
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
// MODERN SOLO 3: MADK1D & VILLIAN — «ДИНАСТИЯ» (Concert Piano Arrangement)
// Key: F# Minor (F#m9 — Dmaj9 — Aadd9 — Eadd9) · 155 BPM (Half-time trap pulse)
// ============================================================================
function buildMadk1dDinastiya() {
  const s = new ScoreBuilder(155);
  let b = 0;

  // Authentic 4-chord progression of «Династия»: F#m — D — A — E
  const chords = [
    {
      name: "F#m",
      sub: "F#1",
      root: "F#2",
      fifth: "C#3",
      oct: "F#3",
      mid: ["F#3", "A3", "C#4"],
      rich: ["C#3", "F#3", "G#3", "A3", "C#4"],
      arp: ["F#4", "A4", "C#5", "E5", "F#5", "A5", "C#6", "E6"],
      introPluck: ["C#5", "A4", "F#4", "A4", "E5", "C#5", "A4", "G#4"],
    },
    {
      name: "D",
      sub: "D1",
      root: "D2",
      fifth: "A2",
      oct: "D3",
      mid: ["D3", "F#3", "A3"],
      rich: ["A2", "D3", "E3", "F#3", "A3"],
      arp: ["D4", "F#4", "A4", "C#5", "D5", "F#5", "A5", "E6"],
      introPluck: ["A4", "F#4", "D4", "F#4", "E5", "D5", "A4", "F#4"],
    },
    {
      name: "A",
      sub: "A1",
      root: "A2",
      fifth: "E3",
      oct: "A3",
      mid: ["E3", "A3", "C#4"],
      rich: ["E3", "A3", "B3", "C#4", "E4"],
      arp: ["A4", "C#5", "E5", "A5", "B5", "C#6", "E6", "C#6"],
      introPluck: ["C#5", "A4", "E4", "A4", "E5", "C#5", "B4", "A4"],
    },
    {
      name: "E",
      sub: "E1",
      root: "E2",
      fifth: "B2",
      oct: "E3",
      mid: ["E3", "G#3", "B3"],
      rich: ["B2", "E3", "F#3", "G#3", "B3"],
      arp: ["E4", "G#4", "B4", "E5", "F#5", "G#5", "B5", "E6"],
      introPluck: ["B4", "G#4", "E4", "G#4", "E5", "B4", "G#4", "F#4"],
    },
  ];

  // Helper: syncopated trap-piano 808 bass & half-time backbeat groove in LH
  const playTrapGrooveLH = (barStart, ch, mode = "verse") => {
    if (mode === "sparse") {
      // Stripped-back moody bounce
      s.note(barStart + 0.0, 1.35, ch.root, 0.56, "LH");
      s.note(barStart + 0.0, 1.35, ch.sub, 0.48, "LH");
      s.note(barStart + 1.5, 0.85, ch.fifth, 0.44, "LH");
      s.note(barStart + 2.0, 0.55, ch.oct, 0.48, "LH");
      s.note(barStart + 3.5, 0.45, ch.root, 0.46, "LH");
      return;
    }
    if (mode === "verse") {
      // Crisp 808 bounce + snare-hit mid-voicing on beat 2.0
      s.note(barStart + 0.0, 1.35, ch.sub, 0.62, "LH");
      s.note(barStart + 0.0, 1.35, ch.root, 0.66, "LH");
      s.note(barStart + 1.0, 0.45, ch.fifth, 0.46, "LH");
      s.note(barStart + 1.5, 0.65, ch.root, 0.56, "LH");
      s.chord(barStart + 2.0, 0.55, ch.mid, 0.58, "LH", 0.015);
      s.note(barStart + 2.5, 0.65, ch.fifth, 0.46, "LH");
      s.note(barStart + 3.0, 0.45, ch.oct, 0.44, "LH");
      s.note(barStart + 3.5, 0.48, ch.root, 0.54, "LH");
      return;
    }
    if (mode === "chorus") {
      // Heavy concert 808 octave drop + wide rhythmic chordal drive
      s.note(barStart + 0.0, 1.45, ch.sub, 0.76, "LH");
      s.note(barStart + 0.0, 1.45, ch.root, 0.78, "LH");
      s.note(barStart + 0.5, 0.65, ch.fifth, 0.52, "LH");
      s.note(barStart + 1.0, 0.55, ch.oct, 0.54, "LH");
      s.note(barStart + 1.5, 0.75, ch.sub, 0.68, "LH");
      s.note(barStart + 1.5, 0.75, ch.root, 0.70, "LH");
      s.chord(barStart + 2.0, 0.62, ch.mid, 0.68, "LH", 0.015);
      s.note(barStart + 2.5, 0.65, ch.fifth, 0.54, "LH");
      s.note(barStart + 3.0, 0.55, ch.oct, 0.56, "LH");
      s.note(barStart + 3.5, 0.48, ch.root, 0.66, "LH");
      return;
    }
    if (mode === "climax") {
      // Full stadium concert grand power: sub-octaves + sweeping 10ths
      s.note(barStart + 0.0, 1.55, ch.sub, 0.84, "LH");
      s.note(barStart + 0.0, 1.55, ch.root, 0.86, "LH");
      s.note(barStart + 0.5, 0.75, ch.fifth, 0.62, "LH");
      s.note(barStart + 1.0, 0.65, ch.oct, 0.64, "LH");
      s.note(barStart + 1.5, 0.75, ch.sub, 0.76, "LH");
      s.note(barStart + 1.5, 0.75, ch.root, 0.78, "LH");
      s.chord(barStart + 2.0, 0.65, ch.rich.slice(1, 4), 0.74, "LH", 0.014);
      s.note(barStart + 2.5, 0.65, ch.fifth, 0.60, "LH");
      s.note(barStart + 3.0, 0.55, ch.oct, 0.62, "LH");
      s.note(barStart + 3.5, 0.48, ch.sub, 0.72, "LH");
      s.note(barStart + 3.5, 0.48, ch.root, 0.74, "LH");
    }
  };

  // ==========================================================================
  // 1. INTRO — Dark Synth-Pluck Piano Ostinato (8 bars, 32 beats)
  // ==========================================================================
  for (let rep = 0; rep < 2; rep++) {
    for (let m = 0; m < 4; m++) {
      const ch = chords[m];
      s.pedal(b, b + 3.84);
      // Deep atmospheric bass foundation
      s.note(b + 0.0, 3.6, ch.root, rep === 0 ? 0.50 : 0.60, "LH");
      if (rep === 1) {
        s.note(b + 0.0, 3.6, ch.sub, 0.56, "LH");
        s.note(b + 2.0, 1.6, ch.fifth, 0.48, "LH");
        s.note(b + 3.5, 0.5, ch.root, 0.52, "LH");
      } else {
        s.note(b + 2.0, 1.7, ch.fifth, 0.38, "LH");
      }
      // Iconic pulsing eighth-note dark music-box pluck
      for (let i = 0; i < 8; i++) {
        const pitch = ch.introPluck[i];
        const v = (i === 0 || i === 4 ? 0.54 : 0.42) + rep * 0.08;
        s.note(b + i * 0.5, 0.72, pitch, v, "RH");
        if (rep === 1 && (i === 0 || i === 4)) {
          s.note(b + i * 0.5, 0.9, noteToMidi(pitch) + 12, v * 0.76, "RH");
        }
      }
      b += 4.0;
    }
  }

  // ==========================================================================
  // CHORUS MELODY DATA — «Династия! Первый миллион, я первый чемпион...»
  // 8-bar full chorus hook (repeated twice = 16 bars per chorus)
  // ==========================================================================
  const chorusHookA = [
    // Bar 1 (F#m): «Ди-на-сти-я!» + synth answer
    [
      [0.0, 0.65, "F#5", 0.80],
      [0.5, 0.55, "F#5", 0.74],
      [1.0, 0.85, "E5", 0.78],
      [1.75, 0.95, "C#5", 0.76],
      [2.75, 0.55, "A5", 0.68],
      [3.25, 0.65, "G#5", 0.70],
    ],
    // Bar 2 (D): «Пер-вый мил-ли-он...»
    [
      [0.0, 0.75, "F#5", 0.80],
      [0.75, 0.55, "E5", 0.74],
      [1.25, 0.75, "D5", 0.76],
      [2.0, 0.75, "C#5", 0.72],
      [2.75, 0.55, "A4", 0.68],
      [3.25, 0.65, "D5", 0.72],
    ],
    // Bar 3 (A): «Я пер-вый чем-пи-он, и мне стя-ну-ло...»
    [
      [0.0, 0.65, "E5", 0.80],
      [0.5, 0.55, "E5", 0.74],
      [1.0, 0.65, "C#5", 0.76],
      [1.5, 0.55, "B4", 0.70],
      [2.0, 0.65, "A4", 0.72],
      [2.5, 0.55, "B4", 0.70],
      [3.0, 0.55, "C#5", 0.74],
      [3.5, 0.50, "E5", 0.76],
    ],
    // Bar 4 (E): «...мы сни-мем на iPhone»
    [
      [0.0, 0.75, "E5", 0.78],
      [0.75, 0.55, "B4", 0.72],
      [1.25, 0.65, "G#4", 0.68],
      [2.0, 0.65, "B4", 0.74],
      [2.5, 0.55, "C#5", 0.76],
      [3.0, 0.90, "B4", 0.72],
    ],
  ];

  const chorusHookB = [
    // Bar 5 (F#m): «Кон-цер-ты из У-фы, мы пи-шем э-то на Samson»
    [
      [0.0, 0.60, "A5", 0.84],
      [0.5, 0.55, "G#5", 0.78],
      [1.0, 0.75, "F#5", 0.82],
      [1.75, 0.60, "E5", 0.76],
      [2.25, 0.65, "C#5", 0.76],
      [3.0, 0.50, "E5", 0.74],
      [3.5, 0.50, "F#5", 0.78],
    ],
    // Bar 6 (D): «Я пом-ню, ма-ма го-во-ри-ла...»
    [
      [0.0, 0.75, "F#5", 0.82],
      [0.75, 0.55, "A5", 0.84],
      [1.25, 0.65, "F#5", 0.78],
      [2.0, 0.65, "E5", 0.76],
      [2.5, 0.60, "D5", 0.74],
      [3.0, 0.55, "E5", 0.76],
      [3.5, 0.50, "F#5", 0.78],
    ],
    // Bar 7 (A): «Кре-а-тор зна-ет толк в э-том, мы сни-мем на iPhone»
    [
      [0.0, 0.75, "E5", 0.82],
      [0.75, 0.55, "A5", 0.86],
      [1.25, 0.70, "E5", 0.80],
      [2.0, 0.60, "C#5", 0.76],
      [2.5, 0.55, "B4", 0.72],
      [3.0, 0.55, "C#5", 0.76],
      [3.5, 0.50, "E5", 0.78],
    ],
    // Bar 8 (E): «Кон-цер-ты из Мос-квы, мы пи-шем э-то на Samson»
    [
      [0.0, 0.75, "G#5", 0.82],
      [0.75, 0.55, "F#5", 0.76],
      [1.25, 0.65, "E5", 0.78],
      [2.0, 0.70, "B4", 0.74],
      [2.75, 0.45, "C#5", 0.74],
      [3.25, 0.40, "E5", 0.76],
      [3.65, 0.40, "F#5", 0.80],
    ],
  ];

  const playChorusSection = (intensity = "chorus", bars = 16) => {
    const sets = bars >= 16 ? [chorusHookA, chorusHookB, chorusHookA, chorusHookB] : [chorusHookA, chorusHookB];
    const isClimax = intensity === "climax";
    for (let sIdx = 0; sIdx < sets.length; sIdx++) {
      const group = sets[sIdx];
      const lift = sIdx >= 2 || isClimax;
      for (let m = 0; m < 4; m++) {
        const ch = chords[m];
        s.pedal(b, b + 3.84);
        playTrapGrooveLH(b, ch, isClimax ? "climax" : "chorus");

        const phrase = group[m];
        for (let i = 0; i < phrase.length; i++) {
          const [off, dur, pitch, vel] = phrase[i];
          const midi = noteToMidi(pitch);
          const v = Math.min(0.90, vel + (isClimax ? 0.06 : lift ? 0.03 : -0.02));
          s.note(b + off, dur, midi, v, "RH");

          // Harmonize downbeats & accented hooks with crisp chord voicings or concert octaves
          if (off === 0.0 || off === 2.0) {
            const harmPitch = ch.mid[i === 0 ? 1 : 2];
            const harmMidi = noteToMidi(harmPitch);
            if (midi - harmMidi >= 3 && midi - harmMidi <= 16) {
              s.note(b + off, dur * 0.9, harmMidi, v * 0.72, "RH");
            }
          }
          if (lift && (off === 0.0 || off === 1.0 || off === 1.25 || off === 2.0) && midi >= 72 && midi <= 84) {
            s.note(b + off, dur * 0.94, midi + 12, v * 0.82, "RH");
          } else if (midi >= 74 && (off === 0.0 || off === 1.75)) {
            s.note(b + off, dur * 0.9, midi - 12, v * 0.70, "RH");
          }
        }
        b += 4.0;
      }
    }
  };

  // ==========================================================================
  // 2. CHORUS 1 — Anthemic Hook Drop (16 bars, 64 beats)
  // ==========================================================================
  playChorusSection("chorus", 16);

  // ==========================================================================
  // 3. VERSE 1 — Crisp Syncopated Melodic Rap Flow (16 bars, 64 beats)
  // ==========================================================================
  const versePhrasesA = [
    // F#m
    [
      [0.0, 0.45, "C#5", 0.64], [0.5, 0.45, "C#5", 0.60], [1.0, 0.45, "A4", 0.62],
      [1.5, 0.55, "C#5", 0.66], [2.25, 0.45, "B4", 0.60], [2.75, 0.45, "A4", 0.58], [3.25, 0.65, "F#4", 0.60],
    ],
    // D
    [
      [0.0, 0.55, "A4", 0.64], [0.5, 0.45, "A4", 0.58], [1.0, 0.50, "F#4", 0.60],
      [1.5, 0.55, "A4", 0.64], [2.0, 0.50, "B4", 0.66], [2.5, 0.45, "A4", 0.60], [3.0, 0.85, "F#4", 0.58],
    ],
    // A
    [
      [0.0, 0.50, "C#5", 0.66], [0.5, 0.45, "B4", 0.60], [1.0, 0.50, "A4", 0.62],
      [1.5, 0.50, "E4", 0.56], [2.0, 0.55, "A4", 0.62], [2.5, 0.50, "B4", 0.64], [3.0, 0.85, "C#5", 0.66],
    ],
    // E
    [
      [0.0, 0.65, "B4", 0.64], [0.75, 0.45, "G#4", 0.58], [1.25, 0.55, "B4", 0.62],
      [2.0, 0.55, "C#5", 0.66], [2.5, 0.55, "B4", 0.62], [3.0, 0.85, "G#4", 0.56],
    ],
  ];

  const versePhrasesB = [
    // F#m (higher emotional push)
    [
      [0.0, 0.50, "F#5", 0.72], [0.5, 0.45, "E5", 0.66], [1.0, 0.50, "C#5", 0.68],
      [1.5, 0.50, "C#5", 0.64], [2.0, 0.65, "E5", 0.72], [2.75, 0.55, "C#5", 0.66], [3.35, 0.55, "A4", 0.62],
    ],
    // D
    [
      [0.0, 0.65, "D5", 0.70], [0.75, 0.45, "C#5", 0.66], [1.25, 0.55, "A4", 0.64],
      [2.0, 0.55, "D5", 0.70], [2.5, 0.55, "E5", 0.72], [3.0, 0.85, "F#5", 0.74],
    ],
    // A
    [
      [0.0, 0.65, "E5", 0.74], [0.75, 0.45, "C#5", 0.68], [1.25, 0.55, "A4", 0.64],
      [2.0, 0.50, "C#5", 0.68], [2.5, 0.50, "E5", 0.72], [3.0, 0.50, "C#5", 0.68], [3.5, 0.50, "B4", 0.66],
    ],
    // E
    [
      [0.0, 0.70, "B4", 0.68], [0.75, 0.50, "C#5", 0.70], [1.25, 0.60, "E5", 0.74],
      [2.0, 0.65, "E5", 0.72], [2.75, 0.55, "C#5", 0.68], [3.35, 0.55, "B4", 0.64],
    ],
  ];

  for (let rep = 0; rep < 4; rep++) {
    const src = rep % 2 === 0 ? versePhrasesA : versePhrasesB;
    const mode = rep === 0 ? "sparse" : "verse";
    for (let m = 0; m < 4; m++) {
      const ch = chords[m];
      s.pedal(b, b + 3.78);
      playTrapGrooveLH(b, ch, mode);
      for (const [off, dur, pitch, vel] of src[m]) {
        const vv = vel + (rep >= 2 ? 0.04 : 0);
        s.note(b + off, dur, pitch, vv, "RH");
        if (rep >= 2 && (off === 0.0 || off === 2.0)) {
          s.note(b + off, dur * 0.85, ch.mid[1], vv * 0.65, "RH");
        }
      }
      b += 4.0;
    }
  }

  // ==========================================================================
  // 4. PRE-CHORUS — Driving Build-Up + Dramatic Beat Drop Pause (8 bars, 32 beats)
  // ==========================================================================
  for (let rep = 0; rep < 2; rep++) {
    for (let m = 0; m < 4; m++) {
      const ch = chords[m];
      const isFinalBar = rep === 1 && m === 3;
      s.pedal(b, b + (isFinalBar ? 2.45 : 3.84));

      if (isFinalBar) {
        // Dramatic dominant hit + crisp silence + pickup right into Chorus 2!
        s.chord(b + 0.0, 2.3, ["E1", "E2", "B2", "E3"], 0.80, "LH", 0.015);
        s.chord(b + 0.0, 2.3, ["G#4", "B4", "E5", "G#5"], 0.82, "RH", 0.02);
        // Pickup riff on beat 3.25..3.75
        s.note(b + 3.25, 0.35, "C#5", 0.72, "RH");
        s.note(b + 3.55, 0.42, "E5", 0.78, "RH");
      } else {
        // Pulsing 8th-note driving bass & swelling inner chords
        for (let k = 0; k < 8; k++) {
          const isAccent = k === 0 || k === 3 || k === 6;
          const v = (isAccent ? 0.64 : 0.46) + rep * 0.08 + m * 0.02;
          s.note(b + k * 0.5, 0.45, k % 2 === 0 ? ch.root : ch.fifth, v, "LH");
          if (k === 0) s.note(b + 0.0, 1.8, ch.sub, 0.68 + rep * 0.08, "LH");
        }
        // Rising emotional vocal-pad melody
        const buildLine = [
          ["A4", "C#5", "E5", "F#5"],
          ["A4", "D5", "F#5", "E5"],
          ["C#5", "E5", "A5", "G#5"],
          ["B4", "E5", "G#5", "F#5"],
        ][m];
        for (let k = 0; k < 4; k++) {
          const v = 0.66 + rep * 0.07 + k * 0.025;
          s.note(b + k * 1.0, 0.95, buildLine[k], v, "RH");
          if (rep === 1) {
            s.note(b + k * 1.0, 0.92, noteToMidi(buildLine[k]) - 12, v * 0.72, "RH");
          }
        }
      }
      b += 4.0;
    }
  }

  // ==========================================================================
  // 5. CHORUS 2 — Full Concert Grand Drop (16 bars, 64 beats)
  // ==========================================================================
  playChorusSection("chorus", 16);

  // ==========================================================================
  // 6. DIGICORE SYNTH-ARPEGGIO INTERLUDE — Sparkling 16th-Note Cascade (8 bars, 32 beats)
  // ==========================================================================
  for (let rep = 0; rep < 2; rep++) {
    for (let m = 0; m < 4; m++) {
      const ch = chords[m];
      s.pedal(b, b + 3.84);
      playTrapGrooveLH(b, ch, rep === 0 ? "chorus" : "climax");

      // Crisp 16-step hyperpop/digicore synth arpeggio across 2.5 octaves
      const seq = [0, 2, 4, 5, 6, 5, 4, 2, 1, 3, 5, 6, 7, 6, 5, 4];
      for (let step = 0; step < 16; step++) {
        const pitch = ch.arp[seq[step]];
        const accent = step % 4 === 0 ? 0.78 : step % 2 === 0 ? 0.64 : 0.56;
        s.note(b + step * 0.25, 0.34, pitch, accent + rep * 0.04, "RH");
      }
      b += 4.0;
    }
  }

  // ==========================================================================
  // 7. ATMOSPHERIC BRIDGE / BREAKDOWN — Intimate Felt-Piano Reflection (8 bars, 32 beats)
  // ==========================================================================
  s.setTempo(b, 144);
  for (let rep = 0; rep < 2; rep++) {
    for (let m = 0; m < 4; m++) {
      const ch = chords[m];
      s.pedal(b, b + 3.88);
      if (rep === 0) {
        // Lush rolled concert chords, hushed and spacious
        s.chord(b + 0.0, 3.7, [ch.sub, ch.root, ch.fifth, ch.oct], 0.48, "LH", 0.08);
        const topSing = [
          [[0.5, 1.5, "F#5", 0.58], [2.0, 1.0, "E5", 0.52], [3.0, 0.9, "C#5", 0.50]],
          [[0.0, 2.0, "D5", 0.56], [2.0, 1.8, "A4", 0.50]],
          [[0.0, 1.5, "E5", 0.58], [1.5, 1.0, "C#5", 0.54], [2.5, 1.4, "B4", 0.50]],
          [[0.0, 2.2, "G#4", 0.52], [2.25, 1.6, "B4", 0.54]],
        ][m];
        for (const [off, dur, pitch, vel] of topSing) {
          s.note(b + off, dur, pitch, vel, "RH");
        }
      } else {
        // Accelerating crescendo back into final climax!
        if (m === 2) s.setTempo(b, 150);
        if (m === 3) s.setTempo(b, 155);
        for (let k = 0; k < 8; k++) {
          const v = 0.48 + m * 0.06 + k * 0.025;
          s.note(b + k * 0.5, 0.55, k % 2 === 0 ? ch.root : ch.fifth, v, "LH");
          if (k === 0 || k === 4) s.note(b + k * 0.5, 1.2, ch.sub, v + 0.06, "LH");
        }
        for (let k = 0; k < 8; k++) {
          const p = ch.arp[Math.min(ch.arp.length - 1, k)];
          s.note(b + k * 0.5, 0.65, p, 0.56 + m * 0.06 + k * 0.02, "RH");
        }
      }
      b += 4.0;
    }
  }

  // ==========================================================================
  // 8. FINAL CLIMAX CHORUS — Maximum Concert Grand Power (8 bars, 32 beats)
  // ==========================================================================
  s.setTempo(b, 155);
  playChorusSection("climax", 8);

  // ==========================================================================
  // 9. OUTRO CODA — Haunting Music-Box Fadeout + Resonant F#m9 Resolve (8 bars)
  // ==========================================================================
  s.setTempo(b, 146);
  for (let m = 0; m < 4; m++) {
    const ch = chords[m];
    const fade = 1.0 - m * 0.09;
    s.pedal(b, b + 3.86);
    if (m === 2) s.setTempo(b, 134);
    if (m === 3) s.setTempo(b, 118);

    s.note(b + 0.0, 3.6, ch.sub, 0.50 * fade, "LH");
    s.note(b + 0.0, 3.6, ch.root, 0.54 * fade, "LH");
    s.note(b + 2.0, 1.7, ch.fifth, 0.42 * fade, "LH");
    for (let i = 0; i < 8; i++) {
      const pitch = ch.introPluck[i];
      s.note(b + i * 0.5, 0.78, pitch, (i === 0 || i === 4 ? 0.54 : 0.40) * fade, "RH");
    }
    b += 4.0;
  }

  // Final slow lingering F#m9 concert chord resolution
  s.setTempo(b, 92);
  s.pedal(b, b + 7.5);
  s.chord(b + 0.0, 7.0, ["F#1", "C#2", "F#2", "A2", "C#3"], 0.46, "LH", 0.14);
  s.chord(b + 0.65, 6.4, ["G#3", "A3", "C#4", "F#4", "A4", "C#5", "F#5"], 0.42, "RH", 0.16);
  b += 8.0;

  return s.build({
    id: "madk1d_dinastiya",
    code: "MK-DYN",
    composer: "madk1d & VILLIAN",
    title: "ДИНАСТИЯ (Piano Concert Arrangement)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Interactive Piano Arrangement",
    tuningA4: 440.0,
    year: "2026 · «Красивое Зло» (Piano Cover)",
    keySignature: "F♯ Minor · 4/4",
    bpm: 155,
    historicalNote:
      "Аранжировка хита «ДИНАСТИЯ» (madk1d & VILLIAN) для сольного фортепиано в оригинальной тональности фа-диез минор (F#m – D – A – E, 155 BPM): атмосферное синт-арпеджио, качающий октавный бас, припевная мелодия и искрящийся диджикор-проигрыш.",
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
  createRealMidiPiece({
    id: "beethoven_moonlight_mvt3_presto",
    code: "LVB-27III",
    composer: "Ludwig van Beethoven (1770–1827)",
    title: "Piano Sonata No. 14 in C♯ Minor, Op. 27 No. 2 — III. Presto agitato",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · ClassicalPianoMIDI Concert Performance",
    year: "1801 · Vienna",
    keySignature: "C♯ Minor · 4/4",
    historicalNote:
      "Stormy, blistering virtuoso finale of Beethoven's Moonlight Sonata (6,538 notes) — surging 16th-note arpeggios, thunderous sforzando chords, and dramatic cadenza.",
  }),
  createRealMidiPiece({
    id: "chopin_fantaisie_impromptu_op66",
    code: "CHOP-66",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Fantaisie-Impromptu in C♯ Minor, Op. 66",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · ClassicalPianoMIDI Concert Performance",
    year: "1834 (pub. 1855) · Paris",
    keySignature: "C♯ Minor · 2/2",
    historicalNote:
      "Complete authentic performance of Chopin's dazzling Fantaisie-Impromptu (3,050 notes), weaving 4-against-3 cross-rhythms around the luminous D-flat major Moderato cantabile.",
  }),
  createRealMidiPiece({
    id: "liszt_liebestraum_no3_s541",
    code: "LISZT-L3",
    composer: "Franz Liszt (1811–1886)",
    title: "Liebestraum No. 3 in A♭ Major, S. 541 (O lieb, so lang du lieben kannst)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · ClassicalPianoMIDI Concert Performance",
    year: "1850 · Weimar",
    keySignature: "A♭ Major · 6/4",
    historicalNote:
      "Complete concert performance of Liszt's iconic Nocturne Liebestraum No. 3 — warm inner-voice thumb melody, two cascading virtuoso cadenzas, and passionate B-major climax.",
  }),
  createRealMidiPiece({
    id: "rachmaninoff_prelude_g_minor_op23_no5",
    code: "RACH-23",
    composer: "Sergei Rachmaninoff (1873–1943)",
    title: "Prelude in G Minor, Op. 23 No. 5 (Alla marcia)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · ClassicalPianoMIDI Concert Performance",
    year: "1901 · Moscow",
    keySignature: "G Minor · 4/4",
    historicalNote:
      "Electrifying concert performance of Rachmaninoff's heroic G-minor Prelude (3,861 notes) — crisp martial chords, sweeping Russian lyricism in the Poco meno mosso, and triumphant return.",
  }),
  createRealMidiPiece({
    id: "beethoven_pathetique_mvt2",
    code: "LVB-13II",
    composer: "Ludwig van Beethoven (1770–1827)",
    title: "Piano Sonata No. 8 in C Minor, Op. 13 \"Pathétique\" — II. Adagio cantabile",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1798 · Vienna",
    keySignature: "A♭ Major · 2/4",
    historicalNote:
      "Complete concert performance of Beethoven's beloved Pathétique Adagio cantabile — a serene hymn-like A-flat major melody framed by tender syncopated inner voices.",
  }),
  createRealMidiPiece({
    id: "chopin_ballade_no1_op23",
    code: "CHOP-B1",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Ballade No. 1 in G Minor, Op. 23",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1831–1835 · Paris",
    keySignature: "G Minor · 6/4",
    historicalNote:
      "Complete monumental performance of Chopin's First Ballade (5,028 notes), immortalized in The Pianist — unfolding from a solemn Largo recitative to a blazing Presto con fuoco coda.",
  }),
  createRealMidiPiece({
    id: "chopin_raindrop_prelude_op28_no15",
    code: "CHOP-15",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Prelude in D♭ Major, Op. 28 No. 15 — \"Raindrop\"",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1838–1839 · Valldemossa, Mallorca",
    keySignature: "D♭ Major · 4/4",
    historicalNote:
      "Authentic performance of Chopin's Raindrop Prelude, built around an obsessive repeated A-flat / G-sharp pulse that shifts from sunlit peace into a dark C-sharp minor storm.",
  }),
  createRealMidiPiece({
    id: "chopin_heroic_polonaise_op53",
    code: "CHOP-53",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Polonaise in A♭ Major, Op. 53 — \"Heroic\"",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1842 · Nohant / Paris",
    keySignature: "A♭ Major · 3/4",
    historicalNote:
      "Complete bravura performance (6,052 notes) of Chopin's Heroic Polonaise — noble fanfares, proud Polish dance rhythms, and thunderous left-hand cavalry octaves in E major.",
  }),
  createRealMidiPiece({
    id: "liszt_hungarian_rhapsody_no2",
    code: "LISZT-HR2",
    composer: "Franz Liszt (1811–1886)",
    title: "Hungarian Rhapsody No. 2 in C♯ Minor, S. 244/2",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1847 · Weimar",
    keySignature: "C♯ Minor → F♯ Major · 2/4",
    historicalNote:
      "Complete concert tour-de-force (6,760 notes) of Liszt's iconic Hungarian Rhapsody No. 2, pairing the brooding Gypsy Lassan with the exhilarating, world-famous Friska finale.",
  }),
  createRealMidiPiece({
    id: "schubert_impromptu_op90_no3",
    code: "SCHUB-90",
    composer: "Franz Schubert (1797–1828)",
    title: "Impromptu in G♭ Major, Op. 90 No. 3 (D. 899)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1827 · Vienna",
    keySignature: "G♭ Major · 4/2",
    historicalNote:
      "Complete poetic performance of Schubert's luminous G-flat major Impromptu — an unending song without words floating atop murmuring harplike sextuplets.",
  }),
  createRealMidiPiece({
    id: "schubert_moment_musical_no3",
    code: "SCHUB-MM3",
    composer: "Franz Schubert (1797–1828)",
    title: "Moment musical No. 3 in F Minor, Op. 94 (D. 780)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1823 · Vienna",
    keySignature: "F Minor · 2/4",
    historicalNote:
      "Charming, bittersweet miniature by Franz Schubert with crisp grace-note dance rhythms and a tender Viennese coda in F major.",
  }),
  createRealMidiPiece({
    id: "brahms_intermezzo_op117_no1",
    code: "BRAH-117",
    composer: "Johannes Brahms (1833–1897)",
    title: "Intermezzo in E♭ Major, Op. 117 No. 1 (\"Cradle Song\")",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1892 · Bad Ischl",
    keySignature: "E♭ Major · 6/8",
    historicalNote:
      "Late autumn masterpiece of Brahms, prefixed with Herder's Scottish lullaby ('Sleep softly, my child') — warm inner-thumb melody rocked by deep resonant harmonies.",
  }),
  createRealMidiPiece({
    id: "grieg_wedding_day_at_troldhaugen",
    code: "GRIEG-65",
    composer: "Edvard Grieg (1843–1907)",
    title: "Wedding Day at Troldhaugen (Lyric Pieces, Op. 65 No. 6)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1896 · Troldhaugen, Bergen",
    keySignature: "D Major · 4/4",
    historicalNote:
      "Joyous Norwegian festive march composed for Edvard and Nina Grieg's 25th wedding anniversary, contrasting jubilant folk bells with a deeply tender Poco tranquillo center.",
  }),
  createRealMidiPiece({
    id: "grieg_march_of_the_dwarfs",
    code: "GRIEG-54",
    composer: "Edvard Grieg (1843–1907)",
    title: "March of the Dwarfs (Lyric Pieces, Op. 54 No. 3)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1891 · Bergen",
    keySignature: "D Minor · 2/4",
    historicalNote:
      "Mischievous Nordic fairy-tale scherzo depicting scurrying mountain trolls in D minor, interrupted by an enchanting, sunlit D-major forest song.",
  }),
  createRealMidiPiece({
    id: "mendelssohn_venetian_boat_song",
    code: "MEND-19",
    composer: "Felix Mendelssohn (1809–1847)",
    title: "Songs Without Words, Op. 19 No. 6 — Venetian Gondola Song",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1830 · Venice",
    keySignature: "G Minor · 6/8",
    historicalNote:
      "Evocative twilight barcarolle composed during Mendelssohn's Italian journey — wistful Venetian canal bells and swaying 6/8 gondolier accompaniment.",
  }),
  createRealMidiPiece({
    id: "mussorgsky_promenade_pictures",
    code: "MUSS-PIC",
    composer: "Modest Mussorgsky (1839–1881)",
    title: "Pictures at an Exhibition — Promenade & Gnomus",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1874 · Saint Petersburg",
    keySignature: "B♭ Major / E♭ Minor · 11/4",
    historicalNote:
      "Iconic Russian opening of Pictures at an Exhibition — the proud, asymmetrical 11/4 Promenade stroll leading directly into the dramatic, grotesque Gnomus.",
  }),
  createRealMidiPiece({
    id: "tchaikovsky_october_autumn_song",
    code: "TCH-OCT",
    composer: "Pyotr Ilyich Tchaikovsky (1840–1893)",
    title: "The Seasons, Op. 37a — No. 10 October: Autumn Song",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Public Domain Score · Bernd Krueger Concert MIDI",
    year: "1876 · Moscow",
    keySignature: "D Minor · 4/4",
    historicalNote:
      "Heartfelt Russian elegy inspired by Alexei Tolstoy's autumn verse — falling golden leaves echoed in sighing descending phrases and a passionate central climax.",
  }),
];

// ============================================================================
// TOP 10 ANIME PIANO MASTERPIECES — Authentic Solo Concert MIDI (Animenz Style)
// ============================================================================
const ANIME_TOP10_CATALOG = [
  createRealMidiPiece({
    id: "anime_tokyo_ghoul_unravel",
    code: "ANI-TG",
    composer: "TK from Ling tosite sigure · Arr. Animenz Style",
    title: "Tokyo Ghoul — \"Unravel\" (Virtuoso Piano Concert Edition)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "2014 · Tokyo Ghoul OP1",
    keySignature: "G Minor · 4/4",
    historicalNote:
      "Легендарная виртуозная фортепианная транскрипция «Unravel» из «Токийского гуля» (3 398 нот!) в духе Animenz: хрупкий хрустальный шёпот верхнего регистра, внезапная пауза и ураганный взрыв октавных каскадов и арпеджио.",
  }),
  createRealMidiPiece({
    id: "anime_demon_slayer_gurenge",
    code: "ANI-DS",
    composer: "LiSA · Arr. Animenz Style",
    title: "Demon Slayer (Kimetsu no Yaiba) — \"Gurenge\" (紅蓮華)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "2019 · Demon Slayer OP1",
    keySignature: "E Minor · 4/4",
    historicalNote:
      "Полная концертная фортепианная версия «Gurenge» из «Клинка, рассекающего демонов» (3 008 нот!): от проникновенной лирической баллады во вступлении до огненного рок-припева с мощнейшими октавами и виртуозными пассажами.",
  }),
  createRealMidiPiece({
    id: "anime_aot_vogel_im_kafig",
    code: "ANI-AOT",
    composer: "Hiroyuki Sawano · Arr. Animenz Style",
    title: "Attack on Titan — \"Vogel im Käfig\" (Птица в клетке)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "2013 · Attack on Titan OST",
    keySignature: "A Minor · 4/4",
    historicalNote:
      "Монументальный трагический шедевр Хироюки Савано из «Атаки титанов» в концертном фортепианном прочтении (1 757 нот, 50 градаций динамики и живое рубато) — от скорбного хорала к сокрушительной оркестровой кульминации.",
  }),
  createRealMidiPiece({
    id: "anime_howls_merry_go_round",
    code: "ANI-HMC",
    composer: "Joe Hisaishi (Studio Ghibli)",
    title: "Howl's Moving Castle — \"Merry-Go-Round of Life\" (Карусель жизни)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "2004 · Studio Ghibli",
    keySignature: "G Minor · 3/4",
    historicalNote:
      "Бессмертный вальс Дзё Хисаиси из «Ходячего замка» Хаяо Миядзаки (1 670 нот): мечтательное вступление рубато, головокружительное романтическое кружение и изысканная салонная лирика.",
  }),
  createRealMidiPiece({
    id: "anime_evangelion_cruel_angel",
    code: "ANI-EVA",
    composer: "Yoko Takahashi · Toshiyuki Omori",
    title: "Neon Genesis Evangelion — \"A Cruel Angel's Thesis\"",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "1995 · Evangelion OP",
    keySignature: "C Minor · 4/4",
    historicalNote:
      "Культовый гимн аниме «Тезис жестокого ангела» в полной 4-минутной концертной фортепианной транскрипции (1 967 нот): загадочное вступление, взрывной синкопированный драйв и виртуозные гармонии.",
  }),
  createRealMidiPiece({
    id: "anime_naruto_blue_bird",
    code: "ANI-NAR",
    composer: "Ikimonogakari · Arr. Animenz Style",
    title: "Naruto Shippuden — \"Blue Bird\" (ブルーバード)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "2008 · Naruto Shippuden OP3",
    keySignature: "F♯ Minor · 4/4",
    historicalNote:
      "Один из самых любимых опенингов «Наруто: Ураганные хроники» — в версии «Оригинал» звучит чистая двухручная партитура, а при выборе «Виртуозная» включается расширенная концертная транскрипция в стиле Animenz!",
  }),
  createRealMidiPiece({
    id: "anime_your_lie_hikaru_nara",
    code: "ANI-YLIA",
    composer: "Goose house · Arr. Animenz Style",
    title: "Your Lie in April — \"Hikaru Nara\" (光るなら)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "2014 · Shigatsu wa Kimi no Uso OP1",
    keySignature: "A Major · 4/4",
    historicalNote:
      "Солнечная и пронзительная главная тема музыкального аниме «Твоя апрельская ложь» — искрящиеся арпеджио, вдохновенная мелодия и весенняя фортепианная энергия.",
  }),
  createRealMidiPiece({
    id: "anime_sao_crossing_field",
    code: "ANI-SAO",
    composer: "LiSA · Arr. Animenz Style",
    title: "Sword Art Online — \"Crossing Field\"",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "2012 · Sword Art Online OP1",
    keySignature: "D Minor · 4/4",
    historicalNote:
      "Мощная виртуозная фортепианная версия хита LiSA из «Мастеров Меча Онлайн» (1 283 ноты, 76 уровней динамики, полный охват A0–G7!) с фирменными октавными вступлениями и стремительным темпом 176 BPM.",
  }),
  createRealMidiPiece({
    id: "anime_oshi_no_ko_idol",
    code: "ANI-ONK",
    composer: "YOASOBI · Ayase",
    title: "Oshi no Ko — \"Idol\" (アイドル)",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "2023 · Oshi no Ko OP1",
    keySignature: "C♯ Minor · 4/4",
    historicalNote:
      "Сверхдинамичный мировой хит YOASOBI из «Звёздного дитя» в оригинальной тональности до-диез минор (165 BPM, 1 104 ноты): готический органный старт, калейдоскоп ритмов и ослепительный припев.",
  }),
  createRealMidiPiece({
    id: "anime_chainsaw_man_kick_back",
    code: "ANI-CSM",
    composer: "Kenshi Yonezu · Arr. Animenz Style",
    title: "Chainsaw Man — \"KICK BACK\"",
    instrument: "Concert Grand Piano · 88-Key Studio Engine",
    license: "Solo Piano Concert Transcription",
    year: "2022 · Chainsaw Man OP",
    keySignature: "C♯ Minor · 4/4",
    historicalNote:
      "Взрывная 3-минутная виртуозная фортепианная транскрипция «KICK BACK» Кэнси Ёнэдзу (2 729 нот, 203 BPM!) — безумный басовый грув, джаз-роковые синкопы и головокружительные аккордовые атаки.",
  }),
];

export const ADDITIONAL_REPERTOIRE = [
  CLASSICAL_MIDI_CATALOG[0],
  buildMadk1dDinastiya(),
  ...ANIME_TOP10_CATALOG,
  ...CLASSICAL_MIDI_CATALOG.slice(1),
  buildDrowningLove(),
  buildMeaningfulLove(),
];
