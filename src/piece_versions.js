/**
 * Piece Versions & Concert Paraphrase Transformation Engine
 *
 * Allows listeners to switch any sampled repertoire piece between 4 musical editions:
 * - "original"  : Authentic Urtext score as recorded/transcribed
 * - "virtuoso"  : Concert Paraphrase — real alternate virtuoso movement where available
 *                 (e.g. Moonlight Sonata -> III. Presto Agitato!), otherwise harmonically
 *                 aware concert bass sub-octaves, sparkling climax RH octaves, rolled
 *                 concert chords, and energetic concert pacing
 * - "chamber"   : Intimate lyrical pacing with singing soprano foreground and hushed accompaniment
 * - "study"     : Clear learning edition — unpedaled articulation, equalized hand balance, +18% slower
 */

export const DEFAULT_PIECE_VERSION_ID = "original";

export const PIECE_VERSIONS = [
  {
    id: "original",
    label: "Версия: Оригинал",
    shortLabel: "Оригинал",
    desc: "Подлинная партитура (уртекст)",
  },
  {
    id: "virtuoso",
    label: "Версия: Виртуозная (Animenz / Концерт)",
    shortLabel: "Виртуозная",
    desc: "Концертный парафраз в духе Листа и Animenz: октавные кульминации, глубокий бас и стремительные арпеджио-каскады",
  },
  {
    id: "chamber",
    label: "Версия: Камерная",
    shortLabel: "Камерная",
    desc: "Лирическая салонная трактовка с певучим верхним голосом",
  },
  {
    id: "study",
    label: "Версия: Учебная",
    shortLabel: "Учебная",
    desc: "Спокойный темп, ровный баланс рук и чёткая артикуляция без педали",
  },
];

export const PIECE_VERSION_BY_ID = new Map(PIECE_VERSIONS.map((v) => [v.id, v]));

// Real alternate MIDI recordings for specific piece + version pairs
const ALTERNATE_MIDI_MAP = {
  "beethoven_moonlight_sonata_op27_no2:virtuoso": "beethoven_moonlight_mvt3_presto",
  "anime_naruto_blue_bird:virtuoso": "anime_naruto_blue_bird_virtuoso",
};

export function getPieceVersion(versionId) {
  return PIECE_VERSION_BY_ID.get(versionId) || PIECE_VERSIONS[0];
}

export function getAlternateScoreIdForVersion(pieceId, versionId) {
  return ALTERNATE_MIDI_MAP[`${pieceId}:${versionId}`] || null;
}

/**
 * Applies a musical edition transformation to an unpacked score
 * ({ alignedNotes, kneePedal, durationSec, bpm }).
 *
 * Note tuple format: [tSec, durSec, beat, durBeats, midi, vel, hand]
 */
