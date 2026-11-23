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
// 1. COMPOSITE 3-PEDAL CONCERT LYRE (11+ procedural PBR parts, grounded at y=0)
// ============================================================================
export function buildConcertPedalLyre(pianoAnchor, isSoftwareGL = false) {
  const lyreGroup = new THREE.Group();
  lyreGroup.name = "ConcertGrand_PedalLyre";
  // Positioned centered beneath the keybed belly (x=0, y=0 stage floor, z=-0.28)
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

  // 1. Grounded bottom pedal box (plinth resting flush at stage floor y = 0.015..0.110)
  const boxGeo = new THREE.BoxGeometry(0.265, 0.088, 0.11);
  const pedalBox = new THREE.Mesh(boxGeo, woodMat);
  pedalBox.position.set(0, 0.064, 0);
  lyreGroup.add(pedalBox);

  // Sculpted decorative stepped foot base plate
  const footGeo = new THREE.BoxGeometry(0.29, 0.020, 0.125);
  const footPlate = new THREE.Mesh(footGeo, woodMat);
  footPlate.position.set(0, 0.010, 0);
  lyreGroup.add(footPlate);

  // Brass escutcheon trim bezel around pedal openings + crimson felt buffer strip
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

  // 3. Two tapered turned lyre columns with brass top/bottom ferrules
  const colGeo = new THREE.CylinderGeometry(0.015, 0.019, 0.535, 16);
  const ferruleGeo = new THREE.CylinderGeometry(0.020, 0.021, 0.022, 16);
  for (const sx of [-0.098, 0.098]) {
    const col = new THREE.Mesh(colGeo, woodMat);
    col.position.set(sx, 0.376, 0);
    lyreGroup.add(col);

    const botFerrule = new THREE.Mesh(ferruleGeo, brassMat);
    botFerrule.position.set(sx, 0.118, 0);
    lyreGroup.add(botFerrule);

    const topFerrule = new THREE.Mesh(ferruleGeo, brassMat);
    topFerrule.position.set(sx, 0.616, 0);
    lyreGroup.add(topFerrule);
  }

  // 4. Two angled rear stability brace struts rising from pedal box toward belly underside
  const braceGeo = new THREE.CylinderGeometry(0.0095, 0.011, 0.68, 10);
  for (const sx of [-0.082, 0.082]) {
    const brace = new THREE.Mesh(braceGeo, woodMat);
    brace.position.set(sx, 0.365, -0.21);
    brace.rotation.x = 0.55;
    lyreGroup.add(brace);
  }

  // 5. Three Vertical Brass Linkage Rods (connecting pedals to dampers/action)
  const rodGeo = new THREE.CylinderGeometry(0.0046, 0.0046, 0.55, 10);
  const pedalXs = [-0.060, 0.0, 0.060]; // Left: Una Corda, Center: Sostenuto, Right: Damper Sustain
  const rodMeshes = [];
  for (let i = 0; i < 3; i++) {
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.position.set(pedalXs[i], 0.382, -0.005);
    lyreGroup.add(rod);
    rodMeshes.push(rod);
  }

  // 6. Three Sculpted Beveled Brass Pedals (pivoting smoothly at z = +0.02)
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
  // Rotate so shape extends forward along +Z and thickness lies along Y
  pedalGeo.rotateX(Math.PI * 0.5);
  pedalGeo.translate(0, 0.006, 0);

  const pedalIds = ["una_corda", "sostenuto", "sustain"];
  const pedalLabels = {
    una_corda: "Педаль Una Corda (Мягкий звук)",
    sostenuto: "Педаль Sostenuto (Средняя)",
    sustain: "Педаль Sustain (Сустейн / Демпфер)",
  };
  const pedalPivots = {};
  const pedalPickMeshes = [];
  const pedalMeshToId = new Map();

  for (let i = 0; i < 3; i++) {
    const pid = pedalIds[i];
    const pivot = new THREE.Group();
    pivot.name = `PedalPivot_${pid}`;
    pivot.position.set(pedalXs[i], 0.066, 0.022);

    const mesh = new THREE.Mesh(pedalGeo, brassMat);
    mesh.name = `PedalMesh_${pid}`;
    // Slight ergonomic concert grand splay on outer pedals
    if (i === 0) pivot.rotation.y = -0.09;
    if (i === 2) pivot.rotation.y = 0.09;
    pivot.add(mesh);

    // Invisible slightly padded hitbox for effortless mouse clicking
    const hitGeo = new THREE.BoxGeometry(0.056, 0.06, 0.18);
    const hitMesh = new THREE.Mesh(
      hitGeo,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.position.set(0, 0, 0.085);
    pivot.add(hitMesh);

    lyreGroup.add(pivot);
    pedalPivots[pid] = { pivot, rod: rodMeshes[i], restY: 0.38, value: 0 };
    pedalPickMeshes.push(mesh, hitMesh);
    pedalMeshToId.set(mesh, pid);
    pedalMeshToId.set(hitMesh, pid);
  }

  pianoAnchor.add(lyreGroup);

  function syncPianoModelVisual(model) {
    if (!model?.visual) return;
    const v = model.visual;
    if (v.isHistorical) {
      woodMat.color.setHex(0x4b2f1c);
      woodMat.roughness = 0.24;
      woodMat.clearcoat = 0.72;
      woodMat.transparent = false;
      woodMat.opacity = 1.0;
      woodMat.transmission = 0.0;
      brassMat.color.setHex(0xc99c42);
      rodMat.color.setHex(0xb88f3b);
      feltMat.color.setHex(0x6e1419);
    } else if (v.isCrystal) {
      woodMat.color.setHex(v.caseColor || 0xdff2ff);
      woodMat.roughness = 0.05;
      woodMat.clearcoat = 1.0;
      woodMat.transparent = true;
      woodMat.opacity = isSoftwareGL ? 0.42 : 0.62;
      woodMat.transmission = isSoftwareGL ? 0.0 : 0.78;
      woodMat.ior = 1.54;
      brassMat.color.setHex(v.hardwareColor || 0xe8f0f8);
      rodMat.color.setHex(v.hardwareColor || 0xd8e4f0);
      feltMat.color.setHex(v.clothColor || 0x3b6ca8);
    } else {
      woodMat.color.setHex(v.caseColor ?? 0x0c0c0e);
      woodMat.roughness = v.caseRoughness ?? 0.08;
      woodMat.clearcoat = v.caseClearcoat ?? 0.96;
      woodMat.transparent = false;
      woodMat.opacity = 1.0;
      woodMat.transmission = 0.0;
      brassMat.color.setHex(v.hardwareColor ?? 0xd8b158);
      rodMat.color.setHex(v.hardwareColor ?? 0xc8a454);
      feltMat.color.setHex(v.clothColor ?? 0x6e1419);
    }
    woodMat.needsUpdate = true;
    brassMat.needsUpdate = true;
    rodMat.needsUpdate = true;
  }

  function updatePedals(sustainAmt, unaCordaAmt, sostenutoAmt, dt, instant = false) {
    const k = instant ? 1.0 : 1.0 - Math.exp(-18.0 * Math.min(0.05, Math.max(0, dt)));
    const targets = {
      sustain: Math.max(0, Math.min(1, sustainAmt)),
      una_corda: Math.max(0, Math.min(1, unaCordaAmt)),
      sostenuto: Math.max(0, Math.min(1, sostenutoAmt)),
    };
    let moving = false;
    for (const pid of pedalIds) {
      const p = pedalPivots[pid];
      const diff = targets[pid] - p.value;
      if (Math.abs(diff) > 0.001) moving = true;
      p.value += diff * k;
      // Rotate front of pedal downward (+X rotation around hinge) and lift vertical rod slightly
      p.pivot.rotation.x = p.value * 0.21;
      p.rod.position.y = p.restY + p.value * 0.012;
    }
    return moving;
  }

  function pickPedalAtRay(raycaster) {
    const hits = raycaster.intersectObjects(pedalPickMeshes, false);
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
// 2. DYNAMIC 3D MUSIC DESK SHEET MUSIC (Live Grand Staff on MusicDesk_Pivot)
// ============================================================================
const DIATONIC_STEP_FROM_C = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const IS_SHARP_PC = [false, true, false, true, false, false, true, false, true, false, true, false];

function midiToStaffStep(midi) {
  const oct = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;
  // Diatonic step relative to C4 (MIDI 60 => step 0)
  return (oct - 4) * 7 + DIATONIC_STEP_FROM_C[pc];
}

export function createMusicDeskScore(pianoAnchor, rigNodes, maxAniso = 4) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, maxAniso || 4);
  texture.generateMipmaps = true;

  const pageMat = new THREE.MeshStandardMaterial({
    name: "MusicDesk_LiveScore",
    map: texture,
    emissive: new THREE.Color(0xfff7e6),
    emissiveMap: texture,
    emissiveIntensity: 0.48,
    roughness: 0.86,
    metalness: 0.0,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const coverMat = new THREE.MeshStandardMaterial({
    name: "MusicDesk_BookCover",
    color: 0x2a1b16,
    roughness: 0.64,
    metalness: 0.04,
  });

  const ledgeMat = new THREE.MeshStandardMaterial({
    name: "MusicDesk_RackLedge",
    color: 0x1e1612,
    roughness: 0.42,
    metalness: 0.05,
  });

  // Compact, museum-proportioned open score volume resting behind the nameboard & wrestplank
  // Placed directly in pianoAnchor local space (immune to rotated world AABB distortion)
  const scoreGroup = new THREE.Group();
  scoreGroup.name = "MusicDesk_ScoreBookAssembly";
  scoreGroup.position.set(0.0, 0.995, -0.295);
  scoreGroup.rotation.x = -0.34; // natural ~19.5° concert rack tilt

  const bookW = 0.385;
  const bookH = 0.215;

  // Hard leather book cover backing (visible neatly from rear/side lid views)
  const coverMesh = new THREE.Mesh(
    new THREE.BoxGeometry(bookW + 0.014, bookH + 0.010, 0.005),
    coverMat
  );
  coverMesh.position.set(0, 0, -0.004);
  scoreGroup.add(coverMesh);

  // Subtle wooden bottom ledge supporting the open score
  const ledgeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(bookW + 0.045, 0.012, 0.022),
    ledgeMat
  );
  ledgeMesh.position.set(0, -(bookH * 0.5 + 0.008), 0.005);
  scoreGroup.add(ledgeMesh);

  // Open double-page parchment front sheet
  const sheetMesh = new THREE.Mesh(new THREE.PlaneGeometry(bookW, bookH), pageMat);
  sheetMesh.name = "MusicDesk_SheetScoreMesh";
  sheetMesh.position.set(0, 0, 0.0);
  scoreGroup.add(sheetMesh);

  pianoAnchor.add(scoreGroup);

  let currentMeta = {
    title: "К Элизе (Für Elise)",
    composer: "Людвиг ван Бетховен",
    genre: "Багатель",
    keySignature: "ля минор",
  };
  let lastDrawSig = "";
  let lastDrawMs = 0;

  function drawScore(activeNotesList = [], pedalDown = false, tempoRate = 1.0) {
    const w = canvas.width;
    const h = canvas.height;

    // Warm museum parchment open double-page spread
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0.0, "#f5efe1");
    grad.addColorStop(0.46, "#faf5e8");
    grad.addColorStop(0.50, "#e2d6be"); // center spine crease shadow
    grad.addColorStop(0.54, "#faf5e8");
    grad.addColorStop(1.0, "#f2ead9");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle double border rule
    ctx.strokeStyle = "rgba(42, 32, 22, 0.22)";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 16, w - 36, h - 32);

    // Header: Genre · Key Signature (left page) & Composer (right page)
    ctx.fillStyle = "#4a3826";
    ctx.font = "600 22px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText(currentMeta.title.slice(0, 38), 44, 54);

    ctx.fillStyle = "#7a6248";
    ctx.font = "500 16px sans-serif";
    ctx.fillText(`${currentMeta.genre} · ${currentMeta.keySignature}`, 44, 80);

    ctx.textAlign = "right";
    ctx.fillStyle = "#3a2b1d";
    ctx.font = "italic 600 21px Georgia, serif";
    ctx.fillText(currentMeta.composer.slice(0, 34), w - 44, 54);

    ctx.fillStyle = "#7a6248";
    ctx.font = "500 15px monospace";
    const tempoText = tempoRate === 1 ? "Темп 1.0x" : `Темп ${tempoRate.toFixed(2)}x`;
    ctx.fillText(`${tempoText}   ${pedalDown ? "Ped. ●" : "Ped. ○"}`, w - 44, 80);

    // Draw Grand Staff across both pages (2 systems: Treble + Bass)
    const drawGrandStaff = (x0, x1, trebleTopY, bassTopY, lineGap) => {
      ctx.strokeStyle = "rgba(38, 30, 22, 0.62)";
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 5; i++) {
        const ty = trebleTopY + i * lineGap;
        ctx.beginPath();
        ctx.moveTo(x0, ty);
        ctx.lineTo(x1, ty);
        ctx.stroke();

        const by = bassTopY + i * lineGap;
        ctx.beginPath();
        ctx.moveTo(x0, by);
        ctx.lineTo(x1, by);
        ctx.stroke();
      }
      // Left & right barlines + center measure divider
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x0, trebleTopY);
      ctx.lineTo(x0, bassTopY + 4 * lineGap);
      ctx.moveTo(x1, trebleTopY);
      ctx.lineTo(x1, bassTopY + 4 * lineGap);
      ctx.stroke();

      // Clef glyphs
      ctx.fillStyle = "#2b2118";
      ctx.textAlign = "left";
      ctx.font = "58px Georgia, serif";
      ctx.fillText("𝄞", x0 + 8, trebleTopY + lineGap * 3.7);
      ctx.font = "44px Georgia, serif";
      ctx.fillText("𝄢", x0 + 10, bassTopY + lineGap * 3.1);
    };

    const lineGap = 17;
    const trebleTopY = 138;
    const bassTopY = 294;
    drawGrandStaff(44, 488, trebleTopY, bassTopY, lineGap);
    drawGrandStaff(536, w - 44, trebleTopY, bassTopY, lineGap);

    // Subtle decorative ghost notes on left page for authentic printed sheet-music elegance
    ctx.fillStyle = "rgba(42, 32, 22, 0.24)";
    const decoSteps = [2, 4, 6, 5, 7, 9, 8, 6, 4, 5, 7, 4];
    for (let i = 0; i < decoSteps.length; i++) {
      const nx = 118 + i * 31;
      const ny = trebleTopY + 4 * lineGap - (decoSteps[i] - 2) * (lineGap * 0.5);
      ctx.beginPath();
      ctx.ellipse(nx, ny, 7.5, 5.5, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(nx + 6.5, ny - 34, 1.8, 34);
    }

    // LIVE SOUNDING NOTES on Right Page + Highlighted Chord Readout at bottom
    const sorted = [...activeNotesList].sort((a, b) => a.midi - b.midi);
    const activeNames = [];
    const baseNoteX = 635;
    const stepSpacing = sorted.length > 6 ? 26 : 36;

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const midi = item.midi;
      const isRightHand = item.hand ? item.hand === "RH" : midi >= 60;
      const step = midiToStaffStep(midi); // C4 = 0, E4 = 2 (bottom treble line), A3 = -2 (top bass line)
      const isSharp = IS_SHARP_PC[((midi % 12) + 12) % 12];
      activeNames.push(midiToNoteName(midi));

      let ny;
      if (midi >= 60) {
        // Treble clef: E4 (step 2) is line 4 (bottom line: trebleTopY + 4*lineGap)
        ny = trebleTopY + 4 * lineGap - (step - 2) * (lineGap * 0.5);
      } else {
        // Bass clef: G2 (step -10) is line 4 (bottom line: bassTopY + 4*lineGap)
        // A3 (step -2) is top line (bassTopY)
        ny = bassTopY - (step - -2) * (lineGap * 0.5);
      }
      ny = Math.max(96, Math.min(432, ny));
      const nx = Math.min(w - 72, baseNoteX + (i % 8) * stepSpacing);

      // Luminous halo behind active notehead
      const accent = isRightHand ? "#c8861e" : "#2e73b8";
      ctx.fillStyle = isRightHand ? "rgba(216, 152, 46, 0.28)" : "rgba(56, 128, 206, 0.28)";
      ctx.beginPath();
      ctx.arc(nx, ny, 16, 0, Math.PI * 2);
      ctx.fill();

      // Ledger lines if outside staff
      ctx.strokeStyle = "#3b2c1d";
      ctx.lineWidth = 1.8;
      if (midi === 60 || ny < trebleTopY - 4 || ny > bassTopY + 4 * lineGap + 4) {
        ctx.beginPath();
        ctx.moveTo(nx - 14, ny);
        ctx.lineTo(nx + 14, ny);
        ctx.stroke();
      }

      // Sharp accidental
      if (isSharp) {
        ctx.fillStyle = accent;
        ctx.font = "bold 20px Georgia, serif";
        ctx.textAlign = "right";
        ctx.fillText("♯", nx - 10, ny + 7);
      }

      // Notehead + stem
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.ellipse(nx, ny, 9.5, 7.0, -0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillRect(nx + 8, ny - 38, 2.4, 38);
    }

    // Bottom live note readout bar across spread
    ctx.fillStyle = "rgba(42, 32, 22, 0.08)";
    ctx.fillRect(44, h - 66, w - 88, 36);
    ctx.textAlign = "left";
    ctx.fillStyle = "#3d2d1d";
    ctx.font = "600 18px monospace";
    const chordStr =
      activeNames.length > 0
        ? `Звучат ноты: ${activeNames.slice(0, 10).join("  ·  ")}`
        : "Нажмите Play или кликните по клавишам рояля";
    ctx.fillText(chordStr, 58, h - 42);

    texture.needsUpdate = true;
  }

  function setPieceInfo(meta) {
    if (!meta) return;
    currentMeta = {
      title: meta.displayTitle || meta.title || "Произведение",
      composer: meta.composerObj?.name || meta.composer || "",
      genre: meta.genreObj?.name || "Классика",
      keySignature: meta.keySignature || "",
    };
    lastDrawSig = "";
    drawScore([], false, 1.0);
  }

  function update(activeNotesList, pedalDown, tempoRate = 1.0) {
    const now = performance.now();
    const sig =
      `${pedalDown ? 1 : 0}|${tempoRate.toFixed(2)}|` +
      activeNotesList.map((n) => n.midi).sort((a, b) => a - b).join(",");
    if (sig === lastDrawSig) return;
    // Cap redraw rate to ~16 Hz to preserve crisp 60 FPS WebGL performance
    if (now - lastDrawMs < 60) return;
    lastDrawSig = sig;
    lastDrawMs = now;
    drawScore(activeNotesList, pedalDown, tempoRate);
  }

  function setVisible(visible) {
    scoreGroup.visible = Boolean(visible);
  }

  drawScore([], false, 1.0);

  return {
    group: scoreGroup,
    mesh: sheetMesh,
    setPieceInfo,
    setVisible,
    update,
  };
}

