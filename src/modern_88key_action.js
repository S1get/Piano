/**
 * Procedural Full 88-Key Concert Grand Piano Keyboard, Action & Overstrung Harp Strings
 *
 * Compass: A0 (MIDI 21) through C8 (MIDI 108) — 52 white natural keys + 36 black sharp keys.
 * Built directly inside `pianoAnchor` local space calibrated to the scaled modern concert grand
 * keywell (`CASE_SCALE_X = 1.36`, `CASE_SCALE_Z = 1.08`), keeping 100% alignment with the
 * case cheek blocks, fallboard, cast-iron harp, falling notes, and direct click/drag playability.
 *
 * GPU / Mobile Optimization:
 * - Shared geometries (1 beveled natural key, 1 sloped sharp key, 1 hammer, 1 damper)
 * - Material pooling (2 resting key materials + 4 active-glow materials, zero per-key clones)
 * - 2 InstancedMeshes for all 88 overstrung bass (copper) & tenor/treble (steel) string courses
 * - Zero per-frame memory allocations inside `updateKeyVisuals()`
 */

import * as THREE from "three";

export const CONCERT_GRAND_MIN_MIDI = 21; // A0
export const CONCERT_GRAND_MAX_MIDI = 108; // C8
export const CONCERT_GRAND_TOTAL_KEYS = 88;
export const MODERN_CASE_SCALE_X = 1.36;
export const MODERN_CASE_SCALE_Z = 1.08;

const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

// Fine horizontal offsets for sharp keys relative to the boundary between adjacent white keys
// (authentic concert-grand key spacing: C#/F# shifted slightly left, D#/A# slightly right, G# centered)
const SHARP_OFFSET_FRAC = {
  1: -0.065, // C#
  3: 0.065,  // D#
  6: -0.075, // F#
  8: 0.0,    // G#
  10: 0.075, // A#
};

const _box = new THREE.Box3();
const _invAnchor = new THREE.Matrix4();
const _minL = new THREE.Vector3();
const _maxL = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _pA = new THREE.Vector3();
const _pB = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

/**
 * Creates a sloped concert-grand black sharp key geometry pivoted at its rear balance rail (z = 0),
 * extending forward along +Z to `length`.
 */
