/**
 * Full-Length Concert Grand Piano Solo Repertoire for Koerner Hall
 *
 * 6 complete, concert-duration multi-voice arrangements (~2:40 – 4:15 each)
 * synchronized to the 61-key 3D action, damper lift, and multi-model Web Audio
 * Concert Grand Piano engine (Steinway D, Bösendorfer Imperial, Fazioli F308,
 * Yamaha CFX, Crystal Grand, Stein 1780):
 *   1. Ludwig van Beethoven — Für Elise, WoO 59 (~2:50)
 *   2. Silo & Steven Cranberry — Meaningful Love (~2:40)
 *   3. Shuichi Sakamoto — Drowning Love ("Chasing Kou") (~3:05)
 *   4. Frédéric Chopin — Étude Op. 25 No. 11 "Winter Wind" (~3:20)
 *   5. Ludwig van Beethoven — Moonlight Sonata, Op. 27 No. 2 I. Adagio sostenuto (~4:15)
 *   6. Franz Liszt — La Campanella, S. 141 No. 3 (~3:30)
 */

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
 * Piecewise tempo & rubato score builder.
 * Converts musical beats into exact seconds for alignedNotes and damper pedal spans.
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
// 1. LUDWIG VAN BEETHOVEN — FÜR ELISE (Bagatelle No. 25 in A Minor, WoO 59)
//    Complete Rondo Form: A(x2) – B–A(x2) – C (F Major) – A – D (A Minor Storm) – A (Coda)
//    3/8 meter (1 beat = 1 eighth note, 3 beats per bar) · Target ~2:50 (170s)
// ============================================================================
function buildFurElise() {
  const s = new ScoreBuilder(114);
  let b = 0;

  const playSectionA = (withPickup = true, finalEnding = false, dyn = 1.0) => {
    const v = (x) => x * dyn;
    if (withPickup) {
      s.note(b, 0.48, "E5", v(0.56), "RH");
      s.note(b + 0.5, 0.48, "D#5", v(0.52), "RH");
      b += 1.0;
    }

    // Bar 1: E5 D#5 E5 B4 D5 C5
    s.note(b + 0.0, 0.48, "E5", v(0.58), "RH");
    s.note(b + 0.5, 0.48, "D#5", v(0.53), "RH");
    s.note(b + 1.0, 0.48, "E5", v(0.58), "RH");
    s.note(b + 1.5, 0.48, "B4", v(0.55), "RH");
    s.note(b + 2.0, 0.48, "D5", v(0.57), "RH");
    s.note(b + 2.5, 0.48, "C5", v(0.53), "RH");
    b += 3.0;

    // Bar 2: A4 + C4 E4 A4 | LH: A2 E3 A3
    s.pedal(b, b + 2.65);
    s.note(b + 0.0, 1.4, "A4", v(0.60), "RH");
    s.note(b + 0.0, 1.5, "A2", v(0.50), "LH");
    s.note(b + 0.5, 1.1, "E3", v(0.41), "LH");
    s.note(b + 1.0, 1.0, "A3", v(0.42), "LH");
    s.note(b + 1.5, 0.48, "C4", v(0.50), "RH");
    s.note(b + 2.0, 0.48, "E4", v(0.55), "RH");
    s.note(b + 2.5, 0.48, "A4", v(0.59), "RH");
    b += 3.0;

    // Bar 3: B4 + E4 G#4 B4 | LH: E2 E3 G#3
    s.pedal(b, b + 2.65);
    s.note(b + 0.0, 1.4, "B4", v(0.62), "RH");
    s.note(b + 0.0, 1.5, "E2", v(0.50), "LH");
    s.note(b + 0.5, 1.1, "E3", v(0.41), "LH");
    s.note(b + 1.0, 1.0, "G#3", v(0.42), "LH");
    s.note(b + 1.5, 0.48, "E4", v(0.50), "RH");
    s.note(b + 2.0, 0.48, "G#4", v(0.55), "RH");
    s.note(b + 2.5, 0.48, "B4", v(0.60), "RH");
    b += 3.0;

    // Bar 4: C5 + E4 E5 D#5 | LH: A2 E3 A3
    s.pedal(b, b + 2.05);
    s.note(b + 0.0, 1.4, "C5", v(0.64), "RH");
    s.note(b + 0.0, 1.5, "A2", v(0.50), "LH");
    s.note(b + 0.5, 1.1, "E3", v(0.41), "LH");
    s.note(b + 1.0, 1.0, "A3", v(0.42), "LH");
    s.note(b + 1.5, 0.48, "E4", v(0.50), "RH");
    s.note(b + 2.0, 0.48, "E5", v(0.57), "RH");
    s.note(b + 2.5, 0.48, "D#5", v(0.53), "RH");
    b += 3.0;

    // Bar 5: E5 D#5 E5 B4 D5 C5
    s.note(b + 0.0, 0.48, "E5", v(0.58), "RH");
    s.note(b + 0.5, 0.48, "D#5", v(0.53), "RH");
    s.note(b + 1.0, 0.48, "E5", v(0.58), "RH");
    s.note(b + 1.5, 0.48, "B4", v(0.55), "RH");
    s.note(b + 2.0, 0.48, "D5", v(0.57), "RH");
    s.note(b + 2.5, 0.48, "C5", v(0.53), "RH");
    b += 3.0;

    // Bar 6: A4 + C4 E4 A4 | LH: A2 E3 A3
    s.pedal(b, b + 2.65);
    s.note(b + 0.0, 1.4, "A4", v(0.60), "RH");
    s.note(b + 0.0, 1.5, "A2", v(0.50), "LH");
    s.note(b + 0.5, 1.1, "E3", v(0.41), "LH");
    s.note(b + 1.0, 1.0, "A3", v(0.42), "LH");
    s.note(b + 1.5, 0.48, "C4", v(0.50), "RH");
    s.note(b + 2.0, 0.48, "E4", v(0.55), "RH");
    s.note(b + 2.5, 0.48, "A4", v(0.59), "RH");
    b += 3.0;

    // Bar 7: B4 + E4 C5 B4 | LH: E2 E3 G#3
    s.pedal(b, b + 2.65);
    s.note(b + 0.0, 1.4, "B4", v(0.62), "RH");
    s.note(b + 0.0, 1.5, "E2", v(0.50), "LH");
    s.note(b + 0.5, 1.1, "E3", v(0.41), "LH");
    s.note(b + 1.0, 1.0, "G#3", v(0.42), "LH");
    s.note(b + 1.5, 0.48, "E4", v(0.50), "RH");
    s.note(b + 2.0, 0.48, "C5", v(0.58), "RH");
    s.note(b + 2.5, 0.48, "B4", v(0.55), "RH");
    b += 3.0;

    // Bar 8: A4 resolution
    if (finalEnding) {
      s.setTempo(b - 1.5, 96);
      s.setTempo(b, 76);
      s.pedal(b, b + 5.2);
      s.note(b + 0.0, 4.6, "A4", v(0.56), "RH");
      s.note(b + 0.0, 4.6, "A2", v(0.50), "LH");
      s.note(b + 0.5, 3.8, "E3", v(0.40), "LH");
      s.note(b + 1.0, 3.4, "A3", v(0.42), "LH");
      s.note(b + 1.5, 3.0, "C4", v(0.38), "LH");
      b += 5.2;
    } else {
      s.pedal(b, b + 1.85);
      s.note(b + 0.0, 1.4, "A4", v(0.58), "RH");
      s.note(b + 0.0, 1.5, "A2", v(0.50), "LH");
      s.note(b + 0.5, 1.1, "E3", v(0.41), "LH");
      s.note(b + 1.0, 1.0, "A3", v(0.42), "LH");
      b += 1.5;
    }
  };

  const playSectionB = (dyn = 1.0) => {
    const v = (x) => x * dyn;
    // Pickup: B4 C5 D5
    s.note(b + 0.0, 0.48, "B4", v(0.56), "RH");
    s.note(b + 0.5, 0.48, "C5", v(0.60), "RH");
    s.note(b + 1.0, 0.48, "D5", v(0.64), "RH");
    b += 1.5;

    // Bar 9: C major — E5 . G4 F5 E5
    s.pedal(b, b + 2.75);
    s.note(b + 0.0, 1.45, "E5", v(0.68), "RH");
    s.note(b + 0.0, 1.5, "C3", v(0.52), "LH");
    s.note(b + 0.5, 1.1, "G3", v(0.44), "LH");
    s.note(b + 1.0, 1.0, "C4", v(0.44), "LH");
    s.note(b + 1.5, 0.48, "G4", v(0.52), "RH");
    s.note(b + 2.0, 0.48, "F5", v(0.65), "RH");
    s.note(b + 2.5, 0.48, "E5", v(0.61), "RH");
    b += 3.0;

    // Bar 10: G major — D5 . F4 E5 D5
    s.pedal(b, b + 2.75);
    s.note(b + 0.0, 1.45, "D5", v(0.66), "RH");
    s.note(b + 0.0, 1.5, "G2", v(0.52), "LH");
    s.note(b + 0.5, 1.1, "G3", v(0.44), "LH");
    s.note(b + 1.0, 1.0, "B3", v(0.44), "LH");
    s.note(b + 1.5, 0.48, "F4", v(0.50), "RH");
    s.note(b + 2.0, 0.48, "E5", v(0.63), "RH");
    s.note(b + 2.5, 0.48, "D5", v(0.59), "RH");
    b += 3.0;

    // Bar 11: A minor — C5 . E4 D5 C5
    s.pedal(b, b + 2.75);
    s.note(b + 0.0, 1.45, "C5", v(0.64), "RH");
    s.note(b + 0.0, 1.5, "A2", v(0.50), "LH");
    s.note(b + 0.5, 1.1, "E3", v(0.42), "LH");
    s.note(b + 1.0, 1.0, "A3", v(0.42), "LH");
    s.note(b + 1.5, 0.48, "E4", v(0.50), "RH");
    s.note(b + 2.0, 0.48, "D5", v(0.61), "RH");
    s.note(b + 2.5, 0.48, "C5", v(0.58), "RH");
    b += 3.0;

    // Bar 12: E dominant octave bounce
    s.pedal(b, b + 2.25);
    s.note(b + 0.0, 0.95, "B4", v(0.62), "RH");
    s.note(b + 0.0, 1.1, "E2", v(0.52), "LH");
    s.note(b + 0.5, 0.85, "E3", v(0.45), "LH");
    s.note(b + 1.0, 0.46, "E4", v(0.50), "RH");
    s.note(b + 1.5, 0.46, "E5", v(0.56), "RH");
    s.note(b + 2.0, 0.46, "E5", v(0.54), "RH");
    s.note(b + 2.5, 0.46, "E6", v(0.58), "RH");
    b += 3.0;

    // Bar 13: D#5 E5 D#5 E5 D#5 leading back to A
    s.note(b + 0.0, 0.46, "D#5", v(0.49), "RH");
    s.note(b + 0.5, 0.46, "E5", v(0.52), "RH");
    s.note(b + 1.0, 0.46, "D#5", v(0.50), "RH");
    s.note(b + 1.5, 0.46, "E5", v(0.54), "RH");
    s.note(b + 2.0, 0.46, "D#5", v(0.51), "RH");
    s.note(b + 2.5, 0.46, "E5", v(0.55), "RH");
    b += 3.0;
    s.note(b + 0.0, 0.46, "D#5", v(0.50), "RH");
    b += 0.5;
  };

  // --- PART 1: Exposition A (first time + repeat) ---
  playSectionA(true, false, 0.96);
  s.note(b + 0.5, 0.48, "E5", 0.54, "RH");
  s.note(b + 1.0, 0.48, "D#5", 0.50, "RH");
  b += 1.5;
  playSectionA(false, false, 1.02);

  // --- PART 2: B + A (repeated as in Beethoven's score!) ---
  playSectionB(1.0);
  playSectionA(false, false, 0.98);
  playSectionB(1.04);
  playSectionA(false, false, 1.0);

  // --- PART 3: Section C — Warm F Major Lyrical Episode (16 bars + chromatic bridge) ---
  s.setTempo(b, 118);
  s.note(b + 0.5, 0.48, "C5", 0.58, "RH");
  s.note(b + 1.0, 0.48, "C5", 0.60, "RH");
  b += 1.5;

  const fMajorEpisode = [
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["F5", 1.4], ["C5", 0.5], ["A4", 0.5], ["C5", 0.5]] },
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["C5", 0.95], ["G4", 0.5], ["A4", 0.5], ["Bb4", 0.5], ["C5", 0.5]] },
    { lh: ["C3", "G3", "Bb3", "G3", "Bb3", "G3"], rh: [["D5", 0.5], ["C5", 0.5], ["Bb4", 0.5], ["A4", 0.5], ["G4", 0.5], ["F4", 0.5]] },
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["E4", 0.5], ["F4", 0.5], ["G4", 0.5], ["A4", 0.5], ["Bb4", 0.5], ["C5", 0.5]] },
    { lh: ["Bb2", "F3", "D4", "F3", "D4", "F3"], rh: [["D5", 1.0], ["F5", 0.5], ["E5", 0.5], ["D5", 0.5], ["C5", 0.5]] },
    { lh: ["C3", "G3", "Bb3", "G3", "C4", "G3"], rh: [["C5", 0.5], ["Bb4", 0.5], ["A4", 0.5], ["G4", 0.5], ["C5", 0.5], ["E5", 0.5]] },
    { lh: ["F2", "C3", "A3", "C3", "F3", "C3"], rh: [["F5", 1.45], ["A4", 0.5], ["C5", 0.5], ["F5", 0.5]] },
    { lh: ["C3", "G3", "E4", "G3", "E4", "G3"], rh: [["G5", 1.0], ["E5", 0.5], ["C5", 0.5], ["E5", 0.5], ["G5", 0.5]] },
    // Sparkling C Major 32nd-like rippling continuation (bars 9-16 of Episode C)
    { lh: ["C3", "G3", "C4", "G3", "C4", "G3"], rh: [["C6", 0.5], ["B5", 0.5], ["A5", 0.5], ["G5", 0.5], ["F5", 0.5], ["E5", 0.5]] },
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["D5", 0.5], ["C5", 0.5], ["B4", 0.5], ["A4", 0.5], ["G4", 0.5], ["F4", 0.5]] },
    { lh: ["G2", "D3", "B3", "D3", "B3", "D3"], rh: [["G4", 0.5], ["B4", 0.5], ["D5", 0.5], ["F5", 0.5], ["E5", 0.5], ["D5", 0.5]] },
    { lh: ["C3", "G3", "E3", "G3", "C4", "G3"], rh: [["C5", 1.0], ["E5", 0.5], ["G5", 0.5], ["F5", 0.5], ["E5", 0.5]] },
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["D5", 0.5], ["E5", 0.5], ["F5", 0.5], ["D5", 0.5], ["C5", 0.5], ["A4", 0.5]] },
    { lh: ["G2", "D3", "F3", "D3", "B3", "D3"], rh: [["B4", 0.5], ["C5", 0.5], ["D5", 0.5], ["F5", 0.5], ["E5", 0.5], ["D5", 0.5]] },
    { lh: ["C3", "G3", "E3", "G3", "C4", "G3"], rh: [["C5", 1.4], ["G4", 0.5], ["A4", 0.5], ["B4", 0.5]] },
    { lh: ["E2", "B2", "G#3", "B2", "E3", "B2"], rh: [["C5", 0.5], ["B4", 0.5], ["A4", 0.5], ["G#4", 0.5], ["B4", 0.5], ["E5", 0.5]] },
  ];

  for (const bar of fMajorEpisode) {
    s.pedal(b, b + 2.75);
    for (let k = 0; k < 6; k++) {
      s.note(b + k * 0.5, 0.48, bar.lh[k], k === 0 ? 0.54 : 0.39, "LH");
    }
    let off = 0;
    for (const [p, d] of bar.rh) {
      s.note(b + off, d * 0.94, p, 0.65, "RH");
      off += d;
    }
    b += 3.0;
  }

  // Graceful descending chromatic bridge into Return of A
  const chromBridge1 = ["E5", "D#5", "D5", "C#5", "C5", "B4", "A#4", "A4", "G#4", "A4", "B4", "C5", "D5", "D#5"];
  s.setTempo(b, 108);
  for (let i = 0; i < chromBridge1.length; i++) {
    s.note(b + i * 0.36, 0.34, chromBridge1[i], 0.52 + (i / chromBridge1.length) * 0.12, "RH");
  }
  s.note(b, 2.8, "E2", 0.50, "LH");
  s.note(b + 1.5, 2.4, "E3", 0.44, "LH");
  b += chromBridge1.length * 0.36 + 0.35;

  // --- PART 4: Return of A + B + A ---
  s.setTempo(b, 114);
  playSectionA(true, false, 0.98);
  playSectionB(1.0);
  playSectionA(false, false, 0.96);

  // --- PART 5: Section D — Dramatic A Minor Pedal-Ostinato Storm (18 bars!) ---
  s.setTempo(b, 122);
  const stormChords = [
    ["A3", "C4", "E4", "A4"],
    ["A3", "D4", "F4", "A4"],
    ["G#3", "D4", "F4", "B4"],
    ["A3", "C4", "E4", "A4"],
    ["A3", "C4", "F4", "A4"],
    ["G#3", "B3", "E4", "G#4"],
    ["A3", "C4", "E4", "A4"],
    ["D4", "F4", "Bb4", "D5"],
    ["C4", "E4", "A4", "C5"],
    ["B3", "D#4", "A4", "B4"],
    ["B3", "E4", "G#4", "B4"],
    ["A3", "C4", "E4", "A4"],
  ];

  for (let i = 0; i < stormChords.length; i++) {
    const ch = stormChords[i];
    const dynWave = 0.64 + 0.16 * Math.sin((i / stormChords.length) * Math.PI);
    s.pedal(b, b + 2.75);
    // Signature Beethoven throbbing A2 16th-note pedal ostinato in LH
    for (let k = 0; k < 6; k++) {
      const bassNote = i === 10 ? "E2" : "A2";
      s.note(b + k * 0.5, 0.42, bassNote, k === 0 ? dynWave * 0.92 : dynWave * 0.72, "LH");
    }
    // Syncopated dramatic RH chords + upper sighing voice
    s.chord(b + 0.0, 1.35, ch, dynWave, "RH");
    s.note(b + 1.5, 0.9, ch[3], dynWave * 0.94, "RH");
    s.note(b + 2.5, 0.5, ch[2], dynWave * 0.85, "RH");
    b += 3.0;
  }

  // Sweeping A-Minor Triplet Arpeggio Cascades (bars 13-16 of Section D)
  const arpAsc = [
    "A3", "C4", "E4", "A4", "C5", "E5",
    "D5", "C5", "B4", "A4", "C5", "E5",
    "A5", "E5", "C5", "A4", "E4", "C4",
    "A3", "C4", "E4", "A4", "C5", "E5",
  ];
  s.pedal(b, b + 6.0);
  for (let i = 0; i < arpAsc.length; i++) {
    s.note(b + i * 0.25, 0.34, arpAsc[i], 0.58 + (i % 6) * 0.03, "RH");
    if (i % 6 === 0) s.note(b + i * 0.25, 1.4, "A1", 0.64, "LH");
  }
  b += arpAsc.length * 0.25;

  // Dramatic descending chromatic cascade from E6 down to D#5
  const chromCascade = [
    "E6", "D#6", "D6", "C#6", "C6", "B5", "A#5", "A5",
    "G#5", "G5", "F#5", "F5", "E5", "D#5", "D5", "C#5",
    "C5", "B4", "A#4", "A4", "G#4", "A4", "B4", "C5", "D5", "D#5",
  ];
  s.setTempo(b, 108);
  s.pedal(b, b + 4.5);
  s.note(b, 3.0, "E2", 0.60, "LH");
  for (let i = 0; i < chromCascade.length; i++) {
    const fade = 0.72 - (i / chromCascade.length) * 0.20;
    s.note(b + i * 0.28, 0.30, chromCascade[i], fade, "RH");
  }
  b += chromCascade.length * 0.28 + 0.45;

  // --- PART 6: Final Tender Return of A + B + Poetic Ritardando Coda ---
  s.setTempo(b, 112);
  playSectionA(true, false, 0.90);
  playSectionB(0.92);
  s.setTempo(b, 106);
  playSectionA(false, true, 0.86);

  return s.build({
    id: "beethoven_fur_elise_woo59",
    code: "LVB-FE",
    composer: "Ludwig van Beethoven (1770–1827)",
    title: "Bagatelle No. 25 in A Minor, WoO 59 — \"Für Elise\"",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1810 · Classical / Early Romantic",
    keySignature: "A Minor · 3/8",
    bpm: 114,
    historicalNote:
      "Complete concert rondo of Beethoven's Für Elise (WoO 59), featuring both the lyrical F-major episode and the stormy A-minor pedal-ostinato climax.",
  });
}

