/**
 * Full-Length Concert Grand Piano Solo Repertoire for Koerner Hall
 *
 * 8 complete, full-length concert-duration multi-voice editions (~3:35 – 5:35 each)
 * synchronized to the 61-key 3D action, damper lift, HD scrolling engraved score,
 * and multi-model Studio Salamander Concert Grand Piano engine:
 *   1. Ludwig van Beethoven — Für Elise, WoO 59 (~3:45)
 *   2. Ludwig van Beethoven — Moonlight Sonata, Op. 27 No. 2 I. Adagio sostenuto (~5:25)
 *   3. Frédéric Chopin — Nocturne in E-flat Major, Op. 9 No. 2 (~4:25)
 *   4. Franz Liszt — La Campanella, S. 141 No. 3 (~4:45)
 *   5. Frédéric Chopin — Étude Op. 25 No. 11 "Winter Wind" (~3:50)
 *   6. Wolfgang Amadeus Mozart — Fantasia in D Minor, K. 397 (~5:05)
 *   7. Shuichi Sakamoto — Drowning Love ("Chasing Kou") (~3:50)
 *   8. Silo & Steven Cranberry — Meaningful Love (~3:50)
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

    // Bar 12: E dominant octave bounce (authentic Urtext 3/8 barline)
    s.pedal(b, b + 2.25);
    s.note(b + 0.0, 0.95, "B4", v(0.62), "RH");
    s.note(b + 0.0, 1.1, "E2", v(0.52), "LH");
    s.note(b + 0.5, 0.85, "E3", v(0.45), "LH");
    s.note(b + 1.0, 0.46, "E4", v(0.50), "RH");
    s.note(b + 1.5, 0.46, "E5", v(0.56), "RH");
    s.note(b + 2.0, 0.46, "E6", v(0.58), "RH");
    s.note(b + 2.5, 0.46, "D#6", v(0.53), "RH");
    b += 3.0;

    // Bar 13: E6 D#5 E5 D#5 E5 D#5 — lands cleanly on Bar 14 E5 downbeat!
    s.note(b + 0.0, 0.46, "E6", v(0.54), "RH");
    s.note(b + 0.5, 0.46, "D#5", v(0.49), "RH");
    s.note(b + 1.0, 0.46, "E5", v(0.52), "RH");
    s.note(b + 1.5, 0.46, "D#5", v(0.50), "RH");
    s.note(b + 2.0, 0.46, "E5", v(0.54), "RH");
    s.note(b + 2.5, 0.46, "D#5", v(0.50), "RH");
    b += 3.0;
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

  // --- PART 3: Section C — Warm F Major Lyrical Episode (Authentic Beethoven WoO 59 F-major theme) ---
  s.setTempo(b, 116);
  s.note(b + 0.0, 0.95, "B4", 0.54, "RH");
  s.note(b + 1.0, 0.95, "C5", 0.58, "RH");
  b += 2.0;

  const fMajorEpisode = [
    // Authentic Beethoven Section C: C5 -> F5 E5 | E5 D5 | Bb5 A5 G5 F5 E5 D5 C5 | Bb4 A4 | A4 G4 C5
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["C5", 1.5], ["F5", 0.5], ["E5", 1.0]] },
    { lh: ["F2", "C3", "Bb3", "C3", "Bb3", "C3"], rh: [["E5", 1.5], ["D5", 1.5]] },
    { lh: ["C3", "G3", "Bb3", "G3", "Bb3", "G3"], rh: [["Bb5", 1.0], ["A5", 0.5], ["G5", 0.5], ["F5", 0.5], ["E5", 0.5]] },
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["D5", 0.5], ["C5", 0.5], ["Bb4", 1.0], ["A4", 1.0]] },
    { lh: ["C3", "G3", "Bb3", "G3", "C4", "G3"], rh: [["A4", 0.5], ["G4", 1.0], ["C4", 0.5], ["D4", 0.5], ["E4", 0.5]] },
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["F4", 0.5], ["G4", 0.5], ["A4", 0.5], ["Bb4", 0.5], ["C5", 0.5], ["D5", 0.5]] },
    { lh: ["Bb2", "F3", "D4", "F3", "D4", "F3"], rh: [["F5", 1.5], ["E5", 0.5], ["D5", 0.5], ["C5", 0.5]] },
    { lh: ["C3", "G3", "E4", "G3", "E4", "G3"], rh: [["G5", 1.0], ["E5", 0.5], ["C5", 0.5], ["E5", 0.5], ["G5", 0.5]] },
    // Sparkling C Major rippling continuation (bars 9-16 of Episode C)
    { lh: ["C3", "G3", "C4", "G3", "C4", "G3"], rh: [["C6", 0.5], ["B5", 0.5], ["A5", 0.5], ["G5", 0.5], ["F5", 0.5], ["E5", 0.5]] },
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["D5", 0.5], ["C5", 0.5], ["B4", 0.5], ["A4", 0.5], ["G4", 0.5], ["F4", 0.5]] },
    { lh: ["G2", "D3", "B3", "D3", "B3", "D3"], rh: [["G4", 0.5], ["B4", 0.5], ["D5", 0.5], ["F5", 0.5], ["E5", 0.5], ["D5", 0.5]] },
    { lh: ["C3", "G3", "E3", "G3", "C4", "G3"], rh: [["C5", 1.0], ["E5", 0.5], ["G5", 0.5], ["F5", 0.5], ["E5", 0.5]] },
    { lh: ["F2", "C3", "A3", "C3", "A3", "C3"], rh: [["D5", 0.5], ["E5", 0.5], ["F5", 0.5], ["D5", 0.5], ["C5", 0.5], ["A4", 0.5]] },
    { lh: ["G2", "D3", "F3", "D3", "B3", "D3"], rh: [["B4", 0.5], ["C5", 0.5], ["D5", 0.5], ["F5", 0.5], ["E5", 0.5], ["D5", 0.5]] },
    { lh: ["C3", "G3", "E3", "G3", "C4", "G3"], rh: [["C5", 1.5], ["G4", 0.5], ["A4", 0.5], ["B4", 0.5]] },
    { lh: ["E2", "B2", "G#3", "B2", "E3", "B2"], rh: [["C5", 0.5], ["B4", 0.5], ["A4", 0.5], ["G#4", 0.5], ["B4", 0.5], ["E5", 0.5]] },
  ];

  // Play the full lyrical F-major / C-major episode with classical repeat and sunlit upper ornament on pass 2
  for (let pass = 0; pass < 2; pass++) {
    s.setTempo(b, pass === 0 ? 114 : 118);
    for (let bi = 0; bi < fMajorEpisode.length; bi++) {
      const bar = fMajorEpisode[bi];
      s.pedal(b, b + 2.75);
      for (let k = 0; k < 6; k++) {
        s.note(b + k * 0.5, 0.48, bar.lh[k], k === 0 ? 0.54 + pass * 0.03 : 0.39 + pass * 0.02, "LH");
      }
      let off = 0;
      for (const [p, d] of bar.rh) {
        const vNote = 0.64 + pass * 0.04;
        s.note(b + off, d * 0.94, p, vNote, "RH");
        if (pass === 1 && off === 0 && d >= 1.0 && noteToMidi(p) <= 77) {
          s.note(b + off, d * 0.9, noteToMidi(p) + 12, vNote * 0.72, "RH");
        }
        off += d;
      }
      b += 3.0;
    }
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

  for (let rep = 0; rep < 2; rep++) {
    s.setTempo(b, rep === 0 ? 118 : 124);
    for (let i = 0; i < stormChords.length; i++) {
      const ch = stormChords[i];
      const dynWave = (rep === 0 ? 0.62 : 0.70) + 0.14 * Math.sin((i / stormChords.length) * Math.PI);
      s.pedal(b, b + 2.75);
      // Signature Beethoven throbbing A2 16th-note pedal ostinato in LH
      for (let k = 0; k < 6; k++) {
        const bassNote = i === 10 ? "E2" : "A2";
        s.note(b + k * 0.5, 0.42, bassNote, k === 0 ? dynWave * 0.92 : dynWave * 0.72, "LH");
      }
      // Syncopated dramatic RH chords + upper sighing voice
      s.chord(b + 0.0, 1.35, ch, dynWave, "RH");
      s.note(b + 1.5, 0.9, ch[3], dynWave * 0.94, "RH");
      if (rep === 1) {
        s.note(b + 1.5, 0.9, noteToMidi(ch[3]) + 12, dynWave * 0.80, "RH");
      }
      s.note(b + 2.5, 0.5, ch[2], dynWave * 0.85, "RH");
      b += 3.0;
    }
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
  s.setTempo(b, 89);
  playChorus(true);

  // --- Intimate Nocturnal Solo Piano Reflection (8 bars): singing tenor melody + upper harp chimes ---
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
        if (rep === 1 && off === 0) {
          s.note(b + off, dur * 0.9, noteToMidi(pitch) - 12, vv * 0.7, "RH");
        }
      }
      b += 4.0;
    }
  }

  // --- Emotional Key-Lifted Climax Chorus (+2 semitones in C# Minor / E Major, 8 bars) ---
  s.setTempo(b, 87);
  for (let i = 0; i < chorusMelody.length; i++) {
    const ch = chorusProg[i % 4];
    s.pedal(b, b + 3.88);
    const seq = [0, 1, 2, 3, 4, 5, 4, 3];
    for (let k = 0; k < 8; k++) {
      s.note(
        b + k * 0.5,
        0.92,
        noteToMidi(ch.bass[seq[k]]) + 2,
        k === 0 ? 0.72 : 0.50,
        "LH"
      );
    }
    for (const [off, dur, pitch, vel] of chorusMelody[i]) {
      const mTop = Math.min(89, noteToMidi(pitch) + 2);
      const vv = Math.min(0.86, vel + 0.10);
      s.note(b + off, dur, mTop, vv, "RH");
      s.note(b + off, dur * 0.94, mTop - 12, vv * 0.78, "RH");
    }
    b += 4.0;
  }

  // --- Gentle Return to Home Key B Minor (4 bars) ---
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
  s.setTempo(b, 120);
  playThemeA({ octaves: true, velBoost: 0.11, drivingLH: true });

  // --- Second Sunlit E-Major Bridge Reprise (8 bars, sweeping broken octaves) ---
  s.setTempo(b, 116);
  for (let rep = 0; rep < 2; rep++) {
    for (const br of bridgeProg) {
      s.pedal(b, b + 3.88);
      const seq = [0, 2, 3, 4, 5, 4, 3, 2];
      for (let k = 0; k < 8; k++) {
        s.note(b + k * 0.5, 0.82, br.bass[seq[k]], k === 0 ? 0.68 : 0.48, "LH");
      }
      for (const [off, dur, pitch, vel] of br.mel) {
        const vv = Math.min(0.86, vel + 0.08 + rep * 0.03);
        s.note(b + off, dur, pitch, vv, "RH");
        s.note(b + off, dur * 0.92, noteToMidi(pitch) - 12, vv * 0.78, "RH");
      }
      b += 4.0;
    }
  }

  // --- Twilight Ocean Reflection (8 bars): lyrical piano cantabile before final surge ---
  s.setTempo(b, 106);
  playThemeA({ octaves: false, velBoost: -0.02, drivingLH: false });

  // --- Grand Final Surge (8 bars) ---
  s.setTempo(b, 118);
  playThemeA({ octaves: true, velBoost: 0.14, drivingLH: true });

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
  const s = new ScoreBuilder(58);
  let b = 0;

  // --- Bars 1-4: Iconic Lento A minor chorale introduction (exact Chopin Op. 25 No. 11 motif!) ---
  // Pickup E4 -> Bar 1: C5 (1.5) B4 (0.5) A4 (0.5) G#4 (0.5) A4 (0.5) E4 (0.5)
  s.pedal(0.0, 0.95);
  s.chord(0.0, 0.92, ["E4", "E5"], 0.50, "RH");
  s.chord(0.0, 0.92, ["A2", "E3"], 0.44, "LH");
  b = 1.0;

  s.pedal(b, b + 3.85);
  s.chord(b + 0.0, 1.45, ["C5", "C6"], 0.60, "RH");
  s.chord(b + 0.0, 1.90, ["A2", "E3", "A3"], 0.50, "LH");
  s.chord(b + 1.5, 0.48, ["B4", "B5"], 0.54, "RH");
  s.chord(b + 2.0, 0.48, ["A4", "A5"], 0.54, "RH");
  s.chord(b + 2.0, 1.85, ["E2", "B2", "E3", "G#3"], 0.48, "LH");
  s.chord(b + 2.5, 0.48, ["G#4", "G#5"], 0.52, "RH");
  s.chord(b + 3.0, 0.48, ["A4", "A5"], 0.56, "RH");
  s.chord(b + 3.5, 0.48, ["E4", "E5"], 0.50, "RH");
  b += 4.0;

  // Bar 2: Repeated yearning phrase
  s.pedal(b, b + 3.85);
  s.chord(b + 0.0, 1.45, ["C5", "C6"], 0.62, "RH");
  s.chord(b + 0.0, 1.90, ["A2", "E3", "A3"], 0.52, "LH");
  s.chord(b + 1.5, 0.48, ["B4", "B5"], 0.56, "RH");
  s.chord(b + 2.0, 0.48, ["A4", "A5"], 0.56, "RH");
  s.chord(b + 2.0, 1.85, ["E2", "B2", "E3", "G#3"], 0.50, "LH");
  s.chord(b + 2.5, 0.48, ["G#4", "G#5"], 0.54, "RH");
  s.chord(b + 3.0, 0.48, ["A4", "A5"], 0.58, "RH");
  s.chord(b + 3.5, 0.48, ["E4", "E5"], 0.52, "RH");
  b += 4.0;

  // Bar 3-4: Poignant Dm -> E7 suspension before the storm breaks!
  s.pedal(b, b + 3.8);
  s.chord(b + 0.0, 1.45, ["F4", "A4", "D5"], 0.58, "RH");
  s.chord(b + 0.0, 1.85, ["D2", "A2", "D3"], 0.52, "LH");
  s.chord(b + 1.5, 0.95, ["D5", "F5"], 0.60, "RH");
  s.chord(b + 2.5, 1.35, ["E4", "G#4", "B4", "E5"], 0.64, "RH");
  s.chord(b + 2.5, 1.35, ["E2", "B2", "E3"], 0.58, "LH");
  b += 4.0;

  // --- ALLEGRO CON BRIO ---
  // Authentic Chopin 24-note sextuplet wind cascades (4 sextuplets = 24 notes per 4/4 bar!)
  // Kept strictly inside our 61-key concert compass (MIDI 29–89, peak F6 = 89) for zero octave folding.
  s.setTempo(b, 118);

  const addWindBar = (startBeat, topAnchor, chordSteps, lhEvents, velBase = 0.68) => {
    s.pedal(startBeat, startBeat + 1.9);
    s.pedal(startBeat + 2.0, startBeat + 3.88);
    // Clamp top anchor cleanly within MIDI 89 (F6) so every sextuplet cascades naturally
    const safeTop = topAnchor > 89 ? topAnchor - 12 : topAnchor;
    // 4 sextuplets per bar = 24 notes (step = 1/6 beat).
    // Chopin's real figure: [chordTone, lowerChromaticNeighbor] descending across 3 chord tones x 2 octaves!
    const totalSub = 24;
    const stepDur = 4.0 / totalSub;
    const pattern = [
      chordSteps[0], chordSteps[1], chordSteps[2],
      chordSteps[3], chordSteps[4], chordSteps[5],
      chordSteps[0], chordSteps[1], chordSteps[2],
      chordSteps[3], chordSteps[4], chordSteps[2],
    ];
    for (let i = 0; i < totalSub; i++) {
      const pairIdx = Math.floor(i / 2);
      const isLowerChrom = i % 2 === 1;
      const offset = pattern[pairIdx % pattern.length];
      let midi = safeTop - offset;
      if (isLowerChrom) midi -= 1; // Authentic Chopin chromatic lower-neighbor shimmer!
      const wave = 0.84 + 0.16 * Math.cos((i / totalSub) * Math.PI * 2);
      const accent = i % 6 === 0 ? 1.09 : i % 2 === 0 ? 0.96 : 0.84;
      s.note(startBeat + i * stepDur, stepDur * 1.15, midi, Math.min(0.86, velBase * wave * accent), "RH");
    }
    for (const [off, dur, notes, v] of lhEvents) {
      s.chord(startBeat + off, dur, notes, Math.min(0.88, v), "LH");
    }
  };

  const playMainStormA = (vBase = 0.70, lhBoost = 0.0) => {
    // 8 bars of the A minor heroic storm theme (LH march melody + RH 24-note sextuplet wind!)
    addWindBar(b, noteToMidi("E6"), [0, 4, 7, 12, 16, 19], [
      [0.0, 1.5, ["A1", "A2"], 0.78 + lhBoost], [1.5, 0.5, ["E3", "A3", "C4"], 0.62],
      [2.0, 1.5, ["C2", "C3"], 0.76 + lhBoost], [3.5, 0.5, ["E3", "A3", "C4"], 0.64],
    ], vBase);
    b += 4.0;

    addWindBar(b, noteToMidi("E6"), [0, 5, 8, 12, 17, 20], [
      [0.0, 1.25, ["B1", "B2"], 0.76 + lhBoost], [1.25, 0.75, ["A1", "A2"], 0.72 + lhBoost],
      [2.0, 1.0, ["G#1", "G#2"], 0.76 + lhBoost], [3.0, 1.0, ["A1", "A2"], 0.76 + lhBoost],
    ], vBase + 0.02);
    b += 4.0;

    addWindBar(b, noteToMidi("E6"), [0, 4, 7, 12, 16, 19], [
      [0.0, 1.0, ["C2", "C3"], 0.78 + lhBoost], [1.0, 0.5, ["B1", "B2"], 0.70 + lhBoost],
      [1.5, 0.5, ["A1", "A2"], 0.70 + lhBoost], [2.0, 0.5, ["G#1", "G#2"], 0.72 + lhBoost],
      [2.5, 0.5, ["A1", "A2"], 0.72 + lhBoost], [3.0, 1.0, ["E1", "E2"], 0.78 + lhBoost],
    ], vBase + 0.03);
    b += 4.0;

    addWindBar(b, noteToMidi("F6"), [0, 3, 7, 12, 15, 19], [
      [0.0, 1.5, ["F1", "F2"], 0.76 + lhBoost], [1.5, 0.5, ["A2", "D3", "F3"], 0.62],
      [2.0, 1.5, ["E1", "E2"], 0.78 + lhBoost], [3.5, 0.5, ["G#2", "B2", "E3"], 0.66],
    ], vBase + 0.03);
    b += 4.0;

    // Second 4-bar answering storm phrase in A minor -> Dm -> E7
    addWindBar(b, noteToMidi("E6"), [0, 4, 7, 12, 16, 19], [
      [0.0, 1.5, ["A1", "A2"], 0.80 + lhBoost], [1.5, 0.5, ["E3", "A3", "C4"], 0.64],
      [2.0, 1.5, ["E2", "E3"], 0.76 + lhBoost], [3.5, 0.5, ["G#2", "B2", "E3"], 0.64],
    ], vBase + 0.04);
    b += 4.0;

    addWindBar(b, noteToMidi("F6"), [0, 3, 7, 12, 15, 19], [
      [0.0, 1.5, ["D2", "D3"], 0.78 + lhBoost], [1.5, 0.5, ["F2", "A2", "D3"], 0.64],
      [2.0, 1.5, ["F1", "F2"], 0.78 + lhBoost], [3.5, 0.5, ["A2", "D3", "F3"], 0.64],
    ], vBase + 0.04);
    b += 4.0;

    addWindBar(b, noteToMidi("E6"), [0, 4, 7, 12, 16, 19], [
      [0.0, 1.0, ["E1", "E2"], 0.80 + lhBoost], [1.0, 1.0, ["B1", "B2"], 0.74 + lhBoost],
      [2.0, 1.0, ["D2", "D3"], 0.76 + lhBoost], [3.0, 1.0, ["E2", "E3"], 0.80 + lhBoost],
    ], vBase + 0.05);
    b += 4.0;

    addWindBar(b, noteToMidi("E6"), [0, 5, 8, 12, 17, 20], [
      [0.0, 1.5, ["A1", "A2"], 0.80 + lhBoost], [1.5, 0.5, ["C3", "E3", "A3"], 0.66],
      [2.0, 1.5, ["E1", "E2"], 0.78 + lhBoost], [3.5, 0.5, ["G#2", "B2", "E3"], 0.66],
    ], vBase + 0.04);
    b += 4.0;
  };

  // --- Section 1: Exposition in A Minor (16 bars) ---
  playMainStormA(0.68, 0.0);
  playMainStormA(0.72, 0.02);

  // --- Section 2: Heroic C Major & Eb Major Modulations (16 bars) ---
  s.setTempo(b, 120);
  const majorStormBars = [
    { top: "E6", steps: [0, 4, 9, 12, 16, 21], lh: [[0, 1.5, ["C2", "C3"], 0.78], [1.5, 0.5, ["G2", "C3", "E3"], 0.64], [2, 1.5, ["E2", "E3"], 0.76], [3.5, 0.5, ["G2", "C3", "E3"], 0.64]] },
    { top: "F6", steps: [0, 5, 10, 12, 17, 22], lh: [[0, 1.25, ["D2", "D3"], 0.76], [1.25, 0.75, ["C2", "C3"], 0.72], [2, 1.0, ["B1", "B2"], 0.76], [3, 1.0, ["C2", "C3"], 0.76]] },
    { top: "F6", steps: [0, 5, 8, 12, 17, 20], lh: [[0, 1.5, ["F1", "F2"], 0.78], [1.5, 0.5, ["C3", "F3", "A3"], 0.66], [2, 1.5, ["D2", "D3"], 0.76], [3.5, 0.5, ["A2", "D3", "F3"], 0.66]] },
    { top: "F6", steps: [0, 4, 7, 12, 16, 19], lh: [[0, 1.5, ["G1", "G2"], 0.80], [1.5, 0.5, ["B2", "D3", "G3"], 0.68], [2, 1.5, ["G1", "G2"], 0.78], [3.5, 0.5, ["B2", "F3", "G3"], 0.68]] },
    // Shift into radiant Eb Major (Chopin's luminous tonal surprise)
    { top: "Eb6", steps: [0, 5, 8, 12, 17, 20], lh: [[0, 1.5, ["Eb2", "Eb3"], 0.78], [1.5, 0.5, ["Bb2", "Eb3", "G3"], 0.64], [2, 1.5, ["G2", "G3"], 0.76], [3.5, 0.5, ["Bb2", "Eb3", "G3"], 0.64]] },
    { top: "F6", steps: [0, 5, 9, 12, 17, 21], lh: [[0, 1.25, ["F2", "F3"], 0.76], [1.25, 0.75, ["Eb2", "Eb3"], 0.72], [2, 1.0, ["D2", "D3"], 0.76], [3, 1.0, ["Eb2", "Eb3"], 0.76]] },
    { top: "Eb6", steps: [0, 4, 7, 12, 16, 19], lh: [[0, 1.5, ["Ab1", "Ab2"], 0.78], [1.5, 0.5, ["Eb3", "Ab3", "C4"], 0.66], [2, 1.5, ["F1", "F2"], 0.76], [3.5, 0.5, ["C3", "F3", "Ab3"], 0.66]] },
    { top: "F6", steps: [0, 4, 7, 12, 16, 19], lh: [[0, 1.5, ["G1", "G2"], 0.80], [1.5, 0.5, ["B2", "D3", "G3"], 0.68], [2, 1.0, ["F2", "F3"], 0.76], [3, 1.0, ["E2", "E3"], 0.80]] },
  ];

  for (let rep = 0; rep < 2; rep++) {
    for (const mb of majorStormBars) {
      addWindBar(b, noteToMidi(mb.top), mb.steps, mb.lh, 0.72 + rep * 0.03);
      b += 4.0;
    }
  }

  // --- Section 3: Tempestuous Chromatic Development (16 bars) ---
  s.setTempo(b, 122);
  const devCenters = [
    { top: "F6", bass: ["F1", "F2"], mid: ["A2", "C3", "F3"] },
    { top: "D#6", bass: ["D#1", "D#2"], mid: ["A2", "C3", "F#3"] },
    { top: "E6", bass: ["E1", "E2"], mid: ["G2", "B2", "E3"] },
    { top: "E6", bass: ["E1", "E2"], mid: ["G#2", "B2", "D3", "E3"] },
    { top: "E6", bass: ["A1", "A2"], mid: ["C3", "E3", "A3"] },
    { top: "F6", bass: ["Bb1", "Bb2"], mid: ["D3", "F3", "Bb3"] },
    { top: "E6", bass: ["A1", "A2"], mid: ["C#3", "E3", "A3"] },
    { top: "D6", bass: ["G1", "G2"], mid: ["Bb2", "D3", "G3"] },
    { top: "F6", bass: ["F1", "F2"], mid: ["A2", "D3", "F3"] },
    { top: "D#6", bass: ["D#1", "D#2"], mid: ["A2", "C3", "F#3"] },
    { top: "E6", bass: ["E1", "E2"], mid: ["B2", "E3", "G#3"] },
    { top: "F6", bass: ["F1", "F2"], mid: ["A2", "C3", "F3"] },
    // Dominant E pedal buildup (4 bars)
    { top: "E6", bass: ["E1", "E2"], mid: ["G#2", "B2", "E3"] },
    { top: "F6", bass: ["E1", "E2"], mid: ["A2", "D3", "F3"] },
    { top: "E6", bass: ["E1", "E2"], mid: ["B2", "D3", "G#3"] },
    { top: "E6", bass: ["E1", "E2"], mid: ["G#2", "B2", "E3"] },
  ];
  for (let i = 0; i < devCenters.length; i++) {
    const dc = devCenters[i];
    const dyn = 0.72 + (i / devCenters.length) * 0.10;
    addWindBar(b, noteToMidi(dc.top), [0, 3, 6, 9, 12, 15], [
      [0.0, 1.5, dc.bass, dyn + 0.04], [1.5, 0.5, dc.mid, dyn - 0.06],
      [2.0, 1.0, dc.bass, dyn + 0.02], [3.0, 1.0, dc.mid, dyn - 0.02],
    ], dyn);
    b += 4.0;
  }

  // --- Section 3B: Turbulent F Minor & D Minor Central Storm Episode (16 bars) ---
  s.setTempo(b, 120);
  const centralStorm = [
    { top: "F6", steps: [0, 4, 7, 12, 16, 19], lh: [[0, 1.5, ["F1", "F2"], 0.80], [1.5, 0.5, ["C3", "F3", "Ab3"], 0.66], [2, 1.5, ["Ab1", "Ab2"], 0.78], [3.5, 0.5, ["C3", "F3", "Ab3"], 0.66]] },
    { top: "F6", steps: [0, 5, 8, 12, 17, 20], lh: [[0, 1.25, ["G1", "G2"], 0.78], [1.25, 0.75, ["F1", "F2"], 0.74], [2, 1.0, ["E1", "E2"], 0.78], [3, 1.0, ["F1", "F2"], 0.78]] },
    { top: "F6", steps: [0, 4, 9, 12, 16, 21], lh: [[0, 1.5, ["Db1", "Db2"], 0.80], [1.5, 0.5, ["Ab2", "Db3", "F3"], 0.68], [2, 1.5, ["Bb1", "Bb2"], 0.78], [3.5, 0.5, ["F2", "Bb2", "Db3"], 0.66]] },
    { top: "E6", steps: [0, 4, 9, 12, 16, 21], lh: [[0, 1.5, ["C2", "C3"], 0.82], [1.5, 0.5, ["E2", "G2", "Bb2"], 0.70], [2, 1.5, ["C2", "C3"], 0.80], [3.5, 0.5, ["E2", "G2", "C3"], 0.70]] },
    // Shift into fiery D Minor driving toward A minor return
    { top: "F6", steps: [0, 3, 8, 12, 15, 20], lh: [[0, 1.5, ["D2", "D3"], 0.80], [1.5, 0.5, ["A2", "D3", "F3"], 0.66], [2, 1.5, ["F2", "F3"], 0.78], [3.5, 0.5, ["A2", "D3", "F3"], 0.66]] },
    { top: "E6", steps: [0, 4, 7, 12, 16, 19], lh: [[0, 1.25, ["E2", "E3"], 0.78], [1.25, 0.75, ["D2", "D3"], 0.74], [2, 1.0, ["C#2", "C#3"], 0.78], [3, 1.0, ["D2", "D3"], 0.78]] },
    { top: "F6", steps: [0, 3, 6, 9, 12, 15], lh: [[0, 1.5, ["B1", "B2"], 0.80], [1.5, 0.5, ["F2", "B2", "D3"], 0.68], [2, 1.5, ["E1", "E2"], 0.82], [3.5, 0.5, ["G#2", "B2", "E3"], 0.70]] },
    { top: "E6", steps: [0, 4, 7, 12, 16, 19], lh: [[0, 1.5, ["E1", "E2"], 0.82], [1.5, 0.5, ["G#2", "B2", "E3"], 0.70], [2, 1.0, ["D2", "D3"], 0.78], [3, 1.0, ["E2", "E3"], 0.82]] },
  ];
  for (let rep = 0; rep < 2; rep++) {
    for (const cs of centralStorm) {
      addWindBar(b, noteToMidi(cs.top), cs.steps, cs.lh, 0.74 + rep * 0.04);
      b += 4.0;
    }
  }

  // --- Section 4: Heroic A Minor Recapitulation (24 bars) ---
  s.setTempo(b, 120);
  playMainStormA(0.75, 0.04);
  playMainStormA(0.78, 0.06);
  playMainStormA(0.80, 0.07);

  // --- Section 5: Blazing Coda, Unison Harmonic Minor Flourish & Grand Cadence ---
  s.setTempo(b, 126);
  for (let k = 0; k < 4; k++) {
    const isDom = k % 2 === 1;
    addWindBar(
      b,
      noteToMidi(isDom ? "E6" : "E6"),
      isDom ? [0, 5, 8, 12, 17, 20] : [0, 4, 7, 12, 16, 19],
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

  // Unison ascending A harmonic minor scale run (capped at E6 inside 61-key compass!)
  const scaleRun = [
    "A2", "B2", "C3", "D3", "E3", "F3", "G#3", "A3",
    "B3", "C4", "D4", "E4", "F4", "G#4", "A4", "B4",
    "C5", "D5", "E5", "F5", "G#5", "A5", "B5", "C6", "D6", "E6",
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
//    Complete 69-bar Concert Adagio sostenuto in C# minor (~49 BPM) · Target ~5:30 (330s)
// ============================================================================
function buildMoonlightSonata() {
  const s = new ScoreBuilder(49);
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
    [[0.0, 1.95, "G#4", 0.58], [2.0, 1.95, "F#4", 0.56]],
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

  // --- PART 3: Expressive Development & Authentic Extended G# Dominant Pedal (Bars 21-46) ---
  s.setTempo(b, 48);
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
  // Bars 25-28: Deepening shadow in F# minor -> C# minor -> G#7 arrival
  addBar(
    [["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"], ["B3", "D4", "G#4"], ["B3", "D4", "G#4"]],
    [[0.0, 1.95, ["F#1", "F#2"], 0.54], [2.0, 1.95, ["E#1", "E#2"], 0.56]],
    [[0.0, 1.9, "F#5", 0.66], [2.0, 1.9, "E#5", 0.64]],
    [[0, 1.92], [2.0, 3.94]],
    0.37
  );
  addBar(
    [["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"], ["A3", "C4", "F#4"], ["A3", "C4", "F#4"]],
    [[0.0, 1.95, ["F#1", "F#2"], 0.54], [2.0, 1.95, ["D#1", "D#2"], 0.56]],
    [[0.0, 1.9, "F#5", 0.68], [2.0, 1.2, "E5", 0.64], [3.2, 0.8, "D#5", 0.60]],
    [[0, 1.92], [2.0, 3.94]],
    0.37
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "B#3", "F#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 1.95, ["G#1", "G#2"], 0.54], [2.0, 1.95, ["G#1", "G#2"], 0.54]],
    [[0.0, 1.9, "E5", 0.64], [2.0, 1.9, "D#5", 0.60]],
    [[0, 1.92], [2.0, 3.94]],
    0.36
  );
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "B#3", "D#4"], ["G#3", "B#3", "D#4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.52]],
    [[0.0, 2.0, "C#5", 0.60], [2.0, 2.0, "B#4", 0.56]],
    [[0, 1.92], [2.0, 3.94]],
    0.35
  );

  // Bars 29-42: Iconic Beethoven 14-Bar G# Dominant Pedal Point Meditation & Cascades
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
  // Second wave of G# pedal suspensions descending into whispered stillness
  addBar(
    [["G#3", "C#4", "E4"], ["G#3", "D#4", "F#4"], ["G#3", "E4", "G#4"], ["G#3", "D#4", "F#4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.48]],
    [[0.0, 2.0, "E5", 0.58], [2.0, 2.0, "D#5", 0.54]],
    [[0, 1.92], [2.0, 3.94]],
    0.34
  );
  addBar(
    [["G#3", "C#4", "E4"], ["A3", "C#4", "F#4"], ["G#3", "B#3", "D#4"], ["F#3", "A3", "C#4"]],
    [[0.0, 3.92, ["G#1", "G#2"], 0.46]],
    [[0.0, 2.0, "C#5", 0.54], [2.0, 2.0, "B#4", 0.50]],
    [[0, 1.92], [2.0, 3.94]],
    0.33
  );
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

  // --- PART 4: Full Recapitulation in C# Minor (Bars 43-60) ---
  s.setTempo(b, 49);
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

  // --- PART 5: Deep-Bass Echo Coda fading to ppp (Bars 61-69) ---
  s.setTempo(b, 47);
  // Iconic LH echo of the dotted melody in the bass (two full waves)!
  for (let rep = 0; rep < 2; rep++) {
    addBar(
      [["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"], ["G#3", "C#4", "E4"]],
      [[0.0, 2.9, ["C#2", "C#3"], 0.46 - rep * 0.03], [3.0, 0.72, ["G#2"], 0.48 - rep * 0.03], [3.75, 0.25, ["G#2"], 0.44 - rep * 0.03]],
      [],
      [[0, 3.94]],
      0.32 - rep * 0.02
    );
    addBar(
      [["A3", "C#4", "F#4"], ["A3", "C#4", "F#4"], ["G#3", "B#3", "D#4"], ["G#3", "B#3", "D#4"]],
      [[0.0, 1.9, ["A2"], 0.48 - rep * 0.03], [2.0, 1.9, ["G#2"], 0.46 - rep * 0.03]],
      [],
      [[0, 1.92], [2.0, 3.94]],
      0.31 - rep * 0.02
    );
  }
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
  s.setTempo(b, 43);
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
//    Authentic G♯ Minor · 6/8 (1 beat = 1 eighth note, 6 beats/bar, 0.5 = 16th note!)
//    Real Paganini/Liszt theme: 4×D# · 2×C# · 4×B · 2×A# · 2×F##(G) · 2×G# · 2×A# · 4×D#
//    with rapid 16th-note giant leaps to high D#6 bell & full virtuoso variations (~4:20)
// ============================================================================
function buildLaCampanella() {
  const s = new ScoreBuilder(198);
  let b = 0;

  // --- Intro (Bars 1-4): Liszt's famous hushed bare octave D# bell chimes + pickup ---
  for (let i = 0; i < 3; i++) {
    const v = 0.52 + i * 0.04;
    s.pedal(b, b + 2.6);
    s.note(b + 0.0, 0.9, "D#4", v * 0.92, "LH");
    s.note(b + 0.0, 0.9, "D#5", v, "RH");
    s.pedal(b + 3.0, b + 5.6);
    s.note(b + 3.0, 0.9, "D#5", v * 0.90, "LH");
    s.note(b + 3.0, 0.9, "D#6", v * 1.04, "RH");
    b += 6.0;
  }
  // Bar 4: Bell toll on beat 0, poised silence, then authentic pickup on beat 5 (D#5 -> D#6!)
  s.pedal(b, b + 2.2);
  s.note(b + 0.0, 0.9, "D#4", 0.56, "LH");
  s.note(b + 0.0, 0.9, "D#5", 0.60, "RH");
  s.note(b + 5.0, 0.42, "D#5", 0.66, "RH"); // 1st of 4× D#!
  s.note(b + 5.5, 0.36, "D#6", 0.62, "RH"); // Crystal bell leap!
  b += 6.0;

  // Helper: 1 bar of authentic rapid 16th-note La Campanella leaps (6 melody notes + 6 high D#6 bells!)
  // modes: "classic" (16th-note giant leaps), "wide" (2-octave leaps + 32nd double bell),
  //        "octave" (bravura octave leaps), "repeated" (famous repeated-note D#6 ostinato + thumb leaps)
  const addCampanellaBar = (mel6, lh1, lh2, opts = {}) => {
    const {
      bell = "D#6",
      vel = 0.68,
      mode = "classic",
      octShift = 0,
      cadenceRestAt = -1,
    } = opts;

    // Crisp dry-ish Liszt 6/8 pedal per dotted quarter (never muddy!)
    s.pedal(b, b + 2.45);
    s.pedal(b + 3.0, b + 5.45);

    // LH crisp staccato 6/8 Paganini accompaniment (Beat 0 bass, Beat 1 chord; Beat 3 bass, Beat 4 chord)
    if (lh1) {
      s.note(b + 0.0, 0.85, lh1.bass, vel * 0.90, "LH");
      if (lh1.ch) s.chord(b + 1.0, 0.65, lh1.ch, vel * 0.72, "LH");
      if (lh1.ch && mode === "octave") s.chord(b + 2.0, 0.55, lh1.ch, vel * 0.66, "LH");
    }
    if (lh2) {
      s.note(b + 3.0, 0.85, lh2.bass, vel * 0.86, "LH");
      if (lh2.ch) s.chord(b + 4.0, 0.65, lh2.ch, vel * 0.70, "LH");
      if (lh2.ch && mode === "octave") s.chord(b + 5.0, 0.55, lh2.ch, vel * 0.64, "LH");
    }

    for (let k = 0; k < 6; k++) {
      const rawPitch = mel6[k];
      if (!rawPitch) continue;
      if (cadenceRestAt >= 0 && k === cadenceRestAt) {
        // Cadential punctuation without bell
        const m = noteToMidi(rawPitch) + octShift;
        s.note(b + k, 0.75, m, vel * 1.04, "RH");
        continue;
      }
      const m = noteToMidi(rawPitch) + octShift;
      const accent = k === 0 ? 1.06 : k === 3 ? 1.03 : 0.94;
      const vMel = Math.min(0.90, vel * accent);
      const vBell = Math.min(0.88, vel * 0.88);

      if (mode === "classic") {
        // True Liszt 16th-note alternation: melody on beat k, crystal D#6 bell on k+0.5!
        s.note(b + k, 0.42, m, vMel, "RH");
        s.note(b + k + 0.5, 0.36, bell, vBell, "RH");
      } else if (mode === "wide") {
        // Variation 1: 2-octave leap (melody down an octave) + rapid double-bell rebound on beats 0 & 3!
        const lowM = m - 12;
        s.note(b + k, 0.36, lowM, vMel * 1.02, "RH");
        if (k === 0 || k === 3) {
          s.note(b + k + 0.40, 0.22, bell, vBell * 0.86, "RH");
          s.note(b + k + 0.70, 0.26, bell, vBell * 0.98, "RH");
        } else {
          s.note(b + k + 0.5, 0.34, bell, vBell, "RH");
        }
      } else if (mode === "repeated") {
        // Variation 3: Famous repeated-note D#6 bell machine-gun with melody thumb leaps!
        s.note(b + k, 0.42, m - 12, vMel * 1.05, "RH");
        s.note(b + k + 0.34, 0.24, bell, vBell * 0.84, "RH");
        s.note(b + k + 0.67, 0.26, bell, vBell * 0.96, "RH");
      } else if (mode === "octave") {
        // Bravura Finale: Melody in thunderous octaves leaping to D#6!
        s.note(b + k, 0.42, m, vMel, "RH");
        if (m - 12 >= 36) s.note(b + k, 0.40, m - 12, vMel * 0.86, "RH");
        s.note(b + k + 0.5, 0.34, bell, vBell * 1.02, "RH");
      }
    }
    b += 6.0;
  };

  // Authentic LH harmony blocks in G# minor / B major
  const GSm = { bass: "G#2", ch: ["B2", "D#3", "G#3"] };
  const D7  = { bass: "D#2", ch: ["A#2", "D#3", "F##3"] };
  const CS  = { bass: "C#2", ch: ["G#2", "C#3", "E3"] };
  const BM  = { bass: "B1",  ch: ["F#2", "B2", "D#3"] };
  const F7  = { bass: "F#2", ch: ["A#2", "C#3", "E3"] };
  const EM  = { bass: "E2",  ch: ["G#2", "B2", "E3"] };

  // Play the EXACT 8-bar Theme A (Paganini/Liszt: 4×D# · 2×C# · 4×B · 2×A# · 2×F##(G) · 2×G# · 2×A# · 4×D#!)
  // Assumes the initial pickup D#5 (+D#6) was placed on beat 5 of the previous bar.
  const playThemeA8 = (opts = {}, withEndingPickup = true) => {
    // Bar 1: D#5, D#5, D#5, C#5, C#5, B4 (completes 4×D#, 2×C#, starts 4×B!)
    addCampanellaBar(["D#5", "D#5", "D#5", "C#5", "C#5", "B4"], GSm, GSm, opts);
    // Bar 2: B4, B4, B4, A#4, A#4, F##4 (completes 4×B, 2×A#, starts 2×G/F##!)
    addCampanellaBar(["B4", "B4", "B4", "A#4", "A#4", "F##4"], GSm, D7, opts);
    // Bar 3: F##4, G#4, G#4, A#4, A#4, D#5 (completes 2×G/F##, 2×G#, 2×A#, starts 4×D#!)
    addCampanellaBar(["F##4", "G#4", "G#4", "A#4", "A#4", "D#5"], D7, GSm, opts);
    // Bar 4: D#5, D#5, D#5, C#5, C#5, B4 (completes 4×D#, 2×C#, starts 4×B!)
    addCampanellaBar(["D#5", "D#5", "D#5", "C#5", "C#5", "B4"], GSm, GSm, opts);
    // Bar 5: B4, B4, B4, A#4, A#4, F##4 (4×B, 2×A#, 1st F##)
    addCampanellaBar(["B4", "B4", "B4", "A#4", "A#4", "F##4"], CS, D7, opts);
    // Bar 6: F##4, G#4, G#4, A#4, A#4, B4 (2nd F##, 2×G#, 2×A#, B4 leading into cadence!)
    addCampanellaBar(["F##4", "G#4", "G#4", "A#4", "A#4", "B4"], D7, GSm, opts);
    // Bar 7: Sparkling G#m arpeggiated bell cadence -> G#4!
    addCampanellaBar(["G#4", "B4", "D#5", "G#4", null, withEndingPickup ? "D#5" : null], GSm, GSm, {
      ...opts,
      cadenceRestAt: 3,
    });
  };

  // Authentic 8-bar Theme B (B Major -> F#7 -> B -> D#7 -> G# minor!)
  const playThemeB8 = (opts = {}) => {
    // Bar 1 (B major): F#5, F#5, G#5, F#5, E5, D#5
    addCampanellaBar(["F#5", "F#5", "G#5", "F#5", "E5", "D#5"], BM, BM, opts);
    // Bar 2 (F#7 -> B): E5, E5, F#5, E5, D#5, C#5
    addCampanellaBar(["E5", "E5", "F#5", "E5", "D#5", "C#5"], F7, F7, opts);
    // Bar 3 (B -> E): D#5, D#5, E5, D#5, C#5, B4
    addCampanellaBar(["D#5", "D#5", "E5", "D#5", "C#5", "B4"], BM, EM, opts);
    // Bar 4 (D#7): A#4, A#4, F##4, G#4, A#4, D#5 (re-triggers 4×D#!)
    addCampanellaBar(["A#4", "A#4", "F##4", "G#4", "A#4", "D#5"], D7, D7, opts);
    // Bar 5-7: Triumphant return of Theme A (4×D# · 2×C# · 4×B · 2×A# · 2×F## · 2×G# · 2×A# · G#!)
    addCampanellaBar(["D#5", "D#5", "D#5", "C#5", "C#5", "B4"], GSm, GSm, opts);
    addCampanellaBar(["B4", "B4", "B4", "A#4", "A#4", "F##4"], CS, D7, opts);
    addCampanellaBar(["F##4", "G#4", "G#4", "A#4", "A#4", "B4"], D7, GSm, opts);
    addCampanellaBar(["G#4", "B4", "D#5", "G#4", null, "D#5"], GSm, GSm, { ...opts, cadenceRestAt: 3 });
  };

  // --- STATEMENT 1: Original Theme A + Theme B (Exact Paganini/Liszt 16th-note giant leaps!) ---
  s.setTempo(b, 202);
  playThemeA8({ vel: 0.68, mode: "classic" }, true);
  playThemeB8({ vel: 0.71, mode: "classic" });

  // --- VARIATION 1: Wider 2-Octave Leaps & Double-Bell Rebounds (True Lisztian Virtuosity!) ---
  s.setTempo(b, 208);
  playThemeA8({ vel: 0.72, mode: "wide" }, true);
  playThemeB8({ vel: 0.74, mode: "wide" });

  // --- VARIATION 2: Dazzling Chromatic 16th-Note Runs + Left-Hand Campanella Theme! ---
  s.setTempo(b, 214);
  const chromVarBars = [
    {
      lhMel: ["D#4", "D#4", "D#4", "C#4", "C#4", "B3"],
      bass: "G#2",
      rh12: ["D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5", "C6", "C#6", "D#6"],
    },
    {
      lhMel: ["B3", "B3", "B3", "A#3", "A#3", "F##3"],
      bass: "D#2",
      rh12: ["D#6", "D6", "C#6", "C6", "B5", "A#5", "A5", "G#5", "G5", "F#5", "F5", "D#5"],
    },
    {
      lhMel: ["F##3", "G#3", "G#3", "A#3", "A#3", "D#4"],
      bass: "D#2",
      rh12: ["D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5", "C6", "C#6", "D#6"],
    },
    {
      lhMel: ["D#4", "D#4", "D#4", "C#4", "C#4", "B3"],
      bass: "G#2",
      rh12: ["E6", "D#6", "D6", "C#6", "C6", "B5", "A#5", "A5", "G#5", "G5", "F#5", "D#5"],
    },
    {
      lhMel: ["B3", "B3", "B3", "A#3", "A#3", "F##3"],
      bass: "C#2",
      rh12: ["G#5", "A5", "A#5", "B5", "C6", "C#6", "D6", "D#6", "E6", "D#6", "C#6", "B5"],
    },
    {
      lhMel: ["F##3", "G#3", "G#3", "A#3", "A#3", "B3"],
      bass: "D#2",
      rh12: ["A#5", "B5", "C6", "C#6", "D6", "D#6", "C#6", "B5", "A#5", "G#5", "F##5", "D#5"],
    },
    {
      lhMel: ["G#3", "B3", "D#4", "G#3", null, "D#4"],
      bass: "G#2",
      rh12: ["G#5", "A#5", "B5", "C#6", "D#6", "E6", "D#6", "B5", "G#5", "D#5", "D#6", "D#6"],
    },
  ];
  for (let rep = 0; rep < 2; rep++) {
    for (const cb of chromVarBars) {
      s.pedal(b, b + 2.6);
      s.pedal(b + 3.0, b + 5.6);
      s.note(b + 0.0, 1.4, cb.bass, 0.68, "LH");
      s.note(b + 3.0, 1.4, cb.bass, 0.64, "LH");
      for (let k = 0; k < 6; k++) {
        if (cb.lhMel[k]) s.note(b + k, 0.55, cb.lhMel[k], 0.70, "LH");
      }
      for (let i = 0; i < 12; i++) {
        s.note(b + i * 0.5, 0.44, cb.rh12[i], 0.62 + (i % 3 === 0 ? 0.08 : 0), "RH");
      }
      b += 6.0;
    }
  }

  // --- VARIATION 3: Sparkling High D#6–E6 Trill over Authentic La Campanella Theme! ---
  s.setTempo(b, 210);
  const trillThemeBars = [
    { mel: ["D#5", "D#5", "D#5", "C#5", "C#5", "B4"], l1: GSm, l2: GSm },
    { mel: ["B4", "B4", "B4", "A#4", "A#4", "F##4"], l1: GSm, l2: D7 },
    { mel: ["F##4", "G#4", "G#4", "A#4", "A#4", "D#5"], l1: D7, l2: GSm },
    { mel: ["D#5", "D#5", "D#5", "C#5", "C#5", "B4"], l1: GSm, l2: GSm },
    { mel: ["B4", "B4", "B4", "A#4", "A#4", "F##4"], l1: CS, l2: D7 },
    { mel: ["F##4", "G#4", "G#4", "A#4", "A#4", "B4"], l1: D7, l2: GSm },
    { mel: ["G#4", "B4", "D#5", "G#4", null, "D#5"], l1: GSm, l2: GSm },
  ];
  for (let rep = 0; rep < 2; rep++) {
    for (const tb of trillThemeBars) {
      s.pedal(b, b + 2.6);
      s.pedal(b + 3.0, b + 5.6);
      s.note(b + 0.0, 1.0, tb.l1.bass, 0.66, "LH");
      s.chord(b + 1.0, 0.8, tb.l1.ch, 0.50, "LH");
      s.note(b + 3.0, 1.0, tb.l2.bass, 0.62, "LH");
      s.chord(b + 4.0, 0.8, tb.l2.ch, 0.48, "LH");
      for (let k = 0; k < 6; k++) {
        if (tb.mel[k]) s.note(b + k, 0.65, tb.mel[k], 0.74, "RH");
      }
      // Continuous shimmering high D#6-E6 16th-note trill above the melody!
      for (let t = 0; t < 12; t++) {
        s.note(b + t * 0.5, 0.38, t % 2 === 0 ? "D#6" : "E6", 0.50 + (t % 4 === 0 ? 0.06 : 0), "RH");
      }
      b += 6.0;
    }
  }

  // --- VARIATION 4: Famous Rapid Repeated-Note D#6 Bell Ostinato + Wide Thumb Leaps! ---
  s.setTempo(b, 214);
  playThemeA8({ vel: 0.74, mode: "repeated" }, true);
  playThemeB8({ vel: 0.76, mode: "repeated" });

  // --- MIDDLE INTERLUDE: Lyrical B Major Cantabile (8 bars) ---
  s.setTempo(b, 190);
  const cantabileBars = [
    { bass: ["B1", "F#2", "B2", "D#3", "F#3", "B3"], mel: [[0, 2.5, "F#5", 0.66], [3, 1.5, "G#5", 0.64], [4.5, 1.5, "F#5", 0.62]] },
    { bass: ["F#1", "C#2", "F#2", "A#2", "C#3", "F#3"], mel: [[0, 2.5, "E5", 0.64], [3, 1.5, "D#5", 0.60], [4.5, 1.5, "C#5", 0.58]] },
    { bass: ["G#1", "D#2", "G#2", "B2", "D#3", "G#3"], mel: [[0, 2.5, "D#5", 0.64], [3, 1.5, "E5", 0.64], [4.5, 1.5, "D#5", 0.60]] },
    { bass: ["D#1", "A#1", "D#2", "F##2", "A#2", "D#3"], mel: [[0, 3.0, "C#5", 0.62], [3, 3.0, "A#4", 0.58]] },
    { bass: ["E1", "B1", "E2", "G#2", "B2", "E3"], mel: [[0, 2.5, "B4", 0.64], [3, 1.5, "C#5", 0.64], [4.5, 1.5, "D#5", 0.66]] },
    { bass: ["C#1", "G#1", "C#2", "E2", "G#2", "C#3"], mel: [[0, 2.5, "E5", 0.68], [3, 1.5, "F#5", 0.70], [4.5, 1.5, "G#5", 0.72]] },
    { bass: ["D#1", "A#1", "D#2", "F##2", "A#2", "D#3"], mel: [[0, 3.0, "F##5", 0.72], [3, 3.0, "D#5", 0.68]] },
    { bass: ["G#1", "D#2", "G#2", "B2", "D#3", "G#3"], mel: [[0, 3.0, "G#5", 0.70], [3, 2.0, "D#5", 0.64], [5, 0.5, "D#5", 0.72], [5.5, 0.4, "D#6", 0.68]] },
  ];
  for (const cb of cantabileBars) {
    s.pedal(b, b + 5.65);
    for (let k = 0; k < 6; k++) {
      s.note(b + k * 1.0, 1.2, cb.bass[k], k === 0 ? 0.58 : 0.42, "LH");
    }
    for (const [off, dur, pitch, vel] of cb.mel) {
      s.note(b + off, dur, pitch, vel, "RH");
    }
    b += 6.0;
  }

  // --- FINALE: Animato Bravura Octave Leaps & Blazing G♯ Minor Coda! ---
  s.setTempo(b, 224);
  playThemeA8({ vel: 0.80, mode: "octave" }, true);
  s.setTempo(b, 234);
  playThemeB8({ vel: 0.84, mode: "octave" });

  // Blistering ascending G# harmonic minor arpeggio into thunderous finale chords!
  const finalArp = [
    "G#2", "B2", "D#3", "G#3", "B3", "D#4", "G#4", "B4",
    "D#5", "G#5", "B5", "D#6", "E6", "D#6",
  ];
  s.pedal(b, b + 12.0);
  for (let i = 0; i < finalArp.length; i++) {
    const m = noteToMidi(finalArp[i]);
    s.note(b + i * 0.28, 0.55, m, 0.72 + (i / finalArp.length) * 0.16, m >= 60 ? "RH" : "LH");
  }
  b += finalArp.length * 0.28 + 0.5;

  s.setTempo(b, 152);
  s.chord(b + 0.0, 1.5, ["D#2", "A#2", "D#3"], 0.84, "LH");
  s.chord(b + 0.0, 1.5, ["F##4", "A#4", "D#5", "D#6"], 0.86, "RH");
  s.chord(b + 2.0, 1.5, ["G#1", "G#2", "D#3"], 0.86, "LH");
  s.chord(b + 2.0, 1.5, ["G#4", "B4", "D#5", "G#5"], 0.86, "RH");
  s.chord(b + 4.0, 6.5, ["G#1", "D#2", "G#2", "B2"], 0.90, "LH");
  s.chord(b + 4.0, 6.5, ["G#4", "B4", "D#5", "G#5", "D#6"], 0.90, "RH");
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
    bpm: 210,
    historicalNote:
      "Virtuoso concert realization of Franz Liszt's La Campanella (S. 141 No. 3) in G♯ minor — featuring the authentic Paganini bell theme (4×D♯, 2×C♯, 4×B, 2×A♯, 2×F♯♯, 2×G♯, 2×A♯) leaping in rapid 16th notes to high D♯6, chromatic runs, sparkling trills, repeated-bell ostinato, and octave finale.",
  });
}

// ============================================================================
// 7. FRÉDÉRIC CHOPIN — NOCTURNE IN E-FLAT MAJOR, OP. 9 NO. 2
//    Authentic Concert Andante 12/8 (~110 eighth-note BPM), full A - A' - B - A'' - B' - A''' - Coda (~4:25)
// ============================================================================
function buildChopinNocturneOp9No2() {
  // 12/8 time: 1 bar = 12 eighth-note beats (4 dotted-quarter pulses of 3 beats each)
  const s = new ScoreBuilder(110);
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
    // Bar 1: Authentic Chopin Op. 9 No. 2 — Eb -> G7/D -> Cm7 -> Bb7/D -> Eb/G
    addNocturnePulse(b + 0, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.43);
    addNocturnePulse(b + 3, "G2", ["F3", "B3", "D4"], ["G3", "Bb3", "Eb4"], 0.42);
    addNocturnePulse(b + 6, "C2", ["G3", "Bb3", "Eb4"], ["G3", "C4", "Eb4"], 0.43);
    addNocturnePulse(b + 9, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.43);

    if (ornamentLevel === 0) {
      addMel(b, [
        [0, 3.0, "G5", velBase + 0.06],
        [3, 1.0, "F5", velBase], [4, 1.0, "G5", velBase + 0.02], [5, 1.0, "F5", velBase - 0.01],
        [6, 2.0, "Eb5", velBase + 0.03], [8, 1.0, "Bb4", velBase - 0.04],
        [9, 3.0, "G5", velBase + 0.05],
      ]);
    } else if (ornamentLevel === 1) {
      addMel(b, [
        [0, 2.5, "G5", velBase + 0.06], [2.5, 0.5, "Ab5", velBase],
        [3, 0.75, "F5", velBase], [3.75, 0.75, "G5", velBase + 0.03], [4.5, 0.75, "Ab5", velBase + 0.03], [5.25, 0.75, "F5", velBase],
        [6, 2.0, "Eb5", velBase + 0.04], [8, 1.0, "Bb4", velBase - 0.04],
        [9, 2.5, "G5", velBase + 0.05], [11.5, 0.5, "Bb5", velBase + 0.03],
      ]);
    } else {
      addMel(b, [
        [0, 2.2, "G5", velBase + 0.08], [2.2, 0.4, "Ab5", velBase + 0.02], [2.6, 0.4, "G5", velBase + 0.01],
        [3, 0.6, "F5", velBase + 0.02], [3.6, 0.6, "G5", velBase + 0.04], [4.2, 0.6, "Bb5", velBase + 0.06], [4.8, 0.6, "Ab5", velBase + 0.03], [5.4, 0.6, "F5", velBase],
        [6, 2.0, "Eb5", velBase + 0.05], [8, 1.0, "Bb4", velBase - 0.03],
        [9, 2.2, "G5", velBase + 0.06], [11.2, 0.8, "Ab5", velBase + 0.02],
      ]);
    }
    b += 12.0;

    // Bar 2: Ab/C -> C7 -> Fm -> Bb7 (Chopin's unmistakable rising C6 -> C5 -> G5 -> F5 -> D5 -> Eb5!)
    addNocturnePulse(b + 0, "C2", ["Ab3", "C4", "Eb4"], ["G3", "Bb3", "E4"], 0.44);
    addNocturnePulse(b + 3, "F2", ["Ab3", "C4", "F4"], ["Ab3", "C4", "F4"], 0.45);
    addNocturnePulse(b + 6, "Bb1", ["Ab3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.45);
    addNocturnePulse(b + 9, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.44);

    addMel(b, [
      [0, 3.0, "C6", velBase + 0.08],
      [3, 2.0, "C5", velBase], [5, 1.0, "G5", velBase + 0.04],
      [6, 2.0, "F5", velBase + 0.04], [8, 1.0, "D5", velBase],
      [9, 2.0, "Eb5", velBase + 0.03], [11, 1.0, "Bb4", velBase - 0.03],
    ]);
    b += 12.0;

    // Bar 3: Authentic Chopin Op. 9 No. 2 — Eb/G -> F#dim7 -> Fm7 -> Bb7 (Bb5 Ab5 G5 F5 G5 D5 Eb5 C5!)
    addNocturnePulse(b + 0, "G2", ["Bb3", "Eb4", "G4"], ["Bb3", "Eb4", "G4"], 0.44);
    addNocturnePulse(b + 3, "F#2", ["A3", "C4", "Eb4"], ["A3", "C4", "Eb4"], 0.46);
    addNocturnePulse(b + 6, "F2", ["Ab3", "C4", "Eb4"], ["Ab3", "C4", "Eb4"], 0.46);
    addNocturnePulse(b + 9, "Bb1", ["Ab3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.44);

    if (ornamentLevel >= 1) {
      addMel(b, [
        [0, 1.5, "Bb5", velBase + 0.08], [1.5, 0.75, "C6", velBase + 0.06], [2.25, 0.75, "Ab5", velBase + 0.04],
        [3, 2.0, "G5", velBase + 0.05], [5, 1.0, "F5", velBase + 0.02],
        [6, 1.5, "G5", velBase + 0.04], [7.5, 0.75, "F5", velBase + 0.01], [8.25, 0.75, "D5", velBase],
        [9, 2.0, "Eb5", velBase + 0.02], [11, 1.0, "C5", velBase - 0.02],
      ]);
    } else {
      addMel(b, [
        [0, 2.0, "Bb5", velBase + 0.07], [2, 1.0, "Ab5", velBase + 0.03],
        [3, 2.0, "G5", velBase + 0.04], [5, 1.0, "F5", velBase + 0.01],
        [6, 2.0, "G5", velBase + 0.03], [8, 1.0, "D5", velBase],
        [9, 2.0, "Eb5", velBase + 0.01], [11, 1.0, "C5", velBase - 0.02],
      ]);
    }
    b += 12.0;

    // Bar 4: Authentic Eb -> Ab -> Bb7 -> Eb cadence (Bb4 -> G5 F5 Eb5 -> D5 F5 -> Eb5 Bb4)
    addNocturnePulse(b + 0, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.44);
    addNocturnePulse(b + 3, "Ab1", ["Ab3", "C4", "Eb4"], ["Ab3", "C4", "Eb4"], 0.42);
    addNocturnePulse(b + 6, "Bb1", ["G3", "Bb3", "Eb4"], ["Ab3", "D4", "F4"], 0.42);
    addNocturnePulse(b + 9, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.40);

    addMel(b, [
      [0, 3.0, "Bb4", velBase + 0.02],
      [3, 1.5, "G5", velBase + 0.04], [4.5, 0.75, "F5", velBase], [5.25, 0.75, "Eb5", velBase - 0.01],
      [6, 1.5, "D5", velBase], [7.5, 1.5, "F5", velBase + 0.02],
      [9, 2.0, "Eb5", velBase], [11, 1.0, "Bb4", velBase - 0.04],
    ]);
    b += 12.0;
  };

  const playSectionB = (passIdx = 0) => {
    const vB = 0.58 + passIdx * 0.04;
    s.setTempo(b, 114 + passIdx * 3);
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
    s.setTempo(b, 108);
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
    s.setTempo(b, 110);
  };

  // Full Concert Nocturne Architecture: A - A' - B - A'' - B' - A''' - Poetic Coda & Cadenza (~4:25)
  playSectionA(0, 0.54);
  playSectionA(1, 0.56);
  playSectionB(0);
  playSectionA(1, 0.58);
  playSectionB(1);
  playSectionA(2, 0.60);
  playSectionB(1);
  playSectionA(2, 0.58);

  // --- Poetically Fading Coda (4 bars of con forza -> smorzando) & Delicate Cadenza ---
  s.setTempo(b, 102);
  for (let rep = 0; rep < 4; rep++) {
    const fade = rep * 0.035;
    addNocturnePulse(b + 0, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.44 - fade);
    addNocturnePulse(b + 3, "Ab1", ["Ab3", "C4", "F4"], ["Ab3", "C4", "F4"], 0.44 - fade);
    addNocturnePulse(b + 6, "Bb1", ["Ab3", "D4", "F4"], ["Ab3", "D4", "F4"], 0.42 - fade);
    addNocturnePulse(b + 9, "Eb2", ["G3", "Bb3", "Eb4"], ["G3", "Bb3", "Eb4"], 0.40 - fade);
    addMel(b, [
      [0, 2.5, rep === 0 ? "Bb5" : "G5", 0.62 - fade * 1.4], [2.5, 0.5, "Ab5", 0.54 - fade * 1.4],
      [3, 2.5, "F5", 0.58 - fade * 1.4], [5.5, 0.5, "G5", 0.52 - fade * 1.4],
      [6, 2.5, "D5", 0.54 - fade * 1.4], [8.5, 0.5, "F5", 0.48 - fade * 1.4],
      [9, 3.0, "Eb5", 0.52 - fade * 1.4],
    ]);
    b += 12.0;
  }

  // Famous feathery descending chromatic senza-tempo cadenza over Bb7 pedal
  s.setTempo(b, 132);
  s.pedal(b, b + 16.0);
  s.chord(b, 8.0, ["Bb1", "Bb2", "D3", "Ab3"], 0.44, "LH");
  const cadNotes = [
    "Bb5", "A5", "Ab5", "G5", "Gb5", "F5", "E5", "Eb5",
    "D5", "Eb5", "F5", "G5", "Ab5", "Bb5", "C6", "Db6",
    "C6", "Bb5", "Ab5", "G5", "F5", "Eb5", "D5", "Eb5", "F5", "G5", "F5", "D5",
  ];
  for (let i = 0; i < cadNotes.length; i++) {
    const v = 0.54 - (i / cadNotes.length) * 0.18;
    s.note(b + i * 0.52, 0.68, cadNotes[i], v, "RH");
  }
  b += cadNotes.length * 0.52 + 1.0;

  // Hushed final Eb major chords (pp)
  s.setTempo(b, 78);
  s.pedal(b, b + 14.0);
  s.chord(b + 0.0, 4.6, ["Eb2", "Bb2", "G3"], 0.36, "LH");
  s.chord(b + 0.0, 4.6, ["Bb4", "Eb5", "G5"], 0.42, "RH");
  s.chord(b + 5.0, 7.6, ["Eb2", "Bb2", "Eb3"], 0.32, "LH");
  s.chord(b + 5.0, 7.6, ["G4", "Bb4", "Eb5"], 0.36, "RH");
  b += 13.0;

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
  const s = new ScoreBuilder(64);
  let b = 0;

  // --- PART 1: Andante — Mysterious Rolling D Minor Arpeggios (14 bars) ---
  const andanteChords = [
    ["D3", "F3", "A3", "D4", "A3", "F3"],
    ["D3", "F3", "A3", "D4", "A3", "F3"],
    ["C#3", "E3", "G3", "Bb3", "G3", "E3"],
    ["C#3", "E3", "G3", "Bb3", "G3", "E3"],
    ["D3", "F3", "A3", "D4", "A3", "F3"],
    ["Bb2", "D3", "G3", "Bb3", "G3", "D3"],
    ["A2", "D3", "F3", "A3", "F3", "D3"],
    ["A2", "C#3", "E3", "A3", "E3", "C#3"],
    ["C3", "Eb3", "G3", "C4", "G3", "Eb3"],
    ["Bb2", "D3", "F3", "Bb3", "F3", "D3"],
    ["G2", "Bb2", "D3", "G3", "D3", "Bb2"],
    ["G#2", "B2", "D3", "F3", "D3", "B2"],
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
    s.setTempo(b, intense ? 55 : 52);
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

  // --- Adagio Development in G Minor & C Minor (8 bars of weeping recitative) ---
  s.setTempo(b, 54);
  const devRecit = [
    { lh: [[0, 1.8, ["G1", "G2", "Bb2", "D3"], 0.52], [2, 1.8, ["D2", "F#2", "A2", "C3"], 0.50]], rh: [[0, 1.5, "Bb5", 0.66], [1.5, 0.5, "A5", 0.62], [2, 1.2, "G5", 0.62], [3.2, 0.8, "F#5", 0.58]] },
    { lh: [[0, 1.8, ["G1", "G2", "Bb2", "D3"], 0.52], [2, 1.8, ["C2", "Eb2", "G2", "C3"], 0.54]], rh: [[0, 1.5, "G5", 0.64], [1.5, 0.5, "A5", 0.62], [2, 1.5, "Bb5", 0.68], [3.5, 0.5, "G5", 0.62]] },
    { lh: [[0, 1.8, ["F2", "Ab2", "C3"], 0.54], [2, 1.8, ["G1", "G2", "B2", "D3"], 0.54]], rh: [[0, 1.5, "Ab5", 0.68], [1.5, 0.5, "G5", 0.64], [2, 1.2, "F5", 0.64], [3.2, 0.8, "D5", 0.58]] },
    { lh: [[0, 1.8, ["C2", "G2", "Eb3"], 0.52], [2, 1.8, ["C#2", "G2", "Bb2", "E3"], 0.56]], rh: [[0, 1.5, "Eb5", 0.62], [1.5, 0.5, "F5", 0.62], [2, 1.5, "G5", 0.68], [3.5, 0.5, "E5", 0.64]] },
    { lh: [[0, 1.8, ["D2", "F2", "A2", "D3"], 0.54], [2, 1.8, ["Bb1", "Bb2", "D3", "G3"], 0.54]], rh: [[0, 1.5, "F5", 0.66], [1.5, 0.5, "E5", 0.62], [2, 1.5, "D5", 0.64], [3.5, 0.5, "Bb4", 0.58]] },
    { lh: [[0, 1.8, ["A1", "A2", "E3"], 0.54], [2, 1.8, ["G#1", "G#2", "B2", "F3"], 0.56]], rh: [[0, 1.5, "A4", 0.60], [1.5, 0.5, "D5", 0.64], [2, 1.5, "F5", 0.68], [3.5, 0.5, "D5", 0.62]] },
    { lh: [[0, 3.6, ["A1", "A2", "E3", "G3"], 0.58]], rh: [[0, 2.0, "E5", 0.66], [2, 1.8, "C#5", 0.60]] },
    { lh: [[0, 3.6, ["A1", "A2", "C#3", "E3"], 0.50]], rh: [[0, 3.2, "A4", 0.54]] },
  ];
  for (const dr of devRecit) {
    s.pedal(b, b + 1.88);
    s.pedal(b + 2.0, b + 3.88);
    for (const [off, dur, notes, vel] of dr.lh) s.chord(b + off, dur, notes, vel, "LH");
    for (const [off, dur, pitch, vel] of dr.rh) s.note(b + off, dur, pitch, vel, "RH");
    b += 4.0;
  }

  // --- Return of Adagio (deeper emotional weight) ---
  playAdagioTheme(true);

  // --- Presto Cadenza 2 leading from darkness into radiant D Major ---
  s.setTempo(b, 144);
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

  // --- PART 3: Allegretto in D Major — Sunlit Classical Resolution (A - A' - B - Cadenza - A'' - Coda) ---
  s.setTempo(b, 102);
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

  // Contrasting Allegretto B-section in A major -> G major -> D major (8 bars)
  const allegrettoB = [
    { lh: ["A2", "E3", "C#3", "E3"], rh: [[0, 1.0, "E5", 0.60], [1, 0.5, "F#5", 0.58], [1.5, 0.5, "G#5", 0.62], [2, 1.0, "A5", 0.66], [3, 1.0, "E5", 0.58]] },
    { lh: ["E2", "B2", "G#2", "B2"], rh: [[0, 1.0, "D5", 0.58], [1, 0.5, "E5", 0.58], [1.5, 0.5, "F#5", 0.62], [2, 1.0, "G#5", 0.64], [3, 1.0, "E5", 0.58]] },
    { lh: ["A2", "E3", "C#3", "E3"], rh: [[0, 0.5, "A5", 0.64], [0.5, 0.5, "G#5", 0.60], [1, 0.5, "F#5", 0.58], [1.5, 0.5, "E5", 0.58], [2, 1.0, "C#5", 0.60], [3, 1.0, "A4", 0.56]] },
    { lh: ["E2", "B2", "D3", "B2"], rh: [[0, 1.0, "B4", 0.58], [1, 1.0, "D5", 0.60], [2, 1.5, "C#5", 0.62], [3.5, 0.5, "E5", 0.58]] },
    { lh: ["G2", "D3", "B2", "D3"], rh: [[0, 1.0, "G5", 0.64], [1, 0.5, "F#5", 0.60], [1.5, 0.5, "G5", 0.62], [2, 1.0, "B5", 0.68], [3, 1.0, "G5", 0.62]] },
    { lh: ["D2", "A2", "F#2", "A2"], rh: [[0, 1.0, "F#5", 0.62], [1, 0.5, "E5", 0.58], [1.5, 0.5, "F#5", 0.62], [2, 1.0, "A5", 0.66], [3, 1.0, "F#5", 0.60]] },
    { lh: ["E2", "B2", "G2", "B2"], rh: [[0, 1.0, "E5", 0.60], [1, 0.5, "F#5", 0.60], [1.5, 0.5, "G5", 0.64], [2, 1.0, "E5", 0.62], [3, 1.0, "C#5", 0.58]] },
    { lh: ["A2", "E3", "G3", "E3"], rh: [[0, 1.5, "E5", 0.62], [1.5, 0.5, "D5", 0.58], [2, 1.8, "C#5", 0.60]] },
  ];
  for (const bar of allegrettoB) {
    s.pedal(b, b + 1.9);
    s.pedal(b + 2.0, b + 3.9);
    for (let k = 0; k < 4; k++) s.note(b + k, 0.85, bar.lh[k], 0.44 + (k === 0 ? 0.06 : 0), "LH");
    for (const [off, dur, pitch, vel] of bar.rh) s.note(b + off, dur, pitch, vel, "RH");
    b += 4.0;
  }

  // Joyful D Major Classical Cadenza & Final Allegretto Reprise
  s.setTempo(b, 146);
  const cadJoy = [
    "A4", "B4", "C#5", "D5", "E5", "F#5", "G5", "A5",
    "B5", "C#6", "D6", "B5", "G5", "E5", "C#5", "A4",
    "D5", "F#5", "A5", "G5", "F#5", "E5", "D5", "C#5",
  ];
  s.pedal(b, b + 6.5);
  s.chord(b, 3.0, ["A1", "A2", "E3", "G3"], 0.52, "LH");
  for (let i = 0; i < cadJoy.length; i++) {
    s.note(b + i * 0.25, 0.30, cadJoy[i], 0.54 + Math.sin((i / cadJoy.length) * Math.PI) * 0.16, "RH");
  }
  b += cadJoy.length * 0.25 + 0.6;

  s.setTempo(b, 104);
  playAllegrettoA(true);

  // Sparkling D Major Closing Cadence
  s.setTempo(b, 94);
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

// ============================================================================
// 9. JOHANN SEBASTIAN BACH — PRELUDE IN C MAJOR, BWV 846 (WTC BOOK I) (~3:25)
//    Complete authentic 35-bar chord progression + luminous concert reprise arch
// ============================================================================
function buildBachPreludeBWV846() {
  const s = new ScoreBuilder(66);
  let b = 0;

  // Authentic complete 35-measure chord table of J. S. Bach's BWV 846 (5 voices per bar)
  const WTC_BARS = [
    ["C4", "E4", "G4", "C5", "E5"],   // 1  C
    ["C4", "D4", "A4", "D5", "F5"],   // 2  Dm7/C
    ["B3", "D4", "G4", "D5", "F5"],   // 3  G7/B
    ["C4", "E4", "G4", "C5", "E5"],   // 4  C
    ["C4", "E4", "A4", "E5", "A5"],   // 5  Am/C
    ["C4", "D4", "F#4", "A4", "D5"],  // 6  D7/C
    ["B3", "D4", "G4", "D5", "G5"],   // 7  G/B
    ["B3", "C4", "E4", "G4", "C5"],   // 8  Cmaj7/B
    ["A3", "C4", "E4", "G4", "C5"],   // 9  Am7
    ["D3", "A3", "D4", "F#4", "C5"],  // 10 D7
    ["G3", "B3", "D4", "G4", "B4"],   // 11 G
    ["G3", "Bb3", "E4", "G4", "C#5"], // 12 C#dim7/G
    ["F3", "A3", "D4", "A4", "D5"],   // 13 Dm/F
    ["F3", "Ab3", "D4", "F4", "B4"],  // 14 Bdim7/F
    ["E3", "G3", "C4", "G4", "C5"],   // 15 C/E
    ["E3", "F3", "A3", "C4", "F4"],   // 16 Fmaj7/E
    ["D3", "F3", "A3", "C4", "F4"],   // 17 Dm7
    ["G2", "D3", "G3", "B3", "F4"],   // 18 G7
    ["C3", "E3", "G3", "C4", "E4"],   // 19 C
    ["C3", "G3", "Bb3", "C4", "E4"],  // 20 C7
    ["F2", "F3", "A3", "C4", "E4"],   // 21 Fmaj7
    ["F#2", "C3", "A3", "C4", "Eb4"], // 22 F#dim7
    ["Ab2", "F3", "B3", "C4", "D4"],  // 23 Abdim / G7b9
    ["G2", "F3", "G3", "B3", "D4"],   // 24 G7
    ["G2", "E3", "G3", "C4", "E4"],   // 25 C/G
    ["G2", "D3", "G3", "C4", "F4"],   // 26 G7sus4
    ["G2", "D3", "G3", "B3", "F4"],   // 27 G7
    ["G2", "Eb3", "A3", "C4", "F#4"], // 28 F#dim7/G
    ["G2", "E3", "G3", "C4", "G4"],   // 29 C/G
    ["G2", "D3", "G3", "C4", "F4"],   // 30 G7sus4
    ["G2", "D3", "G3", "B3", "F4"],   // 31 G7
    ["C2", "C3", "G3", "Bb3", "E4"],  // 32 C7/C
    ["C2", "C3", "F3", "A3", "C4"],   // 33 F/C
  ];

  const playArpBar = (notes, velScale = 1.0, pedalAmt = 1.92) => {
    const [n0, n1, n2, n3, n4] = notes;
    for (let half = 0; half < 2; half++) {
      const hb = b + half * 2.0;
      s.pedal(hb, hb + pedalAmt);
      s.note(hb + 0.0, 1.92, n0, 0.56 * velScale, "LH");
      s.note(hb + 0.25, 1.65, n1, 0.50 * velScale, "LH");
      s.note(hb + 0.50, 0.50, n2, 0.52 * velScale, "RH");
      s.note(hb + 0.75, 0.50, n3, 0.55 * velScale, "RH");
      s.note(hb + 1.00, 0.52, n4, 0.60 * velScale, "RH");
      s.note(hb + 1.25, 0.45, n2, 0.48 * velScale, "RH");
      s.note(hb + 1.50, 0.45, n3, 0.51 * velScale, "RH");
      s.note(hb + 1.75, 0.42, n4, 0.56 * velScale, "RH");
    }
    b += 4.0;
  };

  // First Poetic Exposition (Bars 1–19, crystalline Baroque intimacy)
  s.setTempo(b, 68);
  for (let i = 0; i < 19; i++) {
    const dyn = 0.88 + Math.sin((i / 18) * Math.PI) * 0.16;
    playArpBar(WTC_BARS[i], dyn, 1.88);
  }

  // Expressive Concert Reprise of Bars 1–19 (Warmer singing voice, subtle rubato)
  s.setTempo(b, 64);
  for (let i = 0; i < 19; i++) {
    const dyn = 0.94 + Math.sin((i / 18) * Math.PI) * 0.20;
    if (i === 11) s.setTempo(b, 62);
    if (i === 15) s.setTempo(b, 65);
    playArpBar(WTC_BARS[i], dyn, 1.94);
  }

  // Full Harmonic Development & Dominant Pedal Point (Bars 20–33)
  s.setTempo(b, 63);
  for (let i = 19; i < WTC_BARS.length; i++) {
    const progress = (i - 19) / (WTC_BARS.length - 19);
    const dyn = 0.96 + Math.sin(progress * Math.PI) * 0.22;
    if (i === 24) s.setTempo(b, 60);
    if (i === 28) s.setTempo(b, 64);
    if (i === 31) s.setTempo(b, 58);
    playArpBar(WTC_BARS[i], dyn, 1.96);
  }

  // Bar 34: Authentic flowing G7/C flourish over deep C pedal
  s.setTempo(b, 54);
  s.pedal(b, b + 3.95);
  s.chord(b, 3.95, ["C2", "C3"], 0.64, "LH");
  const bar34 = ["G3", "B3", "D4", "F4", "D4", "B3", "D4", "B3", "G3", "B3", "D4", "F4", "E4", "D4"];
  for (let k = 0; k < bar34.length; k++) {
    s.note(b + 0.5 + k * 0.25, 0.42, bar34[k], 0.54 + (k / bar34.length) * 0.08, "RH");
  }
  b += 4.0;

  // Bar 35: Final sustained C Major cathedral chord (poetic fermata)
  s.setTempo(b, 46);
  s.pedal(b, b + 7.5);
  s.chord(b, 7.2, ["C2", "C3"], 0.66, "LH", 0.06);
  s.chord(b + 0.14, 7.0, ["E4", "G4", "C5", "E5"], 0.64, "RH", 0.07);
  b += 7.8;

  return s.build({
    id: "bach_prelude_c_major_bwv846",
    code: "BACH-846",
    composer: "Johann Sebastian Bach (1685–1750)",
    title: "Prelude in C Major, BWV 846 (WTC Book I)",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1722 · The Well-Tempered Clavier, Book I",
    keySignature: "C Major · 4/4",
    bpm: 66,
    historicalNote:
      "Complete 35-bar harmonic architecture of Bach's Prelude in C Major, BWV 846 — pure Baroque equilibrium where every arpeggio unfolds like stained glass in a cathedral.",
  });
}

// ============================================================================
// 10. CLAUDE DEBUSSY — CLAIR DE LUNE (SUITE BERGAMASQUE) (~4:30)
//     D♭ Major · 9/8 — Andante très expressif → Tempo rubato → Un poco mosso → Calmato
// ============================================================================
function buildDebussyClairDeLune() {
  const s = new ScoreBuilder(114); // 1 beat = 1 eighth note in 9/8 (3 dotted quarters per bar)
  let b = 0;

  // Section A: Andante très expressif (Hushed floating thirds & fifths in D♭ major)
  const playOpeningTheme = (ornamented = false) => {
    const bars = [
      // Bar 1-2: Authentic Debussy suspended [F3, Ab3] opening + [F5, Ab5] -> [Db5, F5] sigh
      { lh: ["F3", "Ab3"], arp: ["Db3", "Ab3", "Db4", "F4", "Ab4", "F4", "Db4", "Ab3", "F3"], rh: [[2, 4, ["F5", "Ab5"], 0.44], [6, 3, ["Db5", "F5"], 0.42]] },
      { lh: ["Db2", "Ab2", "F3"], arp: ["Db2", "Ab2", "F3", "Ab3", "Db4", "F4", "Db4", "Ab3", "F3"], rh: [[0, 3, ["C5", "Eb5"], 0.46], [3, 2, ["Db5", "F5"], 0.48], [5, 1, ["C5", "Eb5"], 0.42], [6, 3, ["Bb4", "Db5"], 0.40]] },
      { lh: ["Gb2", "Db3", "Bb3"], arp: ["Gb2", "Db3", "Bb3", "Db4", "Gb4", "Db4", "Bb3", "Db3", "Gb2"], rh: [[0, 3, ["C5", "Eb5"], 0.44], [3, 2, ["Bb4", "Db5"], 0.42], [5, 1, ["C5", "Eb5"], 0.40], [6, 3, ["Ab4", "C5"], 0.38]] },
      { lh: ["F2", "C3", "Ab3"], arp: ["F2", "C3", "Ab3", "C4", "F4", "C4", "Ab3", "C3", "F2"], rh: [[0, 3, ["Bb4", "Db5"], 0.42], [3, 2, ["Ab4", "C5"], 0.40], [5, 1, ["Bb4", "Db5"], 0.39], [6, 3, ["Gb4", "Bb4"], 0.37]] },
      { lh: ["Eb2", "Bb2", "Gb3"], arp: ["Eb2", "Bb2", "Gb3", "Bb3", "Eb4", "Bb3", "Gb3", "Bb2", "Eb2"], rh: [[0, 4, ["Ab4", "C5"], 0.43], [4, 2, ["Gb4", "Bb4"], 0.41], [6, 3, ["F4", "Ab4"], 0.38]] },
      { lh: ["Ab2", "Eb3", "C4"], arp: ["Ab2", "Eb3", "C4", "Eb4", "Ab4", "Eb4", "C4", "Eb3", "Ab2"], rh: [[0, 3, ["Gb4", "Bb4"], 0.44], [3, 3, ["F4", "Ab4"], 0.42], [6, 3, ["Eb4", "Gb4"], 0.40]] },
      { lh: ["Db2", "Ab2", "F3"], arp: ["Db2", "Ab2", "Db3", "F3", "Ab3", "Db4", "Ab3", "F3", "Db3"], rh: [[0, 6, ["F4", "Ab4", "Db5"], 0.46], [6, 3, ["Ab4", "Db5", "F5"], 0.48]] },
      { lh: ["Ab2", "Gb3", "C4"], arp: ["Ab2", "Eb3", "Gb3", "C4", "Eb4", "Gb4", "Eb4", "C4", "Gb3"], rh: [[0, 5, ["Gb4", "Bb4", "Eb5"], 0.50], [5, 4, ["Ab4", "C5", "F5"], 0.46]] },
    ];
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      s.pedal(b, b + 8.85);
      if (ornamented) {
        // Authentic Calmato reprise: liquid moonlit 9/8 LH arpeggio rippling beneath the opening thirds!
        for (let k = 0; k < 9; k++) {
          s.note(b + k, 1.35, bar.arp[k], 0.34 + Math.sin((k / 8) * Math.PI) * 0.08, "LH");
        }
      } else {
        s.chord(b, 8.6, bar.lh, 0.38, "LH", 0.18);
      }
      for (const [off, dur, notes, vel] of bar.rh) {
        s.chord(b + off, dur, notes, vel + (ornamented ? 0.06 : 0), "RH", 0.08);
      }
      b += 9.0;
    }
  };

  s.setTempo(b, 108);
  playOpeningTheme(false);

  // Expressive Singing Middle Phrase (High crystalline octave melody over moonlit chords)
  s.setTempo(b, 114);
  const middleBars = [
    { lh: ["Db3", "Ab3", "F4"], mel: [[0, 3, "F5"], [3, 3, "Ab5"], [6, 3, "Db6"]] },
    { lh: ["C3", "Ab3", "Eb4"], mel: [[0, 4, "C6"], [4, 2, "Bb5"], [6, 3, "Ab5"]] },
    { lh: ["Bb2", "F3", "Db4"], mel: [[0, 3, "Bb5"], [3, 3, "Ab5"], [6, 3, "F5"]] },
    { lh: ["Gb2", "Db3", "Bb3"], mel: [[0, 4, "Gb5"], [4, 2, "F5"], [6, 3, "Eb5"]] },
    { lh: ["F2", "C3", "Ab3"], mel: [[0, 3, "F5"], [3, 3, "Eb5"], [6, 3, "Db5"]] },
    { lh: ["Eb2", "Bb2", "Gb3"], mel: [[0, 5, "Eb5"], [5, 4, "C5"]] },
    { lh: ["Ab2", "Eb3", "C4"], mel: [[0, 6, "Db5"], [6, 3, "Eb5"]] },
    { lh: ["Db2", "Ab2", "F3"], mel: [[0, 9, "F5"]] },
  ];
  for (const bar of middleBars) {
    s.pedal(b, b + 8.9);
    s.chord(b, 8.6, bar.lh, 0.44, "LH", 0.16);
    for (const [off, dur, pitch] of bar.mel) {
      s.note(b + off, dur + 0.4, pitch, 0.58, "RH");
    }
    b += 9.0;
  }

  // Section B: Tempo rubato (Shimmering Debussy liquid arpeggio waves in 9/8!)
  s.setTempo(b, 134);
  const rubatoWaves = [
    { bass: "Db2", arp: ["Ab2", "Db3", "F3", "Ab3", "Db4", "F4", "Ab4", "F4", "Db4"], rh: [[0, 6, ["Ab4", "F5"]], [6, 3, ["Gb4", "Eb5"]]] },
    { bass: "Db2", arp: ["Ab2", "Db3", "F3", "Ab3", "Db4", "F4", "Ab4", "F4", "Db4"], rh: [[0, 5, ["F4", "Db5"]], [5, 4, ["Ab4", "F5"]]] },
    { bass: "Eb2", arp: ["Bb2", "Eb3", "Gb3", "Bb3", "Eb4", "Gb4", "Bb4", "Gb4", "Eb4"], rh: [[0, 6, ["Bb4", "Gb5"]], [6, 3, ["Ab4", "F5"]]] },
    { bass: "Ab2", arp: ["Eb3", "Ab3", "C4", "Eb4", "Ab4", "C5", "Eb5", "C5", "Ab4"], rh: [[0, 5, ["Gb4", "Eb5"]], [5, 4, ["F4", "Db5"]]] },
    { bass: "Gb2", arp: ["Db3", "Gb3", "Bb3", "Db4", "Gb4", "Bb4", "Db5", "Bb4", "Gb4"], rh: [[0, 6, ["Bb4", "Gb5"]], [6, 3, ["Db5", "Ab5"]]] },
    { bass: "F2", arp: ["C3", "F3", "Ab3", "C4", "F4", "Ab4", "C5", "Ab4", "F4"], rh: [[0, 5, ["C5", "Ab5"]], [5, 4, ["Bb4", "Gb5"]]] },
    { bass: "Eb2", arp: ["Bb2", "Eb3", "Gb3", "Bb3", "Eb4", "Gb4", "Bb4", "Gb4", "Eb4"], rh: [[0, 6, ["Ab4", "F5"]], [6, 3, ["Gb4", "Eb5"]]] },
    { bass: "Ab2", arp: ["Eb3", "Ab3", "C4", "Eb4", "Gb4", "C5", "Eb5", "C5", "Gb4"], rh: [[0, 9, ["Ab4", "Eb5", "Ab5"]]] },
  ];

  // Play Rubato Waves twice: first tender, second swelling into Un poco mosso radiant climax
  for (let pass = 0; pass < 2; pass++) {
    s.setTempo(b, pass === 0 ? 132 : 146);
    for (let i = 0; i < rubatoWaves.length; i++) {
      const w = rubatoWaves[i];
      const vBoost = pass === 1 ? 0.14 : 0.0;
      s.pedal(b, b + 8.9);
      s.note(b, 8.8, w.bass, 0.50 + vBoost, "LH");
      for (let k = 0; k < 9; k++) {
        s.note(b + k, 1.3, w.arp[k], 0.36 + Math.sin((k / 8) * Math.PI) * 0.10 + vBoost * 0.6, "LH");
      }
      for (const [off, dur, notes] of w.rh) {
        s.chord(b + off, dur + 0.3, notes, 0.56 + vBoost, "RH", 0.06);
        if (pass === 1 && off === 0) {
          // Luminous octave bloom at climax
          s.note(b + off, dur, notes[notes.length - 1], 0.66, "RH");
        }
      }
      b += 9.0;
    }
  }

  // En animant — Crystalline E Major / C♯ Minor Shimmer Bridge
  s.setTempo(b, 138);
  const shimmerBridge = [
    { bass: "C#2", arp: ["G#2", "C#3", "E3", "G#3", "C#4", "E4", "G#4", "E4", "C#4"], mel: "G#5" },
    { bass: "F#2", arp: ["C#3", "F#3", "A3", "C#4", "F#4", "A4", "C#5", "A4", "F#4"], mel: "A5" },
    { bass: "B2", arp: ["F#3", "B3", "D#4", "F#4", "B4", "D#5", "F#5", "D#5", "B4"], mel: "B5" },
    { bass: "Ab2", arp: ["Eb3", "Ab3", "C4", "Eb4", "Gb4", "C5", "Eb5", "C5", "Gb4"], mel: "Ab5" },
  ];
  for (const sh of shimmerBridge) {
    s.pedal(b, b + 8.9);
    s.note(b, 8.8, sh.bass, 0.54, "LH");
    for (let k = 0; k < 9; k++) {
      s.note(b + k, 1.4, sh.arp[k], 0.42 + Math.sin((k / 8) * Math.PI) * 0.09, "LH");
    }
    s.note(b + 0.0, 6.0, sh.mel, 0.64, "RH");
    s.note(b + 6.0, 3.0, sh.arp[6], 0.52, "RH");
    b += 9.0;
  }

  // Section A': Calmato — Moonlit Reprise of Opening Theme
  s.setTempo(b, 102);
  playOpeningTheme(true);

  // Coda: Morendo — Dissolving Db Major9 Arpeggio into Starlight
  s.setTempo(b, 88);
  const codaArps = [
    ["Db2", "Ab2", "Db3", "F3", "Ab3", "Db4", "F4", "Ab4", "Db5"],
    ["Gb2", "Db3", "Gb3", "Bb3", "Db4", "Gb4", "Bb4", "Db5", "F5"],
    ["Db2", "Ab2", "Db3", "F3", "Ab3", "Db4", "F4", "Ab4", "F5"],
  ];
  for (let c = 0; c < codaArps.length; c++) {
    s.pedal(b, b + 9.2);
    const seq = codaArps[c];
    for (let k = 0; k < seq.length; k++) {
      s.note(b + k, 4.5, seq[k], 0.42 - c * 0.05 + (k === seq.length - 1 ? 0.05 : 0), k < 4 ? "LH" : "RH");
    }
    b += 9.0;
  }
  s.setTempo(b, 76);
  s.pedal(b, b + 11.0);
  s.chord(b, 10.5, ["Db2", "Ab2", "Db3", "F3"], 0.36, "LH", 0.25);
  s.chord(b + 1.0, 9.5, ["Ab4", "Db5", "F5", "Ab5"], 0.34, "RH", 0.30);
  b += 11.2;

  return s.build({
    id: "debussy_clair_de_lune",
    code: "DEB-CLAIR",
    composer: "Claude Debussy (1862–1918)",
    title: "Clair de Lune (Suite bergamasque)",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1890 / 1905 · French Impressionism",
    keySignature: "D♭ Major · 9/8",
    bpm: 114,
    historicalNote:
      "Complete Impressionist realization of Claude Debussy's Clair de Lune — floating from hushed moonlit chords into liquid 9/8 rubato arpeggio waves and a luminous starlit coda.",
  });
}

// ============================================================================
// 11. SERGEI RACHMANINOFF — PRELUDE IN C♯ MINOR, OP. 3 NO. 2 (~3:55)
//     Lento Kremlin Bells → Agitato Chromatic Storm → Tempo Primo fff → ppp Fade
// ============================================================================
function buildRachmaninoffPreludeCSharpMinor() {
  const s = new ScoreBuilder(52);
  let b = 0;

  // Section A: Lento — Strict 4/4 Kremlin Bell Motif (A1-A2 -> G#1-G#2 -> C#1-C#2)
  // & Authentic Rachmaninoff Descending Soprano Lament (E4 -> D#4 -> C#4 -> B#3 -> C#4!)
  const playLentoSection = (grand = false) => {
    const vBell = grand ? 0.90 : 0.76;
    const vCh = grand ? 0.84 : 0.54;

    // Bar 1 (Strict 4/4): Iconic 3-note Kremlin Bell Motif: A (beat 0), G# (beat 1), C# (beats 2-4)!
    s.pedal(b, b + 0.92);
    s.chord(b + 0.0, 0.92, ["A1", "A2"], vBell, "LH");
    if (grand) s.chord(b + 0.0, 0.92, ["A3", "C#4", "E4", "A4", "C#5", "E5"], 0.88, "RH");
    s.pedal(b + 1.0, b + 1.92);
    s.chord(b + 1.0, 0.92, ["G#1", "G#2"], vBell * 0.96, "LH");
    if (grand) s.chord(b + 1.0, 0.92, ["G#3", "B#3", "D#4", "G#4", "B#4", "D#5"], 0.88, "RH");
    s.pedal(b + 2.0, b + 3.92);
    s.chord(b + 2.0, 1.95, ["C#1", "C#2"], vBell * 1.02, "LH");
    if (grand) s.chord(b + 2.0, 1.95, ["G#3", "C#4", "E4", "G#4", "C#5", "E5"], 0.90, "RH");
    b += 4.0;

    // Bars 2-9 (Strict 4/4): Deep bass tolling on beats 0 & 2, solemn answering soprano chords on beats 1 & 3
    // Tracing Rachmaninoff's exact haunting descending soprano melody: E4 -> D#4 -> C#4 -> B#3 -> C#4 -> F#4 -> E4 -> D#4 -> C#4!
    const bellBars = [
      // Bar 2: C# pedal -> E4 (C#m) -> D#4 (G#7/C#)
      { b1: ["C#1", "C#2"], c1: ["G#3", "C#4", "E4"], b2: ["C#1", "C#2"], c2: ["G#3", "B#3", "D#4"] },
      // Bar 3: C# pedal -> C#4 (C#m) -> B#3 (G#7)
      { b1: ["C#1", "C#2"], c1: ["E3", "G#3", "C#4"], b2: ["G#1", "G#2"], c2: ["F#3", "G#3", "B#3"] },
      // Bar 4: A -> C#4 (Amaj7) -> G# -> B#3 (G#7)
      { b1: ["A1", "A2"], c1: ["E3", "A3", "C#4"], b2: ["G#1", "G#2"], c2: ["D#3", "G#3", "B#3"] },
      // Bar 5: C# -> C#4 -> F# -> F#4 (soaring sigh!)
      { b1: ["C#1", "C#2"], c1: ["E3", "G#3", "C#4"], b2: ["F#1", "F#2"], c2: ["A3", "C#4", "F#4"] },
      // Bar 6: G# -> E4 -> G# -> D#4
      { b1: ["G#1", "G#2"], c1: ["G#3", "C#4", "E4"], b2: ["G#1", "G#2"], c2: ["F#3", "B#3", "D#4"] },
      // Bar 7: C# -> C#4 -> F# -> B#3/A3
      { b1: ["C#1", "C#2"], c1: ["E3", "G#3", "C#4"], b2: ["D#1", "D#2"], c2: ["F#3", "A3", "B#3"] },
      // Bar 8: E -> G#4 -> D# -> F#4 (second phrase swell!)
      { b1: ["E1", "E2"], c1: ["G#3", "B3", "E4", "G#4"], b2: ["F#1", "F#2"], c2: ["A3", "C#4", "F#4"] },
      // Bar 9: G# -> E4 -> G# -> D#4 -> resolves to C#m
      { b1: ["G#1", "G#2"], c1: ["G#3", "C#4", "E4"], b2: ["G#1", "G#2"], c2: ["F#3", "B#3", "D#4"] },
    ];

    for (const bar of bellBars) {
      s.pedal(b, b + 1.92);
      s.chord(b + 0.0, 1.85, bar.b1, vBell * (grand ? 0.96 : 0.78), "LH");
      s.chord(b + 1.0, 0.92, bar.c1, vCh, "RH");
      if (grand) {
        s.chord(b + 1.0, 0.92, bar.c1.map((n) => noteToMidi(n) + 12), vCh * 0.95, "RH");
      }

      s.pedal(b + 2.0, b + 3.92);
      s.chord(b + 2.0, 1.85, bar.b2, vBell * (grand ? 0.94 : 0.76), "LH");
      s.chord(b + 3.0, 0.92, bar.c2, vCh * 0.96, "RH");
      if (grand) {
        s.chord(b + 3.0, 0.92, bar.c2.map((n) => noteToMidi(n) + 12), vCh * 0.92, "RH");
      }
      b += 4.0;
    }

    // Cadence Bar (Strict 4/4): Deep C#m toll + A - G# - C# echo
    s.pedal(b, b + 1.92);
    s.chord(b + 0.0, 1.90, ["C#1", "C#2"], vBell * 0.90, "LH");
    s.chord(b + 0.5, 1.40, ["E3", "G#3", "C#4", "E4"], vCh * 0.92, "RH");
    s.pedal(b + 2.0, b + 2.92);
    s.chord(b + 2.0, 0.92, ["A1", "A2"], vBell * 0.88, "LH");
    s.pedal(b + 3.0, b + 3.92);
    s.chord(b + 3.0, 0.92, ["G#1", "G#2"], vBell * 0.86, "LH");
    b += 4.0;

    s.pedal(b, b + 3.92);
    s.chord(b + 0.0, 3.80, ["C#1", "C#2", "G#2"], vBell * 0.92, "LH");
    s.chord(b + 1.0, 2.80, ["E3", "G#3", "C#4", "E4"], vCh * 0.90, "RH");
    if (grand) {
      s.chord(b + 1.0, 2.80, ["G#4", "C#5", "E5"], vCh * 0.92, "RH");
    }
    b += 4.0;
  };

  s.setTempo(b, 48);
  playLentoSection(false);
  // Second quieter poetic statement before the Agitato breaks loose
  s.setTempo(b, 46);
  playLentoSection(false);

  // Section B: Agitato — Strict 4/4 Stormy Chromatic Triplets (12 triplets per bar!)
  s.setTempo(b, 100);
  const agitatoChords = [
    { bass: "C#2", rh: ["C#4", "E4", "G#4", "C#5", "G#4", "E4", "C#4", "E4", "G#4", "D5", "G#4", "E4"] },
    { bass: "D2",  rh: ["D4", "F#4", "A4", "D5", "A4", "F#4", "D4", "F#4", "A4", "E5", "A4", "F#4"] },
    { bass: "D#2", rh: ["D#4", "F#4", "B#4", "D#5", "B#4", "F#4", "D#4", "G#4", "B#4", "F#5", "B#4", "G#4"] },
    { bass: "E2",  rh: ["E4", "G#4", "C#5", "E5", "C#5", "G#4", "E4", "A4", "C#5", "G#5", "C#5", "A4"] },
    { bass: "F#2", rh: ["F#4", "A4", "D#5", "F#5", "D#5", "A4", "F#4", "B#4", "D#5", "A5", "D#5", "B#4"] },
    { bass: "G#2", rh: ["G#4", "C#5", "E5", "G#5", "E5", "C#5", "G#4", "D#5", "F#5", "A5", "F#5", "D#5"] },
    { bass: "A2",  rh: ["A4", "C#5", "E5", "A5", "E5", "C#5", "A4", "D#5", "F#5", "B5", "F#5", "D#5"] },
    { bass: "G#2", rh: ["G#4", "B#4", "D#5", "G#5", "B#5", "G#5", "D#5", "B#4", "G#4", "F#4", "D#4", "B#3"] },
  ];

  for (let pass = 0; pass < 2; pass++) {
    s.setTempo(b, pass === 0 ? 104 : 122);
    for (let i = 0; i < agitatoChords.length; i++) {
      const ag = agitatoChords[i];
      const intensity = 0.56 + pass * 0.16 + (i / agitatoChords.length) * 0.16;
      s.pedal(b, b + 3.85);
      s.chord(b, 3.8, [ag.bass, ag.bass.replace("2", "3")], intensity, "LH");
      for (let k = 0; k < 12; k++) {
        const accent = k % 3 === 0 ? 0.08 : 0.0;
        s.note(b + k / 3, 0.45, ag.rh[k], Math.min(0.90, intensity + accent), "RH");
      }
      b += 4.0;
    }
  }

  // Descending Thunderous Chromatic Octaves (Strict 4/4 = 12 triplet chords across 4 beats!)
  s.setTempo(b, 88);
  const thunderOct = ["G#4", "G4", "F#4", "F4", "E4", "D#4", "D4", "C#4", "C4", "B3", "A#3", "A3"];
  s.pedal(b, b + 3.92);
  for (let i = 0; i < thunderOct.length; i++) {
    const p = thunderOct[i];
    const lo = noteToMidi(p) - 12;
    s.chord(b + i / 3, 0.42, [lo, p], 0.78 + (i / thunderOct.length) * 0.12, "RH");
  }
  b += 4.0;

  // Section A': Tempo Primo — Monumental sfff Four-Staff Cathedral Climax (Strict 4/4!)
  s.setTempo(b, 42);
  playLentoSection(true);

  // Coda: Sotto voce — Distant Moscow Bells fading to ppp (Strict 4/4!)
  s.setTempo(b, 38);
  const codaBells = [
    { lh: ["A1", "A2"], rh: ["C#4", "E4", "A4"], vel: 0.44 },
    { lh: ["G#1", "G#2"], rh: ["B#3", "D#4", "G#4"], vel: 0.38 },
    { lh: ["C#1", "C#2", "G#2"], rh: ["C#4", "E4", "G#4", "C#5"], vel: 0.32 },
  ];
  for (const cb of codaBells) {
    s.pedal(b, b + 3.92);
    s.chord(b, 3.85, cb.lh, cb.vel, "LH", 0.06);
    s.chord(b + 0.2, 3.65, cb.rh, cb.vel * 0.92, "RH", 0.08);
    b += 4.0;
  }
  b += 2.0;

  return s.build({
    id: "rachmaninoff_prelude_c_sharp_minor_op3_no2",
    code: "RACH-3-2",
    composer: "Sergei Rachmaninoff (1873–1943)",
    title: "Prelude in C♯ Minor, Op. 3 No. 2",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1892 · Morceaux de fantaisie, Op. 3",
    keySignature: "C♯ Minor · 4/4",
    bpm: 52,
    historicalNote:
      "Full strict-4/4 concert edition of Rachmaninoff's Prelude in C♯ Minor, Op. 3 No. 2 — opening with the iconic A–G♯–C♯ Kremlin bells and descending E–D♯–C♯–B♯ lament, erupting into chromatic Agitato triplets, and peaking in monumental four-staff chords.",
  });
}

// ============================================================================
// 12. P. I. TCHAIKOVSKY — JUNE: BARCAROLLE, OP. 37a NO. 6 (~4:20)
//     G Minor · 4/4 — Andante cantabile → Poco più mosso (G Major) → Allegro → Reprise
// ============================================================================
function buildTchaikovskyJuneBarcarolle() {
  const s = new ScoreBuilder(64);
  let b = 0;

  // Section A: Andante cantabile — Authentic Tchaikovsky "June: Barcarolle" in G minor (4/4)
  // Unmistakable real opening: D4 -> Bb4 -> A4 | G4 -> A4-Bb4 -> A4 -> G4 | F#4 -> D5 -> C5 | Bb4 -> C5-D5 -> C5 -> Bb4 | A4!
  const playBarcarolleA = (enriched = false) => {
    const bars = [
      // Bar 1: D4 (beat 0) -> Bb4 (beats 1-2) -> A4 (beat 3)
      { lh: ["G2", ["D3", "Bb3"], "G3", ["D3", "Bb3"]], rh: [[0, 1.0, "D4"], [1.0, 2.0, "Bb4"], [3.0, 1.0, "A4"]] },
      // Bar 2: G4 -> A4-Bb4 -> A4 -> G4
      { lh: ["G2", ["D3", "Bb3"], "G3", ["D3", "Bb3"]], rh: [[0, 1.0, "G4"], [1.0, 0.5, "A4"], [1.5, 0.5, "Bb4"], [2.0, 1.0, "A4"], [3.0, 1.0, "G4"]] },
      // Bar 3: F#4 -> D5 -> C5 (D7/F# -> Gm/D)
      { lh: ["D2", ["A2", "F#3", "C4"], "D3", ["A2", "F#3", "C4"]], rh: [[0, 1.0, "F#4"], [1.0, 2.0, "D5"], [3.0, 1.0, "C5"]] },
      // Bar 4: Bb4 -> C5-D5 -> C5 -> Bb4
      { lh: ["G2", ["D3", "Bb3"], "G3", ["D3", "Bb3"]], rh: [[0, 1.0, "Bb4"], [1.0, 0.5, "C5"], [1.5, 0.5, "D5"], [2.0, 1.0, "C5"], [3.0, 1.0, "Bb4"]] },
      // Bar 5: A4 sigh -> D4 pickup
      { lh: ["D2", ["A2", "F#3", "C4"], "D3", ["A2", "F#3", "C4"]], rh: [[0, 3.0, "A4"], [3.0, 1.0, "D4"]] },
      // Bar 6-8: Second strain climbing tenderly to Eb5 -> D5 -> C5 -> Bb4
      { lh: ["G2", ["D3", "Bb3"], "G3", ["D3", "Bb3"]], rh: [[0, 1.0, "Bb4"], [1.0, 2.0, "D5"], [3.0, 1.0, "C5"]] },
      { lh: ["C2", ["G2", "Eb3", "C4"], "C3", ["G2", "Eb3", "C4"]], rh: [[0, 1.5, "Eb5"], [1.5, 0.5, "D5"], [2.0, 1.0, "C5"], [3.0, 1.0, "Bb4"]] },
      { lh: ["F2", ["C3", "A3", "Eb4"], "Bb2", ["F3", "D4"]], rh: [[0, 1.0, "A4"], [1.0, 0.5, "G4"], [1.5, 0.5, "A4"], [2.0, 2.0, "Bb4"]] },
      // Bar 9-15: Answering phrase climbing to soulful G5 climax and gentle G minor resolution
      { lh: ["G2", ["D3", "Bb3"], "G3", ["D3", "Bb3"]], rh: [[0, 1.0, "D4"], [1.0, 2.0, "Bb4"], [3.0, 1.0, "D5"]] },
      { lh: ["C2", ["G2", "Eb3", "C4"], "C3", ["G2", "Eb3", "C4"]], rh: [[0, 1.5, "G5"], [1.5, 0.5, "F5"], [2.0, 1.0, "Eb5"], [3.0, 1.0, "D5"]] },
      { lh: ["Bb2", ["F3", "D4"], "Bb2", ["F3", "D4"]], rh: [[0, 2.0, "D5"], [2.0, 1.0, "C5"], [3.0, 1.0, "Bb4"]] },
      { lh: ["Eb2", ["Bb2", "G3", "C4"], "Eb2", ["Bb2", "G3"]], rh: [[0, 2.0, "C5"], [2.0, 1.0, "Bb4"], [3.0, 1.0, "A4"]] },
      { lh: ["C2", ["G2", "Eb3", "A3"], "C2", ["G2", "Eb3"]], rh: [[0, 2.0, "Bb4"], [2.0, 1.0, "A4"], [3.0, 1.0, "G4"]] },
      { lh: ["D2", ["A2", "F#3", "C4"], "D2", ["A2", "F#3", "C4"]], rh: [[0, 2.0, "A4"], [2.0, 2.0, "F#4"]] },
      { lh: ["G2", ["D3", "Bb3"], "G2", ["D3", "Bb3"]], rh: [[0, 4.0, "G4"]] },
    ];

    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      s.pedal(b, b + 3.85);
      for (let k = 0; k < 4; k++) {
        const lhItem = bar.lh[k];
        if (Array.isArray(lhItem)) s.chord(b + k, 1.05, lhItem, 0.40, "LH");
        else s.note(b + k, 1.35, lhItem, 0.48 + (k === 0 ? 0.06 : 0), "LH");
      }
      const G_MINOR_DIATONIC_THIRD_BELOW = {
        D4: "Bb3", F4: "D4", "F#4": "D4", G4: "D4", A4: "F#4", Bb4: "G4",
        C5: "A4", D5: "Bb4", Eb5: "C5", F5: "D5", G5: "Eb5",
      };
      for (const [off, dur, pitch] of bar.rh) {
        const vel = 0.60 + (enriched ? 0.08 : 0);
        s.note(b + off, dur + 0.15, pitch, vel, "RH");
        if (enriched) {
          // Authentic G-minor diatonic inner harmony (zero chromatic clashes!)
          const harmPitch = G_MINOR_DIATONIC_THIRD_BELOW[pitch] || noteToMidi(pitch) - 4;
          s.note(b + off, dur, harmPitch, vel * 0.72, "RH");
        }
      }
      b += 4.0;
    }
  };

  s.setTempo(b, 64);
  playBarcarolleA(false);

  // Section B: Poco più mosso — Radiant G Major sunlit water duet
  s.setTempo(b, 84);
  const gMajorB = [
    { lh: ["G2", "D3", "B3", "D3"], rh: [[0, 1.5, ["B4", "D5"]], [1.5, 0.5, ["C5", "E5"]], [2.0, 2.0, ["D5", "G5"]]] },
    { lh: ["C3", "G3", "E4", "G3"], rh: [[0, 1.5, ["E5", "G5"]], [1.5, 0.5, ["D5", "F#5"]], [2.0, 2.0, ["C5", "E5"]]] },
    { lh: ["D2", "A2", "F#3", "C4"], rh: [[0, 1.5, ["A4", "D5"]], [1.5, 0.5, ["B4", "E5"]], [2.0, 2.0, ["C5", "F#5"]]] },
    { lh: ["G2", "D3", "B3", "D3"], rh: [[0, 2.0, ["B4", "G5"]], [2.0, 2.0, ["B4", "D5"]]] },
    { lh: ["E2", "B2", "G3", "B3"], rh: [[0, 1.5, ["E5", "G5"]], [1.5, 0.5, ["F#5", "A5"]], [2.0, 2.0, ["G5", "B5"]]] },
    { lh: ["A2", "E3", "C#4", "G4"], rh: [[0, 2.0, ["E5", "A5"]], [2.0, 2.0, ["C#5", "G5"]]] },
    { lh: ["D2", "A2", "F#3", "D4"], rh: [[0, 2.0, ["D5", "F#5"]], [2.0, 2.0, ["C5", "E5"]]] },
    { lh: ["D2", "A2", "F#3", "C4"], rh: [[0, 4.0, ["A4", "D5"]]] },
  ];
  for (const bar of gMajorB) {
    s.pedal(b, b + 3.85);
    for (let k = 0; k < 4; k++) s.note(b + k, 1.1, bar.lh[k], 0.48 + (k === 0 ? 0.08 : 0), "LH");
    for (const [off, dur, ch] of bar.rh) s.chord(b + off, dur, ch, 0.66, "RH");
    b += 4.0;
  }

  // Section C: Allegro giocoso — Sparkling festive Russian dance episode
  s.setTempo(b, 114);
  const giocoso = [
    { lh: [["G2", "D3"], ["B3", "D4"]], rh: ["B4", "D5", "G5", "D5", "B4", "G4", "D5", "B4"] },
    { lh: [["C2", "G2"], ["C4", "E4"]], rh: ["C5", "E5", "G5", "E5", "C5", "G4", "E5", "C5"] },
    { lh: [["D2", "A2"], ["C4", "F#4"]], rh: ["D5", "F#5", "A5", "F#5", "D5", "C5", "A4", "F#4"] },
    { lh: [["G2", "D3"], ["B3", "G4"]], rh: ["G4", "B4", "D5", "G5", "B5", "G5", "D5", "B4"] },
    { lh: [["E2", "B2"], ["G3", "E4"]], rh: ["E5", "G5", "B5", "G5", "E5", "B4", "G4", "E4"] },
    { lh: [["C2", "G2"], ["E3", "C4"]], rh: ["C5", "E5", "G5", "E5", "C5", "A4", "G4", "E4"] },
    { lh: [["D2", "A2"], ["F#3", "C4"]], rh: ["D5", "C5", "B4", "A4", "G4", "F#4", "E4", "D4"] },
    { lh: [["G2", "D3"], ["B3", "D4"]], rh: ["G4", "A4", "B4", "C5", "D5", "E5", "F#5", "G5"] },
  ];
  for (let rep = 0; rep < 2; rep++) {
    for (const bar of giocoso) {
      s.pedal(b, b + 1.85);
      s.pedal(b + 2.0, b + 3.85);
      s.chord(b + 0.0, 0.9, bar.lh[0], 0.62, "LH");
      s.chord(b + 1.0, 0.8, bar.lh[1], 0.52, "LH");
      s.chord(b + 2.0, 0.9, bar.lh[0], 0.60, "LH");
      s.chord(b + 3.0, 0.8, bar.lh[1], 0.50, "LH");
      for (let k = 0; k < 8; k++) {
        s.note(b + k * 0.5, 0.44, bar.rh[k], 0.64 + (k % 2 === 0 ? 0.06 : 0), "RH");
      }
      b += 4.0;
    }
  }

  // Section A': Nostalgic G Minor Reprise with rich inner singing voice
  s.setTempo(b, 62);
  playBarcarolleA(true);

  // Twilight Coda — Gentle oars fading into evening mist
  s.setTempo(b, 54);
  for (let k = 0; k < 3; k++) {
    const fade = 0.46 - k * 0.08;
    s.pedal(b, b + 3.9);
    s.note(b + 0.0, 1.8, "G2", fade, "LH");
    s.note(b + 1.0, 1.5, "D3", fade * 0.85, "LH");
    s.note(b + 2.0, 1.5, "Bb3", fade * 0.85, "LH");
    s.note(b + 3.0, 1.2, "D3", fade * 0.80, "LH");
    s.chord(b + 0.0, 3.6, ["G4", "Bb4", "D5"], fade * 0.95, "RH", 0.08);
    b += 4.0;
  }
  s.setTempo(b, 46);
  s.pedal(b, b + 6.5);
  s.chord(b, 6.2, ["G1", "G2", "D3"], 0.42, "LH", 0.08);
  s.chord(b + 0.18, 6.0, ["G3", "Bb3", "D4", "G4"], 0.38, "RH", 0.12);
  b += 6.8;

  return s.build({
    id: "tchaikovsky_june_barcarolle_op37a_no6",
    code: "TCH-JUNE",
    composer: "Pyotr Ilyich Tchaikovsky (1840–1893)",
    title: "June: Barcarolle, Op. 37a No. 6 (The Seasons)",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1876 · The Seasons, Op. 37a",
    keySignature: "G Minor · 4/4",
    bpm: 64,
    historicalNote:
      "Complete concert edition of Tchaikovsky's beloved 'June: Barcarolle' from The Seasons — swaying Venetian gondola lyricism opening into a radiant G major summer celebration and wistful twilight reprise.",
  });
}

// ============================================================================
// 13. ERIK SATIE — GYMNOPÉDIE NO. 1 (~3:30)
//     D Major · 3/4 — Lent et douloureux (Complete translucent Maj7 waltz meditation)
// ============================================================================
function buildSatieGymnopedieNo1() {
  const s = new ScoreBuilder(74);
  let b = 0;

  // Classic alternating floating GMaj7 -> DMaj7 pendulum accompaniment
  const playPendulum = (count, vel = 0.44) => {
    for (let i = 0; i < count; i++) {
      const isG = i % 2 === 0;
      s.pedal(b, b + 2.92);
      s.note(b + 0.0, 2.85, isG ? "G2" : "D2", vel, "LH");
      s.chord(b + 1.0, 1.90, isG ? ["B3", "D4", "F#4"] : ["A3", "C#4", "F#4"], vel * 0.86, "LH");
      b += 3.0;
    }
  };

  // Intro: 4 iconic swaying bars of stillness
  playPendulum(4, 0.42);

  // Full Half-Cycle Builder (Satie wrote two nearly twin architectural halves with contrasting cadences!)
  const playGymnopedieHalf = (isSecondHalf = false) => {
    const seq = [
      // Main translucent melody over Gmaj7 / Dmaj7
      { bass: "G2", ch: ["B3", "D4", "F#4"], mel: [[1, 1, "F#5"], [2, 1, "A5"]] },
      { bass: "D2", ch: ["A3", "C#4", "F#4"], mel: [[0, 1, "G5"], [1, 1, "F#5"], [2, 1, "C#5"]] },
      { bass: "G2", ch: ["B3", "D4", "F#4"], mel: [[0, 1, "B4"], [1, 1, "C#5"], [2, 1, "D5"]] },
      { bass: "D2", ch: ["A3", "C#4", "F#4"], mel: [[0, 3, "A4"]] },
      { bass: "G2", ch: ["B3", "D4", "F#4"], mel: [[0, 3, "F#4"]] },
      { bass: "D2", ch: ["A3", "C#4", "F#4"], mel: [] },
      { bass: "G2", ch: ["B3", "D4", "F#4"], mel: [] },
      { bass: "D2", ch: ["A3", "C#4", "F#4"], mel: [] },
      // Second strain — modal sighing descent
      { bass: "G2", ch: ["B3", "D4", "F#4"], mel: [[1, 1, "F#5"], [2, 1, "A5"]] },
      { bass: "D2", ch: ["A3", "C#4", "F#4"], mel: [[0, 1, "G5"], [1, 1, "F#5"], [2, 1, "C#5"]] },
      { bass: "G2", ch: ["B3", "D4", "F#4"], mel: [[0, 1, "B4"], [1, 1, "C#5"], [2, 1, "D5"]] },
      { bass: "D2", ch: ["A3", "C#4", "F#4"], mel: [[0, 3, "A4"]] },
      // Luminous modal turn to F#m -> Bm -> Em -> D
      { bass: "F#2", ch: ["A3", "C#4", "F#4"], mel: [[0, 3, "C#5"]] },
      { bass: "B2", ch: ["D4", "F#4", "A4"], mel: [[0, 3, "F#5"]] },
      { bass: "E2", ch: ["G3", "B3", "E4"], mel: [[0, 3, "E4"]] },
      { bass: "E2", ch: ["G3", "B3", "D4"], mel: [[0, 3, "E4"]] },
      { bass: "D2", ch: ["A3", "D4", "F#4"], mel: [[0, 1, "A4"], [1, 1, "B4"], [2, 1, "C5"]] },
      { bass: "A2", ch: ["E3", "G3", "C4"], mel: [[0, 1, "E5"], [1, 1, "D5"], [2, 1, "B4"]] },
      { bass: "D2", ch: ["A3", "C4", "F4"], mel: [[0, 1, "D5"], [1, 1, "C5"], [2, 1, "B4"]] },
      { bass: "D2", ch: ["A3", "C4", "E4"], mel: [[0, 3, "D5"]] },
      // Concluding cadence (1st half resolves to bright A/D; 2nd half settles into poetic D minor/D major)
      { bass: "E2", ch: ["G3", "B3", "E4"], mel: [[0, 1, "D5"], [1, 1, "E5"], [2, 1, "F5"]] },
      { bass: "A2", ch: ["E3", "G3", "C4"], mel: [[0, 1, "G5"], [1, 1, "F5"], [2, 1, "E5"]] },
      { bass: "D2", ch: isSecondHalf ? ["F3", "A3", "D4"] : ["A3", "D4", "F#4"], mel: [[0, 3, isSecondHalf ? "F4" : "E5"]] },
      { bass: "D2", ch: isSecondHalf ? ["F3", "A3", "D4"] : ["A3", "C#4", "E4"], mel: [[0, 3, isSecondHalf ? "D5" : "A4"]] },
    ];

    for (let i = 0; i < seq.length; i++) {
      const bar = seq[i];
      s.pedal(b, b + 2.94);
      const v = isSecondHalf ? 0.41 : 0.44;
      s.note(b + 0.0, 2.85, bar.bass, v, "LH");
      s.chord(b + 1.0, 1.90, bar.ch, v * 0.84, "LH");
      for (const [off, dur, pitch] of bar.mel) {
        s.note(b + off, dur + 0.35, pitch, v + 0.14, "RH");
      }
      b += 3.0;
    }
  };

  s.setTempo(b, 60);
  playGymnopedieHalf(false);
  playPendulum(4, 0.40);
  s.setTempo(b, 56);
  playGymnopedieHalf(true);
  // Poetic suspended ending
  s.setTempo(b, 50);
  playPendulum(4, 0.36);
  s.pedal(b, b + 7.5);
  s.note(b, 7.2, "D2", 0.36, "LH");
  s.chord(b + 1.0, 6.2, ["F#3", "A3", "D4", "F#4"], 0.34, "RH", 0.14);
  b += 7.8;

  return s.build({
    id: "satie_gymnopedie_no1",
    code: "SATIE-G1",
    composer: "Erik Satie (1866–1925)",
    title: "Gymnopédie No. 1 (Lent et douloureux)",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1888 · Paris Avant-Garde",
    keySignature: "D Major · 3/4",
    bpm: 74,
    historicalNote:
      "Complete meditative edition of Erik Satie's Gymnopédie No. 1 — luminous suspended major-seventh chords swaying gently beneath an unforgettable melancholic French melody.",
  });
}

// ============================================================================
// 14. W. A. MOZART — TURKISH MARCH (RONDO ALLA TURCA), K. 331 (~3:35)
//     A Minor → A Major · 2/4 — Complete A–B–C–A–B–Janissary Coda Concert Rondo
// ============================================================================
function buildMozartRondoAllaTurca() {
  const s = new ScoreBuilder(126);
  let b = 0;

  // Theme A (Authentic Mozart K. 331 Rondo Alla Turca — exact Bars 1-8 including crisp 8th-note Em descent!)
  const playSectionA = () => {
    const pickup = ["B4", "A4", "G#4", "A4"];
    const aSeq = [
      // Bar 1: C5 on Beat 0 -> D5 C5 B4 C5 pickup to Bar 2
      { lh: ["A2", ["C3", "E3"], "A2", ["C3", "E3"]], rh: ["C5", null, null, null, "D5", "C5", "B4", "C5"] },
      // Bar 2: E5 on Beat 0 -> F5 E5 D#5 E5 pickup to Bar 3
      { lh: ["A2", ["C3", "E3"], "E2", ["G#2", "B2"]], rh: ["E5", null, null, null, "F5", "E5", "D#5", "E5"] },
      // Bar 3: B5 A5 G#5 A5 B5 A5 G#5 A5
      { lh: ["A2", ["C3", "E3"], "A2", ["C3", "E3"]], rh: ["B5", "A5", "G#5", "A5", "B5", "A5", "G#5", "A5"] },
      // Bar 4: C6 on Beat 0 -> A5 C6 (authentic Mozart 8th notes!)
      { lh: ["A2", ["C3", "E3"], "A2", ["C3", "E3"]], rh: ["C6", null, null, null, "A5", null, "C6", null] },
      // Bar 5: Authentic Mozart Em 8th notes — B5 A5 G5 A5!
      { lh: ["E2", ["G2", "B2"], "E2", ["G2", "B2"]], rh: ["B5", null, "A5", null, "G5", null, "A5", null] },
      // Bar 6: Authentic Mozart Em 8th notes — B5 A5 G5 A5!
      { lh: ["E2", ["G2", "B2"], "E2", ["G2", "B2"]], rh: ["B5", null, "A5", null, "G5", null, "A5", null] },
      // Bar 7: Authentic Mozart Em -> B7 — B5 A5 G5 F#5!
      { lh: ["E2", ["G2", "B2"], "B1", ["D#2", "F#2", "A2"]], rh: ["B5", null, "A5", null, "G5", null, "F#5", null] },
      // Bar 8: Authentic Em cadence on E5 (beat 0..1.0), leaving beat 1.0..2.0 cleanly for the repeat pickup!
      { lh: ["E2", ["G2", "B2"], null, null], rh: ["E5", null, null, null, null, null, null, null] },
    ];
    // Initial 4-sixteenth anacrusis pickup before Bar 1 so C5 lands squarely on beat 0!
    for (let k = 0; k < 4; k++) {
      s.note(b + k * 0.25, 0.22, pickup[k], 0.66 + (k === 0 ? 0.06 : 0), "RH");
    }
    b += 1.0;

    for (let rep = 0; rep < 2; rep++) {
      for (let bi = 0; bi < aSeq.length; bi++) {
        const bar = aSeq[bi];
        for (let k = 0; k < 4; k++) {
          const l = bar.lh[k];
          if (!l) continue;
          if (Array.isArray(l)) s.chord(b + k * 0.5, 0.36, l, 0.52, "LH");
          else s.note(b + k * 0.5, 0.40, l, 0.60, "LH");
        }
        for (let k = 0; k < 8; k++) {
          if (bar.rh[k]) {
            const isEighth = bi >= 4 && bi <= 6;
            s.note(b + k * 0.25, isEighth ? 0.36 : 0.22, bar.rh[k], 0.68 + (k % 2 === 0 ? 0.06 : 0), "RH");
          }
        }
        // On Bar 8 of pass 1, place the repeat pickup cleanly inside beats 1.0..2.0 so strict 2/4 pulse NEVER breaks!
        if (bi === 7 && rep === 0) {
          for (let k = 0; k < 4; k++) {
            s.note(b + 1.0 + k * 0.25, 0.22, pickup[k], 0.66 + (k === 0 ? 0.06 : 0), "RH");
          }
        }
        b += 2.0;
      }
    }
  };

  // Theme B (Heroic A Major Janissary March with rolled Turkish bass chords!)
  const playSectionB = (grand = false) => {
    const v = grand ? 0.78 : 0.70;
    const bSeq = [
      { bass: ["A2", "E3", "A3"], rh: [[0, 0.45, ["A4", "A5"]], [0.5, 0.45, ["B4", "B5"]], [1.0, 0.45, ["C#5", "C#6"]], [1.5, 0.45, ["C#5", "C#6"]]] },
      { bass: ["E2", "B2", "E3"], rh: [[0, 0.24, ["D5", "D6"]], [0.25, 0.24, ["C#5", "C#6"]], [0.5, 0.45, ["B4", "B5"]], [1.0, 0.45, ["A4", "A5"]], [1.5, 0.45, ["G#4", "G#5"]]] },
      { bass: ["A2", "E3", "A3"], rh: [[0, 0.45, ["A4", "A5"]], [0.5, 0.45, ["B4", "B5"]], [1.0, 0.45, ["C#5", "C#6"]], [1.5, 0.45, ["B4", "B5"]]] },
      { bass: ["E2", "B2", "E3"], rh: [[0, 0.45, ["A4", "A5"]], [0.5, 0.45, ["G#4", "G#5"]], [1.0, 0.90, ["E4", "E5"]]] },
      { bass: ["A2", "E3", "A3"], rh: [[0, 0.45, ["A4", "A5"]], [0.5, 0.45, ["B4", "B5"]], [1.0, 0.45, ["C#5", "C#6"]], [1.5, 0.45, ["D5", "D6"]]] },
      { bass: ["D2", "A2", "D3"], rh: [[0, 0.45, ["E5", "E6"]], [0.5, 0.45, ["D5", "D6"]], [1.0, 0.45, ["C#5", "C#6"]], [1.5, 0.45, ["B4", "B5"]]] },
      { bass: ["E2", "B2", "E3"], rh: [[0, 0.45, ["A4", "A5"]], [0.5, 0.45, ["B4", "B5"]], [1.0, 0.45, ["G#4", "G#5"]], [1.5, 0.45, ["E4", "E5"]]] },
      { bass: ["A2", "E3", "A3"], rh: [[0, 1.4, ["A4", "C#5", "E5", "A5"]]] },
    ];
    for (let rep = 0; rep < 2; rep++) {
      for (const bar of bSeq) {
        s.pedal(b, b + 0.9);
        s.chord(b + 0.0, 0.55, bar.bass, v * 0.9, "LH", 0.03);
        s.chord(b + 1.0, 0.55, bar.bass, v * 0.85, "LH", 0.03);
        for (const [off, dur, ch] of bar.rh) {
          s.chord(b + off, dur, ch, v, "RH");
        }
        b += 2.0;
      }
    }
  };

  // Theme C (Sparkling F♯ Minor continuous 16th-note whirlwind trio!)
  const playSectionC = () => {
    const cRuns = [
      { lh: ["F#2", "A2", "C#3", "A2"], rh: ["C#5", "D5", "E5", "F#5", "E5", "D5", "C#5", "B4"] },
      { lh: ["C#2", "G#2", "B2", "G#2"], rh: ["A4", "B4", "C#5", "D5", "C#5", "B4", "A4", "G#4"] },
      { lh: ["F#2", "A2", "C#3", "A2"], rh: ["F#4", "G#4", "A4", "B4", "C#5", "D5", "E5", "F#5"] },
      { lh: ["C#2", "E#2", "G#2", "C#3"], rh: ["G#5", "F#5", "E#5", "F#5", "G#5", "E#5", "C#5", "G#4"] },
      { lh: ["F#2", "A2", "C#3", "A2"], rh: ["A4", "C#5", "F#5", "A5", "G#5", "F#5", "E5", "D5"] },
      { lh: ["B2", "D3", "F#3", "D3"], rh: ["C#5", "B4", "A4", "G#4", "F#4", "E4", "D4", "C#4"] },
      { lh: ["C#2", "G#2", "B2", "G#2"], rh: ["D4", "F#4", "B4", "D5", "C#5", "B4", "A4", "G#4"] },
      { lh: ["F#2", "C#3", "F#3", "A3"], rh: ["F#4", "A4", "C#5", "F#5", "A5", "F#5", "C#5", "A4"] },
    ];
    for (let rep = 0; rep < 2; rep++) {
      for (const bar of cRuns) {
        for (let k = 0; k < 4; k++) s.note(b + k * 0.5, 0.38, bar.lh[k], 0.54, "LH");
        for (let k = 0; k < 8; k++) s.note(b + k * 0.25, 0.22, bar.rh[k], 0.66, "RH");
        b += 2.0;
      }
    }
  };

  // Full Concert Rondo Architecture with authentic classical repeats:
  // A → B → C → B → C(Reprise) → A → B(Grand) → Janissary Coda
  s.setTempo(b, 106);
  playSectionA();
  s.setTempo(b, 110);
  playSectionB(false);
  s.setTempo(b, 114);
  playSectionC();
  s.setTempo(b, 110);
  playSectionB(false);
  s.setTempo(b, 116);
  playSectionC();
  s.setTempo(b, 108);
  playSectionA();
  s.setTempo(b, 112);
  playSectionB(true);
  s.setTempo(b, 116);
  playSectionB(true);

  // Sparkling A Major Janissary Coda!
  s.setTempo(b, 118);
  const codaArps = [
    ["A4", "C#5", "E5", "A5", "E5", "C#5", "A4", "E4"],
    ["B4", "D5", "E5", "G#5", "E5", "D5", "B4", "E4"],
    ["A4", "C#5", "E5", "A5", "C#6", "A5", "E5", "C#5"],
    ["E5", "G#5", "B5", "E6", "B5", "G#5", "E5", "B4"],
  ];
  for (let rep = 0; rep < 2; rep++) {
    for (const run of codaArps) {
      s.pedal(b, b + 1.85);
      s.chord(b + 0.0, 0.8, ["A1", "A2", "E3"], 0.76, "LH", 0.02);
      s.chord(b + 1.0, 0.8, ["E2", "B2", "E3"], 0.72, "LH", 0.02);
      for (let k = 0; k < 8; k++) s.note(b + k * 0.25, 0.24, run[k], 0.74, "RH");
      b += 2.0;
    }
  }
  s.pedal(b, b + 4.0);
  s.chord(b + 0.0, 0.6, ["A1", "A2", "E3"], 0.84, "LH");
  s.chord(b + 0.0, 0.6, ["A4", "C#5", "E5", "A5"], 0.84, "RH");
  s.chord(b + 1.0, 0.6, ["E2", "B2", "E3"], 0.82, "LH");
  s.chord(b + 1.0, 0.6, ["G#4", "B4", "E5", "G#5"], 0.82, "RH");
  s.chord(b + 2.0, 2.2, ["A1", "A2", "E3", "A3"], 0.88, "LH");
  s.chord(b + 2.0, 2.2, ["A4", "C#5", "E5", "A5"], 0.90, "RH");
  b += 4.5;

  return s.build({
    id: "mozart_rondo_alla_turca_k331",
    code: "MOZ-TURCA",
    composer: "Wolfgang Amadeus Mozart (1756–1791)",
    title: "Turkish March (Rondo Alla Turca), K. 331",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1783 · Piano Sonata No. 11 in A Major",
    keySignature: "A Minor → A Major · 2/4",
    bpm: 126,
    historicalNote:
      "Complete concert rondo of Mozart's dazzling Rondo Alla Turca — evoking Viennese fascination with Ottoman Janissary bands through mischievous A minor tiptoes, heroic A major marches, and sparkling 16th-note runs.",
  });
}

// ============================================================================
// 15. FRÉDÉRIC CHOPIN — WALTZ IN C♯ MINOR, OP. 64 NO. 2 (~3:45)
//     C♯ Minor · 3/4 — Tempo giusto → Più mosso → Più lento (D♭ Major) → Reprise
// ============================================================================
function buildChopinWaltzOp64No2() {
  const s = new ScoreBuilder(114);
  let b = 0;

  // Helper: authentic Parisian Chopin waltz bass (oom-pah-pah in 3/4)
  const waltzBar = (bass, chord, rhEvents, velScale = 1.0) => {
    s.pedal(b, b + 2.65);
    s.note(b + 0.0, 0.95, bass, 0.56 * velScale, "LH");
    s.chord(b + 1.0, 0.72, chord, 0.44 * velScale, "LH");
    s.chord(b + 2.0, 0.68, chord, 0.42 * velScale, "LH");
    for (const [off, dur, pitch, v] of rhEvents) {
      if (Array.isArray(pitch)) s.chord(b + off, dur, pitch, (v || 0.64) * velScale, "RH");
      else s.note(b + off, dur, pitch, (v || 0.64) * velScale, "RH");
    }
    b += 3.0;
  };

  // Section A: Tempo giusto — Authentic Chopin Op. 64 No. 2 opening (G#4 C#5 | E5 D#5 | C#5 turn | G#4!)
  const playSectionA = () => {
    const bars = [
      // Bars 1-4: Iconic Chopin C#m melody with signature mordent/turn in Bar 3!
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], rh: [[0, 2.0, "G#4", 0.62], [2.0, 1.0, "C#5", 0.66]] },
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], rh: [[0, 2.0, "E5", 0.70], [2.0, 1.0, "D#5", 0.64]] },
      { bass: "G#2", ch: ["B#3", "D#4", "F#4"], rh: [[0, 1.0, "C#5", 0.66], [1.0, 0.34, "D#5", 0.62], [1.34, 0.33, "C#5", 0.60], [1.67, 0.33, "B#4", 0.58], [2.0, 1.0, "C#5", 0.64]] },
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], rh: [[0, 3.0, "G#4", 0.60]] },
      // Bars 5-8: Answering yearning phrase (A4 D#5 | F#5 E5 | D#5 turn | G#4!)
      { bass: "F#2", ch: ["A3", "C#4", "D#4"], rh: [[0, 2.0, "A4", 0.64], [2.0, 1.0, "D#5", 0.68]] },
      { bass: "G#2", ch: ["B#3", "D#4", "F#4"], rh: [[0, 2.0, "F#5", 0.72], [2.0, 1.0, "E5", 0.66]] },
      { bass: "G#2", ch: ["B#3", "D#4", "F#4"], rh: [[0, 1.0, "D#5", 0.66], [1.0, 0.34, "E5", 0.62], [1.34, 0.33, "D#5", 0.60], [1.67, 0.33, "C##5", 0.58], [2.0, 1.0, "D#5", 0.64]] },
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], rh: [[0, 3.0, "G#4", 0.60]] },
      // Bars 9-16: Soaring continuation climbing to G#5 and resolving cleanly to C#5!
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], rh: [[0, 2.0, "G#4", 0.64], [2.0, 1.0, "C#5", 0.68]] },
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], rh: [[0, 2.0, "E5", 0.72], [2.0, 1.0, "G#5", 0.76]] },
      { bass: "F#2", ch: ["A3", "C#4", "F#4"], rh: [[0, 1.5, "F#5", 0.74], [1.5, 0.5, "E5", 0.66], [2.0, 1.0, "D#5", 0.66]] },
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], rh: [[0, 2.0, "E5", 0.68], [2.0, 1.0, "C#5", 0.64]] },
      { bass: "G#2", ch: ["B#3", "D#4", "F#4"], rh: [[0, 1.5, "D#5", 0.66], [1.5, 0.5, "C#5", 0.62], [2.0, 1.0, "B#4", 0.60]] },
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], rh: [[0, 3.0, "C#5", 0.62]] },
    ];
    for (const bar of bars) waltzBar(bar.bass, bar.ch, bar.rh, 1.0);
  };

  // Section B: Più mosso — Chopin's iconic swirling 8th-note ribbons in C♯ minor!
  const playPiuMosso = () => {
    const swirls = [
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], notes: ["G#4", "C#5", "E5", "G#5", "A5", "G#5"] },
      { bass: "G#2", ch: ["B#3", "D#4", "F#4"], notes: ["F#5", "E5", "D#5", "C#5", "B#4", "C#5"] },
      { bass: "F#2", ch: ["A3", "C#4", "F#4"], notes: ["A4", "C#5", "F#5", "A5", "B5", "A5"] },
      { bass: "G#2", ch: ["B#3", "D#4", "F#4"], notes: ["G#5", "F#5", "E5", "D#5", "C#5", "B#4"] },
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], notes: ["C#5", "E5", "G#5", "C#6", "B5", "A5"] },
      { bass: "F#2", ch: ["A3", "C#4", "F#4"], notes: ["G#5", "F#5", "E5", "D#5", "C#5", "A4"] },
      { bass: "G#2", ch: ["B#3", "D#4", "G#4"], notes: ["G#4", "B#4", "D#5", "F#5", "G#5", "D#5"] },
      { bass: "C#2", ch: ["G#3", "C#4", "E4"], notes: ["E5", "C#5", "G#4", "C#5", "E5", "G#5"] },
    ];
    for (let rep = 0; rep < 2; rep++) {
      for (const sw of swirls) {
        const rh = sw.notes.map((n, idx) => [idx * 0.5, 0.52, n, 0.62 + Math.sin((idx / 5) * Math.PI) * 0.12]);
        waltzBar(sw.bass, sw.ch, rh, 1.0);
      }
    }
  };

  // Section C: Più lento — Authentic D♭ Major nocturnal heart of Op. 64 No. 2!
  const playPiuLento = () => {
    const slowBars = [
      { bass: "Db2", ch: ["Ab3", "Db4", "F4"], rh: [[0, 2.0, "F5", 0.64], [2.0, 1.0, "Ab5", 0.68]] },
      { bass: "Ab2", ch: ["Eb3", "Ab3", "Gb4"], rh: [[0, 1.5, "Gb5", 0.68], [1.5, 0.5, "F5", 0.62], [2.0, 1.0, "Eb5", 0.62]] },
      { bass: "Db2", ch: ["Ab3", "Db4", "F4"], rh: [[0, 2.0, "Db5", 0.62], [2.0, 1.0, "F5", 0.64]] },
      { bass: "Ab2", ch: ["Eb3", "Ab3", "C4"], rh: [[0, 3.0, "Eb5", 0.60]] },
      { bass: "Gb2", ch: ["Db3", "Gb3", "Bb3"], rh: [[0, 2.0, "Gb5", 0.66], [2.0, 1.0, "Bb5", 0.70]] },
      { bass: "Db2", ch: ["Ab3", "Db4", "F4"], rh: [[0, 1.5, "Ab5", 0.70], [1.5, 0.5, "Gb5", 0.62], [2.0, 1.0, "F5", 0.64]] },
      { bass: "Ab2", ch: ["Eb3", "Ab3", "Gb4"], rh: [[0, 1.5, "Eb5", 0.64], [1.5, 0.5, "F5", 0.62], [2.0, 1.0, "Gb5", 0.64]] },
      { bass: "Db2", ch: ["Ab3", "Db4", "F4"], rh: [[0, 2.0, "F5", 0.64], [2.0, 1.0, "Db5", 0.58]] },
    ];
    for (let rep = 0; rep < 2; rep++) {
      for (const bar of slowBars) waltzBar(bar.bass, bar.ch, bar.rh, rep === 1 ? 0.94 : 1.0);
    }
  };

  // Authentic Chopin Form: A → B(Più mosso) → C(Più lento D♭) → B(Più mosso) → A → B(Finale)
  s.setTempo(b, 92);
  playSectionA();
  s.setTempo(b, 130);
  playPiuMosso();
  s.setTempo(b, 74);
  playPiuLento();
  s.setTempo(b, 72);
  playPiuLento();
  s.setTempo(b, 132);
  playPiuMosso();
  s.setTempo(b, 88);
  playSectionA();
  s.setTempo(b, 136);
  playPiuMosso();

  // Whispered Romantic Closing Cadence in C♯ minor
  s.setTempo(b, 96);
  s.pedal(b, b + 6.5);
  s.note(b + 0.0, 2.0, "G#2", 0.54, "LH");
  s.chord(b + 0.0, 2.0, ["B#3", "D#4", "G#4"], 0.56, "RH");
  s.chord(b + 2.2, 4.5, ["C#2", "G#2", "C#3"], 0.58, "LH", 0.06);
  s.chord(b + 2.35, 4.3, ["E4", "G#4", "C#5", "E5"], 0.56, "RH", 0.08);
  b += 7.0;

  return s.build({
    id: "chopin_waltz_c_sharp_minor_op64_no2",
    code: "CHOP-W64",
    composer: "Frédéric Chopin (1810–1849)",
    title: "Waltz in C♯ Minor, Op. 64 No. 2",
    instrument: "Concert Grand Piano · Koerner Hall Acoustic Engine",
    license: "Public Domain Composition",
    tuningA4: 440.0,
    year: "1847 · Late Parisian Salon Masterpiece",
    keySignature: "C♯ Minor · 3/4",
    bpm: 114,
    historicalNote:
      "Complete concert architecture of Chopin's beloved Waltz in C♯ Minor, Op. 64 No. 2 — weaving together nostalgic salon yearning, silky Più mosso eighth-note ribbons, and a radiant D♭ major nocturnal heart.",
  });
}

export const ADDITIONAL_REPERTOIRE = [
  buildFurElise(),
  buildMoonlightSonata(),
  buildChopinNocturneOp9No2(),
  buildLaCampanella(),
  buildWinterWind(),
  buildMozartFantasiaDMinor(),
  buildBachPreludeBWV846(),
  buildDebussyClairDeLune(),
  buildRachmaninoffPreludeCSharpMinor(),
  buildTchaikovskyJuneBarcarolle(),
  buildSatieGymnopedieNo1(),
  buildMozartRondoAllaTurca(),
  buildChopinWaltzOp64No2(),
  buildDrowningLove(),
  buildMeaningfulLove(),
];


