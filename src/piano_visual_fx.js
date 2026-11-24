/**
 * Concert Grand Piano 3D Visual Enhancements:
 *  1. Composite 3-Pedal Concert Lyre (Una Corda, Sostenuto, Damper Sustain)
 *     with interactive raycast picking, smooth mechanical articulation, and brand material sync.
 *  2. Dynamic HD 3D Music Desk Sheet Music (CanvasTexture on MusicDesk_Pivot)
 *     rendering live treble/bass grand staff with active sounding note highlights.
 *  3. Dual-Mode 3D Note Animation Engine (Zero-GC InstancedMesh pools):
 *     - Falling 3D Piano-Roll Note Ribbons (LH sapphire / RH concert gold) aligned to all 61 keys
 *     - Luminous Acoustic Particles & Impact Glow Motes rising from struck keys and strings
 */

import * as THREE from "three";

const FORTEPIANO_MIN_MIDI = 29;
const FORTEPIANO_TOTAL_KEYS = 61;
const NOTE_NAMES_FX = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
function midiToNoteName(midi) {
  const m = Math.round(midi);
  return `${NOTE_NAMES_FX[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
}

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

// Reusable zero-GC scratch objects for render loop
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();
const _box = new THREE.Box3();
const _vec = new THREE.Vector3();
const _invAnchor = new THREE.Matrix4();

// ============================================================================
// 1. COMPOSITE 3/4-PEDAL CONCERT LYRE (Fazioli F308 4-Pedal + Modern 3-Pedal)
// ============================================================================
export function buildConcertPedalLyre(pianoAnchor, isSoftwareGL = false) {
  const lyreGroup = new THREE.Group();
  lyreGroup.name = "ConcertGrand_PedalLyre";
  lyreGroup.position.set(0.0, 0.0, -0.28);

  const woodMat = new THREE.MeshPhysicalMaterial({
    name: "PedalLyre_CaseWood",
    color: 0x0c0c0e,
    roughness: 0.08,
    metalness: 0.02,
    clearcoat: 0.96,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.35,
  });

  const brassMat = new THREE.MeshPhysicalMaterial({
    name: "PedalLyre_BrassHardware",
    color: 0xd8b158,
    roughness: 0.22,
    metalness: 0.92,
    clearcoat: 0.35,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.45,
  });

  const rodMat = new THREE.MeshPhysicalMaterial({
    name: "PedalLyre_LinkageRods",
    color: 0xc8a454,
    roughness: 0.28,
    metalness: 0.90,
    envMapIntensity: 1.25,
  });

  const feltMat = new THREE.MeshStandardMaterial({
    name: "PedalLyre_SlotFelt",
    color: 0x6e1419,
    roughness: 0.92,
    metalness: 0.0,
  });

  // 1. Grounded bottom pedal box (plinth resting flush at stage floor y = 0.0..0.110)
  const pedalBox = new THREE.Mesh(new THREE.BoxGeometry(0.265, 0.088, 0.11), woodMat);
  pedalBox.position.set(0, 0.064, 0);
  lyreGroup.add(pedalBox);

  const footPlate = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.020, 0.125), woodMat);
  footPlate.position.set(0, 0.010, 0);
  lyreGroup.add(footPlate);

  const escutcheon = new THREE.Mesh(new THREE.BoxGeometry(0.215, 0.038, 0.010), brassMat);
  escutcheon.position.set(0, 0.064, 0.053);
  lyreGroup.add(escutcheon);

  const feltStrip = new THREE.Mesh(new THREE.BoxGeometry(0.198, 0.022, 0.012), feltMat);
  feltStrip.position.set(0, 0.064, 0.054);
  lyreGroup.add(feltStrip);

  // 2. Top cross-beam mounting block attaching flush to underside of piano belly (y ≈ 0.65)
  const topBlock = new THREE.Mesh(new THREE.BoxGeometry(0.295, 0.048, 0.118), woodMat);
  topBlock.position.set(0, 0.648, 0);
  lyreGroup.add(topBlock);

  // 3. Two tapered turned lyre columns with brass top/bottom ferrules (repositioned for 3 vs 4 pedals)
  const colGeo = new THREE.CylinderGeometry(0.015, 0.019, 0.535, 16);
  const ferruleGeo = new THREE.CylinderGeometry(0.020, 0.021, 0.022, 16);
  const sideCols = [];
  for (const sign of [-1, 1]) {
    const colGrp = new THREE.Group();
    colGrp.position.set(sign * 0.098, 0, 0);

    const col = new THREE.Mesh(colGeo, woodMat);
    col.position.set(0, 0.376, 0);
    colGrp.add(col);

    const botFerrule = new THREE.Mesh(ferruleGeo, brassMat);
    botFerrule.position.set(0, 0.118, 0);
    colGrp.add(botFerrule);

    const topFerrule = new THREE.Mesh(ferruleGeo, brassMat);
    topFerrule.position.set(0, 0.616, 0);
    colGrp.add(topFerrule);

    lyreGroup.add(colGrp);
    sideCols.push({ grp: colGrp, sign });
  }

  // 4. Two angled rear stability brace struts rising from pedal box toward belly underside
  const braceGeo = new THREE.CylinderGeometry(0.0095, 0.011, 0.68, 10);
  for (const sx of [-0.082, 0.082]) {
    const brace = new THREE.Mesh(braceGeo, woodMat);
    brace.position.set(sx, 0.365, -0.21);
    brace.rotation.x = 0.55;
    lyreGroup.add(brace);
  }

  // 5. Four Vertical Brass Linkage Rods & Sculpted Beveled Pedals (4th pedal visible only on Fazioli F308)
  const rodGeo = new THREE.CylinderGeometry(0.0046, 0.0046, 0.55, 10);
  const pedalShape = new THREE.Shape();
  pedalShape.moveTo(-0.013, 0);
  pedalShape.lineTo(0.013, 0);
  pedalShape.lineTo(0.018, 0.098);
  pedalShape.quadraticCurveTo(0.021, 0.138, 0.0, 0.144);
  pedalShape.quadraticCurveTo(-0.021, 0.138, -0.018, 0.098);
  pedalShape.closePath();

  const pedalGeo = new THREE.ExtrudeGeometry(pedalShape, {
    depth: 0.011,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.0025,
    bevelSegments: 2,
  });
  pedalGeo.rotateX(Math.PI * 0.5);
  pedalGeo.translate(0, 0.006, 0);

  const pedalIds = ["una_corda", "sostenuto", "fazioli_soft", "sustain"];
  const pedalLabels = {
    una_corda: "Педаль Una Corda (Мягкий тембр)",
    sostenuto: "Педаль Sostenuto (Средняя)",
    fazioli_soft: "4-я педаль Fazioli (Укороченный ход молоточков)",
    sustain: "Педаль Sustain (Сустейн / Демпфер)",
  };

  const pedalPivots = {};
  const pedalPickMeshes = [];
  const pedalMeshToId = new Map();

  for (let i = 0; i < pedalIds.length; i++) {
    const pid = pedalIds[i];
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.set(0, 0.382, -0.005);
    lyreGroup.add(rod);

    const pivot = new THREE.Group();
    pivot.name = `PedalPivot_${pid}`;
    pivot.position.set(0, 0.066, 0.022);

    const mesh = new THREE.Mesh(pedalGeo, brassMat);
    mesh.name = `PedalMesh_${pid}`;
    pivot.add(mesh);

    const hitGeo = new THREE.BoxGeometry(0.052, 0.06, 0.18);
    const hitMesh = new THREE.Mesh(
      hitGeo,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.set(0, 0, 0.085);
    pivot.add(hitMesh);

    lyreGroup.add(pivot);
    pedalPivots[pid] = { pivot, rod, restY: 0.382, value: 0, mesh, hitMesh };
    pedalPickMeshes.push(mesh, hitMesh);
    pedalMeshToId.set(mesh, pid);
    pedalMeshToId.set(hitMesh, pid);
  }

  let hasFourPedals = false;

  function applyPedalLayout(fourPedals) {
    hasFourPedals = Boolean(fourPedals);
    const widthScale = hasFourPedals ? 1.24 : 1.0;
    pedalBox.scale.x = widthScale;
    footPlate.scale.x = widthScale;
    escutcheon.scale.x = widthScale;
    feltStrip.scale.x = widthScale;
    topBlock.scale.x = widthScale;

    for (const c of sideCols) {
      c.grp.position.x = c.sign * (hasFourPedals ? 0.128 : 0.098);
    }

    if (hasFourPedals) {
      // Authentic Fazioli F308 4-pedal spacing: Una Corda | Sostenuto | 4th Soft | Sustain
      const xs = { una_corda: -0.087, sostenuto: -0.029, fazioli_soft: 0.029, sustain: 0.087 };
      const splays = { una_corda: -0.09, sostenuto: -0.02, fazioli_soft: 0.02, sustain: 0.09 };
      for (const pid of pedalIds) {
        const p = pedalPivots[pid];
        p.pivot.visible = true;
        p.rod.visible = true;
        p.pivot.position.x = xs[pid];
        p.rod.position.x = xs[pid];
        p.pivot.rotation.y = splays[pid];
      }
    } else {
      // Classic Concert Grand 3-pedal spacing
      const xs = { una_corda: -0.060, sostenuto: 0.0, sustain: 0.060 };
      const splays = { una_corda: -0.09, sostenuto: 0.0, sustain: 0.09 };
      for (const pid of pedalIds) {
        const p = pedalPivots[pid];
        const show = pid !== "fazioli_soft";
        p.pivot.visible = show;
        p.rod.visible = show;
        if (show) {
          p.pivot.position.x = xs[pid];
          p.rod.position.x = xs[pid];
          p.pivot.rotation.y = splays[pid];
        }
      }
    }
  }

  applyPedalLayout(false);
  pianoAnchor.add(lyreGroup);

  function syncPianoModelVisual(model) {
    if (!model?.visual) return;
    const v = model.visual;

    // Historical 1780 Stein-Schule fortepiano uses authentic knee levers (Kniehebel), NOT a modern pedal lyre
    if (v.isHistorical) {
      lyreGroup.visible = false;
      return;
    }

    lyreGroup.visible = true;
    applyPedalLayout(Boolean(v.hasFourthPedal));

    if (v.isCrystal) {
      woodMat.color.setHex(v.caseColor || 0xdff2ff);
      woodMat.roughness = 0.05;
      woodMat.clearcoat = 1.0;
      woodMat.transparent = true;
      woodMat.opacity = isSoftwareGL ? 0.42 : 0.62;
      woodMat.transmission = isSoftwareGL ? 0.0 : 0.78;
      woodMat.ior = 1.54;
      brassMat.color.setHex(v.hardwareColor || 0xe8f0f8);
      rodMat.color.setHex(v.hardwareColor || 0xd8e4f0);
      feltMat.color.setHex(v.clothColor || 0x25589c);
    } else {
      woodMat.color.setHex(v.caseColor ?? 0x0c0c0e);
      woodMat.roughness = v.caseRoughness ?? 0.08;
      woodMat.clearcoat = v.caseClearcoat ?? 0.96;
      woodMat.transparent = false;
      woodMat.opacity = 1.0;
      woodMat.transmission = 0.0;
      brassMat.color.setHex(v.hardwareColor ?? 0xd8b158);
      rodMat.color.setHex(v.hardwareColor ?? 0xc8a454);
      feltMat.color.setHex(v.feltAccentColor ?? v.clothColor ?? 0x6e1419);
    }
    woodMat.needsUpdate = true;
    brassMat.needsUpdate = true;
    rodMat.needsUpdate = true;
  }

  function updatePedals(
    sustainAmt,
    unaCordaAmt,
    sostenutoAmt,
    fazioliSoftAmt,
    dt,
    instant = false
  ) {
    if (!lyreGroup.visible) return false;
    const k = instant ? 1.0 : 1.0 - Math.exp(-18.0 * Math.min(0.05, Math.max(0, dt)));
    const targets = {
      sustain: Math.max(0, Math.min(1, sustainAmt)),
      una_corda: Math.max(0, Math.min(1, unaCordaAmt)),
      sostenuto: Math.max(0, Math.min(1, sostenutoAmt)),
      fazioli_soft: hasFourPedals ? Math.max(0, Math.min(1, fazioliSoftAmt)) : 0.0,
    };
    let moving = false;
    for (const pid of pedalIds) {
      const p = pedalPivots[pid];
      if (!p.pivot.visible) continue;
      const diff = targets[pid] - p.value;
      if (Math.abs(diff) > 0.001) moving = true;
      p.value += diff * k;
      p.pivot.rotation.x = p.value * 0.21;
      p.rod.position.y = p.restY + p.value * 0.012;
    }
    return moving;
  }

  function pickPedalAtRay(raycaster) {
    if (!lyreGroup.visible) return null;
    const activePickers = pedalPickMeshes.filter((m) => m.parent && m.parent.visible);
    const hits = raycaster.intersectObjects(activePickers, false);
    if (hits.length > 0) {
      return pedalMeshToId.get(hits[0].object) || null;
    }
    return null;
  }

  return {
    group: lyreGroup,
    pedalLabels,
    syncPianoModelVisual,
    updatePedals,
    pickPedalAtRay,
  };
}

// ============================================================================
// 2. REAL-TIME 2048×1024 HD ENGRAVED SCROLLING SHEET MUSIC ON 3D MUSIC DESK
// ============================================================================
// Chromatic pitch-class spelling tables (Sharp-key vs Flat-key)
// [diatonicLetterIndex 0..6 (C..B), accidentalOffset (-1 flat, 0 nat, +1 sharp)]
const SPELL_SHARP = [
  [0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0],
  [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0],
];
const SPELL_FLAT = [
  [0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0],
  [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0],
];

// Diatonic letter order of sharps (F C G D A E B) and flats (B E A D G C F)
const SHARP_LETTERS = [3, 0, 4, 1, 5, 2, 6];
const FLAT_LETTERS = [6, 2, 5, 1, 4, 0, 3];

// Standard engraving positions (diatonic step relative to C4=0) for Key Signatures
// Treble staff: E4=2 (bottom line) .. F5=10 (top line)
const TREBLE_SHARP_STEPS = [10, 7, 11, 8, 5, 9, 6]; // F5 C5 G5 D5 A4 E5 B4
const TREBLE_FLAT_STEPS = [6, 9, 5, 8, 4, 7, 3];   // B4 E5 A4 D5 G4 C5 F4
// Bass staff: G2=-10 (bottom line) .. A3=-2 (top line)
const BASS_SHARP_STEPS = [-4, -7, -3, -6, -9, -5, -8]; // F3 C3 G3 D3 A2 E3 B2
const BASS_FLAT_STEPS = [-8, -5, -9, -6, -10, -7, -11]; // B2 E3 A2 D3 G2 C3 F2

function parsePieceScoreSpec(keySigText = "") {
  const txt = String(keySigText || "").toLowerCase();

  // 1. Parse time signature
  let num = 4;
  let den = 4;
  let beatsPerBar = 4;
  if (txt.includes("12/8")) {
    num = 12;
    den = 8;
    beatsPerBar = 12;
  } else if (txt.includes("9/8")) {
    num = 9;
    den = 8;
    beatsPerBar = 9;
  } else if (txt.includes("6/8")) {
    num = 6;
    den = 8;
    beatsPerBar = 6;
  } else if (txt.includes("3/8")) {
    num = 3;
    den = 8;
    beatsPerBar = 3;
  } else if (txt.includes("3/4")) {
    num = 3;
    den = 4;
    beatsPerBar = 3;
  } else if (txt.includes("2/2") || txt.includes("alla breve")) {
    num = 2;
    den = 2;
    beatsPerBar = 4;
  } else if (txt.includes("2/4")) {
    num = 2;
    den = 4;
    beatsPerBar = 2;
  } else if (txt.includes("4/4") || txt.includes("c")) {
    num = 4;
    den = 4;
    beatsPerBar = 4;
  }

  // 2. Parse key signature (positive = sharps, negative = flats)
  let fifths = 0;
  if (txt.includes("g♯ minor") || txt.includes("g# minor") || txt.includes("соль-диез")) fifths = 5;
  else if (txt.includes("c♯ minor") || txt.includes("c# minor") || txt.includes("до-диез")) fifths = 4;
  else if (txt.includes("a major") || txt.includes("ля мажор")) fifths = 3;
  else if (txt.includes("b minor") || txt.includes("си минор") || txt.includes("d major") || txt.includes("ре мажор")) fifths = 2;
  else if (txt.includes("g major") || txt.includes("e minor") || txt.includes("ми минор") || txt.includes("соль мажор")) fifths = 1;
  else if (txt.includes("g♭ major") || txt.includes("gb major") || txt.includes("соль-бемоль")) fifths = -6;
  else if (txt.includes("d♭ major") || txt.includes("db major") || txt.includes("ре-бемоль") || txt.includes("b♭ minor") || txt.includes("bb minor") || txt.includes("си-бемоль минор")) fifths = -5;
  else if (txt.includes("f minor") || txt.includes("фа минор")) fifths = -4;
  else if (txt.includes("e♭ major") || txt.includes("eb major") || txt.includes("ми-бемоль") || txt.includes("c minor")) fifths = -3;
  else if (txt.includes("b♭ major") || txt.includes("g minor") || txt.includes("соль минор")) fifths = -2;
  else if (txt.includes("d minor") || txt.includes("ре минор") || txt.includes("f major") || txt.includes("фа мажор")) fifths = -1;
  else fifths = 0;

  // Build map of diatonic letter (0..6) -> key accidental (-1, 0, +1)
  const keyAccMap = [0, 0, 0, 0, 0, 0, 0];
  if (fifths > 0) {
    for (let i = 0; i < fifths; i++) keyAccMap[SHARP_LETTERS[i]] = 1;
  } else if (fifths < 0) {
    for (let i = 0; i < -fifths; i++) keyAccMap[FLAT_LETTERS[i]] = -1;
  }

  return {
    num,
    den,
    beatsPerBar,
    fifths,
    useFlats: fifths < 0,
    keyAccMap,
  };
}

function spellMidiNote(midi, useFlats) {
  const m = Math.round(midi);
  const oct = Math.floor(m / 12) - 1;
  const pc = ((m % 12) + 12) % 12;
  const [letter, acc] = (useFlats ? SPELL_FLAT : SPELL_SHARP)[pc];
  const step = (oct - 4) * 7 + letter; // C4 = 0
  return { step, letter, acc, midi: m };
}

function parsePieceMeasures(piece, spec) {
  const raw = piece?.alignedNotes || [];
  if (!raw.length) return [];

  const bpm = Number(piece.bpm || 100);
  const secPerBeatFallback = 60.0 / Math.max(30, bpm);
  const beatsPerBar = spec.beatsPerBar;

  // Detect whether alignedNotes has meaningful musical beat indices at col [2]
  let maxBeatCol = 0;
  for (let i = 0; i < Math.min(raw.length, 40); i++) {
    const bVal = Number(raw[i][2]);
    if (Number.isFinite(bVal) && bVal > maxBeatCol) maxBeatCol = bVal;
  }
  const hasBeatCol = maxBeatCol > 0.2;

  const measureMap = new Map();
  for (let i = 0; i < raw.length; i++) {
    const n = raw[i];
    const t = Number(n[0] ?? 0);
    const dur = Math.max(0.05, Number(n[1] ?? 0.25));
    const beat = hasBeatCol ? Number(n[2] ?? 0) : Math.max(0, (t - 0.3) / secPerBeatFallback);
    const durBeats = hasBeatCol
      ? Math.max(0.12, Number(n[3] ?? 0.5))
      : Math.max(0.12, dur / secPerBeatFallback);
    const midi = Math.round(Number(n[4] ?? 60));
    const hand = n[6] === "LH" || n[6] === "RH" ? n[6] : midi >= 60 ? "RH" : "LH";

    const barIdx = Math.max(0, Math.floor(beat / beatsPerBar + 1e-4));
    const beatInBar = Math.max(0, beat - barIdx * beatsPerBar);

    let bar = measureMap.get(barIdx);
    if (!bar) {
      bar = {
        barIdx,
        tStart: t,
        tEnd: t + dur,
        rh: [],
        lh: [],
      };
      measureMap.set(barIdx, bar);
    } else {
      if (t < bar.tStart) bar.tStart = t;
      if (t + dur > bar.tEnd) bar.tEnd = t + dur;
    }

    const sp = spellMidiNote(midi, spec.useFlats);
    const entry = {
      t,
      tEnd: t + dur,
      beatInBar,
      durBeats,
      midi,
      step: sp.step,
      letter: sp.letter,
      acc: sp.acc,
      hand,
    };
    if (hand === "RH") bar.rh.push(entry);
    else bar.lh.push(entry);
  }

  const maxBar = Math.max(...measureMap.keys());
  const measures = [];
  let prevEnd = 0;
  for (let bi = 0; bi <= maxBar; bi++) {
    const bar = measureMap.get(bi);
    if (bar) {
      bar.rh.sort((a, b) => a.beatInBar - b.beatInBar || a.step - b.step);
      bar.lh.sort((a, b) => a.beatInBar - b.beatInBar || a.step - b.step);
      measures.push(bar);
      prevEnd = Math.max(prevEnd, bar.tEnd);
    } else {
      measures.push({ barIdx: bi, tStart: prevEnd, tEnd: prevEnd + 0.5, rh: [], lh: [] });
    }
  }
  return measures;
}

/**
 * Vector engraving helpers for razor-sharp Treble Clef, Bass Clef, and Grand-Staff Curly Brace
 * (100% crisp across Linux/macOS/Windows without relying on missing Unicode musical fonts)
 */
function drawEngravedBrace(ctx, x, yTop, yBot) {
  const mid = (yTop + yBot) * 0.5;
  const h = yBot - yTop;
  ctx.save();
  ctx.strokeStyle = "#1b140d";
  ctx.lineWidth = 4.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + 8, yTop);
  ctx.bezierCurveTo(x - 16, yTop + h * 0.14, x + 6, mid - h * 0.10, x - 14, mid);
  ctx.bezierCurveTo(x + 6, mid + h * 0.10, x - 16, yBot - h * 0.14, x + 8, yBot);
  ctx.stroke();
  ctx.restore();
}

function drawTrebleClef(ctx, x, trebleTopY, gap) {
  // G4 line is trebleTopY + 3 * gap
  const gY = trebleTopY + 3 * gap;
  ctx.save();
  ctx.strokeStyle = "#1d150e";
  ctx.fillStyle = "#1d150e";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Main central spine with bottom hook
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(x + 4, trebleTopY - gap * 1.15);
  ctx.bezierCurveTo(x + 22, trebleTopY - gap * 0.65, x + 16, trebleTopY + gap * 1.1, x - 6, trebleTopY + gap * 2.1);
  ctx.bezierCurveTo(x - 24, trebleTopY + gap * 3.0, x - 18, trebleTopY + gap * 4.55, x + 4, trebleTopY + gap * 4.35);
  ctx.bezierCurveTo(x + 24, trebleTopY + gap * 4.15, x + 22, trebleTopY + gap * 2.35, x + 4, trebleTopY + gap * 2.45);
  ctx.bezierCurveTo(x - 10, trebleTopY + gap * 2.55, x - 8, gY + gap * 0.55, x + 3, gY + gap * 0.35);
  ctx.stroke();

  // Vertical staff axis through loop down to finial dot
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(x + 2, trebleTopY - gap * 1.12);
  ctx.bezierCurveTo(x - 4, trebleTopY + gap * 0.6, x + 6, trebleTopY + gap * 3.8, x - 2, trebleTopY + gap * 5.25);
  ctx.quadraticCurveTo(x - 8, trebleTopY + gap * 5.75, x - 14, trebleTopY + gap * 5.35);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x - 14, trebleTopY + gap * 5.25, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBassClef(ctx, x, bassTopY, gap) {
  // F3 line is bassTopY + gap
  const fY = bassTopY + gap;
  ctx.save();
  ctx.strokeStyle = "#1d150e";
  ctx.fillStyle = "#1d150e";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.arc(x - 10, fY, 6.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 5.4;
  ctx.beginPath();
  ctx.moveTo(x - 10, fY);
  ctx.bezierCurveTo(x - 10, bassTopY - gap * 0.25, x + 18, bassTopY - gap * 0.15, x + 16, bassTopY + gap * 1.45);
  ctx.bezierCurveTo(x + 14, bassTopY + gap * 2.8, x - 2, bassTopY + gap * 3.65, x - 14, bassTopY + gap * 4.05);
  ctx.stroke();

  // Two signature F-clef dots straddling F3 line
  ctx.beginPath();
  ctx.arc(x + 25, bassTopY + gap * 0.5, 4.0, 0, Math.PI * 2);
  ctx.arc(x + 25, bassTopY + gap * 1.5, 4.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createMusicDeskScore(pianoAnchor, rigNodes, maxAniso = 4, isMobile = false) {
  const drawScale = isMobile ? 0.5 : 1.0;
  const VIRTUAL_W = 2048;
  const VIRTUAL_H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(VIRTUAL_W * drawScale);
  canvas.height = Math.round(VIRTUAL_H * drawScale);
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(isMobile ? 4 : 8, maxAniso || 4);
  texture.generateMipmaps = !isMobile;
  if (isMobile) {
    texture.minFilter = THREE.LinearFilter;
  }

  const pageMat = new THREE.MeshStandardMaterial({
    name: "MusicDesk_LiveScore",
    map: texture,
    emissive: new THREE.Color(0xfff8eb),
    emissiveMap: texture,
    emissiveIntensity: 0.44,
    roughness: 0.84,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const coverMat = new THREE.MeshStandardMaterial({
    name: "MusicDesk_BookCover",
    color: 0x241612,
    roughness: 0.58,
    metalness: 0.06,
  });

  const scoreGroup = new THREE.Group();
  scoreGroup.name = "MusicDesk_ScoreBookAssembly";
  scoreGroup.position.set(0.0, 1.004, -0.292);
  scoreGroup.rotation.x = -0.34;

  const bookW = 0.438;
  const bookH = 0.236;

  // Hardbound concert Urtext folio cover backing
  const coverMesh = new THREE.Mesh(
    new THREE.BoxGeometry(bookW + 0.016, bookH + 0.012, 0.006),
    coverMat
  );
  coverMesh.position.set(0, 0, -0.0045);
  scoreGroup.add(coverMesh);

  // Subtle layered page-block edge thickness
  const pagesBlock = new THREE.Mesh(
    new THREE.BoxGeometry(bookW + 0.004, bookH + 0.002, 0.004),
    new THREE.MeshStandardMaterial({ color: 0xe9dec8, roughness: 0.9 })
  );
  pagesBlock.position.set(0, 0, -0.002);
  scoreGroup.add(pagesBlock);

  // Open double-page engraved Urtext front sheet
  const sheetMesh = new THREE.Mesh(new THREE.PlaneGeometry(bookW, bookH), pageMat);
  sheetMesh.name = "MusicDesk_SheetScoreMesh";
  sheetMesh.position.set(0, 0, 0.0005);
  scoreGroup.add(sheetMesh);

  pianoAnchor.add(scoreGroup);

  let currentMeta = {
    title: "К Элизе (Für Elise), WoO 59",
    composer: "Людвиг ван Бетховен",
    genre: "Багатель",
    keySignature: "A Minor · 3/8",
  };
  let currentSpec = parsePieceScoreSpec(currentMeta.keySignature);
  let currentMeasures = [];
  let lastDrawSig = "";
  let lastDrawMs = 0;

  function setHistoricalOffset(isHistorical) {
    // On Stein 1780, offset book cleanly IN FRONT of the historical wooden Notenpult rack
    // On scaled modern 88-key grands (1.08x Z), sit flush in front of the bespoke carved brand music desk
    scoreGroup.position.z = isHistorical ? -0.252 : -0.316;
  }

  function stepToY(step, isTreble, trebleTopY, bassTopY, gap) {
    if (isTreble) {
      // E4 (step 2) is bottom treble line (trebleTopY + 4*gap)
      return trebleTopY + 4 * gap - (step - 2) * (gap * 0.5);
    }
    // A3 (step -2) is top bass line (bassTopY); G2 (step -10) is bottom bass line
    return bassTopY - (step - -2) * (gap * 0.5);
  }

  function drawLedgerLines(nx, step, isTreble, trebleTopY, bassTopY, gap, color = "#1e160e") {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    if (isTreble) {
      if (step <= 0) {
        for (let s = 0; s >= step; s -= 2) {
          const ly = stepToY(s, true, trebleTopY, bassTopY, gap);
          ctx.beginPath();
          ctx.moveTo(nx - 22, ly);
          ctx.lineTo(nx + 22, ly);
          ctx.stroke();
        }
      } else if (step >= 12) {
        for (let s = 12; s <= step; s += 2) {
          const ly = stepToY(s, true, trebleTopY, bassTopY, gap);
          ctx.beginPath();
          ctx.moveTo(nx - 22, ly);
          ctx.lineTo(nx + 22, ly);
          ctx.stroke();
        }
      }
    } else {
      if (step >= 0) {
        for (let s = 0; s <= step; s += 2) {
          const ly = stepToY(s, false, trebleTopY, bassTopY, gap);
          ctx.beginPath();
          ctx.moveTo(nx - 22, ly);
          ctx.lineTo(nx + 22, ly);
          ctx.stroke();
        }
      } else if (step <= -12) {
        for (let s = -12; s >= step; s -= 2) {
          const ly = stepToY(s, false, trebleTopY, bassTopY, gap);
          ctx.beginPath();
          ctx.moveTo(nx - 22, ly);
          ctx.lineTo(nx + 22, ly);
          ctx.stroke();
        }
      }
    }
  }

  function drawKeySignature(xStart, trebleTopY, bassTopY, gap, spec) {
    const count = Math.abs(spec.fifths);
    if (count === 0) return xStart;
    const isSharp = spec.fifths > 0;
    const glyph = isSharp ? "♯" : "♭";
    const tSteps = isSharp ? TREBLE_SHARP_STEPS : TREBLE_FLAT_STEPS;
    const bSteps = isSharp ? BASS_SHARP_STEPS : BASS_FLAT_STEPS;

    ctx.fillStyle = "#1d150e";
    ctx.font = "700 34px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < count; i++) {
      const gx = xStart + i * 20;
      const ty = stepToY(tSteps[i], true, trebleTopY, bassTopY, gap);
      const by = stepToY(bSteps[i], false, trebleTopY, bassTopY, gap);
      ctx.fillText(glyph, gx, ty + 2);
      ctx.fillText(glyph, gx, by + 2);
    }
    return xStart + count * 20 + 14;
  }

  function drawTimeSignature(xPos, trebleTopY, bassTopY, gap, spec) {
    ctx.fillStyle = "#1d150e";
    ctx.font = "700 44px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Treble
    ctx.fillText(String(spec.num), xPos, trebleTopY + gap * 1.05);
    ctx.fillText(String(spec.den), xPos, trebleTopY + gap * 3.05);
    // Bass
    ctx.fillText(String(spec.num), xPos, bassTopY + gap * 1.05);
    ctx.fillText(String(spec.den), xPos, bassTopY + gap * 3.05);
    return xPos + 34;
  }

  function drawStaffVoiceNotes(
    notes,
    xLeft,
    xRight,
    isTreble,
    trebleTopY,
    bassTopY,
    gap,
    spec,
    curTimeSec,
    isPlaying,
    activeMidiSet
  ) {
    if (!notes || notes.length === 0) return;

    const padL = 22;
    const padR = 20;
    const usableW = Math.max(40, xRight - xLeft - padL - padR);
    const beatsPerBar = spec.beatsPerBar;

    // Track in-measure accidentals per diatonic step
    const barAccState = new Map();

    // Cluster simultaneous notes (within 0.08 beats) into vertical chord columns
    const columns = [];
    for (const n of notes) {
      const last = columns[columns.length - 1];
      if (last && Math.abs(n.beatInBar - last.beatInBar) < 0.08) {
        last.notes.push(n);
      } else {
        columns.push({
          beatInBar: n.beatInBar,
          durBeats: n.durBeats,
          t: n.t,
          tEnd: n.tEnd,
          notes: [n],
        });
      }
    }

    // Compute pixel positions & stem directions per column
    const midStep = isTreble ? 6 : -6; // B4 (treble middle line) / D3 (bass middle line)
    const placed = [];
    for (const col of columns) {
      const frac = Math.max(0, Math.min(0.95, col.beatInBar / beatsPerBar));
      const nx = xLeft + padL + frac * usableW;
      let sumStep = 0;
      let minStep = Infinity;
      let maxStep = -Infinity;
      let anyActive = false;

      for (const n of col.notes) {
        sumStep += n.step;
        if (n.step < minStep) minStep = n.step;
        if (n.step > maxStep) maxStep = n.step;
        const playingHit =
          isPlaying && curTimeSec >= n.t - 0.03 && curTimeSec <= n.tEnd + 0.04;
        if (playingHit || (!isPlaying && activeMidiSet.has(n.midi))) {
          anyActive = true;
        }
      }
      const avgStep = sumStep / col.notes.length;
      const stemUp = avgStep < midStep;
      const isHollow = col.durBeats >= 1.85;
      const isWhole = col.durBeats >= 3.6;
      const isEighth = col.durBeats <= 0.68;
      const isSixteenth = col.durBeats <= 0.34;
      const isDotted =
        (col.durBeats >= 1.35 && col.durBeats <= 1.75) ||
        (col.durBeats >= 2.65 && col.durBeats <= 3.35);

      const yLow = stepToY(minStep, isTreble, trebleTopY, bassTopY, gap);
      const yHigh = stepToY(maxStep, isTreble, trebleTopY, bassTopY, gap);
      const stemLen = 78;
      const stemX = stemUp ? nx + 11.5 : nx - 11.5;
      const stemYEnd = stemUp ? yHigh - stemLen : yLow + stemLen;

      placed.push({
        ...col,
        nx,
        minStep,
        maxStep,
        yLow,
        yHigh,
        stemUp,
        stemX,
        stemYEnd,
        isHollow,
        isWhole,
        isEighth,
        isSixteenth,
        isDotted,
        anyActive,
      });
    }

    // Group consecutive eighth/sixteenth columns within the same beat group for clean engraving beams!
    const beatGroupSize = spec.den === 8 ? 3.0 : 1.0;
    const beamedIndices = new Set();
    let idx = 0;
    while (idx < placed.length) {
      if (!placed[idx].isEighth || placed[idx].isWhole) {
        idx++;
        continue;
      }
      const grpIdx = Math.floor(placed[idx].beatInBar / beatGroupSize + 1e-4);
      let endIdx = idx;
      while (
        endIdx + 1 < placed.length &&
        placed[endIdx + 1].isEighth &&
        !placed[endIdx + 1].isWhole &&
        Math.floor(placed[endIdx + 1].beatInBar / beatGroupSize + 1e-4) === grpIdx &&
        endIdx - idx < 5
      ) {
        endIdx++;
      }

      if (endIdx > idx) {
        // Unify stem direction across beam group
        let upVotes = 0;
        for (let k = idx; k <= endIdx; k++) {
          upVotes += placed[k].stemUp ? 1 : -1;
        }
        const grpStemUp = upVotes >= 0;
        let extremeY = grpStemUp ? Infinity : -Infinity;
        for (let k = idx; k <= endIdx; k++) {
          const p = placed[k];
          p.stemUp = grpStemUp;
          p.stemX = grpStemUp ? p.nx + 11.5 : p.nx - 11.5;
          const anchorY = grpStemUp ? p.yHigh - 74 : p.yLow + 74;
          if (grpStemUp && anchorY < extremeY) extremeY = anchorY;
          if (!grpStemUp && anchorY > extremeY) extremeY = anchorY;
          beamedIndices.add(k);
        }
        // Slight engraved musical slope from first to last note in group
        const firstY = grpStemUp ? placed[idx].yHigh : placed[idx].yLow;
        const lastY = grpStemUp ? placed[endIdx].yHigh : placed[endIdx].yLow;
        const slope = Math.max(-22, Math.min(22, (lastY - firstY) * 0.25));
        const y0 = extremeY - slope * 0.5;
        const y1 = extremeY + slope * 0.5;
        const xSpan = Math.max(1, placed[endIdx].stemX - placed[idx].stemX);

        for (let k = idx; k <= endIdx; k++) {
          const tFrac = (placed[k].stemX - placed[idx].stemX) / xSpan;
          placed[k].stemYEnd = y0 + (y1 - y0) * tFrac;
        }

        // Draw primary beam (and secondary 16th beam if fast)
        const groupActive = placed.slice(idx, endIdx + 1).some((p) => p.anyActive);
        const beamCol = groupActive ? (isTreble ? "#b87414" : "#2464a8") : "#1b140d";
        ctx.strokeStyle = beamCol;
        ctx.lineWidth = 9.5;
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.moveTo(placed[idx].stemX - 1.5, y0);
        ctx.lineTo(placed[endIdx].stemX + 1.5, y1);
        ctx.stroke();

        const hasSixteenths = placed.slice(idx, endIdx + 1).every((p) => p.isSixteenth);
        if (hasSixteenths) {
          const secOff = grpStemUp ? 14 : -14;
          ctx.lineWidth = 7.0;
          ctx.beginPath();
          ctx.moveTo(placed[idx].stemX - 1.5, y0 + secOff);
          ctx.lineTo(placed[endIdx].stemX + 1.5, y1 + secOff);
          ctx.stroke();
        }
      }
      idx = endIdx + 1;
    }

    // Draw noteheads, ledger lines, accidentals, stems & single flags
    for (let c = 0; c < placed.length; c++) {
      const col = placed[c];
      const accent = isTreble ? "#c47d16" : "#2569b0";
      const inkCol = col.anyActive ? accent : "#1c150e";

      // Draw stem first (for non-whole notes)
      if (!col.isWhole) {
        ctx.strokeStyle = inkCol;
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(col.stemX, col.stemUp ? col.yLow - 2 : col.yHigh + 2);
        ctx.lineTo(col.stemX, col.stemYEnd);
        ctx.stroke();

        // Single flag for unbeamed 8th / 16th note
        if (col.isEighth && !beamedIndices.has(c)) {
          ctx.lineWidth = 4.2;
          ctx.beginPath();
          if (col.stemUp) {
            ctx.moveTo(col.stemX, col.stemYEnd);
            ctx.bezierCurveTo(col.stemX + 20, col.stemYEnd + 16, col.stemX + 18, col.stemYEnd + 36, col.stemX + 6, col.stemYEnd + 46);
          } else {
            ctx.moveTo(col.stemX, col.stemYEnd);
            ctx.bezierCurveTo(col.stemX + 20, col.stemYEnd - 16, col.stemX + 18, col.stemYEnd - 36, col.stemX + 6, col.stemYEnd - 46);
          }
          ctx.stroke();
        }
      }

      // Draw each notehead in the chord
      for (const n of col.notes) {
        const ny = stepToY(n.step, isTreble, trebleTopY, bassTopY, gap);
        const noteActive =
          (isPlaying && curTimeSec >= n.t - 0.03 && curTimeSec <= n.tEnd + 0.04) ||
          (!isPlaying && activeMidiSet.has(n.midi));
        const nCol = noteActive ? accent : "#1c150e";

        // Warm concert halo on active notehead
        if (noteActive) {
          ctx.fillStyle = isTreble
            ? "rgba(218, 150, 38, 0.34)"
            : "rgba(48, 122, 206, 0.34)";
          ctx.beginPath();
          ctx.arc(col.nx, ny, 24, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ledger lines
        drawLedgerLines(col.nx, n.step, isTreble, trebleTopY, bassTopY, gap, nCol);

        // Key-aware accidental check
        const expectedAcc = barAccState.has(n.step)
          ? barAccState.get(n.step)
          : spec.keyAccMap[n.letter];
        if (n.acc !== expectedAcc) {
          barAccState.set(n.step, n.acc);
          const accGlyph = n.acc === 1 ? "♯" : n.acc === -1 ? "♭" : "♮";
          ctx.fillStyle = nCol;
          ctx.font = "700 30px Georgia, serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(accGlyph, col.nx - 15, ny + 2);
        }

        // Engraved tilted oval notehead (hollow for half/whole, solid for quarter/8th/16th)
        ctx.save();
        ctx.translate(col.nx, ny);
        ctx.rotate(-0.32);
        if (col.isHollow) {
          ctx.fillStyle = "#faf4e6";
          ctx.beginPath();
          ctx.ellipse(0, 0, 12.5, 8.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = nCol;
          ctx.lineWidth = 4.2;
          ctx.stroke();
        } else {
          ctx.fillStyle = nCol;
          ctx.beginPath();
          ctx.ellipse(0, 0, 12.6, 8.8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Augmentation dot
        if (col.isDotted) {
          ctx.fillStyle = nCol;
          ctx.beginPath();
          ctx.arc(col.nx + 18, ny - 3, 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawScore(activeNotesList = [], pedalDown = false, tempoRate = 1.0, perfState = null) {
    const w = VIRTUAL_W;
    const h = VIRTUAL_H;
    ctx.save();
    if (drawScale !== 1.0) ctx.scale(drawScale, drawScale);

    // 1. Archival Urtext double-page spread paper with central gutter shadow
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0.0, "#f4ede0");
    grad.addColorStop(0.46, "#fbf7ec");
    grad.addColorStop(0.50, "#dfd2b8");
    grad.addColorStop(0.54, "#fbf7ec");
    grad.addColorStop(1.0, "#f1e9d7");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle archival page framing rule
    ctx.strokeStyle = "rgba(42, 31, 20, 0.24)";
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 28, w - 64, h - 56);

    // Determine current 4-measure spread (2 bars left page + 2 bars right page)
    const curTimeSec = perfState?.currentTimeSec || 0;
    const isPlaying = Boolean(perfState?.playing || curTimeSec > 0.05);

    let activeBarIdx = 0;
    if (currentMeasures.length > 0 && curTimeSec > 0.01) {
      // Binary search for measure containing curTimeSec
      let lo = 0;
      let hi = currentMeasures.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (currentMeasures[mid].tStart <= curTimeSec + 0.02) lo = mid;
        else hi = mid - 1;
      }
      activeBarIdx = lo;
    }

    const spreadStartBar = Math.floor(activeBarIdx / 4) * 4;
    const totalSpreads = Math.max(1, Math.ceil(currentMeasures.length / 4));
    const curSpreadNum = Math.floor(spreadStartBar / 4) + 1;

    // 2. Editorial Urtext Header (Left page: Piece title & Key/Genre; Right page: Composer & Page/Pedal)
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillStyle = "#2b1f14";
    ctx.font = "700 42px Georgia, serif";
    ctx.fillText(currentMeta.title.slice(0, 42), 78, 98);

    ctx.fillStyle = "#6c563e";
    ctx.font = "500 28px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(`${currentMeta.genre} · ${currentMeta.keySignature}`, 78, 138);

    ctx.textAlign = "right";
    ctx.fillStyle = "#2b1f14";
    ctx.font = "italic 600 38px Georgia, serif";
    ctx.fillText(currentMeta.composer.slice(0, 36), w - 78, 98);

    ctx.fillStyle = "#6c563e";
    ctx.font = "600 26px monospace";
    const tempoText = tempoRate === 1 ? "1.00x" : `${tempoRate.toFixed(2)}x`;
    ctx.fillText(
      `Стр. ${curSpreadNum}/${totalSpreads}  ·  Темп ${tempoText}  ·  ${pedalDown ? "Ped. ●" : "Ped. ○"}`,
      w - 78,
      138
    );

    // 3. Draw 2 Grand-Staff Pages (Left Page = Bars [s, s+1], Right Page = Bars [s+2, s+3])
    const gap = 30; // Crisp 30px staff line spacing at 2048x1024!
    const trebleTopY = 258;
    const bassTopY = 584;
    const activeMidiSet = new Set(activeNotesList.map((n) => n.midi));

    const drawPageSystem = (pageX0, pageX1, barAIdx, barBIdx, isLeftPage) => {
      // 5 Treble lines + 5 Bass lines
      ctx.strokeStyle = "rgba(32, 24, 16, 0.72)";
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 5; i++) {
        const ty = trebleTopY + i * gap;
        ctx.beginPath();
        ctx.moveTo(pageX0, ty);
        ctx.lineTo(pageX1, ty);
        ctx.stroke();

        const by = bassTopY + i * gap;
        ctx.beginPath();
        ctx.moveTo(pageX0, by);
        ctx.lineTo(pageX1, by);
        ctx.stroke();
      }

      // Outer vertical system bars & Curly Grand-Staff Brace
      ctx.strokeStyle = "#1d150e";
      ctx.lineWidth = 4.0;
      ctx.beginPath();
      ctx.moveTo(pageX0, trebleTopY);
      ctx.lineTo(pageX0, bassTopY + 4 * gap);
      ctx.moveTo(pageX1, trebleTopY);
      ctx.lineTo(pageX1, bassTopY + 4 * gap);
      ctx.stroke();
      drawEngravedBrace(ctx, pageX0 - 12, trebleTopY, bassTopY + 4 * gap);

      // Engraved Clefs + Key Signature + (Time Signature on bar 0)
      drawTrebleClef(ctx, pageX0 + 44, trebleTopY, gap);
      drawBassClef(ctx, pageX0 + 42, bassTopY, gap);
      let contentX0 = drawKeySignature(pageX0 + 94, trebleTopY, bassTopY, gap, currentSpec);
      if (barAIdx === 0 && isLeftPage) {
        contentX0 = drawTimeSignature(contentX0 + 14, trebleTopY, bassTopY, gap, currentSpec);
      } else {
        contentX0 += 12;
      }

      // Divide remaining page width evenly into 2 measures
      const midBarX = contentX0 + (pageX1 - contentX0) * 0.5;
      ctx.strokeStyle = "#221910";
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(midBarX, trebleTopY);
      ctx.lineTo(midBarX, bassTopY + 4 * gap);
      ctx.stroke();

      const slots = [
        { bIdx: barAIdx, x0: contentX0, x1: midBarX },
        { bIdx: barBIdx, x0: midBarX, x1: pageX1 },
      ];

      for (const slot of slots) {
        // Measure number above top-left of each measure
        ctx.fillStyle = "#8a7052";
        ctx.font = "italic 600 24px Georgia, serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(String(slot.bIdx + 1), slot.x0 + 10, trebleTopY - 38);

        const barData = currentMeasures[slot.bIdx];
        if (!barData) continue;

        // Gliding golden playhead cursor inside the active measure!
        if (isPlaying && slot.bIdx === activeBarIdx) {
          const spanSec = Math.max(0.15, barData.tEnd - barData.tStart);
          const frac = Math.max(0, Math.min(1, (curTimeSec - barData.tStart) / spanSec));
          const cursorX = slot.x0 + 22 + frac * Math.max(40, slot.x1 - slot.x0 - 42);

          // Soft amber wash on active measure
          ctx.fillStyle = "rgba(218, 160, 56, 0.085)";
          ctx.fillRect(slot.x0 + 2, trebleTopY - 26, slot.x1 - slot.x0 - 4, bassTopY + 4 * gap - trebleTopY + 54);

          // Vertical golden playhead needle
          ctx.strokeStyle = "rgba(198, 128, 22, 0.78)";
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(cursorX, trebleTopY - 32);
          ctx.lineTo(cursorX, bassTopY + 4 * gap + 32);
          ctx.stroke();
        }

        // Engrave RH (Treble) and LH (Bass) voices
        drawStaffVoiceNotes(
          barData.rh,
          slot.x0,
          slot.x1,
          true,
          trebleTopY,
          bassTopY,
          gap,
          currentSpec,
          curTimeSec,
          isPlaying,
          activeMidiSet
        );
        drawStaffVoiceNotes(
          barData.lh,
          slot.x0,
          slot.x1,
          false,
          trebleTopY,
          bassTopY,
          gap,
          currentSpec,
          curTimeSec,
          isPlaying,
          activeMidiSet
        );
      }
    };

    drawPageSystem(96, 976, spreadStartBar, spreadStartBar + 1, true);
    drawPageSystem(1088, w - 78, spreadStartBar + 2, spreadStartBar + 3, false);

    // 4. Bottom Live Readout Strip across the Urtext spread
    ctx.fillStyle = "rgba(42, 31, 20, 0.075)";
    ctx.fillRect(78, h - 116, w - 156, 62);

    const sortedActive = [...activeNotesList].sort((a, b) => a.midi - b.midi);
    const activeNames = sortedActive.map((n) => midiToNoteName(n.midi));
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#352618";
    ctx.font = "600 30px monospace";
    const statusLine =
      activeNames.length > 0
        ? `Звучат ноты:  ${activeNames.slice(0, 12).join("  ·  ")}`
        : `Такт ${activeBarIdx + 1} из ${Math.max(1, currentMeasures.length)}  ·  Нажмите Play или кликните по клавишам рояля`;
    ctx.fillText(statusLine, 108, h - 85);

    // Color legend on right edge of footer
    ctx.textAlign = "right";
    ctx.font = "600 24px 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = "#b57414";
    ctx.fillText("● Правая рука (RH)", w - 340, h - 85);
    ctx.fillStyle = "#2569b0";
    ctx.fillText("● Левая рука (LH)", w - 104, h - 85);

    ctx.restore();
    texture.needsUpdate = true;
  }

  function setPieceData(piece, meta = null) {
    const resolvedMeta = meta || piece;
    if (resolvedMeta) {
      currentMeta = {
        title: resolvedMeta.displayTitle || resolvedMeta.title || "Произведение",
        composer: resolvedMeta.composerObj?.name || resolvedMeta.composer || "",
        genre: resolvedMeta.genreObj?.name || "Классика",
        keySignature: piece?.keySignature || resolvedMeta.keySignature || "4/4",
      };
    }
    currentSpec = parsePieceScoreSpec(currentMeta.keySignature);
    currentMeasures = piece ? parsePieceMeasures(piece, currentSpec) : [];
    lastDrawSig = "";
    drawScore([], false, 1.0, null);
  }

  function setPieceInfo(meta) {
    setPieceData(null, meta);
  }

  const updateHz = isMobile ? 8 : 14;
  const minDrawIntervalMs = isMobile ? 115 : 55;

  function update(activeNotesList, pedalDown, tempoRate = 1.0, perfState = null) {
    const now = performance.now();
    const tBucket = perfState?.playing
      ? Math.floor((perfState.currentTimeSec || 0) * updateHz)
      : Math.floor((perfState?.currentTimeSec || 0) * 4);
    const sig =
      `${tBucket}|${pedalDown ? 1 : 0}|${tempoRate.toFixed(2)}|` +
      activeNotesList.map((n) => n.midi).sort((a, b) => a - b).join(",");
    if (sig === lastDrawSig) return;
    if (now - lastDrawMs < minDrawIntervalMs) return;
    lastDrawSig = sig;
    lastDrawMs = now;
    drawScore(activeNotesList, pedalDown, tempoRate, perfState);
  }

  function setVisible(visible) {
    scoreGroup.visible = Boolean(visible);
  }

  drawScore([], false, 1.0, null);

  return {
    group: scoreGroup,
    mesh: sheetMesh,
    setPieceInfo,
    setPieceData,
    setHistoricalOffset,
    setVisible,
    update,
  };
}

// ============================================================================
// 3. DUAL-MODE 3D NOTE ANIMATION ENGINE (Falling 3D Ribbons + Acoustic Particles)
// ============================================================================
export function createPianoNoteVisualizer(
  pianoAnchor,
  rigNodes,
  isSoftwareGL = false,
  modern88Anchors = null
) {
  const vizGroup = new THREE.Group();
  vizGroup.name = "Piano_3D_NoteVisualizer";
  pianoAnchor.add(vizGroup);

  // Calibrate exact local (x, y, z) coordinates of all 61 historical keys in pianoAnchor local space
  pianoAnchor.updateMatrixWorld(true);
  _invAnchor.copy(pianoAnchor.matrixWorld).invert();

  const historical61Anchors = new Array(FORTEPIANO_TOTAL_KEYS);
  let avgKeyY61 = 0.78;
  let avgKeyZ61 = 0.08;
  let validCount = 0;

  for (let i = 0; i < FORTEPIANO_TOTAL_KEYS; i++) {
    const kNode = rigNodes.keys[i];
    const midi = FORTEPIANO_MIN_MIDI + i;
    const isSharp = BLACK_PCS.has(((midi % 12) + 12) % 12);
    if (kNode) {
      _box.setFromObject(kNode);
      if (!_box.isEmpty()) {
        const minL = _box.min.clone().applyMatrix4(_invAnchor);
        const maxL = _box.max.clone().applyMatrix4(_invAnchor);
        const cx = (minL.x + maxL.x) * 0.5;
        const topY = Math.max(minL.y, maxL.y);
        const frontZ = Math.max(minL.z, maxL.z);
        const backZ = Math.min(minL.z, maxL.z);
        const kz = isSharp ? backZ + (frontZ - backZ) * 0.64 : frontZ - 0.032;
        historical61Anchors[i] = { x: cx, y: topY, z: kz, isSharp };
        avgKeyY61 += topY;
        avgKeyZ61 += kz;
        validCount++;
        continue;
      }
    }
    const frac = i / Math.max(1, FORTEPIANO_TOTAL_KEYS - 1);
    historical61Anchors[i] = {
      x: -0.42 + frac * 0.84,
      y: 0.785 + (isSharp ? 0.012 : 0),
      z: isSharp ? 0.03 : 0.085,
      isSharp,
    };
  }
  if (validCount > 0) {
    avgKeyY61 /= validCount;
    avgKeyZ61 /= validCount;
  }

  let avgKeyY88 = avgKeyY61;
  let avgKeyZ88 = avgKeyZ61;
  if (Array.isArray(modern88Anchors) && modern88Anchors.length === 88) {
    let sy = 0;
    let sz = 0;
    for (let i = 0; i < 88; i++) {
      sy += modern88Anchors[i].y;
      sz += modern88Anchors[i].z;
    }
    avgKeyY88 = sy / 88;
    avgKeyZ88 = sz / 88;
  }

  let is88KeyMode = Boolean(Array.isArray(modern88Anchors) && modern88Anchors.length === 88);

  // --- A. FALLING 3D PIANO-ROLL NOTE RIBBONS (InstancedMesh pool) ---
  const MAX_RIBBONS = isSoftwareGL ? 140 : 240;
  const ribbonGeo = new THREE.BoxGeometry(1.0, 1.0, 1.0);
  const ribbonMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.90,
    depthWrite: false,
    toneMapped: false,
  });
  const ribbonMesh = new THREE.InstancedMesh(ribbonGeo, ribbonMat, MAX_RIBBONS);
  ribbonMesh.name = "FallingNotes_InstancedRibbons";
  ribbonMesh.frustumCulled = false;
  ribbonMesh.renderOrder = 12;
  vizGroup.add(ribbonMesh);

  // Subtle luminous guide rail directly above the keybed showing impact plane (only visible during active playback)
  const railGeo = new THREE.PlaneGeometry(0.86, 0.003);
  const railMat = new THREE.MeshBasicMaterial({
    color: 0xe6be72,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const guideRail = new THREE.Mesh(railGeo, railMat);
  guideRail.position.set(
    0.0,
    (is88KeyMode ? avgKeyY88 : avgKeyY61) + 0.018,
    (is88KeyMode ? avgKeyZ88 : avgKeyZ61) + 0.012
  );
  guideRail.scale.x = is88KeyMode ? 1.35 : 1.0;
  guideRail.visible = false;
  vizGroup.add(guideRail);

  function setKeyboardMode(use88Keys) {
    is88KeyMode = Boolean(use88Keys && Array.isArray(modern88Anchors) && modern88Anchors.length === 88);
    guideRail.scale.x = is88KeyMode ? 1.35 : 1.0;
    guideRail.position.y = (is88KeyMode ? avgKeyY88 : avgKeyY61) + 0.018;
    guideRail.position.z = (is88KeyMode ? avgKeyZ88 : avgKeyZ61) + 0.012;
  }

  // --- B. LUMINOUS ACOUSTIC PARTICLES & SPARKS (InstancedMesh pool) ---
  const MAX_PARTICLES = isSoftwareGL ? 140 : 260;
  const particleGeo = new THREE.OctahedronGeometry(0.0085, 1);
  const particleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.90,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, MAX_PARTICLES);
  particleMesh.name = "AcousticNotes_InstancedParticles";
  particleMesh.frustumCulled = false;
  particleMesh.renderOrder = 13;
  vizGroup.add(particleMesh);

  // --- C. KEY-STRIKE GLOW PADS (61 subtle light pools right over each key) ---
  const glowGeo = new THREE.PlaneGeometry(0.018, 0.068);
  glowGeo.rotateX(-Math.PI * 0.5);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const glowMesh = new THREE.InstancedMesh(glowGeo, glowMat, FORTEPIANO_TOTAL_KEYS);
  glowMesh.name = "KeyStrike_GlowPads";
  glowMesh.frustumCulled = false;
  glowMesh.renderOrder = 11;
  vizGroup.add(glowMesh);

  // Particle state arrays (zero-GC struct-of-arrays)
  const pActive = new Uint8Array(MAX_PARTICLES);
  const pAge = new Float32Array(MAX_PARTICLES);
  const pLife = new Float32Array(MAX_PARTICLES);
  const pPos = new Float32Array(MAX_PARTICLES * 3);
  const pVel = new Float32Array(MAX_PARTICLES * 3);
  const pScale = new Float32Array(MAX_PARTICLES);
  const pColor = new Float32Array(MAX_PARTICLES * 3);
  let pCursor = 0;

  const keyGlowEnergy = new Float32Array(88);
  const keyGlowHand = new Uint8Array(88); // 1 = RH (gold), 0 = LH (sapphire)

  let fallingEnabled = false;
  let particlesEnabled = false;
  let mode = "off"; // "off" | "falling" | "particles" | "both"

  // Color palette: RH warm concert gold, LH sapphire blue, sharp accents slightly brighter
  const COL_RH_NAT = new THREE.Color(0xecc06a);
  const COL_RH_SHARP = new THREE.Color(0xffd98a);
  const COL_LH_NAT = new THREE.Color(0x5fa2e6);
  const COL_LH_SHARP = new THREE.Color(0x88c4ff);
  const COL_IMPACT = new THREE.Color(0xfff6dd);

  function syncModeFlags() {
    mode =
      fallingEnabled && particlesEnabled
        ? "both"
        : fallingEnabled
          ? "falling"
          : particlesEnabled
            ? "particles"
            : "off";
    ribbonMesh.visible = fallingEnabled;
    guideRail.visible = fallingEnabled;
    particleMesh.visible = particlesEnabled;
    // Floating glow pads are permanently disabled — direct key highlight is rendered on the 3D key meshes themselves
    glowMesh.visible = false;
    glowMesh.count = 0;
  }

  function setFallingEnabled(enabled) {
    fallingEnabled = Boolean(enabled);
    syncModeFlags();
  }

  function setParticlesEnabled(enabled) {
    particlesEnabled = Boolean(enabled);
    syncModeFlags();
  }

  function setMode(nextMode) {
    if (nextMode === "both") {
      fallingEnabled = true;
      particlesEnabled = true;
    } else if (nextMode === "falling") {
      fallingEnabled = true;
      particlesEnabled = false;
    } else if (nextMode === "particles") {
      fallingEnabled = false;
      particlesEnabled = true;
    } else if (nextMode === "off") {
      fallingEnabled = false;
      particlesEnabled = false;
    }
    syncModeFlags();
  }

  function resolveKeyIndexForMidi(rawMidi) {
    let m = Math.round(rawMidi);
    if (is88KeyMode) {
      if (m < 21) m = 21;
      else if (m > 108) m = 108;
      return m - 21;
    }
    while (m < FORTEPIANO_MIN_MIDI) m += 12;
    while (m > FORTEPIANO_MIN_MIDI + FORTEPIANO_TOTAL_KEYS - 1) m -= 12;
    return m - FORTEPIANO_MIN_MIDI;
  }

  function spawnParticlesForKey(midi, velocity = 0.75, hand = "RH", sustainDown = false) {
    const activeAnchors = is88KeyMode ? modern88Anchors : historical61Anchors;
    const keyIdx = resolveKeyIndexForMidi(midi);
    if (keyIdx < 0 || keyIdx >= activeAnchors.length) return;
    const isRH = hand === "RH" || (hand !== "LH" && midi >= 60);
    keyGlowEnergy[keyIdx] = Math.min(1.0, Math.max(keyGlowEnergy[keyIdx], 0.55 + velocity * 0.55));
    keyGlowHand[keyIdx] = isRH ? 1 : 0;

    if (!particlesEnabled) return;
    const anchor = activeAnchors[keyIdx];
    const burstCount = isSoftwareGL ? 2 : Math.min(6, Math.max(3, Math.round(velocity * 5)));
    const baseCol = isRH ? (anchor.isSharp ? COL_RH_SHARP : COL_RH_NAT) : (anchor.isSharp ? COL_LH_SHARP : COL_LH_NAT);

    for (let b = 0; b < burstCount; b++) {
      const idx = pCursor;
      pCursor = (pCursor + 1) % MAX_PARTICLES;
      pActive[idx] = 1;
      pAge[idx] = 0;
      pLife[idx] = (sustainDown ? 1.55 : 0.98) + Math.random() * 0.55;

      const i3 = idx * 3;
      pPos[i3] = anchor.x + (Math.random() - 0.5) * 0.014;
      pPos[i3 + 1] = anchor.y + 0.018 + Math.random() * 0.014;
      pPos[i3 + 2] = anchor.z - (Math.random() * 0.06);

      pVel[i3] = (Math.random() - 0.5) * 0.075;
      pVel[i3 + 1] = 0.22 + velocity * 0.34 + Math.random() * 0.16;
      pVel[i3 + 2] = -0.08 - Math.random() * 0.14; // drift gracefully backward toward strings/lid

      pScale[idx] = 0.65 + velocity * 0.75 + Math.random() * 0.35;
      pColor[i3] = baseCol.r;
      pColor[i3 + 1] = baseCol.g;
      pColor[i3 + 2] = baseCol.b;
    }
  }

  function update(dt, perfState = null, _keyDownArr = null) {
    const clampedDt = Math.min(0.05, Math.max(0.0, dt));
    const showFall = fallingEnabled;
    const showPart = particlesEnabled;
    let moving = false;

    // 1. Update Falling 3D Piano-Roll Ribbons (only when falling notes are explicitly enabled)
    let ribbonCount = 0;
    const isPieceEngaged = Boolean(
      perfState && (perfState.playing || (perfState.currentTimeSec || 0) > 0.05)
    );
    guideRail.visible = showFall && isPieceEngaged;

    if (showFall && isPieceEngaged && perfState.events && perfState.events.length > 0) {
      const curTime = perfState.currentTimeSec;
      const tempoRate = Math.max(0.25, perfState.tempoRate || 1.0);
      const lookaheadSec = 2.1 * tempoRate; // 2.1 visual seconds of crisp cascade
      const fallHeightM = 0.42; // compact height well clear of the music desk behind
      const events = perfState.events;
      const activeAnchors = is88KeyMode ? modern88Anchors : historical61Anchors;

      // Binary search for first event whose end > curTime - 0.05
      let lo = 0;
      let hi = events.length - 1;
      const minStart = curTime - 4.0;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (events[mid].t < minStart) lo = mid + 1;
        else hi = mid;
      }

      for (let i = lo; i < events.length && ribbonCount < MAX_RIBBONS; i++) {
        const ev = events[i];
        if (ev.t > curTime + lookaheadSec) break;
        const evEnd = ev.t + Math.max(0.08, ev.dur);
        if (evEnd < curTime - 0.02) continue;

        const keyIdx = resolveKeyIndexForMidi(ev.audioMidi ?? ev.midi);
        if (keyIdx < 0 || keyIdx >= activeAnchors.length) continue;
        const anchor = activeAnchors[keyIdx];

        const timeToHitStart = (ev.t - curTime) / tempoRate;
        const timeToHitEnd = (evEnd - curTime) / tempoRate;
        const yBot = Math.max(0.0, (timeToHitStart / 2.1) * fallHeightM);
        const yTop = Math.min(fallHeightM, (timeToHitEnd / 2.1) * fallHeightM);
        const barH = Math.max(0.011, yTop - yBot);
        if (yTop <= 0.0 || yBot >= fallHeightM) continue;

        const isPlayingNow = curTime >= ev.t && curTime <= evEnd;
        const barW = is88KeyMode
          ? (anchor.isSharp ? 0.0112 : 0.0180)
          : (anchor.isSharp ? 0.0082 : 0.0132);
        const barD = anchor.isSharp ? 0.009 : 0.010;

        _dummy.position.set(
          anchor.x,
          anchor.y + 0.018 + yBot + barH * 0.5,
          anchor.z + (anchor.isSharp ? 0.006 : 0.016)
        );
        _dummy.rotation.set(0, 0, 0);
        _dummy.scale.set(barW, barH, barD);
        _dummy.updateMatrix();
        ribbonMesh.setMatrixAt(ribbonCount, _dummy.matrix);

        const isRH = ev.hand ? ev.hand === "RH" : ev.midi >= 60;
        const baseCol = isRH
          ? anchor.isSharp
            ? COL_RH_SHARP
            : COL_RH_NAT
          : anchor.isSharp
            ? COL_LH_SHARP
            : COL_LH_NAT;
        _color.copy(baseCol);
        if (isPlayingNow) {
          _color.lerp(COL_IMPACT, 0.55);
        }
        ribbonMesh.setColorAt(ribbonCount, _color);
        ribbonCount++;
      }
      if (ribbonCount > 0 && perfState.playing) moving = true;
    }

    // Hide unused ribbon instances
    if (showFall || ribbonMesh.count > 0) {
      for (let i = ribbonCount; i < MAX_RIBBONS; i++) {
        _dummy.position.set(0, -10, 0);
        _dummy.scale.set(0, 0, 0);
        _dummy.updateMatrix();
        ribbonMesh.setMatrixAt(i, _dummy.matrix);
      }
      ribbonMesh.count = ribbonCount;
      ribbonMesh.instanceMatrix.needsUpdate = true;
      if (ribbonMesh.instanceColor) ribbonMesh.instanceColor.needsUpdate = true;
    }

    // 2. Update Luminous Acoustic Particles (only when explicitly enabled)
    let activePartCount = 0;
    if (showPart) {
      const nowSec = performance.now() * 0.001;
      for (let i = 0; i < MAX_PARTICLES; i++) {
        if (!pActive[i]) continue;
        pAge[i] += clampedDt;
        if (pAge[i] >= pLife[i]) {
          pActive[i] = 0;
          continue;
        }
        moving = true;
        const i3 = i * 3;
        const frac = pAge[i] / pLife[i];
        // Gentle buoyant deceleration + subtle harmonic drift
        pPos[i3] += (pVel[i3] + Math.sin(nowSec * 3.8 + i) * 0.018) * clampedDt;
        pPos[i3 + 1] += pVel[i3 + 1] * (1.0 - frac * 0.55) * clampedDt;
        pPos[i3 + 2] += pVel[i3 + 2] * clampedDt;

        const fade = Math.sin(Math.min(1.0, frac) * Math.PI);
        const s = pScale[i] * Math.max(0.05, fade);
        _dummy.position.set(pPos[i3], pPos[i3 + 1], pPos[i3 + 2]);
        _dummy.rotation.set(nowSec * 1.4 + i, nowSec * 1.9 + i, 0);
        _dummy.scale.set(s, s * 1.35, s);
        _dummy.updateMatrix();
        particleMesh.setMatrixAt(activePartCount, _dummy.matrix);

        _color.setRGB(
          pColor[i3] * (0.65 + 0.55 * fade),
          pColor[i3 + 1] * (0.65 + 0.55 * fade),
          pColor[i3 + 2] * (0.65 + 0.55 * fade)
        );
        particleMesh.setColorAt(activePartCount, _color);
        activePartCount++;
      }
      particleMesh.count = activePartCount;
      particleMesh.instanceMatrix.needsUpdate = true;
      if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;
    } else if (particleMesh.count > 0) {
      particleMesh.count = 0;
    }

    // Floating glow pads remain permanently hidden (replaced by direct-on-key mesh emissive glow)
    glowMesh.visible = false;
    glowMesh.count = 0;

    return moving;
  }

  // Default: ALL note visual effects OFF on startup
  setFallingEnabled(false);
  setParticlesEnabled(false);

  return {
    group: vizGroup,
    setKeyboardMode,
    setMode,
    getMode: () => mode,
    setFallingEnabled,
    getFallingEnabled: () => fallingEnabled,
    setParticlesEnabled,
    getParticlesEnabled: () => particlesEnabled,
    spawnParticlesForKey,
    update,
  };
}