function createSlopedSharpKeyGeometry(width, height, length) {
  const shape = new THREE.Shape();
  // Side profile in (z, y) plane -> extruded along X then centered
  const topBackZ = 0.0;
  const topFrontZ = length - 0.011;
  const botFrontZ = length;
  shape.moveTo(0.0, 0.0);
  shape.lineTo(botFrontZ, 0.0);
  shape.lineTo(topFrontZ, height);
  shape.lineTo(topBackZ, height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.0012,
    bevelSize: 0.0010,
    bevelSegments: 1,
  });
  // Rotate so X is width, Y is height, Z is forward length (+Z toward pianist)
  geo.rotateY(-Math.PI * 0.5);
  geo.translate(width * 0.5, 0.0, 0.0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Creates a beveled concert-grand white natural key geometry pivoted at its rear balance rail (z = 0),
 * extending forward along +Z to `length`, with top surface sitting cleanly at `y = 0` so key dip rotates naturally.
 */
function createBeveledNaturalKeyGeometry(width, height, length) {
  const shape = new THREE.Shape();
  shape.moveTo(0.0, -height);
  shape.lineTo(length, -height);
  shape.lineTo(length, 0.0);
  shape.lineTo(0.0, 0.0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelThickness: 0.0010,
    bevelSize: 0.0009,
    bevelSegments: 1,
  });
  geo.rotateY(-Math.PI * 0.5);
  geo.translate(width * 0.5, 0.0, 0.0);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Measures the exact unscaled keywell, hammer, damper, and string plane from the loaded 1780 GLB
 * in `pianoAnchor` local space BEFORE scaling `root`.
 */
function measureUnscaledKeywell(pianoAnchor, rigNodes) {
  pianoAnchor.updateMatrixWorld(true);
  _invAnchor.copy(pianoAnchor.matrixWorld).invert();

  let minX = Infinity;
  let maxX = -Infinity;
  let natTopY = -Infinity;
  let natBotY = Infinity;
  let natFrontZ = -Infinity;
  let natBackZ = Infinity;
  let sharpTopY = -Infinity;
  let sharpFrontZ = -Infinity;
  let validKeys = 0;

  for (let i = 0; i < rigNodes.keys.length; i++) {
    const kNode = rigNodes.keys[i];
    if (!kNode) continue;
    _box.setFromObject(kNode);
    if (_box.isEmpty()) continue;
    _minL.copy(_box.min).applyMatrix4(_invAnchor);
    _maxL.copy(_box.max).applyMatrix4(_invAnchor);

    const x0 = Math.min(_minL.x, _maxL.x);
    const x1 = Math.max(_minL.x, _maxL.x);
    const y0 = Math.min(_minL.y, _maxL.y);
    const y1 = Math.max(_minL.y, _maxL.y);
    const z0 = Math.min(_minL.z, _maxL.z);
    const z1 = Math.max(_minL.z, _maxL.z);

    if (x0 < minX) minX = x0;
    if (x1 > maxX) maxX = x1;

    const midi61 = 29 + i;
    const isSharp = BLACK_PCS.has(((midi61 % 12) + 12) % 12);
    if (isSharp) {
      if (y1 > sharpTopY) sharpTopY = y1;
      if (z1 > sharpFrontZ) sharpFrontZ = z1;
    } else {
      if (y1 > natTopY) natTopY = y1;
      if (y0 < natBotY) natBotY = y0;
      if (z1 > natFrontZ) natFrontZ = z1;
      if (z0 < natBackZ) natBackZ = z0;
    }
    validKeys++;
  }

  // Fallback to calibrated Stein 1780 GLB measurements if traversal failed
  if (validKeys < 10 || !Number.isFinite(minX)) {
    minX = -0.422;
    maxX = 0.422;
    natTopY = 0.742;
    natBotY = 0.720;
    natFrontZ = 0.102;
    natBackZ = -0.025;
    sharpTopY = 0.754;
    sharpFrontZ = 0.056;
  }

  // Measure average hammer & damper & string height
  let hammerY = natTopY + 0.075;
  let hammerZ = natBackZ - 0.14;
  let damperY = natTopY + 0.092;
  let damperZ = natBackZ - 0.23;
  let stringY = natTopY + 0.088;

  const midHammer = rigNodes.hammers[30];
  if (midHammer) {
    _box.setFromObject(midHammer);
    if (!_box.isEmpty()) {
      _minL.copy(_box.min).applyMatrix4(_invAnchor);
      _maxL.copy(_box.max).applyMatrix4(_invAnchor);
      hammerY = Math.max(_minL.y, _maxL.y) - 0.008;
      hammerZ = (_minL.z + _maxL.z) * 0.5;
    }
  }
  const midDamper = rigNodes.dampers[30];
  if (midDamper) {
    _box.setFromObject(midDamper);
    if (!_box.isEmpty()) {
      _minL.copy(_box.min).applyMatrix4(_invAnchor);
      _maxL.copy(_box.max).applyMatrix4(_invAnchor);
      damperY = (_minL.y + _maxL.y) * 0.5;
      damperZ = (_minL.z + _maxL.z) * 0.5;
    }
  }
  const midCourse = rigNodes.courses[30];
  if (midCourse) {
    _box.setFromObject(midCourse);
    if (!_box.isEmpty()) {
      _minL.copy(_box.min).applyMatrix4(_invAnchor);
      _maxL.copy(_box.max).applyMatrix4(_invAnchor);
      stringY = (_minL.y + _maxL.y) * 0.5;
    }
  }

  return {
    minX,
    maxX,
    natTopY,
    natBotY,
    natFrontZ,
    natBackZ,
    sharpTopY,
    sharpFrontZ,
    hammerY,
    hammerZ,
    damperY,
    damperZ,
    stringY,
  };
}

export function buildModern88KeyConcertAction(
  pianoAnchor,
  rigNodes,
  stageEnvTex = null,
  isMobile = false
) {
  const m = measureUnscaledKeywell(pianoAnchor, rigNodes);

  // Calibrate to the scaled modern concert grand case (1.36x wide, 1.08x deep, 1.0x tall)
  const scaledMinX = m.minX * MODERN_CASE_SCALE_X;
  const scaledMaxX = m.maxX * MODERN_CASE_SCALE_X;
  const keybedSpanX = Math.max(1.06, (scaledMaxX - scaledMinX) * 0.992);
  const centerX = (scaledMinX + scaledMaxX) * 0.5;
  const leftEdgeX = centerX - keybedSpanX * 0.5;

  const natTopY = m.natTopY;
  const keyThick = Math.max(0.017, Math.min(0.024, m.natTopY - m.natBotY));
  const frontZ = m.natFrontZ * MODERN_CASE_SCALE_Z;
  const backZ = Math.min(frontZ - 0.138, m.natBackZ * MODERN_CASE_SCALE_Z);
  const natLen = Math.max(0.136, frontZ - backZ);
  const sharpLen = natLen * 0.625;
  const sharpHeight = Math.max(0.0115, Math.min(0.0155, m.sharpTopY - m.natTopY + 0.002));

  const whitePitch = keybedSpanX / 52.0; // ~21.9 mm per white key (authentic concert grand!)
  const whiteWidth = whitePitch * 0.948; // ~1.1 mm crisp inter-key shadow gap
  const blackWidth = whitePitch * 0.575; // ~12.6 mm concert grand ebony sharp

  const group = new THREE.Group();
  group.name = "ConcertGrand_88Key_Action";

  // --------------------------------------------------------------------------
  // 1. SHARED PBR MATERIALS (Resting + Pooled Direct-On-Key Active Glow)
  // --------------------------------------------------------------------------
  const whiteRestMat = new THREE.MeshPhysicalMaterial({
    name: "Modern88_WhiteKey_Rest",
    color: 0xf6f3eb,
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 0.72,
    clearcoatRoughness: 0.09,
    ior: 1.52,
    sheen: 0.08,
    sheenColor: new THREE.Color(0xffffff),
    envMap: stageEnvTex,
    envMapIntensity: 1.08,
  });

  const blackRestMat = new THREE.MeshPhysicalMaterial({
    name: "Modern88_BlackKey_Rest",
    color: 0x121216,
    roughness: 0.26,
    metalness: 0.0,
    clearcoat: 0.36,
    clearcoatRoughness: 0.18,
    ior: 1.50,
    envMap: stageEnvTex,
    envMapIntensity: 0.82,
  });

  const makeGlowMat = (baseMat, glowHex, intensity, name) => {
    const gm = baseMat.clone();
    gm.name = name;
    gm.emissive = new THREE.Color(glowHex);
    gm.emissiveIntensity = intensity;
    return gm;
  };

  const whiteGlowRH = makeGlowMat(whiteRestMat, 0xd99b26, 0.76, "Modern88_WhiteKey_GlowRH");
  const whiteGlowLH = makeGlowMat(whiteRestMat, 0x2c7be5, 0.76, "Modern88_WhiteKey_GlowLH");
  const blackGlowRH = makeGlowMat(blackRestMat, 0xe8ab34, 0.92, "Modern88_BlackKey_GlowRH");
  const blackGlowLH = makeGlowMat(blackRestMat, 0x3b8cf5, 0.92, "Modern88_BlackKey_GlowLH");

  const feltMat = new THREE.MeshStandardMaterial({
    name: "Modern88_NameboardFelt",
    color: 0x7a161c,
    roughness: 0.92,
    metalness: 0.0,
  });

  const keySlipMat = new THREE.MeshPhysicalMaterial({
    name: "Modern88_KeySlipWood",
    color: 0x0b0b0d,
    roughness: 0.07,
    metalness: 0.02,
    clearcoat: 0.98,
    clearcoatRoughness: 0.03,
    envMap: stageEnvTex,
    envMapIntensity: 1.35,
  });

  const hammerShankMat = new THREE.MeshStandardMaterial({
    name: "Modern88_HammerShankMaple",
    color: 0xcba675,
    roughness: 0.62,
    metalness: 0.0,
  });

  const hammerFeltMat = new THREE.MeshStandardMaterial({
    name: "Modern88_HammerWoolFelt",
    color: 0xf4eee0,
    roughness: 0.88,
    metalness: 0.0,
  });

  const hammerUnderfeltMat = new THREE.MeshStandardMaterial({
    name: "Modern88_HammerUnderfelt",
    color: 0x7a161c,
    roughness: 0.86,
    metalness: 0.0,
  });

  const damperHeadMat = new THREE.MeshStandardMaterial({
    name: "Modern88_DamperBlock",
    color: 0x161418,
    roughness: 0.45,
    metalness: 0.04,
  });

  const copperStringMat = new THREE.MeshStandardMaterial({
    name: "Modern88_CopperBassStrings",
    color: 0xd9a84e,
    roughness: 0.24,
    metalness: 0.92,
    envMap: stageEnvTex,
    envMapIntensity: 1.45,
  });

  const steelStringMat = new THREE.MeshStandardMaterial({
    name: "Modern88_SteelTrebleStrings",
    color: 0xd5dce6,
    roughness: 0.20,
    metalness: 0.94,
    envMap: stageEnvTex,
    envMapIntensity: 1.52,
  });

  // --------------------------------------------------------------------------
  // 2. KEYBED BACK-RAIL FELT STRIP & FRONT KEY-SLIP GUARD
  // --------------------------------------------------------------------------
  const backFeltGeo = new THREE.BoxGeometry(keybedSpanX + 0.008, 0.011, 0.014);
  const backFeltMesh = new THREE.Mesh(backFeltGeo, feltMat);
  backFeltMesh.position.set(centerX, natTopY + 0.004, backZ + 0.002);
  group.add(backFeltMesh);

  const keybedDarkPlateGeo = new THREE.BoxGeometry(keybedSpanX + 0.014, 0.008, natLen + 0.012);
  const keybedDarkPlateMat = new THREE.MeshStandardMaterial({
    color: 0x09080a,
    roughness: 0.82,
    metalness: 0.0,
  });
  const keybedDarkPlate = new THREE.Mesh(keybedDarkPlateGeo, keybedDarkPlateMat);
  keybedDarkPlate.position.set(centerX, natTopY - keyThick - 0.005, backZ + natLen * 0.5);
  group.add(keybedDarkPlate);

  const keySlipGeo = new THREE.BoxGeometry(keybedSpanX + 0.022, 0.024, 0.012);
  const keySlipMesh = new THREE.Mesh(keySlipGeo, keySlipMat);
  keySlipMesh.position.set(centerX, natTopY - keyThick - 0.010, frontZ + 0.007);
  group.add(keySlipMesh);

  // --------------------------------------------------------------------------
  // 3. BUILD ALL 88 KEYS (A0 = MIDI 21 .. C8 = MIDI 108)
  // --------------------------------------------------------------------------
  const natKeyGeo = createBeveledNaturalKeyGeometry(whiteWidth, keyThick, natLen);
  const sharpKeyGeo = createSlopedSharpKeyGeometry(blackWidth, sharpHeight, sharpLen);

  const keyPivots = new Array(CONCERT_GRAND_TOTAL_KEYS);
  const keyMeshes = new Array(CONCERT_GRAND_TOTAL_KEYS);
  const keyIsSharp = new Uint8Array(CONCERT_GRAND_TOTAL_KEYS);
  const keyXPos = new Float32Array(CONCERT_GRAND_TOTAL_KEYS);
  const keyAnchors88 = new Array(CONCERT_GRAND_TOTAL_KEYS);
  const keyMeshToMidi = new Map();

  let whiteIdx = 0;
  for (let i = 0; i < CONCERT_GRAND_TOTAL_KEYS; i++) {
    const midi = CONCERT_GRAND_MIN_MIDI + i;
    const pc = ((midi % 12) + 12) % 12;
    const isSharp = BLACK_PCS.has(pc);
    keyIsSharp[i] = isSharp ? 1 : 0;

    let kx;
    if (!isSharp) {
      kx = leftEdgeX + (whiteIdx + 0.5) * whitePitch;
      whiteIdx++;
    } else {
      // Positioned cleanly straddling the boundary between the previous white key and next white key
      const seamX = leftEdgeX + whiteIdx * whitePitch;
      kx = seamX + (SHARP_OFFSET_FRAC[pc] || 0) * whitePitch;
    }
    keyXPos[i] = kx;

    const pivot = new THREE.Group();
    pivot.name = `Key88_Pivot_${midi}`;
    pivot.position.set(kx, natTopY, backZ);

    const mesh = new THREE.Mesh(
      isSharp ? sharpKeyGeo : natKeyGeo,
      isSharp ? blackRestMat : whiteRestMat
    );
    mesh.name = `Key88_Mesh_${midi}`;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    pivot.add(mesh);

    group.add(pivot);
    keyPivots[i] = pivot;
    keyMeshes[i] = mesh;
    keyMeshToMidi.set(mesh, midi);

    keyAnchors88[i] = {
      x: kx,
      y: isSharp ? natTopY + sharpHeight : natTopY,
      z: isSharp ? backZ + sharpLen * 0.65 : frontZ - 0.030,
      isSharp,
    };
  }

  // --------------------------------------------------------------------------
  // 4. BUILD 88 INDIVIDUAL ANIMATED CONCERT HAMMERS & OVERHEAD DAMPERS
  // --------------------------------------------------------------------------
  const hammerPivotY = m.hammerY - 0.012;
  const hammerPivotZ = m.hammerZ * MODERN_CASE_SCALE_Z;
  const damperRestY = m.damperY;
  const damperBaseZ = m.damperZ * MODERN_CASE_SCALE_Z;

  // Compact wooden shank + teardrop wool felt hammer head + colored underfelt core
  const shankGeo = new THREE.BoxGeometry(0.0044, 0.0046, 0.072);
  shankGeo.translate(0, 0, -0.036);
  const underfeltGeo = new THREE.BoxGeometry(0.0074, 0.015, 0.013);
  underfeltGeo.translate(0, 0.009, -0.068);
  const headFeltGeo = new THREE.BoxGeometry(0.0086, 0.022, 0.018);
  headFeltGeo.translate(0, 0.013, -0.068);

  // Concert damper head (black wood carrier + white felt block beneath)
  const damperWoodGeo = new THREE.BoxGeometry(0.0082, 0.012, 0.034);
  const damperFeltGeo = new THREE.BoxGeometry(0.0076, 0.006, 0.032);
  damperFeltGeo.translate(0, -0.008, 0);

  const hammerPivots = new Array(CONCERT_GRAND_TOTAL_KEYS);
  const damperPivots = new Array(CONCERT_GRAND_TOTAL_KEYS);
  const damperRestYs = new Float32Array(CONCERT_GRAND_TOTAL_KEYS);

  for (let i = 0; i < CONCERT_GRAND_TOTAL_KEYS; i++) {
    const t = i / (CONCERT_GRAND_TOTAL_KEYS - 1);
    const hx = keyXPos[i] * 0.965;
    // Authentic concert grand hammer/damper graduation (heavier in bass, smaller/lighter in high treble)
    const sizeScale = 1.18 - t * 0.42;

    const hPivot = new THREE.Group();
    hPivot.name = `Hammer88_${i}`;
    hPivot.position.set(hx, hammerPivotY, hammerPivotZ);

    const shank = new THREE.Mesh(shankGeo, hammerShankMat);
    const head = new THREE.Mesh(headFeltGeo, hammerFeltMat);
    head.scale.set(sizeScale, sizeScale, sizeScale);
    hPivot.add(shank, head);

    if (!isMobile) {
      const under = new THREE.Mesh(underfeltGeo, hammerUnderfeltMat);
      under.scale.set(sizeScale, sizeScale, sizeScale);
      hPivot.add(under);
    }

    group.add(hPivot);
    hammerPivots[i] = hPivot;

    // Uppermost 18 treble notes (MIDI 91..108) on real concert grands are undamped (free sympathetic shimmer!),
    // while the lower 70 courses have individual overhead dampers that lift cleanly on key & sustain pedal.
    if (i < 72) {
      const dPivot = new THREE.Group();
      dPivot.name = `Damper88_${i}`;
      const dz = damperBaseZ - (1.0 - t) * 0.045;
      dPivot.position.set(hx, damperRestY, dz);

      const dWood = new THREE.Mesh(damperWoodGeo, damperHeadMat);
      const dFelt = new THREE.Mesh(damperFeltGeo, hammerFeltMat);
      dPivot.add(dWood, dFelt);
      group.add(dPivot);

      damperPivots[i] = dPivot;
      damperRestYs[i] = damperRestY;
    } else {
      damperPivots[i] = null;
      damperRestYs[i] = damperRestY;
    }
  }

  // --------------------------------------------------------------------------
  // 5. OVERSTRUNG 88-COURSE CONCERT HARP STRINGS (2 GPU InstancedMeshes total!)
  // --------------------------------------------------------------------------
  const BASS_COUNT = 26; // MIDI 21 (A0) .. MIDI 46 (Bb2) — diagonal copper-wound overstrung bass fan
  const TREBLE_COUNT = CONCERT_GRAND_TOTAL_KEYS - BASS_COUNT; // 62 steel tenor/treble courses
  const stringGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.0, 5, 1, true);

  const bassStringsMesh = new THREE.InstancedMesh(stringGeo, copperStringMat, BASS_COUNT);
  bassStringsMesh.name = "ConcertGrand_OverstrungBassStrings";
  bassStringsMesh.frustumCulled = false;

  const trebleStringsMesh = new THREE.InstancedMesh(stringGeo, steelStringMat, TREBLE_COUNT);
  trebleStringsMesh.name = "ConcertGrand_SteelTrebleStrings";
  trebleStringsMesh.frustumCulled = false;

  const baseStringY = m.stringY;
  const wrestplankZ = backZ - 0.16;

  // Populate overstrung diagonal bass fan (elevated +14 mm over tenor bridge, sweeping toward rear right tail)
  for (let i = 0; i < BASS_COUNT; i++) {
    const u = i / Math.max(1, BASS_COUNT - 1);
    const xStart = keyXPos[i] * 0.94;
    const zStart = wrestplankZ - 0.02 - u * 0.04;
    // Fan sweeps diagonally from left-front wrestplank toward right-rear bass bridge
    const xEnd = -0.18 + u * 0.44;
    const zEnd = -1.96 + u * 0.42;
    const yBass = baseStringY + 0.016;

    _pA.set(xStart, yBass, zStart);
    _pB.set(xEnd, yBass + 0.003, zEnd);
    _dir.subVectors(_pB, _pA);
    const len = _dir.length();
    _dir.divideScalar(len);
    _quat.setFromUnitVectors(_up, _dir);

    _dummy.position.copy(_pA).addScaledVector(_dir, len * 0.5);
    _dummy.quaternion.copy(_quat);
    const radius = 0.0019 - u * 0.00055;
    _dummy.scale.set(radius, len, radius);
    _dummy.updateMatrix();
    bassStringsMesh.setMatrixAt(i, _dummy.matrix);
  }
  bassStringsMesh.instanceMatrix.needsUpdate = true;
  bassStringsMesh.computeBoundingSphere();

  // Populate fanned steel tenor & treble courses (running under the bass fan into the curved bentside bridge)
  for (let j = 0; j < TREBLE_COUNT; j++) {
    const i = BASS_COUNT + j;
    const u = j / Math.max(1, TREBLE_COUNT - 1);
    const xStart = keyXPos[i] * 0.96;
    const zStart = wrestplankZ - 0.04 + u * 0.05;
    // Exponential concert-grand string scaling curve from long tenor to short sparkling treble
    const xEnd = -0.34 + u * 0.86;
    const zEnd = -1.88 + Math.pow(u, 0.72) * 1.44;
    const ySteel = baseStringY + 0.002;

    _pA.set(xStart, ySteel, zStart);
    _pB.set(xEnd, ySteel, zEnd);
    _dir.subVectors(_pB, _pA);
    const len = _dir.length();
    _dir.divideScalar(len);
    _quat.setFromUnitVectors(_up, _dir);

    _dummy.position.copy(_pA).addScaledVector(_dir, len * 0.5);
    _dummy.quaternion.copy(_quat);
    const radius = 0.0011 - u * 0.00035;
    _dummy.scale.set(radius, len, radius);
    _dummy.updateMatrix();
    trebleStringsMesh.setMatrixAt(j, _dummy.matrix);
  }
  trebleStringsMesh.instanceMatrix.needsUpdate = true;
  trebleStringsMesh.computeBoundingSphere();

  group.add(bassStringsMesh);
  group.add(trebleStringsMesh);
  pianoAnchor.add(group);

  // Track currently applied material state per key to avoid redundant JS assignments
  // 0 = rest, 1 = RH glow, 2 = LH glow
  const appliedGlowState = new Uint8Array(CONCERT_GRAND_TOTAL_KEYS);

  function applyKeyStyle(style = "modern") {
    const isHist = style === "historical";
    if (isHist) {
      // Inverted baroque/classical ebony naturals + bone sharps if user toggles "Исторические"
      whiteRestMat.color.setHex(0x161412);
      whiteRestMat.roughness = 0.34;
      whiteRestMat.clearcoat = 0.25;
      blackRestMat.color.setHex(0xeae2ce);
      blackRestMat.roughness = 0.24;
      blackRestMat.clearcoat = 0.45;
    } else {
      // Authentic Concert Grand warm ivory-white naturals + satin-ebony sharps
      whiteRestMat.color.setHex(0xf6f3eb);
      whiteRestMat.roughness = 0.14;
      whiteRestMat.clearcoat = 0.72;
      blackRestMat.color.setHex(0x121216);
      blackRestMat.roughness = 0.26;
      blackRestMat.clearcoat = 0.36;
    }
    whiteRestMat.needsUpdate = true;
    blackRestMat.needsUpdate = true;

    // Sync glow base colors to match active style
    whiteGlowRH.color.copy(whiteRestMat.color);
    whiteGlowLH.color.copy(whiteRestMat.color);
    blackGlowRH.color.copy(blackRestMat.color);
    blackGlowLH.color.copy(blackRestMat.color);
    whiteGlowRH.needsUpdate = true;
    whiteGlowLH.needsUpdate = true;
    blackGlowRH.needsUpdate = true;
    blackGlowLH.needsUpdate = true;
  }

  function syncPianoModelVisual(model) {
    if (!model?.visual) return;
    const v = model.visual;
    const accentFelt = v.feltAccentColor ?? v.clothColor ?? 0x7a161c;
    feltMat.color.setHex(accentFelt);
    hammerUnderfeltMat.color.setHex(accentFelt);

    copperStringMat.color.setHex(v.stringBrassColor ?? 0xd9a84e);
    steelStringMat.color.setHex(v.stringIronColor ?? 0xd5dce6);

    if (v.isCrystal) {
      keySlipMat.color.setHex(v.caseColor ?? 0xdff2ff);
      keySlipMat.transparent = true;
      keySlipMat.opacity = 0.44;
      keySlipMat.roughness = 0.04;
      keySlipMat.clearcoat = 1.0;
    } else {
      keySlipMat.color.setHex(v.caseColor ?? 0x0b0b0d);
      keySlipMat.transparent = false;
      keySlipMat.opacity = 1.0;
      keySlipMat.roughness = v.caseRoughness ?? 0.07;
      keySlipMat.clearcoat = v.caseClearcoat ?? 0.98;
    }
    keySlipMat.needsUpdate = true;
  }

  function clearAllKeyEmissives() {
    for (let i = 0; i < CONCERT_GRAND_TOTAL_KEYS; i++) {
      if (appliedGlowState[i] !== 0) {
        appliedGlowState[i] = 0;
        keyMeshes[i].material = keyIsSharp[i] ? blackRestMat : whiteRestMat;
      }
    }
  }

  function updateKeyVisuals(keyPos, keyHand, hammerPhase, damperLift, sustainLift, keyGlowEnabled) {
    const globalPedalLift = sustainLift * 0.0085;
    for (let i = 0; i < CONCERT_GRAND_TOTAL_KEYS; i++) {
      // 1. Key dip rotation (+X rotates front edge downward ~10 mm)
      const dip = keyPos[i];
      keyPivots[i].rotation.x = dip * 0.068;

      // 2. Pooled direct-on-key emissive glow (RH concert gold / LH sapphire blue)
      const wantGlow = keyGlowEnabled && dip > 0.04 ? (keyHand[i] === "LH" ? 2 : 1) : 0;
      if (wantGlow !== appliedGlowState[i]) {
        appliedGlowState[i] = wantGlow;
        const sharp = keyIsSharp[i] === 1;
        if (wantGlow === 1) {
          keyMeshes[i].material = sharp ? blackGlowRH : whiteGlowRH;
        } else if (wantGlow === 2) {
          keyMeshes[i].material = sharp ? blackGlowLH : whiteGlowLH;
        } else {
          keyMeshes[i].material = sharp ? blackRestMat : whiteRestMat;
        }
      }

      // 3. Hammer strike arc (rotates upward around X to strike strings cleanly)
      hammerPivots[i].rotation.x = hammerPhase[i] * 0.42;

      // 4. Individual + Sustain Pedal overhead damper lift
      const dPivot = damperPivots[i];
      if (dPivot) {
        const lift = Math.max(damperLift[i] * 0.011, globalPedalLift);
        dPivot.position.y = damperRestYs[i] + lift;
      }
    }
  }

  function dispose() {
    natKeyGeo.dispose();
    sharpKeyGeo.dispose();
    backFeltGeo.dispose();
    keybedDarkPlateGeo.dispose();
    keySlipGeo.dispose();
    shankGeo.dispose();
    underfeltGeo.dispose();
    headFeltGeo.dispose();
    damperWoodGeo.dispose();
    damperFeltGeo.dispose();
    stringGeo.dispose();

    whiteRestMat.dispose();
    blackRestMat.dispose();
    whiteGlowRH.dispose();
    whiteGlowLH.dispose();
    blackGlowRH.dispose();
    blackGlowLH.dispose();
    feltMat.dispose();
    keybedDarkPlateMat.dispose();
    keySlipMat.dispose();
    hammerShankMat.dispose();
    hammerFeltMat.dispose();
    hammerUnderfeltMat.dispose();
    damperHeadMat.dispose();
    copperStringMat.dispose();
    steelStringMat.dispose();
  }

  return {
    group,
    keyPivots,
    keyMeshes,
    keyMeshToMidi,
    keyAnchors88,
    hammerPivots,
    damperPivots,
    applyKeyStyle,
    syncPianoModelVisual,
    clearAllKeyEmissives,
    updateKeyVisuals,
    dispose,
  };
}