export function applyVersionToScore(piece, rawScore, versionId = DEFAULT_PIECE_VERSION_ID) {
  if (!rawScore || !Array.isArray(rawScore.alignedNotes) || rawScore.alignedNotes.length === 0) {
    return {
      alignedNotes: [],
      kneePedal: [],
      durationSec: piece?.durationSec || 60,
      bpm: piece?.bpm || 84,
      versionId,
      isAlternateMidi: false,
    };
  }

  const baseNotes = rawScore.alignedNotes;
  const basePedal = Array.isArray(rawScore.kneePedal) ? rawScore.kneePedal : [];
  const baseDur = rawScore.durationSec || piece?.durationSec || 120;
  const baseBpm = rawScore.bpm || piece?.bpm || 84;

  const isAnimePiece = Boolean(piece?.id?.startsWith("anime_"));

  // Original (or classical alternate virtuoso MIDI like Moonlight III Presto)
  if (versionId === "original" || (rawScore._isAlternateMidi && !isAnimePiece)) {
    return {
      alignedNotes: baseNotes.map((n) => [...n]),
      kneePedal: basePedal.map((p) => [p[0], p[1]]),
      durationSec: baseDur,
      bpm: baseBpm,
      versionId,
      isAlternateMidi: Boolean(rawScore._isAlternateMidi),
    };
  }

  // Group simultaneous notes within 26 ms slices so we know top melody vs inner voices vs bass root
  const slices = [];
  for (let i = 0; i < baseNotes.length; i++) {
    const n = baseNotes[i];
    const t = n[0];
    if (slices.length > 0 && t - slices[slices.length - 1].t <= 0.026) {
      slices[slices.length - 1].notes.push(n);
    } else {
      slices.push({ t, notes: [n] });
    }
  }

  // Compute velocity quantile so virtuoso octaves target genuine melodic climaxes
  const vels = baseNotes.map((n) => n[5]).sort((a, b) => a - b);
  const p62 = vels[Math.min(vels.length - 1, Math.floor(vels.length * (isAnimePiece ? 0.56 : 0.62)))] || 0.55;

  if (versionId === "virtuoso") {
    const timeScale = isAnimePiece ? 0.99 : 0.98; // Crisp heroic concert pacing
    const outNotes = [];
    let lastSubOctaveT = -10;
    let lastHighOctaveT = -10;
    let lastCascadeT = -10;
    let maxEnd = 0;

    for (let sIdx = 0; sIdx < slices.length; sIdx++) {
      const slice = slices[sIdx];
      const group = slice.notes;
      // Sort slice low-to-high so chord rolling sweeps naturally bottom-to-top
      group.sort((a, b) => a[4] - b[4]);

      const minMidi = group[0][4];
      const maxMidi = group[group.length - 1][4];
      const existingMidis = new Set(group.map((g) => g[4]));
      const isRichChord = group.length >= 3;

      for (let j = 0; j < group.length; j++) {
        const n = group[j];
        const rollOff = isRichChord ? j * 0.010 : 0;
        const t = n[0] * timeScale + rollOff;
        const dur = Math.max(0.055, n[1] * timeScale);
        const midi = n[4];
        const hand = n[6];
        // Wider dramatic dynamic range
        const vel = Math.max(0.24, Math.min(0.97, n[5] * 1.12 + 0.04));

        outNotes.push([t, dur, n[2], n[3], midi, vel, hand]);
        if (t + dur > maxEnd) maxEnd = t + dur;

        // 1) Deep concert bass sub-octave on strong low roots (Liszt/Rachmaninoff concert weight)
        if (
          j === 0 &&
          midi >= 33 &&
          midi <= 54 &&
          (hand === "LH" || midi <= 48) &&
          t - lastSubOctaveT >= 0.34
        ) {
          const subMidi = midi - 12;
          if (subMidi >= 21 && !existingMidis.has(subMidi)) {
            outNotes.push([
              t,
              Math.min(dur * 1.25, 3.2),
              n[2],
              n[3],
              subMidi,
              Math.min(0.92, vel * 0.86),
              "LH",
            ]);
            existingMidis.add(subMidi);
            lastSubOctaveT = t;
          }
        }

        // 2) Sparkling concert upper octave on prominent melodic peaks
        if (
          j === group.length - 1 &&
          midi === maxMidi &&
          midi >= 64 &&
          midi <= 92 &&
          hand === "RH" &&
          n[5] >= p62 &&
          t - lastHighOctaveT >= 0.16
        ) {
          const hiMidi = midi + 12;
          if (hiMidi <= 108 && !existingMidis.has(hiMidi)) {
            outNotes.push([
              t + 0.004,
              dur * 0.96,
              n[2],
              n[3],
              hiMidi,
              Math.min(0.94, vel * 0.80),
              "RH",
            ]);
            existingMidis.add(hiMidi);
            lastHighOctaveT = t;
          }
        }
      }

      // 3) Inner harmonic fifth/octave support on wide sparse open textures
      if (group.length === 2 && maxMidi - minMidi >= 16 && minMidi >= 36 && minMidi <= 55) {
        const fifth = minMidi + 7;
        if (!existingMidis.has(fifth) && fifth < maxMidi - 4) {
          const base = group[0];
          const t = base[0] * timeScale + 0.008;
          outNotes.push([
            t,
            Math.max(0.08, base[1] * timeScale * 0.9),
            base[2],
            base[3],
            fifth,
            Math.min(0.76, base[5] * 0.72),
            "LH",
          ]);
        }
      }

      // 4) Animenz-style cascading harmonic arpeggio sweep during sustained anime chord holds
      if (isAnimePiece && group.length >= 2 && minMidi <= 56) {
        const nextSlice = slices[sIdx + 1];
        const gapSec = nextSlice ? (nextSlice.t - slice.t) * timeScale : 0;
        const baseT = slice.t * timeScale;
        if (gapSec >= 0.36 && gapSec <= 2.4 && baseT - lastCascadeT >= 0.72) {
          // Build strictly consonant ascending sweep strictly from the active chord's pitch classes
          const bassRoot = minMidi;
          const chordTones = [];
          const candidates = [
            bassRoot + 7,
            bassRoot + 12,
            ...group.slice(1).map((g) => g[4]),
            ...group.slice(1).map((g) => g[4] + 12),
          ]
            .filter((m) => m >= 48 && m <= 96 && m > bassRoot + 4)
            .sort((a, b) => a - b);
          for (const m of candidates) {
            if (chordTones.length === 0 || m - chordTones[chordTones.length - 1] >= 3) {
              chordTones.push(m);
            }
            if (chordTones.length >= 4) break;
          }
          if (chordTones.length >= 3) {
            const stepSec = Math.min(0.082, Math.max(0.052, (gapSec * 0.78) / chordTones.length));
            const ref = group[0];
            for (let k = 0; k < chordTones.length; k++) {
              const ct = baseT + stepSec * (k + 1);
              if (nextSlice && ct >= nextSlice.t * timeScale - 0.03) break;
              const cdur = Math.max(0.14, Math.min(0.55, gapSec - stepSec * (k + 1) + 0.08));
              const cvel = Math.max(0.32, Math.min(0.74, ref[5] * (0.64 + k * 0.04)));
              outNotes.push([
                ct,
                cdur,
                ref[2] + k * 0.25,
                0.25,
                chordTones[k],
                cvel,
                chordTones[k] >= 62 ? "RH" : "LH",
              ]);
              if (ct + cdur > maxEnd) maxEnd = ct + cdur;
            }
            lastCascadeT = baseT;
          }
        }
      }
    }

    outNotes.sort((a, b) => a[0] - b[0] || a[4] - b[4]);
    const outPedal = basePedal.map((p) => [p[0] * timeScale, p[1] * timeScale]);
    return {
      alignedNotes: outNotes,
      kneePedal: outPedal,
      durationSec: Math.max(baseDur * timeScale, maxEnd + 2.0),
      bpm: Math.round(baseBpm / timeScale),
      versionId,
      isAlternateMidi: Boolean(rawScore._isAlternateMidi),
    };
  }

  if (versionId === "chamber") {
    const timeScale = 1.07; // Lyrical, unhurried salon rubato feel
    const outNotes = [];
    let maxEnd = 0;

    for (let sIdx = 0; sIdx < slices.length; sIdx++) {
      const group = slices[sIdx].notes;
      let maxMidi = -1;
      for (const n of group) {
        if (n[4] > maxMidi) maxMidi = n[4];
      }
      for (const n of group) {
        const t = n[0] * timeScale;
        const dur = Math.max(0.06, n[1] * timeScale * 1.04);
        const isTopVoice = n[4] === maxMidi && n[6] === "RH";
        const vel = isTopVoice
          ? Math.max(0.38, Math.min(0.88, n[5] * 1.14 + 0.06))
          : Math.max(0.24, Math.min(0.72, n[5] * 0.82));
        outNotes.push([t, dur, n[2], n[3], n[4], vel, n[6]]);
        if (t + dur > maxEnd) maxEnd = t + dur;
      }
    }

    outNotes.sort((a, b) => a[0] - b[0] || a[4] - b[4]);
    // Trim pedal intervals slightly (92%) so chamber phrasing stays luminous and uncluttered
    const outPedal = basePedal
      .map((p) => {
        const t0 = p[0] * timeScale;
        const t1 = t0 + (p[1] - p[0]) * timeScale * 0.90;
        return t1 > t0 + 0.05 ? [t0, t1] : null;
      })
      .filter(Boolean);

    return {
      alignedNotes: outNotes,
      kneePedal: outPedal,
      durationSec: Math.max(baseDur * timeScale, maxEnd + 2.0),
      bpm: Math.round(baseBpm / timeScale),
      versionId,
      isAlternateMidi: false,
    };
  }

  // "study": Clear practice edition — 18% slower, balanced hands, crisp unpedaled articulation
  const timeScale = 1.18;
  const outNotes = [];
  let maxEnd = 0;
  for (let i = 0; i < baseNotes.length; i++) {
    const n = baseNotes[i];
    const t = n[0] * timeScale;
    const dur = Math.max(0.07, n[1] * timeScale * 0.94);
    const vel = Math.max(0.54, Math.min(0.78, 0.56 + n[5] * 0.24));
    outNotes.push([t, dur, n[2], n[3], n[4], vel, n[6]]);
    if (t + dur > maxEnd) maxEnd = t + dur;
  }

  return {
    alignedNotes: outNotes,
    kneePedal: [], // Unpedaled so every harmony & inner voice is crystal-clear for study
    durationSec: Math.max(baseDur * timeScale, maxEnd + 2.0),
    bpm: Math.round(baseBpm / timeScale),
    versionId: "study",
    isAlternateMidi: false,
  };
}