// ============================================================================
// 3. DUAL-MODE 3D NOTE ANIMATION ENGINE (Falling 3D Ribbons + Acoustic Particles)
// ============================================================================
export function createPianoNoteVisualizer(pianoAnchor, rigNodes, isSoftwareGL = false) {
  const vizGroup = new THREE.Group();
  vizGroup.name = "Piano_3D_NoteVisualizer";
  pianoAnchor.add(vizGroup);

  // Calibrate exact local (x, y, z) coordinates of all 61 keys in pianoAnchor local space
  pianoAnchor.updateMatrixWorld(true);
  _invAnchor.copy(pianoAnchor.matrixWorld).invert();

  const keyAnchors = new Array(FORTEPIANO_TOTAL_KEYS);
  let avgKeyY = 0.78;
  let avgKeyZ = 0.08;
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
        keyAnchors[i] = { x: cx, y: topY, z: kz, isSharp };
        avgKeyY += topY;
        avgKeyZ += kz;
        validCount++;
        continue;
      }
    }
    const frac = i / Math.max(1, FORTEPIANO_TOTAL_KEYS - 1);
    keyAnchors[i] = {
      x: -0.42 + frac * 0.84,
      y: 0.785 + (isSharp ? 0.012 : 0),
      z: isSharp ? 0.03 : 0.085,
      isSharp,
    };
  }
  if (validCount > 0) {
    avgKeyY /= validCount;
    avgKeyZ /= validCount;
  }

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
  guideRail.position.set(0.0, avgKeyY + 0.018, avgKeyZ + 0.012);
  guideRail.visible = false;
  vizGroup.add(guideRail);

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

  const keyGlowEnergy = new Float32Array(FORTEPIANO_TOTAL_KEYS);
  const keyGlowHand = new Uint8Array(FORTEPIANO_TOTAL_KEYS); // 1 = RH (gold), 0 = LH (sapphire)

  let mode = "both"; // "both" | "falling" | "particles" | "off"

  // Color palette: RH warm concert gold, LH sapphire blue, sharp accents slightly brighter
  const COL_RH_NAT = new THREE.Color(0xecc06a);
  const COL_RH_SHARP = new THREE.Color(0xffd98a);
  const COL_LH_NAT = new THREE.Color(0x5fa2e6);
  const COL_LH_SHARP = new THREE.Color(0x88c4ff);
  const COL_IMPACT = new THREE.Color(0xfff6dd);

  function setMode(nextMode) {
    if (["both", "falling", "particles", "off"].includes(nextMode)) {
      mode = nextMode;
    }
    const showFall = mode === "both" || mode === "falling";
    const showPart = mode === "both" || mode === "particles";
    ribbonMesh.visible = showFall;
    guideRail.visible = showFall;
    particleMesh.visible = showPart;
    glowMesh.visible = mode !== "off";
  }

  function spawnParticlesForKey(keyIdx, velocity = 0.75, hand = "RH", sustainDown = false) {
    if (keyIdx < 0 || keyIdx >= FORTEPIANO_TOTAL_KEYS) return;
    const isRH = hand === "RH" || (hand !== "LH" && FORTEPIANO_MIN_MIDI + keyIdx >= 60);
    keyGlowEnergy[keyIdx] = Math.min(1.0, Math.max(keyGlowEnergy[keyIdx], 0.55 + velocity * 0.55));
    keyGlowHand[keyIdx] = isRH ? 1 : 0;

    if (mode !== "both" && mode !== "particles") return;
    const anchor = keyAnchors[keyIdx];
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

  function update(dt, perfState = null, keyDownArr = null) {
    const clampedDt = Math.min(0.05, Math.max(0.0, dt));
    const showFall = mode === "both" || mode === "falling";
    const showPart = mode === "both" || mode === "particles";
    const showGlow = mode !== "off";
    let moving = false;

    // 1. Update Falling 3D Piano-Roll Ribbons (only active during playback or scrubbed mid-piece)
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

        const keyIdx = ev.midi - FORTEPIANO_MIN_MIDI;
        if (keyIdx < 0 || keyIdx >= FORTEPIANO_TOTAL_KEYS) continue;
        const anchor = keyAnchors[keyIdx];

        const timeToHitStart = (ev.t - curTime) / tempoRate;
        const timeToHitEnd = (evEnd - curTime) / tempoRate;
        const yBot = Math.max(0.0, (timeToHitStart / 2.1) * fallHeightM);
        const yTop = Math.min(fallHeightM, (timeToHitEnd / 2.1) * fallHeightM);
        const barH = Math.max(0.011, yTop - yBot);
        if (yTop <= 0.0 || yBot >= fallHeightM) continue;

        const isPlayingNow = curTime >= ev.t && curTime <= evEnd;
        const barW = anchor.isSharp ? 0.0082 : 0.0132;
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
    for (let i = ribbonCount; i < MAX_RIBBONS; i++) {
      _dummy.position.set(0, -10, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      ribbonMesh.setMatrixAt(i, _dummy.matrix);
    }
    ribbonMesh.count = ribbonCount;
    ribbonMesh.instanceMatrix.needsUpdate = true;
    if (ribbonMesh.instanceColor) ribbonMesh.instanceColor.needsUpdate = true;

    // 2. Update Luminous Acoustic Particles
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
    }
    particleMesh.count = activePartCount;
    particleMesh.instanceMatrix.needsUpdate = true;
    if (particleMesh.instanceColor) particleMesh.instanceColor.needsUpdate = true;

    // 3. Update Key-Strike Glow Pads (shows active keys cleanly in all visual modes except "off")
    if (showGlow) {
      let glowCount = 0;
      for (let i = 0; i < FORTEPIANO_TOTAL_KEYS; i++) {
        const isDown = keyDownArr ? keyDownArr[i] === 1 : false;
        if (isDown) {
          keyGlowEnergy[i] = Math.max(keyGlowEnergy[i], 0.92);
        } else if (keyGlowEnergy[i] > 0.005) {
          keyGlowEnergy[i] *= Math.pow(0.04, clampedDt);
          moving = true;
        } else {
          keyGlowEnergy[i] = 0;
        }

        if (keyGlowEnergy[i] > 0.01) {
          const anchor = keyAnchors[i];
          const e = keyGlowEnergy[i];
          _dummy.position.set(
            anchor.x,
            anchor.y + (anchor.isSharp ? 0.004 : 0.003),
            anchor.z - (anchor.isSharp ? 0.008 : 0.012)
          );
          _dummy.rotation.set(0, 0, 0);
          _dummy.scale.set(anchor.isSharp ? 0.62 : 0.96, 1.0, anchor.isSharp ? 0.65 : 1.05);
          _dummy.updateMatrix();
          glowMesh.setMatrixAt(glowCount, _dummy.matrix);

          const base = keyGlowHand[i] === 1 ? COL_RH_SHARP : COL_LH_SHARP;
          _color.setRGB(base.r * e, base.g * e, base.b * e);
          glowMesh.setColorAt(glowCount, _color);
          glowCount++;
        }
      }
      glowMesh.count = glowCount;
      glowMesh.instanceMatrix.needsUpdate = true;
      if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;
    } else {
      glowMesh.count = 0;
    }

    return moving;
  }

  setMode("both");

  return {
    group: vizGroup,
    setMode,
    getMode: () => mode,
    spawnParticlesForKey,
    update,
  };
}