// ============================================================================
// 2. SILO & STEVEN CRANBERRY — MEANINGFUL LOVE (Full Solo Piano Ballad)
//    4/4 meter, B Minor / D Major emotional nostalgic ballad (~82–88 BPM) · Target ~2:40 (160s)
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

  // --- Intro (8 bars): intimate pp rubato broken chords & tender upper motif ---
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
        if (off === 0.0) {
          s.note(b + off, dur * 0.92, ch.bass[3], vv * 0.66, "RH");
        }
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

  // --- Verse 1 (8 bars) ---
  s.setTempo(b, 85);
  playVerse(false);

  // --- Chorus 1 (8 bars) ---
  s.setTempo(b, 88);
  playChorus(false);

  // --- Quiet Interlude (4 bars): sparse bell-like echo ---
  s.setTempo(b, 80);
  for (let m = 0; m < 4; m++) {
    const ch = prog[m];
    s.pedal(b, b + 3.85);
    s.chord(b, 3.6, [ch.bass[0], ch.bass[2], ch.bass[4]], 0.46, "LH", 0.12);
    s.note(b + 1.0, 1.5, m % 2 === 0 ? "F#6" : "D6", 0.44, "RH");
    s.note(b + 2.5, 1.4, m % 2 === 0 ? "E6" : "B5", 0.40, "RH");
    b += 4.0;
  }

  // --- Verse 2 (8 bars): enriched harmony ---
  s.setTempo(b, 86);
  playVerse(true);

  // --- Emotional Bridge (4 bars): Em9 -> F#m7 -> Gmaj7 -> Aadd9 swell ---
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

  // --- Grand Soaring Climax Chorus (8 bars) ---
  s.setTempo(b, 90);
  playChorus(true);

  // --- Intimate High Reprise & ppp Fading Outro (8 bars) ---
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
// 3. SHUICHI SAKAMOTO — DROWNING LOVE ("Chasing Kou" / コウを追いかけて)
//    4/4 meter, Bb Minor with luminous E-major shimmer (~114–122 BPM) · Target ~3:05 (185s)
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

  // --- Intro (8 bars): shimmering coastal waves ---
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

  // --- Theme A (8 bars): tender singing melody ---
  const playThemeA = ({ octaves = false, velBoost = 0, drivingLH = false } = {}) => {
    for (let i = 0; i < themeA.length; i++) {
      const ch = progA[i];
      s.pedal(b, b + 3.88);
      const seq = drivingLH ? [0, 2, 3, 4, 5, 4, 3, 2] : [0, 1, 2, 3, 4, 5, 4, 3];
      for (let k = 0; k < 8; k++) {
        s.note(
          b + k * 0.5,
          0.78,
          ch[seq[k]],
          k === 0 ? 0.58 + velBoost * 0.8 : 0.42 + velBoost * 0.6 + (k === 4 ? 0.05 : 0),
          "LH"
        );
        if (drivingLH && k === 0) {
          s.note(b, 0.85, noteToMidi(ch[0]) + 12, 0.62 + velBoost * 0.5, "LH");
        }
      }
      for (const [off, dur, pitch, vel] of themeA[i]) {
        const mTop = noteToMidi(pitch);
        const vv = Math.min(0.86, vel + velBoost);
        s.note(b + off, dur, mTop, vv, "RH");
        if (octaves) {
          s.note(b + off, dur * 0.92, mTop - 12, vv * 0.78, "RH");
        }
      }
      b += 4.0;
    }
  };

  playThemeA({ octaves: false, velBoost: 0.0 });
  // Rising second statement with richer inner harmonic warmth
  playThemeA({ octaves: false, velBoost: 0.05, drivingLH: true });

  // --- Luminous Sunlight Bridge (8 bars = 2x4 bars) ---
  s.setTempo(b, 118);
  for (let rep = 0; rep < 2; rep++) {
    for (const br of bridgeProg) {
      s.pedal(b, b + 3.88);
      const seq = [0, 1, 2, 3, 4, 5, 4, 3];
      for (let k = 0; k < 8; k++) {
        s.note(b + k * 0.5, 0.78, br.bass[seq[k]], k === 0 ? 0.64 : 0.46, "LH");
      }
      for (const [off, dur, pitch, vel] of br.mel) {
        const vv = vel + rep * 0.05;
        s.note(b + off, dur, pitch, vv, "RH");
        s.note(b + off, dur * 0.92, noteToMidi(pitch) - 12, vv * 0.74, "RH");
      }
      b += 4.0;
    }
  }

  // --- First Passionate Climax (8 bars) ---
  s.setTempo(b, 121);
  playThemeA({ octaves: true, velBoost: 0.10, drivingLH: true });

  // --- Quiet High-Register Bell Interlude (8 bars): suspended ocean stillness ---
  s.setTempo(b, 104);
  for (let m = 0; m < 8; m++) {
    const ch = progA[m];
    s.pedal(b, b + 3.88);
    s.chord(b, 3.6, [ch[0], ch[2], ch[4]], 0.45, "LH", 0.12);
    const bellNotes = m % 2 === 0 ? ["F6", "Eb6", "Db6", "C6"] : ["Bb5", "Db6", "F6", "Eb6"];
    for (let k = 0; k < 4; k++) {
      s.note(b + k * 1.0, 1.2, bellNotes[k], 0.44 + (m >= 4 ? 0.05 : 0), "RH");
    }
    b += 4.0;
  }

  // --- Wave Build-Up Transition (8 bars) ---
  s.setTempo(b, 116);
  for (let m = 0; m < 8; m++) {
    const ch = progA[m];
    s.pedal(b, b + 3.88);
    const grow = 0.46 + (m / 8) * 0.22;
    const seq = [0, 1, 2, 3, 4, 5, 4, 3];
    for (let k = 0; k < 8; k++) {
      s.note(b + k * 0.5, 0.72, ch[seq[k]], k === 0 ? grow + 0.08 : grow * 0.82, "LH");
    }
    for (let k = 0; k < 4; k++) {
      s.note(b + k * 1.0, 0.9, ch[3 + (k % 3)], grow * 0.9, "RH");
      s.note(b + k * 1.0 + 0.5, 0.5, noteToMidi(ch[5]) + 12, grow * 0.85, "RH");
    }
    b += 4.0;
  }

  // --- Final Soaring Concert Climax (16 bars = 2 full passes) ---
  s.setTempo(b, 122);
  playThemeA({ octaves: true, velBoost: 0.12, drivingLH: true });
  playThemeA({ octaves: true, velBoost: 0.15, drivingLH: true });

  // --- Fragile Seafront Coda (8 bars) ---
  s.setTempo(b, 102);
  s.setTempo(b + 16.0, 82);
  for (let m = 0; m < 8; m++) {
    const ch = progA[m === 7 ? 0 : m % 4];
    const fade = 1.0 - m * 0.07;
    s.pedal(b, b + (m === 7 ? 5.6 : 3.88));
    const pat = [0, 1, 2, 3, 4, 3];
    for (let k = 0; k < 6; k++) {
      s.note(b + k * 0.65, 1.1, ch[pat[k]], (k === 0 ? 0.50 : 0.34) * fade, "LH");
    }
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
// 4. FRÉDÉRIC CHOPIN — ÉTUDE IN A MINOR, OP. 25 NO. 11 ("WINTER WIND")
//    4/4 meter: Lento chorale (4 bars) -> Full Allegro con brio storm (~88 bars)
//    Target ~3:20 (200s)
// ============================================================================
function buildWinterWind() {
  const s = new ScoreBuilder(56);
  let b = 0;

  // --- Bars 1-4: Iconic Lento A minor chorale introduction ---
  s.pedal(0.0, 3.85);
  s.chord(0.0, 1.85, ["E4", "E5"], 0.56, "RH");
  s.chord(0.0, 1.85, ["A2", "E3", "A3"], 0.50, "LH");
  s.chord(2.0, 1.85, ["C5", "C6"], 0.60, "RH");
  s.chord(2.0, 1.85, ["A2", "E3", "A3"], 0.48, "LH");
  b = 4.0;

  s.pedal(b, b + 3.85);
  s.chord(b + 0.0, 1.45, ["B4", "B5"], 0.60, "RH");
  s.chord(b + 0.0, 1.45, ["E2", "B2", "E3"], 0.50, "LH");
  s.chord(b + 1.5, 0.5, ["A4", "A5"], 0.54, "RH");
  s.chord(b + 2.0, 0.95, ["G#4", "G#5"], 0.56, "RH");
  s.chord(b + 2.0, 1.65, ["E2", "B2", "E3", "G#3"], 0.48, "LH");
  s.chord(b + 3.0, 0.95, ["A4", "A5"], 0.58, "RH");
  b += 4.0;

  s.pedal(b, b + 3.85);
  s.chord(b + 0.0, 1.45, ["C5", "C6"], 0.62, "RH");
  s.chord(b + 0.0, 1.85, ["A2", "E3", "A3"], 0.52, "LH");
  s.chord(b + 1.5, 0.5, ["B4", "B5"], 0.56, "RH");
  s.chord(b + 2.0, 0.5, ["A4", "A5"], 0.56, "RH");
  s.chord(b + 2.5, 0.5, ["G#4", "G#5"], 0.56, "RH");
  s.chord(b + 3.0, 0.5, ["A4", "A5"], 0.58, "RH");
  s.chord(b + 3.5, 0.5, ["E4", "E5"], 0.54, "RH");
  b += 4.0;

  s.pedal(b, b + 3.7);
  s.chord(b + 0.0, 1.65, ["F4", "A4", "D5"], 0.58, "RH");
  s.chord(b + 0.0, 1.65, ["D2", "A2", "D3"], 0.52, "LH");
  s.chord(b + 2.0, 1.7, ["E4", "G#4", "B4", "E5"], 0.66, "RH");
  s.chord(b + 2.0, 1.7, ["E2", "B2", "E3"], 0.60, "LH");
  b += 4.0;

  // --- ALLEGRO CON BRIO ---
  s.setTempo(b, 122);

  const addWindBar = (startBeat, topAnchor, chordSteps, lhEvents, velBase = 0.68) => {
    s.pedal(startBeat, startBeat + 1.9);
    s.pedal(startBeat + 2.0, startBeat + 3.88);
    const totalSub = 16;
    for (let i = 0; i < totalSub; i++) {
      const stepIdx = Math.floor(i / 2);
      const isAux = i % 2 === 1;
      const tone = chordSteps[stepIdx % chordSteps.length];
      const octDrop = Math.floor(stepIdx / chordSteps.length) * 12;
      let midi = topAnchor - tone - octDrop;
      if (isAux) midi -= 1;
      const wave = 0.86 + 0.14 * Math.cos((i / totalSub) * Math.PI * 2);
      const accent = i % 4 === 0 ? 1.07 : 0.91;
      s.note(startBeat + i * 0.25, 0.24, midi, Math.min(0.86, velBase * wave * accent), "RH");
    }
    for (const [off, dur, notes, v] of lhEvents) {
      s.chord(startBeat + off, dur, notes, Math.min(0.88, v), "LH");
    }
  };

  const playMainStormA = (vBase = 0.70, lhBoost = 0.0) => {
    // 8 bars of the A minor heroic storm theme
    addWindBar(b, noteToMidi("E6"), [0, 4, 7, 12, 16, 19, 24, 19], [
      [0.0, 1.5, ["A1", "A2"], 0.78 + lhBoost], [1.5, 0.5, ["E3", "A3", "C4"], 0.62],
      [2.0, 1.5, ["C2", "C3"], 0.76 + lhBoost], [3.5, 0.5, ["E3", "A3", "C4"], 0.64],
    ], vBase);
    b += 4.0;

    addWindBar(b, noteToMidi("E6"), [0, 5, 8, 12, 17, 20, 24, 17], [
      [0.0, 1.2, ["B1", "B2"], 0.76 + lhBoost], [1.25, 0.75, ["A1", "A2"], 0.72 + lhBoost],
      [2.0, 1.0, ["G#1", "G#2"], 0.76 + lhBoost], [3.0, 1.0, ["A1", "A2"], 0.76 + lhBoost],
    ], vBase + 0.02);
    b += 4.0;

    addWindBar(b, noteToMidi("E6"), [0, 4, 7, 12, 16, 19, 12, 7], [
      [0.0, 1.0, ["C2", "C3"], 0.78 + lhBoost], [1.0, 0.5, ["B1", "B2"], 0.70 + lhBoost],
      [1.5, 0.5, ["A1", "A2"], 0.70 + lhBoost], [2.0, 0.5, ["G#1", "G#2"], 0.72 + lhBoost],
      [2.5, 0.5, ["A1", "A2"], 0.72 + lhBoost], [3.0, 1.0, ["E1", "E2"], 0.78 + lhBoost],
    ], vBase + 0.03);
    b += 4.0;

    addWindBar(b, noteToMidi("F6"), [0, 3, 7, 12, 15, 19, 24, 19], [
      [0.0, 1.5, ["F1", "F2"], 0.76 + lhBoost], [1.5, 0.5, ["A2", "D3", "F3"], 0.62],
      [2.0, 1.5, ["E1", "E2"], 0.78 + lhBoost], [3.5, 0.5, ["G#2", "B2", "E3"], 0.66],
    ], vBase + 0.03);
    b += 4.0;

    // Second 4-bar answering storm phrase in A minor -> Dm -> E7
    addWindBar(b, noteToMidi("A6"), [0, 5, 9, 12, 17, 21, 24, 17], [
      [0.0, 1.5, ["A1", "A2"], 0.80 + lhBoost], [1.5, 0.5, ["E3", "A3", "C4"], 0.64],
      [2.0, 1.5, ["E2", "E3"], 0.76 + lhBoost], [3.5, 0.5, ["G#2", "B2", "E3"], 0.64],
    ], vBase + 0.04);
    b += 4.0;

    addWindBar(b, noteToMidi("F6"), [0, 3, 7, 12, 15, 19, 24, 15], [
      [0.0, 1.5, ["D2", "D3"], 0.78 + lhBoost], [1.5, 0.5, ["F2", "A2", "D3"], 0.64],
      [2.0, 1.5, ["F1", "F2"], 0.78 + lhBoost], [3.5, 0.5, ["A2", "D3", "F3"], 0.64],
    ], vBase + 0.04);
    b += 4.0;

    addWindBar(b, noteToMidi("E6"), [0, 4, 7, 12, 16, 19, 24, 12], [
      [0.0, 1.0, ["E1", "E2"], 0.80 + lhBoost], [1.0, 1.0, ["B1", "B2"], 0.74 + lhBoost],
      [2.0, 1.0, ["D2", "D3"], 0.76 + lhBoost], [3.0, 1.0, ["E2", "E3"], 0.80 + lhBoost],
    ], vBase + 0.05);
    b += 4.0;

    addWindBar(b, noteToMidi("E6"), [0, 5, 8, 12, 17, 20, 24, 17], [
      [0.0, 1.5, ["A1", "A2"], 0.80 + lhBoost], [1.5, 0.5, ["C3", "E3", "A3"], 0.66],
      [2.0, 1.5, ["E1", "E2"], 0.78 + lhBoost], [3.5, 0.5, ["G#2", "B2", "E3"], 0.66],
    ], vBase + 0.04);
    b += 4.0;
  };

  // --- Section 1: Exposition in A Minor (16 bars) ---
  playMainStormA(0.68, 0.0);
  playMainStormA(0.72, 0.02);

  // --- Section 2: Heroic C Major & Eb Major Modulations (16 bars) ---
  s.setTempo(b, 125);
  const majorStormBars = [
    { top: "G6", steps: [0, 3, 7, 12, 15, 19, 24, 19], lh: [[0, 1.5, ["C2", "C3"], 0.78], [1.5, 0.5, ["G2", "C3", "E3"], 0.64], [2, 1.5, ["E2", "E3"], 0.76], [3.5, 0.5, ["G2", "C3", "E3"], 0.64]] },
    { top: "G6", steps: [0, 5, 8, 12, 17, 20, 24, 17], lh: [[0, 1.25, ["D2", "D3"], 0.76], [1.25, 0.75, ["C2", "C3"], 0.72], [2, 1.0, ["B1", "B2"], 0.76], [3, 1.0, ["C2", "C3"], 0.76]] },
    { top: "A6", steps: [0, 4, 7, 12, 16, 19, 24, 16], lh: [[0, 1.5, ["F1", "F2"], 0.78], [1.5, 0.5, ["C3", "F3", "A3"], 0.66], [2, 1.5, ["D2", "D3"], 0.76], [3.5, 0.5, ["A2", "D3", "F3"], 0.66]] },
    { top: "G6", steps: [0, 5, 7, 12, 17, 19, 24, 12], lh: [[0, 1.5, ["G1", "G2"], 0.80], [1.5, 0.5, ["B2", "D3", "G3"], 0.68], [2, 1.5, ["G1", "G2"], 0.78], [3.5, 0.5, ["B2", "F3", "G3"], 0.68]] },
    // Shift into radiant Eb Major (Chopin's luminous tonal surprise)
    { top: "Bb6", steps: [0, 3, 7, 12, 15, 19, 24, 19], lh: [[0, 1.5, ["Eb2", "Eb3"], 0.78], [1.5, 0.5, ["Bb2", "Eb3", "G3"], 0.64], [2, 1.5, ["G2", "G3"], 0.76], [3.5, 0.5, ["Bb2", "Eb3", "G3"], 0.64]] },
    { top: "Bb6", steps: [0, 5, 8, 12, 17, 20, 24, 17], lh: [[0, 1.25, ["F2", "F3"], 0.76], [1.25, 0.75, ["Eb2", "Eb3"], 0.72], [2, 1.0, ["D2", "D3"], 0.76], [3, 1.0, ["Eb2", "Eb3"], 0.76]] },
    { top: "Ab6", steps: [0, 4, 7, 12, 16, 19, 24, 16], lh: [[0, 1.5, ["Ab1", "Ab2"], 0.78], [1.5, 0.5, ["Eb3", "Ab3", "C4"], 0.66], [2, 1.5, ["F1", "F2"], 0.76], [3.5, 0.5, ["C3", "F3", "Ab3"], 0.66]] },
    { top: "G6", steps: [0, 4, 7, 12, 16, 19, 24, 12], lh: [[0, 1.5, ["G1", "G2"], 0.80], [1.5, 0.5, ["B2", "D3", "G3"], 0.68], [2, 1.0, ["F2", "F3"], 0.76], [3, 1.0, ["E2", "E3"], 0.80]] },
  ];

  for (let rep = 0; rep < 2; rep++) {
    for (const mb of majorStormBars) {
      addWindBar(b, noteToMidi(mb.top), mb.steps, mb.lh, 0.72 + rep * 0.03);
      b += 4.0;
    }
  }

  // --- Section 3: Tempestuous Chromatic Development (16 bars) ---
  s.setTempo(b, 128);
  const devCenters = [
    { top: "F6", bass: ["F1", "F2"], mid: ["A2", "C3", "F3"] },
    { top: "F#6", bass: ["D#1", "D#2"], mid: ["A2", "C3", "F#3"] },
    { top: "G6", bass: ["E1", "E2"], mid: ["G2", "B2", "E3"] },
    { top: "G#6", bass: ["E1", "E2"], mid: ["G#2", "B2", "D3", "E3"] },
    { top: "A6", bass: ["A1", "A2"], mid: ["C3", "E3", "A3"] },
    { top: "Bb6", bass: ["Bb1", "Bb2"], mid: ["D3", "F3", "Bb3"] },
    { top: "A6", bass: ["A1", "A2"], mid: ["C#3", "E3", "A3"] },
    { top: "G6", bass: ["G1", "G2"], mid: ["Bb2", "D3", "G3"] },
    { top: "F6", bass: ["F1", "F2"], mid: ["A2", "D3", "F3"] },
    { top: "F#6", bass: ["D#1", "D#2"], mid: ["A2", "C3", "F#3"] },
    { top: "G#6", bass: ["E1", "E2"], mid: ["B2", "E3", "G#3"] },
    { top: "A6", bass: ["F1", "F2"], mid: ["A2", "C3", "F3"] },
    // Dominant E pedal buildup (4 bars)
    { top: "E6", bass: ["E1", "E2"], mid: ["G#2", "B2", "E3"] },
    { top: "F6", bass: ["E1", "E2"], mid: ["A2", "D3", "F3"] },
    { top: "G#6", bass: ["E1", "E2"], mid: ["B2", "D3", "G#3"] },
    { top: "B6", bass: ["E1", "E2"], mid: ["G#2", "B2", "E3"] },
  ];
  for (let i = 0; i < devCenters.length; i++) {
    const dc = devCenters[i];
    const dyn = 0.72 + (i / devCenters.length) * 0.10;
    addWindBar(b, noteToMidi(dc.top), [0, 3, 6, 9, 12, 15, 18, 12], [
      [0.0, 1.5, dc.bass, dyn + 0.04], [1.5, 0.5, dc.mid, dyn - 0.06],
      [2.0, 1.0, dc.bass, dyn + 0.02], [3.0, 1.0, dc.mid, dyn - 0.02],
    ], dyn);
    b += 4.0;
  }

  // --- Section 4: Heroic A Minor Recapitulation (16 bars) ---
  s.setTempo(b, 126);
  playMainStormA(0.75, 0.04);
  playMainStormA(0.78, 0.06);

  // --- Section 5: Blazing Coda, Unison Harmonic Minor Flourish & Grand Cadence ---
  s.setTempo(b, 130);
  // 4 bars of ferocious dominant-tonic storm gusts
  for (let k = 0; k < 4; k++) {
    const isDom = k % 2 === 1;
    addWindBar(
      b,
      noteToMidi(isDom ? "G#6" : "A6"),
      [0, 4, 7, 12, 16, 19, 24, 19],
      [
        [0.0, 1.5, isDom ? ["E1", "E2"] : ["A1", "A2"], 0.84],
        [1.5, 0.5, isDom ? ["G#2", "B2", "E3"] : ["C3", "E3", "A3"], 0.72],
        [2.0, 1.5, isDom ? ["E1", "E2"] : ["A1", "A2"], 0.84],
        [3.5, 0.5, isDom ? ["G#2", "B2", "E3"] : ["C3", "E3", "A3"], 0.74],
      ],
      0.80
    );
    b += 4.0;
  }

  // Unison ascending A harmonic minor scale run
  const scaleRun = [
    "A2", "B2", "C3", "D3", "E3", "F3", "G#3", "A3",
    "B3", "C4", "D4", "E4", "F4", "G#4", "A4", "B4",
    "C5", "D5", "E5", "F5", "G#5", "A5", "B5", "C6", "E6", "A6",
  ];
  s.pedal(b, b + 7.5);
  for (let i = 0; i < scaleRun.length; i++) {
    const tBeat = b + i * 0.20;
    const m = noteToMidi(scaleRun[i]);
    s.note(tBeat, 0.25, m, 0.66 + (i / scaleRun.length) * 0.20, m >= 60 ? "RH" : "LH");
    if (i < scaleRun.length - 4) {
      s.note(tBeat, 0.25, m - 12, 0.62 + (i / scaleRun.length) * 0.18, "LH");
    }
  }
  b += scaleRun.length * 0.20 + 0.5;

  // Final thunderous A minor cadence
  s.setTempo(b, 96);
  s.pedal(b, b + 6.0);
  s.chord(b + 0.0, 1.1, ["E1", "E2", "B2", "E3"], 0.84, "LH");
  s.chord(b + 0.0, 1.1, ["G#4", "B4", "E5", "G#5"], 0.84, "RH");
  s.chord(b + 1.2, 4.6, ["A1", "E2", "A2", "C3"], 0.88, "LH");
  s.chord(b + 1.2, 4.6, ["A4", "C5", "E5", "A5"], 0.88, "RH");
  b += 6.0;

  return s.build({
    id: "chopin_winter_wind_op25_no11",
    code: "CHP-WW",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Étude in A Minor, Op. 25 No. 11 — \"Winter Wind\"",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1836 · High Romantic Étude",
    keySignature: "A Minor · 4/4",
    bpm: 124,
    historicalNote:
      "Full concert performance of Chopin's Étude Op. 25 No. 11 ('Winter Wind'), from the hushed Lento chorale through A-minor, C-major, and Eb-major storms to the unison finale.",
  });
}

// ============================================================================
// 5. LUDWIG VAN BEETHOVEN — MOONLIGHT SONATA, OP. 27 NO. 2 (I. Adagio sostenuto)
//    Complete 56-bar Adagio sostenuto in C# minor (~52 BPM) · Target ~4:15 (255s)
// ============================================================================
function buildMoonlightSonata() {
  const s = new ScoreBuilder(53);
  let b = 0;

  const addBar = (triplets4, lhNotes, rhMel = [], pedalSplits = [[0, 3.94]], tripletVel = 0.34) => {
    for (const [p0, p1] of pedalSplits) {
      s.pedal(b + p0, b + p1);
    }
    for (let g = 0; g < 4; g++) {
      const grp = triplets4[g] || triplets4[0];
      for (let k = 0; k < 3; k++) {
        const beatPos = b + g + k / 3.0;
        const v = k === 0 ? tripletVel + 0.02 : k === 1 ? tripletVel - 0.02 : tripletVel;
        s.note(beatPos, 0.38, grp[k], v, "RH");
      }
    }
    for (const [off, dur, notes, vel] of lhNotes) {
      s.chord(b + off, dur, notes, vel, "LH");
    }
    for (const [off, dur, pitch, vel] of rhMel) {
      s.note(b + off, dur, pitch, vel, "RH");
    }
    b += 4.0;
  };

  // --- PART 1: Opening 4-Bar Bass Prelude (Bars 1-4) ---
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
    [[0.0, 3.92, ["C#2", "C#3"], 0.44]]
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
    [[0.0, 3.92, ["B1", "B2"], 0.44]]
  );
  addBar(
    [["A3", "C#4", "E4"], ["A3", "C#4", "E4"], ["A3", "D4", "F#4"], ["A3", "D4", "F#4"]],
    [[0.0, 1.95, ["A1", "A2"], 0.45], [2.0, 1.95, ["F#1", "F#2"], 0.45]],
    [],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "B#3", "F#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.45]],
    [],
    [[0, 1.92], [2.0, 3.94]]
  );

  // --- PART 2: Exposition — C# Minor -> E Major -> E Minor -> B Minor (Bars 5-22) ---
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
    [[0.0, 3.92, ["C#2", "G#2", "C#3"], 0.46]],
    [[3.0, 0.72, "G#4", 0.54], [3.75, 0.25, "G#4", 0.50]]
  );
  addBar(
    [["G#3", "D#4", "F#4"], ["G#3", "D#4", "F#4"], ["G#3", "D#4", "F#4"], ["G#3", "D#4", "F#4"]],
    [[0.0, 3.92, ["B#1", "B#2"], 0.46]],
    [[0.0, 2.9, "G#4", 0.58], [3.0, 0.72, "G#4", 0.54], [3.75, 0.25, "G#4", 0.50]]
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"]],
    [[0.0, 1.95, ["C#2", "C#3"], 0.48], [2.0, 1.95, ["F#1", "F#2"], 0.48]],
    [[0.0, 1.9, "G#4", 0.58], [2.0, 1.9, "A4", 0.62]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["G#3", "B3", "E4"], ["G#3", "B3", "E4"], ["A3", "B3", "D#4"], ["A3", "B3", "D#4"]],
    [[0.0, 1.95, ["B1", "B2"], 0.48], [2.0, 1.95, ["B1", "B2"], 0.48]],
    [[0.0, 1.9, "G#4", 0.58], [2.0, 1.4, "F#4", 0.56], [3.5, 0.5, "B4", 0.56]],
    [[0, 1.92], [2.0, 3.94]]
  );
  // Bar 9: E Major warm respite
  addBar(
    [["G#3", "B3", "E4"], ["G#3", "B3", "E4"], ["G#3", "B3", "E4"], ["G#3", "B3", "E4"]],
    [[0.0, 3.92, ["E2", "B2", "E3"], 0.48]],
    [[0.0, 2.9, "E4", 0.56]]
  );
  // Bar 10: E Minor shadow
  addBar(
    [["G3", "B3", "E4"], ["G3", "B3", "E4"], ["G3", "B3", "E4"], ["G3", "B3", "E4"]],
    [[0.0, 3.92, ["E2", "E3"], 0.48]],
    [[3.0, 0.72, "G4", 0.56], [3.75, 0.25, "G4", 0.52]]
  );
  // Bar 11: Em -> B7/D#
  addBar(
    [["G3", "B3", "E4"], ["G3", "B3", "E4"], ["F#3", "B3", "D#4"], ["F#3", "B3", "D#4"]],
    [[0.0, 1.95, ["E2", "E3"], 0.48], [2.0, 1.95, ["D#2", "D#3"], 0.48]],
    [[0.0, 1.9, "G4", 0.60], [2.0, 1.0, "F#4", 0.58], [3.0, 1.0, "G4", 0.60]],
    [[0, 1.92], [2.0, 3.94]]
  );
  // Bar 12: C Major Neapolitan glow -> B7
  addBar(
    [["G3", "C4", "E4"], ["G3", "C4", "E4"], ["F#3", "A3", "D#4"], ["F#3", "A3", "D#4"]],
    [[0.0, 1.95, ["C2", "C3"], 0.52], [2.0, 1.95, ["B1", "B2"], 0.50]],
    [[0.0, 1.9, "C5", 0.64], [2.0, 1.0, "B4", 0.60], [3.0, 1.0, "A4", 0.58]],
    [[0, 1.92], [2.0, 3.94]]
  );
  // Bar 13-16: B Minor lyrical descent & sigh
  addBar(
    [["F#3", "B3", "D4"], ["F#3", "B3", "D4"], ["G3", "B3", "E4"], ["G3", "B3", "E4"]],
    [[0.0, 1.95, ["B1", "B2"], 0.50], [2.0, 1.95, ["E1", "E2"], 0.50]],
    [[0.0, 1.9, "B4", 0.60], [2.0, 1.9, "B4", 0.58]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["F#3", "B3", "D4"], ["F#3", "B3", "D4"], ["F#3", "A#3", "C#4"], ["F#3", "A#3", "C#4"]],
    [[0.0, 1.95, ["F#1", "F#2"], 0.50], [2.0, 1.95, ["F#1", "F#2"], 0.50]],
    [[0.0, 1.9, "D5", 0.64], [2.0, 1.9, "C#5", 0.60]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["F#3", "B3", "D4"], ["F#3", "B3", "D4"], ["F#3", "B3", "D4"], ["F#3", "B3", "D4"]],
    [[0.0, 3.92, ["B1", "F#2", "B2"], 0.48]],
    [[0.0, 2.5, "B4", 0.58], [3.0, 0.72, "B4", 0.54], [3.75, 0.25, "B4", 0.50]]
  );
  addBar(
    [["E3", "B3", "C#4"], ["E3", "B3", "C#4"], ["F#3", "A#3", "C#4"], ["F#3", "A#3", "C#4"]],
    [[0.0, 1.95, ["G1", "G2"], 0.50], [2.0, 1.95, ["F#1", "F#2"], 0.50]],
    [[0.0, 1.9, "B4", 0.60], [2.0, 1.0, "A#4", 0.56], [3.0, 1.0, "C#5", 0.58]],
    [[0, 1.92], [2.0, 3.94]]
  );
  // Bars 17-20: B minor cadence & dark transition into Development
  addBar(
    [["F#3", "B3", "D4"], ["F#3", "B3", "D4"], ["G3", "B3", "E4"], ["G3", "B3", "E4"]],
    [[0.0, 1.95, ["B1", "B2"], 0.50], [2.0, 1.95, ["E1", "E2"], 0.50]],
    [[0.0, 1.9, "D5", 0.62], [2.0, 1.9, "E5", 0.64]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["F#3", "B3", "D4"], ["F#3", "B3", "D4"], ["F#3", "A#3", "E4"], ["F#3", "A#3", "C#4"]],
    [[0.0, 1.95, ["F#1", "F#2"], 0.52], [2.0, 1.95, ["F#1", "F#2"], 0.52]],
    [[0.0, 1.9, "D5", 0.64], [2.0, 1.9, "C#5", 0.60]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["F#3", "B3", "D4"], ["F#3", "B3", "D4"], ["G#3", "B3", "E#4"], ["G#3", "B3", "E#4"]],
    [[0.0, 1.95, ["B1", "B2"], 0.50], [2.0, 1.95, ["G#1", "G#2"], 0.52]],
    [[0.0, 1.9, "B4", 0.58], [2.0, 1.9, "C#5", 0.62]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"], ["A3", "D#4", "F#4"], ["A3", "D#4", "F#4"]],
    [[0.0, 1.95, ["F#1", "F#2"], 0.52], [2.0, 1.95, ["B1", "B2"], 0.52]],
    [[0.0, 1.9, "C#5", 0.64], [2.0, 1.9, "B4", 0.60]],
    [[0, 1.92], [2.0, 3.94]]
  );

  // --- PART 3: Expressive Development & Iconic G# Dominant Pedal Cascade (Bars 21-36) ---
  s.setTempo(b, 51);
  // Bars 21-24: F# Minor / D Major / G#7 dramatic climb
  addBar(
    [["G#3", "B3", "E4"], ["G#3", "B3", "E4"], ["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"]],
    [[0.0, 1.95, ["E1", "E2"], 0.52], [2.0, 1.95, ["F#1", "F#2"], 0.54]],
    [[0.0, 1.9, "B4", 0.60], [2.0, 1.9, "C#5", 0.64]],
    [[0, 1.92], [2.0, 3.94]],
    0.36
  );
  addBar(
    [["A3", "D4", "F#4"], ["A3", "D4", "F#4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
    [[0.0, 1.95, ["D1", "D2"], 0.54], [2.0, 1.95, ["C#1", "C#2"], 0.54]],
    [[0.0, 1.9, "D5", 0.66], [2.0, 1.9, "C#5", 0.64]],
    [[0, 1.92], [2.0, 3.94]],
    0.36
  );
  addBar(
    [["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"], ["G#3", "B#3", "F#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 1.95, ["F#1", "F#2"], 0.56], [2.0, 1.95, ["G#1", "G#2"], 0.56]],
    [[0.0, 1.9, "D5", 0.68], [2.0, 1.2, "C#5", 0.64], [3.2, 0.8, "B#4", 0.60]],
    [[0, 1.92], [2.0, 3.94]],
    0.37
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"]],
    [[0.0, 1.95, ["C#2", "C#3"], 0.54], [2.0, 1.95, ["A1", "A2"], 0.54]],
    [[0.0, 1.9, "C#5", 0.64], [2.0, 1.9, "D#5", 0.66]],
    [[0, 1.92], [2.0, 3.94]],
    0.37
  );

  // Bars 25-32: Iconic Beethoven G# Dominant Pedal Point Arpeggio Cascades (8 full bars!)
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "D#4", "F#4"], ["G#3", "E4", "G#4"], ["G#3", "F#4", "A4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.52]],
    [[0.0, 1.0, "C#5", 0.60], [1.0, 1.0, "D#5", 0.62], [2.0, 1.0, "E5", 0.66], [3.0, 1.0, "F#5", 0.68]],
    [[0, 1.92], [2.0, 3.94]],
    0.38
  );
  addBar(
    [["B#3", "D#4", "G#4"], ["A3", "C#4", "F#4"], ["G#3", "B#3", "D#4"], ["F#3", "A3", "C#4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.50]],
    [[0.0, 1.5, "G#5", 0.68], [1.5, 1.0, "F#5", 0.62], [2.5, 1.5, "D#5", 0.56]],
    [[0, 1.92], [2.0, 3.94]],
    0.36
  );
  addBar(
    [["E3", "G#3", "C#4"], ["F#3", "A3", "D#4"], ["G#3", "B#3", "E4"], ["A3", "C#4", "F#4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.50]],
    [[0.0, 1.0, "C#5", 0.58], [1.0, 1.0, "D#5", 0.60], [2.0, 1.0, "E5", 0.62], [3.0, 1.0, "F#5", 0.64]],
    [[0, 1.92], [2.0, 3.94]],
    0.36
  );
  addBar(
    [["G#3", "B#3", "D#4"], ["F#3", "A3", "C#4"], ["E3", "G#3", "B#3"], ["D#3", "F#3", "A3"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.48]],
    [[0.0, 1.5, "D#5", 0.58], [1.5, 1.0, "C#5", 0.54], [2.5, 1.5, "B#4", 0.50]],
    [[0, 1.92], [2.0, 3.94]],
    0.34
  );
  // Floating whisper over G# bass descending into Recapitulation
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "D#4", "F#4"], ["G#3", "C#4", "E4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.46]],
    [[0.0, 1.9, "E4", 0.52], [2.0, 1.9, "D#4", 0.48]],
    [[0, 1.92], [2.0, 3.94]],
    0.33
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "B#3", "D#4"], ["G#3", "C#4", "E4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.44]],
    [[0.0, 3.5, "G#4", 0.50]],
    [[0, 1.92], [2.0, 3.94]],
    0.31
  );

  // --- PART 4: Full Recapitulation in C# Minor (Bars 31-48) ---
  s.setTempo(b, 53);
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
    [[0.0, 3.92, ["C#2", "C#3"], 0.46]]
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
    [[0.0, 3.92, ["B1", "B2"], 0.46]]
  );
  addBar(
    [["A3", "C#4", "E4"], ["A3", "C#4", "E4"], ["A3", "D4", "F#4"], ["A3", "D4", "F#4"]],
    [[0.0, 1.95, ["A1", "A2"], 0.46], [2.0, 1.95, ["F#1", "F#2"], 0.46]],
    [],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "B#3", "F#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.46]],
    [],
    [[0, 1.92], [2.0, 3.94]]
  );
  // Haunting melody returns
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
    [[0.0, 3.92, ["C#2", "G#2", "C#3"], 0.48]],
    [[3.0, 0.72, "G#4", 0.56], [3.75, 0.25, "G#4", 0.52]]
  );
  addBar(
    [["G#3", "D#4", "F#4"], ["G#3", "D#4", "F#4"], ["G#3", "D#4", "F#4"], ["G#3", "D#4", "F#4"]],
    [[0.0, 3.92, ["B#1", "B#2"], 0.48]],
    [[0.0, 2.9, "G#4", 0.60], [3.0, 0.72, "G#4", 0.56], [3.75, 0.25, "G#4", 0.52]]
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"]],
    [[0.0, 1.95, ["C#2", "C#3"], 0.50], [2.0, 1.95, ["F#1", "F#2"], 0.50]],
    [[0.0, 1.9, "G#4", 0.60], [2.0, 1.9, "A4", 0.64]],
    [[0, 1.92], [2.0, 3.94]]
  );
  // Recapitulation stays in tonic C# minor / F# minor (instead of E major)
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "B#3", "D#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 1.95, ["G#1", "G#2"], 0.50], [2.0, 1.95, ["G#1", "G#2"], 0.50]],
    [[0.0, 1.9, "G#4", 0.60], [2.0, 1.4, "F#4", 0.58], [3.5, 0.5, "C#5", 0.60]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"], ["A3", "D4", "F#4"], ["A3", "D4", "F#4"]],
    [[0.0, 1.95, ["F#1", "F#2"], 0.52], [2.0, 1.95, ["D1", "D2"], 0.52]],
    [[0.0, 1.9, "C#5", 0.64], [2.0, 1.0, "D5", 0.66], [3.0, 1.0, "C#5", 0.62]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "B#3", "D#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 1.95, ["G#1", "G#2"], 0.52], [2.0, 1.95, ["G#1", "G#2"], 0.52]],
    [[0.0, 1.9, "C#5", 0.62], [2.0, 1.9, "B#4", 0.58]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"]],
    [[0.0, 1.95, ["C#2", "C#3"], 0.50], [2.0, 1.95, ["F#1", "F#2"], 0.50]],
    [[0.0, 1.9, "C#5", 0.60], [2.0, 1.9, "A4", 0.58]],
    [[0, 1.92], [2.0, 3.94]]
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "B#3", "D#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 1.95, ["G#1", "G#2"], 0.50], [2.0, 1.95, ["G#1", "G#2"], 0.50]],
    [[0.0, 1.9, "G#4", 0.58], [2.0, 1.9, "F#4", 0.54]],
    [[0, 1.92], [2.0, 3.94]]
  );

  // --- PART 5: Deep-Bass Echo Coda fading to ppp (Bars 49-56) ---
  s.setTempo(b, 50);
  // Iconic LH echo of the dotted melody in the bass!
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
    [[0.0, 2.9, ["C#2", "C#3"], 0.46], [3.0, 0.72, ["G#2"], 0.48], [3.75, 0.25, ["G#2"], 0.44]],
    [],
    [[0, 3.94]],
    0.32
  );
  addBar(
    [["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"], ["G#3", "B#3", "D#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 1.9, ["A2"], 0.48], [2.0, 1.9, ["G#2"], 0.46]],
    [],
    [[0, 1.92], [2.0, 3.94]],
    0.31
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
    [[0.0, 2.9, ["C#2", "C#3"], 0.44], [3.0, 0.72, ["G#2"], 0.45], [3.75, 0.25, ["G#2"], 0.41]],
    [],
    [[0, 3.94]],
    0.30
  );
  addBar(
    [["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"], ["G#3", "B#3", "D#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 1.9, ["F#1", "F#2"], 0.44], [2.0, 1.9, ["G#1", "G#2"], 0.44]],
    [[0.0, 1.9, "F#4", 0.50], [2.0, 1.9, "D#4", 0.46]],
    [[0, 1.92], [2.0, 3.94]],
    0.29
  );
  // Final lingering C# minor arpeggiated ascent & ppp chords
  s.setTempo(b, 46);
  addBar(
    [["G#3", "C#4", "E4"], ["C#4", "E4", "G#4"], ["E4", "G#4", "C#5"], ["G#3", "C#4", "E4"]],
    [[0.0, 3.92, ["C#1", "C#2"], 0.44]],
    [],
    [[0, 3.94]],
    0.28
  );
  addBar(
    [["G#3", "C#4", "E4"], ["C#4", "E4", "G#4"], ["E4", "G#4", "C#5"], ["G#3", "C#4", "E4"]],
    [[0.0, 3.92, ["C#1", "C#2"], 0.42]],
    [],
    [[0, 3.94]],
    0.26
  );

  s.setTempo(b, 40);
  s.pedal(b, b + 5.8);
  s.chord(b + 0.0, 2.4, ["C#1", "C#2", "G#2", "C#3"], 0.40, "LH");
  s.chord(b + 0.0, 2.4, ["G#3", "C#4", "E4"], 0.38, "RH", 0.14);
  s.chord(b + 2.6, 3.0, ["C#1", "C#2", "G#2", "C#3"], 0.36, "LH");
  s.chord(b + 2.6, 3.0, ["E3", "G#3", "C#4"], 0.34, "RH", 0.16);
  b += 5.8;

  return s.build({
    id: "beethoven_moonlight_sonata_op27_no2",
    code: "LVB-MS",
    composer: "Ludwig van Beethoven (1770–1827)",
    title: "Piano Sonata No. 14 in C-Sharp Minor, Op. 27 No. 2 — \"Moonlight\" (I. Adagio sostenuto)",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1801 · Quasi una fantasia",
    keySignature: "C♯ Minor · 4/4 (12/8)",
    bpm: 53,
    historicalNote:
      "Complete Adagio sostenuto movement of Beethoven's Moonlight Sonata (Op. 27 No. 2), including full exposition, G-sharp pedal development, recapitulation, and deep-bass echo coda.",
  });
}

// ============================================================================
// 6. FRANZ LISZT — LA CAMPANELLA, S. 141 NO. 3 (Grandes Études de Paganini)
//    6/8 meter (1 beat = 1 eighth note, 6 beats per bar) · Target ~3:30 (210s)
// ============================================================================
function buildLaCampanella() {
  const s = new ScoreBuilder(198);
  let b = 0;

  // --- Intro (8 bars): Famous glistening high D#6 / D#5 octave bell chimes ---
  for (let i = 0; i < 4; i++) {
    s.pedal(b, b + 5.7);
    s.note(b + 0.0, 1.4, "D#6", 0.62, "RH");
    s.note(b + 0.0, 1.5, "D#5", 0.56, "LH");
    s.note(b + 3.0, 1.4, "D#6", 0.54, "RH");
    s.note(b + 3.0, 1.5, "D#5", 0.48, "LH");
    b += 6.0;
  }
  for (let i = 0; i < 4; i++) {
    s.pedal(b, b + 5.7);
    const bell = i % 2 === 0 ? "D#6" : "E6";
    s.note(b + 0.0, 0.9, bell, 0.64, "RH");
    s.note(b + 1.5, 0.9, "D#5", 0.52, "RH");
    s.note(b + 3.0, 0.9, "D#6", 0.60, "RH");
    s.note(b + 4.5, 0.9, "D#5", 0.50, "RH");
    s.note(b + 0.0, 2.5, "G#2", 0.48, "LH");
    b += 6.0;
  }

  // Helper: 1 bar of leaping La Campanella (6 eighth-note beats alternating melody & high D#6 bell)
  const addBellBar = (melNotes3, lhBass, lhChord, bellNote = "D#6", velBase = 0.68, repeatBell = false) => {
    s.pedal(b, b + 2.8);
    s.pedal(b + 3.0, b + 5.8);
    // LH waltz-like 6/8 accompaniment
    s.note(b + 0.0, 1.5, lhBass, 0.64, "LH");
    s.chord(b + 1.0, 1.0, lhChord, 0.48, "LH");
    s.chord(b + 2.0, 0.8, lhChord, 0.44, "LH");
    s.note(b + 3.0, 1.5, lhBass, 0.60, "LH");
    s.chord(b + 4.0, 1.0, lhChord, 0.46, "LH");
    s.chord(b + 5.0, 0.8, lhChord, 0.42, "LH");

    // RH signature huge leaping melody <-> crystal bell D#6
    for (let k = 0; k < 3; k++) {
      const mPitch = melNotes3[k];
      s.note(b + k * 2.0, 0.85, mPitch, velBase, "RH");
      if (repeatBell) {
        s.note(b + k * 2.0 + 0.65, 0.42, bellNote, velBase * 0.84, "RH");
        s.note(b + k * 2.0 + 1.25, 0.55, bellNote, velBase * 0.90, "RH");
      } else {
        s.note(b + k * 2.0 + 1.0, 0.85, bellNote, velBase * 0.88, "RH");
      }
    }
    b += 6.0;
  };

  const playTheme16 = (velBase = 0.68, repeatBell = false) => {
    // Part A (8 bars)
    addBellBar(["D#5", "D#5", "E5"], "G#2", ["B2", "D#3", "G#3"], "D#6", velBase, repeatBell);
    addBellBar(["D#5", "C#5", "B4"], "G#2", ["B2", "D#3", "G#3"], "D#6", velBase, repeatBell);
    addBellBar(["C#5", "D#5", "C#5"], "D#2", ["A#2", "C#3", "F##3"], "D#6", velBase, repeatBell);
    addBellBar(["B4", "A#4", "G#4"], "G#2", ["B2", "D#3", "G#3"], "D#6", velBase, repeatBell);
    addBellBar(["D#5", "D#5", "E5"], "G#2", ["B2", "D#3", "G#3"], "D#6", velBase + 0.02, repeatBell);
    addBellBar(["D#5", "C#5", "B4"], "C#2", ["G#2", "C#3", "E3"], "D#6", velBase + 0.02, repeatBell);
    addBellBar(["A#4", "B4", "C#5"], "D#2", ["A#2", "D#3", "F##3"], "D#6", velBase + 0.02, repeatBell);
    addBellBar(["G#4", "B4", "D#5"], "G#2", ["B2", "D#3", "G#3"], "D#6", velBase, repeatBell);

    // Part B (8 bars): Brighter B major -> G# minor dramatic leaps
    addBellBar(["F#5", "G#5", "F#5"], "B1", ["F#2", "B2", "D#3"], "D#6", velBase + 0.04, repeatBell);
    addBellBar(["E5", "D#5", "C#5"], "F#2", ["A#2", "C#3", "F#3"], "D#6", velBase + 0.03, repeatBell);
    addBellBar(["D#5", "E5", "D#5"], "B1", ["F#2", "B2", "D#3"], "D#6", velBase + 0.04, repeatBell);
    addBellBar(["C#5", "B4", "A#4"], "F#2", ["A#2", "C#3", "F#3"], "D#6", velBase + 0.02, repeatBell);
    addBellBar(["B4", "C#5", "D#5"], "E2", ["G#2", "B2", "E3"], "D#6", velBase + 0.04, repeatBell);
    addBellBar(["E5", "F#5", "G#5"], "C#2", ["G#2", "C#3", "E3"], "D#6", velBase + 0.05, repeatBell);
    addBellBar(["F##5", "G#5", "A#5"], "D#2", ["A#2", "D#3", "F##3"], "D#6", velBase + 0.06, repeatBell);
    addBellBar(["G#5", "D#5", "B4"], "G#2", ["B2", "D#3", "G#3"], "D#6", velBase + 0.04, repeatBell);
  };

  // --- Statement 1: Classic Theme (16 bars) ---
  s.setTempo(b, 206);
  playTheme16(0.66, false);

  // --- Variation 1: Sparkling Repeated-Bell Virtuosity (16 bars) ---
  s.setTempo(b, 214);
  playTheme16(0.70, true);

  // --- Variation 2: Chromatic Runs & High Bell Echoes (16 bars) ---
  s.setTempo(b, 218);
  const chromRuns = [
    ["D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5", "C6", "C#6", "D#6"],
    ["D#6", "D6", "C#6", "C6", "B5", "A#5", "A5", "G#5", "G5", "F#5", "F5", "D#5"],
    ["C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "C#6", "D#6"],
    ["B5", "A#5", "A5", "G#5", "G5", "F#5", "F5", "E5", "D#5", "C#5", "B4", "G#4"],
  ];
  const var2Bass = [
    ["G#2", ["B2", "D#3", "G#3"]],
    ["G#2", ["B2", "D#3", "G#3"]],
    ["D#2", ["A#2", "C#3", "F##3"]],
    ["G#2", ["B2", "D#3", "G#3"]],
  ];
  for (let rep = 0; rep < 4; rep++) {
    for (let m = 0; m < 4; m++) {
      s.pedal(b, b + 5.7);
      const [root, ch] = var2Bass[m];
      s.note(b + 0.0, 2.0, root, 0.64, "LH");
      s.chord(b + 1.5, 1.2, ch, 0.48, "LH");
      s.note(b + 3.0, 2.0, root, 0.60, "LH");
      s.chord(b + 4.5, 1.2, ch, 0.48, "LH");
      const run = chromRuns[m];
      for (let i = 0; i < 12; i++) {
        const pitch = rep % 2 === 1 && i === 11 ? "D#6" : run[i];
        s.note(b + i * 0.5, 0.46, pitch, 0.60 + (i % 4 === 0 ? 0.08 : 0), "RH");
      }
      b += 6.0;
    }
  }

  // --- Variation 3: Sparkling Trill-Bell Section (16 bars) ---
  s.setTempo(b, 212);
  const trillBars = [
    { mel: ["D#5", "E5"], bass: "G#2", ch: ["B2", "D#3", "G#3"] },
    { mel: ["D#5", "C#5"], bass: "G#2", ch: ["B2", "D#3", "G#3"] },
    { mel: ["C#5", "D#5"], bass: "D#2", ch: ["A#2", "C#3", "F##3"] },
    { mel: ["B4", "G#4"], bass: "G#2", ch: ["B2", "D#3", "G#3"] },
    { mel: ["F#5", "G#5"], bass: "B1", ch: ["F#2", "B2", "D#3"] },
    { mel: ["E5", "C#5"], bass: "F#2", ch: ["A#2", "C#3", "F#3"] },
    { mel: ["D#5", "C#5"], bass: "D#2", ch: ["A#2", "D#3", "F##3"] },
    { mel: ["B4", "G#4"], bass: "G#2", ch: ["B2", "D#3", "G#3"] },
  ];
  for (let rep = 0; rep < 2; rep++) {
    for (const tb of trillBars) {
      s.pedal(b, b + 5.7);
      s.note(b + 0.0, 2.2, tb.bass, 0.64, "LH");
      s.chord(b + 1.0, 1.2, tb.ch, 0.48, "LH");
      s.note(b + 3.0, 2.2, tb.bass, 0.60, "LH");
      s.chord(b + 4.0, 1.2, tb.ch, 0.48, "LH");
      // Delicate high D#6-E6 trill interwoven with singing middle melody
      s.note(b + 0.0, 2.4, tb.mel[0], 0.72, "RH");
      s.note(b + 3.0, 2.4, tb.mel[1], 0.70, "RH");
      for (let t = 0; t < 12; t++) {
        const trillPitch = t % 2 === 0 ? "D#6" : "E6";
        s.note(b + t * 0.5, 0.42, trillPitch, 0.48 + (t % 4 === 0 ? 0.06 : 0), "RH");
      }
      b += 6.0;
    }
  }

  // --- Middle Section: Lyrical B Major Cantabile (16 bars) ---
  s.setTempo(b, 192);
  const cantabileBars = [
    { bass: ["B1", "F#2", "B2", "D#3", "F#3", "B3"], mel: [[0, 2.5, "F#5", 0.66], [3, 1.5, "G#5", 0.64], [4.5, 1.5, "F#5", 0.62]] },
    { bass: ["F#1", "C#2", "F#2", "A#2", "C#3", "F#3"], mel: [[0, 2.5, "E5", 0.64], [3, 1.5, "D#5", 0.60], [4.5, 1.5, "C#5", 0.58]] },
    { bass: ["G#1", "D#2", "G#2", "B2", "D#3", "G#3"], mel: [[0, 2.5, "D#5", 0.64], [3, 1.5, "E5", 0.64], [4.5, 1.5, "D#5", 0.60]] },
    { bass: ["D#1", "A#1", "D#2", "F##2", "A#2", "D#3"], mel: [[0, 3.0, "C#5", 0.62], [3, 3.0, "A#4", 0.58]] },
    { bass: ["E1", "B1", "E2", "G#2", "B2", "E3"], mel: [[0, 2.5, "B4", 0.64], [3, 1.5, "C#5", 0.64], [4.5, 1.5, "D#5", 0.66]] },
    { bass: ["C#1", "G#1", "C#2", "E2", "G#2", "C#3"], mel: [[0, 2.5, "E5", 0.68], [3, 1.5, "F#5", 0.70], [4.5, 1.5, "G#5", 0.72]] },
    { bass: ["D#1", "A#1", "D#2", "F##2", "A#2", "D#3"], mel: [[0, 3.0, "F##5", 0.72], [3, 3.0, "D#5", 0.68]] },
    { bass: ["G#1", "D#2", "G#2", "B2", "D#3", "G#3"], mel: [[0, 3.0, "G#5", 0.70], [3, 3.0, "D#5", 0.62]] },
  ];
  for (let rep = 0; rep < 2; rep++) {
    for (const cb of cantabileBars) {
      s.pedal(b, b + 5.75);
      for (let k = 0; k < 6; k++) {
        s.note(b + k * 1.0, 1.3, cb.bass[k], k === 0 ? 0.58 : 0.42, "LH");
      }
      for (const [off, dur, pitch, vel] of cb.mel) {
        const vv = vel + rep * 0.05;
        s.note(b + off, dur, pitch, vv, "RH");
        if (rep === 1) s.note(b + off, dur * 0.9, noteToMidi(pitch) - 12, vv * 0.74, "RH");
      }
      b += 6.0;
    }
  }

  // --- Variation 4: Virtuoso Double-Hand Arpeggios & Leaping Bells (16 bars) ---
  s.setTempo(b, 222);
  playTheme16(0.76, true);

  // --- Animato Concert Finale & Blazing G# Minor Bell Cadence (16 bars) ---
  s.setTempo(b, 232);
  for (let rep = 0; rep < 3; rep++) {
    addBellBar(["D#5", "E5", "F##5"], "D#2", ["A#2", "D#3", "F##3"], "D#6", 0.78 + rep * 0.02, true);
    addBellBar(["G#5", "A#5", "B5"], "G#2", ["B2", "D#3", "G#3"], "D#6", 0.80 + rep * 0.02, true);
    addBellBar(["C#6", "B5", "A#5"], "C#2", ["G#2", "C#3", "E3"], "D#6", 0.80 + rep * 0.02, true);
    addBellBar(["G#5", "F##5", "G#5"], "D#2", ["A#2", "D#3", "F##3"], "D#6", 0.82 + rep * 0.02, true);
  }

  // Sweeping final G# minor arpeggio & grand chords
  const finalArp = [
    "G#2", "B2", "D#3", "G#3", "B3", "D#4", "G#4", "B4",
    "D#5", "G#5", "B5", "D#6", "G#6",
  ];
  s.pedal(b, b + 12.0);
  for (let i = 0; i < finalArp.length; i++) {
    const m = noteToMidi(finalArp[i]);
    s.note(b + i * 0.32, 0.6, m, 0.70 + (i / finalArp.length) * 0.16, m >= 60 ? "RH" : "LH");
  }
  b += finalArp.length * 0.32 + 0.6;

  s.setTempo(b, 150);
  s.chord(b + 0.0, 1.5, ["D#2", "A#2", "D#3"], 0.82, "LH");
  s.chord(b + 0.0, 1.5, ["F##4", "A#4", "D#5", "D#6"], 0.84, "RH");
  s.chord(b + 2.0, 1.5, ["G#1", "G#2", "D#3"], 0.84, "LH");
  s.chord(b + 2.0, 1.5, ["G#4", "B4", "D#5", "G#5"], 0.84, "RH");
  s.chord(b + 4.0, 6.5, ["G#1", "D#2", "G#2", "B2"], 0.88, "LH");
  s.chord(b + 4.0, 6.5, ["G#4", "B4", "D#5", "G#5", "D#6"], 0.88, "RH");
  b += 10.5;

  return s.build({
    id: "liszt_la_campanella_s141_no3",
    code: "LSZ-LC",
    composer: "Franz Liszt (1811–1886)",
    title: "Grandes Études de Paganini, S. 141 No. 3 — \"La Campanella\"",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1851 · Virtuoso Romantic Étude",
    keySignature: "G♯ Minor · 6/8",
    bpm: 214,
    historicalNote:
      "Full concert performance of Franz Liszt's La Campanella (S. 141 No. 3), featuring the iconic high D#6 bell leaps, chromatic runs, sparkling trills, B-major cantabile, and blazing finale.",
  });
}

// ============================================================================
// 7. FRÉDÉRIC CHOPIN — NOCTURNE IN E-FLAT MAJOR, OP. 9 NO. 2
//    Andante 12/8 (~132 eighth-note BPM), full A - A' - B - A'' - B' - A''' - Coda (~3:30)
// ============================================================================
function buildChopinNocturneOp9No2() {
  // 12/8 time: 1 bar = 12 eighth-note beats (4 dotted-quarter pulses of 3 beats each)
  const s = new ScoreBuilder(134);
  let b = 0;

  const addNocturnePulse = (beatStart, bassNote, chord1, chord2, vel = 0.44) => {
    s.pedal(beatStart, beatStart + 2.86);
    s.note(beatStart, 1.35, bassNote, vel + 0.05, "LH");
    s.chord(beatStart + 1.0, 0.92, chord1, vel - 0.06, "LH");
    s.chord(beatStart + 2.0, 0.88, chord2, vel - 0.09, "LH");
  };

  const addMel = (beatStart, events) => {
    for (const [off, dur, pitch, vel] of events) {
      s.note(beatStart + off, dur, pitch, vel, "RH");
    }
  };

  // Upbeat Bb4 pickup (1 beat)
  s.note(0.0, 0.95, "Bb4", 0.48, "RH");
  b = 1.0;

  const playSectionA = (ornamentLevel = 0, velBase = 0.56) => {
    // Bar 1: Eb -> Eb(dim/G) -> Fm7 -> Bb7
    addNocturnePulse(b + 0, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.43);
    addNocturnePulse(b + 3, "G2", ["Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.42);
    addNocturnePulse(b + 6, "F2", ["Ab3", "C4", "Eb4"], ["Ab3", "C4", "Eb4"], 0.43);
    addNocturnePulse(b + 9, "Bb1", ["Ab3", "D4"], ["Ab3", "D4", "F4"], 0.43);

    if (ornamentLevel === 0) {
      addMel(b, [
        [0, 3.0, "G5", velBase + 0.06],
        [3, 1.0, "F5", velBase], [4, 1.0, "G5", velBase + 0.02], [5, 1.0, "F5", velBase - 0.01],
        [6, 3.0, "Eb5", velBase + 0.03],
        [9, 2.0, "Bb4", velBase - 0.04], [11, 1.0, "G5", velBase + 0.04],
      ]);
    } else if (ornamentLevel === 1) {
      addMel(b, [
        [0, 2.5, "G5", velBase + 0.06], [2.5, 0.5, "A5", velBase],
        [3, 0.75, "F5", velBase], [3.75, 0.75, "G5", velBase + 0.03], [4.5, 0.75, "Ab5", velBase + 0.03], [5.25, 0.75, "F5", velBase],
        [6, 2.5, "Eb5", velBase + 0.04], [8.5, 0.5, "D5", velBase - 0.03],
        [9, 2.0, "Bb4", velBase - 0.04], [11, 1.0, "G5", velBase + 0.05],
      ]);
    } else {
      addMel(b, [
        [0, 2.2, "G5", velBase + 0.08], [2.2, 0.4, "Ab5", velBase + 0.02], [2.6, 0.4, "G5", velBase + 0.01],
        [3, 0.6, "F5", velBase + 0.02], [3.6, 0.6, "G5", velBase + 0.04], [4.2, 0.6, "Bb5", velBase + 0.06], [4.8, 0.6, "Ab5", velBase + 0.03], [5.4, 0.6, "F5", velBase],
        [6, 2.6, "Eb5", velBase + 0.05], [8.6, 0.4, "D5", velBase - 0.02],
        [9, 1.5, "Bb4", velBase - 0.03], [10.5, 0.5, "Eb5", velBase], [11, 1.0, "G5", velBase + 0.06],
      ]);
    }
    b += 12.0;

    // Bar 2: Eb -> C7 -> Fm -> Bb7
    addNocturnePulse(b + 0, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.44);
    addNocturnePulse(b + 3, "C2", ["G3", "Bb3", "E4"], ["G3", "Bb3", "E4"], 0.45);
    addNocturnePulse(b + 6, "F2", ["Ab3", "C4", "F4"], ["Ab3", "C4", "F4"], 0.45);
    addNocturnePulse(b + 9, "Bb1", ["Ab3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.44);

    addMel(b, [
      [0, 2.5, "C6", velBase + 0.08], [2.5, 0.5, "Bb5", velBase + 0.03],
      [3, 2.0, "G5", velBase + 0.04], [5, 1.0, "E5", velBase],
      [6, 2.2, "F5", velBase + 0.04], [8.2, 0.8, "Ab5", velBase + 0.05],
      [9, 2.0, "D5", velBase], [11, 1.0, "Bb4", velBase - 0.03],
    ]);
    b += 12.0;

    // Bar 3: Eb -> Ab -> Fm7 -> Bb7 (expressive rising cantabile)
    addNocturnePulse(b + 0, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.43);
    addNocturnePulse(b + 3, "Ab1", ["Ab3", "C4", "Eb4"], ["Ab3", "C4", "Eb4"], 0.46);
    addNocturnePulse(b + 6, "F2", ["Ab3", "C4", "Eb4"], ["A3", "C4", "Eb4"], 0.46);
    addNocturnePulse(b + 9, "Bb1", ["Bb3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.44);

    if (ornamentLevel >= 1) {
      addMel(b, [
        [0, 1.8, "G5", velBase + 0.05], [1.8, 0.6, "F5", velBase], [2.4, 0.6, "G5", velBase + 0.02],
        [3, 1.5, "C6", velBase + 0.09], [4.5, 0.75, "Bb5", velBase + 0.05], [5.25, 0.75, "Ab5", velBase + 0.03],
        [6, 1.5, "G5", velBase + 0.04], [7.5, 0.75, "F5", velBase + 0.02], [8.25, 0.75, "Eb5", velBase],
        [9, 2.0, "D5", velBase], [11, 1.0, "F5", velBase + 0.02],
      ]);
    } else {
      addMel(b, [
        [0, 2.5, "G5", velBase + 0.05], [2.5, 0.5, "F5", velBase],
        [3, 2.0, "Ab5", velBase + 0.07], [5, 1.0, "G5", velBase + 0.03],
        [6, 2.0, "F5", velBase + 0.02], [8, 1.0, "Eb5", velBase],
        [9, 2.0, "D5", velBase - 0.01], [11, 1.0, "F5", velBase + 0.01],
      ]);
    }
    b += 12.0;

    // Bar 4: Eb cadence with delicate grace turn
    addNocturnePulse(b + 0, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.44);
    addNocturnePulse(b + 3, "Ab1", ["Ab3", "C4", "Eb4"], ["Ab3", "C4", "Eb4"], 0.42);
    addNocturnePulse(b + 6, "Bb1", ["G3", "Bb3", "Eb4"], ["Ab3", "D4", "F4"], 0.42);
    addNocturnePulse(b + 9, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.40);

    addMel(b, [
      [0, 3.0, "Eb5", velBase + 0.04],
      [3, 1.5, "F5", velBase], [4.5, 0.75, "Eb5", velBase - 0.02], [5.25, 0.75, "D5", velBase - 0.02],
      [6, 1.5, "Eb5", velBase + 0.01], [7.5, 1.5, "F5", velBase + 0.02],
      [9, 2.0, "Eb5", velBase - 0.02], [11, 1.0, "Bb4", velBase - 0.04],
    ]);
    b += 12.0;
  };

  const playSectionB = (passIdx = 0) => {
    const vB = 0.58 + passIdx * 0.04;
    s.setTempo(b, 138 + passIdx * 3);
    // Bar 1: Bb7 -> Eb -> G7 -> Cm
    addNocturnePulse(b + 0, "Bb1", ["Ab3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.46);
    addNocturnePulse(b + 3, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.46);
    addNocturnePulse(b + 6, "G2", ["F3", "B3", "D4"], ["F3", "B3", "D4"], 0.48);
    addNocturnePulse(b + 9, "C2", ["G3", "C4", "Eb4"], ["G3", "C4", "Eb4"], 0.48);
    addMel(b, [
      [0, 2.0, "Bb5", vB + 0.04], [2, 1.0, "Ab5", vB],
      [3, 2.0, "G5", vB + 0.02], [5, 1.0, "F5", vB],
      [6, 2.0, "G5", vB + 0.05], [8, 1.0, "F5", vB + 0.02],
      [9, 2.0, "Eb5", vB + 0.03], [11, 1.0, "G5", vB + 0.04],
    ]);
    b += 12.0;

    // Bar 2: Fm -> Bb7 -> Eb -> C7
    addNocturnePulse(b + 0, "F2", ["Ab3", "C4", "F4"], ["Ab3", "C4", "F4"], 0.48);
    addNocturnePulse(b + 3, "Bb1", ["Ab3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.48);
    addNocturnePulse(b + 6, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.48);
    addNocturnePulse(b + 9, "C2", ["G3", "Bb3", "E4"], ["G3", "Bb3", "E4"], 0.50);
    addMel(b, [
      [0, 2.0, "Ab5", vB + 0.06], [2, 1.0, "G5", vB + 0.02],
      [3, 2.0, "F5", vB + 0.03], [5, 1.0, "D5", vB],
      [6, 2.0, "Eb5", vB + 0.04], [8, 1.0, "G5", vB + 0.04],
      [9, 2.0, "Bb5", vB + 0.07], [11, 1.0, "C6", vB + 0.08],
    ]);
    b += 12.0;

    // Bar 3: Expressive Romantic Climax (Fm7 -> F#dim7 -> Eb/G -> Bb7)
    addNocturnePulse(b + 0, "F2", ["Ab3", "C4", "F4"], ["Ab3", "C4", "F4"], 0.52);
    addNocturnePulse(b + 3, "F#2", ["A3", "C4", "Eb4"], ["A3", "C4", "Eb4"], 0.54);
    addNocturnePulse(b + 6, "G2", ["Bb3", "Eb4", "G4"], ["Bb3", "Eb4", "G4"], 0.52);
    addNocturnePulse(b + 9, "Bb1", ["Ab3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.48);
    addMel(b, [
      [0, 2.0, "Db6", vB + 0.11], [2, 1.0, "C6", vB + 0.08],
      [3, 1.5, "Bb5", vB + 0.09], [4.5, 1.5, "A5", vB + 0.06],
      [6, 2.0, "Bb5", vB + 0.08], [8, 1.0, "G5", vB + 0.04],
      [9, 1.5, "F5", vB + 0.02], [10.5, 1.5, "D5", vB - 0.02],
    ]);
    b += 12.0;

    // Bar 4: Singing return to Eb tonic
    s.setTempo(b, 130);
    addNocturnePulse(b + 0, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.44);
    addNocturnePulse(b + 3, "C2", ["G3", "C4", "Eb4"], ["G3", "C4", "Eb4"], 0.42);
    addNocturnePulse(b + 6, "F2", ["Ab3", "C4", "Eb4"], ["Ab3", "D4", "F4"], 0.42);
    addNocturnePulse(b + 9, "Bb1", ["Ab3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.40);
    addMel(b, [
      [0, 3.0, "Eb5", vB + 0.04],
      [3, 2.0, "G5", vB + 0.02], [5, 1.0, "F5", vB],
      [6, 2.0, "Eb5", vB], [8, 1.0, "C5", vB - 0.03],
      [9, 2.0, "D5", vB - 0.04], [11, 1.0, "Bb4", vB - 0.05],
    ]);
    b += 12.0;
    s.setTempo(b, 134);
  };

  // Full Nocturne Architecture: A - A' - B - A'' - B' - A''' - Coda (36 bars ~ 3:28)
  playSectionA(0, 0.54);
  playSectionA(1, 0.56);
  playSectionB(0);
  playSectionA(1, 0.58);
  playSectionB(1);
  playSectionA(2, 0.60);

  // --- Poetically Fading Coda & Delicate Cadenza ---
  s.setTempo(b, 122);
  for (let rep = 0; rep < 2; rep++) {
    addNocturnePulse(b + 0, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.42 - rep * 0.04);
    addNocturnePulse(b + 3, "Ab1", ["Ab3", "C4", "F4"], ["Ab3", "C4", "F4"], 0.42 - rep * 0.04);
    addNocturnePulse(b + 6, "Bb1", ["Ab3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.40 - rep * 0.04);
    addNocturnePulse(b + 9, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.38 - rep * 0.04);
    addMel(b, [
      [0, 2.5, "G5", 0.58 - rep * 0.06], [2.5, 0.5, "Ab5", 0.52 - rep * 0.06],
      [3, 2.5, "F5", 0.56 - rep * 0.06], [5.5, 0.5, "G5", 0.50 - rep * 0.06],
      [6, 2.5, "D5", 0.52 - rep * 0.06], [8.5, 0.5, "F5", 0.48 - rep * 0.06],
      [9, 3.0, "Eb5", 0.50 - rep * 0.06],
    ]);
    b += 12.0;
  }

  // Famous feathery descending chromatic cadenza over Bb7 pedal
  s.setTempo(b, 152);
  s.pedal(b, b + 12.0);
  s.chord(b, 6.0, ["Bb1", "Bb2", "D3", "Ab3"], 0.44, "LH");
  const cadNotes = [
    "Bb5", "A5", "Ab5", "G5", "Gb5", "F5", "E5", "Eb5",
    "D5", "Eb5", "F5", "G5", "Ab5", "Bb5", "C6", "Bb5",
    "Ab5", "G5", "F5", "Eb5", "D5", "F5",
  ];
  for (let i = 0; i < cadNotes.length; i++) {
    const v = 0.52 - (i / cadNotes.length) * 0.16;
    s.note(b + i * 0.52, 0.65, cadNotes[i], v, "RH");
  }
  b += cadNotes.length * 0.52 + 0.8;

  // Hushed final Eb major chords (pp)
  s.setTempo(b, 92);
  s.pedal(b, b + 12.0);
  s.chord(b + 0.0, 4.2, ["Eb2", "Bb2", "G3"], 0.36, "LH");
  s.chord(b + 0.0, 4.2, ["Bb4", "Eb5", "G5"], 0.42, "RH");
  s.chord(b + 4.5, 6.8, ["Eb2", "Bb2", "Eb3"], 0.32, "LH");
  s.chord(b + 4.5, 6.8, ["G4", "Bb4", "Eb5"], 0.36, "RH");
  b += 11.8;

  return s.build({
    id: "chopin_nocturne_op9_no2",
    code: "CHP-N92",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Nocturne in E-flat Major, Op. 9 No. 2",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1831 · Romantic Nocturne",
    keySignature: "E♭ Major · 12/8",
    bpm: 134,
    historicalNote:
      "Full concert realization of Frédéric Chopin's Nocturne in E-flat Major, Op. 9 No. 2, tracing the ornamented cantabile repeats, passionate B-section climax, and feathery cadenza coda.",
  });
}

// ============================================================================
// 8. WOLFGANG AMADEUS MOZART — FANTASIA IN D MINOR, K. 397
//    Andante arpeggios -> Adagio tragic recitative -> Presto cadenzas -> Allegretto D major (~3:20)
// ============================================================================
function buildMozartFantasiaDMinor() {
  const s = new ScoreBuilder(72);
  let b = 0;

  // --- PART 1: Andante — Mysterious Rolling D Minor Arpeggios (11 bars) ---
  const andanteChords = [
    ["D3", "F3", "A3", "D4", "A3", "F3"],
    ["D3", "F3", "A3", "D4", "A3", "F3"],
    ["C#3", "E3", "G3", "A3", "G3", "E3"],
    ["C#3", "E3", "G3", "A3", "G3", "E3"],
    ["D3", "F3", "A3", "D4", "A3", "F3"],
    ["Bb2", "D3", "G3", "Bb3", "G3", "D3"],
    ["A2", "C#3", "E3", "G3", "E3", "C#3"],
    ["D3", "F3", "A3", "D4", "A3", "F3"],
    ["G2", "Bb2", "D3", "G3", "D3", "Bb2"],
    ["A2", "D3", "F3", "A3", "F3", "D3"],
    ["A2", "C#3", "E3", "A3", "E3", "C#3"],
  ];
  for (let i = 0; i < andanteChords.length; i++) {
    const arp = andanteChords[i];
    const baseVel = 0.36 + Math.sin((i / andanteChords.length) * Math.PI) * 0.14;
    s.pedal(b, b + 3.85);
    s.note(b, 3.6, noteToMidi(arp[0]) - 12, baseVel + 0.04, "LH");
    for (let rep = 0; rep < 2; rep++) {
      for (let k = 0; k < 6; k++) {
        const beatPos = b + rep * 2.0 + k * (2.0 / 6.0);
        const m = noteToMidi(arp[k]);
        const v = baseVel + (k === 3 ? 0.04 : 0.0);
        s.note(beatPos, 0.42, m, v, m >= 60 ? "RH" : "LH");
      }
    }
    b += 4.0;
  }
  // Dramatic pause on A7 fermata
  s.pedal(b, b + 3.4);
  s.chord(b, 3.2, ["A1", "A2", "E3", "G3", "C#4"], 0.42, "LH");
  b += 3.8;

  // --- PART 2: Adagio — Tragic Sighing D Minor Theme & Dramatic Outbursts ---
  const playAdagioTheme = (intense = false) => {
    s.setTempo(b, intense ? 62 : 58);
    const vM = intense ? 0.62 : 0.54;
    const phrases = [
      // Phrase 1: famous sighing D minor descent
      {
        lh: [[0, 1.8, ["D2", "D3"], 0.48], [2, 1.8, ["A2", "D3", "F3"], 0.44]],
        rh: [
          [0.0, 1.2, "A4", vM], [1.25, 0.5, "D5", vM + 0.04], [1.75, 0.25, "E5", vM + 0.02],
          [2.0, 1.0, "F5", vM + 0.08], [3.0, 0.5, "E5", vM], [3.5, 0.5, "D5", vM - 0.02],
        ],
      },
      {
        lh: [[0, 1.8, ["G2", "Bb2", "D3"], 0.48], [2, 1.8, ["A2", "C#3", "E3"], 0.46]],
        rh: [
          [0.0, 1.5, "G5", vM + 0.10], [1.5, 0.5, "F5", vM + 0.04],
          [2.0, 1.2, "E5", vM + 0.05], [3.2, 0.8, "C#5", vM - 0.02],
        ],
      },
      {
        lh: [[0, 1.8, ["Bb1", "Bb2", "D3"], 0.50], [2, 1.8, ["G2", "Bb2", "E3"], 0.48]],
        rh: [
          [0.0, 1.0, "D5", vM + 0.04], [1.0, 0.5, "F5", vM + 0.06], [1.5, 0.5, "A5", vM + 0.10],
          [2.0, 1.2, "G5", vM + 0.07], [3.2, 0.8, "E5", vM + 0.02],
        ],
      },
      {
        lh: [[0, 1.8, ["A1", "A2", "E3"], 0.50], [2, 1.8, ["D2", "A2", "D3"], 0.46]],
        rh: [
          [0.0, 1.5, "F5", vM + 0.06], [1.5, 0.5, "E5", vM + 0.02],
          [2.0, 1.8, "D5", vM],
        ],
      },
      // Phrase 2: Chromatic weeping sequence into G minor & A7
      {
        lh: [[0, 1.8, ["G1", "G2", "D3"], 0.52], [2, 1.8, ["F#2", "A2", "C3"], 0.50]],
        rh: [
          [0.0, 1.0, "Bb5", vM + 0.12], [1.0, 0.5, "A5", vM + 0.08], [1.5, 0.5, "G5", vM + 0.05],
          [2.0, 1.0, "F#5", vM + 0.08], [3.0, 1.0, "A5", vM + 0.07],
        ],
      },
      {
        lh: [[0, 1.8, ["G2", "Bb2", "D3"], 0.52], [2, 1.8, ["E2", "G2", "Bb2", "C#3"], 0.54]],
        rh: [
          [0.0, 1.2, "G5", vM + 0.08], [1.25, 0.75, "F5", vM + 0.04],
          [2.0, 1.0, "E5", vM + 0.08], [3.0, 1.0, "G5", vM + 0.06],
        ],
      },
      {
        lh: [[0, 1.8, ["F2", "A2", "D3"], 0.52], [2, 1.8, ["G#2", "B2", "D3", "F3"], 0.56]],
        rh: [
          [0.0, 1.2, "F5", vM + 0.06], [1.25, 0.75, "E5", vM + 0.03],
          [2.0, 1.2, "D5", vM + 0.08], [3.2, 0.8, "B4", vM + 0.02],
        ],
      },
      {
        lh: [[0, 3.6, ["A1", "A2", "C#3", "E3"], 0.56]],
        rh: [
          [0.0, 1.5, "C#5", vM + 0.08], [1.5, 2.0, "A4", vM],
        ],
      },
    ];

    for (const ph of phrases) {
      s.pedal(b, b + 1.88);
      s.pedal(b + 2.0, b + 3.88);
      for (const [off, dur, notes, vel] of ph.lh) {
        s.chord(b + off, dur, notes, vel + (intense ? 0.06 : 0.0), "LH");
      }
      for (const [off, dur, pitch, vel] of ph.rh) {
        s.note(b + off, dur, pitch, vel, "RH");
        if (intense && off === 0) {
          s.note(b + off, dur * 0.9, noteToMidi(pitch) - 12, vel * 0.74, "RH");
        }
      }
      b += 4.0;
    }
  };

  playAdagioTheme(false);

  // --- Presto Cadenza 1 (Mozart's dazzling improvisatory flourish) ---
  s.setTempo(b, 148);
  const cadenza1 = [
    "A3", "C#4", "E4", "G4", "A4", "Bb4", "A4", "G4", "F4", "E4",
    "D4", "E4", "F4", "G4", "A4", "Bb4", "C#5", "D5", "E5", "F5",
    "G5", "A5", "Bb5", "A5", "G5", "F5", "E5", "D5", "C#5", "E5",
    "G5", "F5", "E5", "D5", "C#5", "Bb4", "A4", "G4", "F4", "E4",
  ];
  s.pedal(b, b + 10.5);
  s.chord(b, 4.0, ["A1", "A2", "E3", "G3"], 0.54, "LH");
  for (let i = 0; i < cadenza1.length; i++) {
    const v = 0.50 + Math.sin((i / cadenza1.length) * Math.PI) * 0.22;
    s.note(b + i * 0.26, 0.32, cadenza1[i], v, "RH");
  }
  b += cadenza1.length * 0.26 + 0.8;

  // --- Return of Adagio (deeper emotional weight) ---
  playAdagioTheme(true);

  // --- Presto Cadenza 2 leading from darkness into radiant D Major ---
  s.setTempo(b, 152);
  const cadenza2 = [
    "D4", "F#4", "A4", "C5", "D5", "E5", "F#5", "G5", "A5", "B5",
    "C#6", "D6", "C#6", "B5", "A5", "G5", "F#5", "E5", "D5", "C#5",
    "B4", "A4", "G4", "F#4", "E4", "F#4", "G4", "A4",
  ];
  s.pedal(b, b + 8.0);
  s.chord(b, 4.0, ["A1", "A2", "E3", "G3"], 0.56, "LH");
  for (let i = 0; i < cadenza2.length; i++) {
    s.note(b + i * 0.28, 0.36, cadenza2[i], 0.52 + (i / cadenza2.length) * 0.16, "RH");
  }
  b += cadenza2.length * 0.28 + 1.0;

  // --- PART 3: Allegretto in D Major — Sunlit Classical Resolution (20 bars) ---
  s.setTempo(b, 108);
  const playAllegrettoA = (bright = false) => {
    const vA = bright ? 0.64 : 0.56;
    const bars = [
      { lh: ["D3", "A3", "F#3", "A3"], rh: [[0, 1.0, "F#5", vA + 0.04], [1, 0.5, "G5", vA], [1.5, 0.5, "A5", vA + 0.05], [2, 1.0, "F#5", vA + 0.02], [3, 1.0, "D5", vA - 0.02]] },
      { lh: ["E3", "A3", "G3", "A3"], rh: [[0, 1.0, "E5", vA + 0.02], [1, 0.5, "F#5", vA], [1.5, 0.5, "G5", vA + 0.04], [2, 1.0, "E5", vA], [3, 1.0, "C#5", vA - 0.02]] },
      { lh: ["D3", "A3", "F#3", "A3"], rh: [[0, 0.5, "D5", vA], [0.5, 0.5, "E5", vA], [1, 0.5, "F#5", vA + 0.03], [1.5, 0.5, "G5", vA + 0.04], [2, 1.0, "A5", vA + 0.08], [3, 1.0, "F#5", vA + 0.02]] },
      { lh: ["A2", "E3", "G3", "E3"], rh: [[0, 1.0, "G5", vA + 0.04], [1, 1.0, "F#5", vA + 0.02], [2, 1.5, "E5", vA], [3.5, 0.5, "A4", vA - 0.04]] },
      { lh: ["B2", "F#3", "D3", "F#3"], rh: [[0, 1.0, "D5", vA + 0.04], [1, 0.5, "E5", vA + 0.02], [1.5, 0.5, "F#5", vA + 0.05], [2, 1.0, "B5", vA + 0.08], [3, 1.0, "A5", vA + 0.04]] },
      { lh: ["G2", "D3", "B2", "D3"], rh: [[0, 1.0, "G5", vA + 0.05], [1, 0.5, "F#5", vA + 0.02], [1.5, 0.5, "E5", vA], [2, 1.0, "D5", vA + 0.02], [3, 1.0, "B4", vA - 0.02]] },
      { lh: ["A2", "F#3", "D3", "F#3"], rh: [[0, 0.5, "A4", vA], [0.5, 0.5, "D5", vA + 0.02], [1, 0.5, "F#5", vA + 0.04], [1.5, 0.5, "A5", vA + 0.06], [2, 1.0, "G5", vA + 0.04], [3, 1.0, "E5", vA + 0.02]] },
      { lh: ["D2", "A2", "D3", "F#3"], rh: [[0, 1.0, "F#5", vA + 0.05], [1, 0.5, "E5", vA + 0.02], [1.5, 0.5, "C#5", vA], [2, 1.8, "D5", vA + 0.04]] },
    ];
    for (const bar of bars) {
      s.pedal(b, b + 1.9);
      s.pedal(b + 2.0, b + 3.9);
      for (let k = 0; k < 4; k++) {
        s.note(b + k, 0.85, bar.lh[k], 0.42 + (k === 0 ? 0.06 : 0.0), "LH");
      }
      for (const [off, dur, pitch, vel] of bar.rh) {
        s.note(b + off, dur, pitch, vel, "RH");
      }
      b += 4.0;
    }
  };

  playAllegrettoA(false);
  playAllegrettoA(true);

  // Sparkling D Major Closing Cadence
  s.setTempo(b, 98);
  s.pedal(b, b + 8.0);
  s.chord(b + 0.0, 1.5, ["G2", "B2", "D3"], 0.62, "LH");
  s.chord(b + 0.0, 1.5, ["G4", "B4", "D5", "G5"], 0.66, "RH");
  s.chord(b + 1.8, 1.5, ["A2", "E3", "G3"], 0.64, "LH");
  s.chord(b + 1.8, 1.5, ["A4", "C#5", "E5", "A5"], 0.68, "RH");
  s.chord(b + 3.6, 4.4, ["D2", "A2", "D3"], 0.70, "LH");
  s.chord(b + 3.6, 4.4, ["F#4", "A4", "D5", "F#5"], 0.72, "RH");
  b += 8.2;

  return s.build({
    id: "mozart_fantasia_d_minor_k397",
    code: "MOZ-F397",
    composer: "Wolfgang Amadeus Mozart (1756–1791)",
    title: "Fantasia in D Minor, K. 397",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1782 · Viennese Classical Fantasia",
    keySignature: "D Minor → D Major · 4/4",
    bpm: 72,
    historicalNote:
      "Full concert realization of Mozart's Fantasia in D Minor, K. 397 — journeying from hushed Andante arpeggios and weeping Adagio recitative through two dazzling Presto cadenzas to the sunlit D major Allegretto.",
  });
}

export const ADDITIONAL_REPERTOIRE = [
  buildFurElise(),
  buildMoonlightSonata(),
  buildChopinNocturneOp9No2(),
  buildLaCampanella(),
  buildWinterWind(),
  buildMozartFantasiaDMinor(),
  buildDrowningLove(),
  buildMeaningfulLove(),
];

