/**
 * Concert Grand Piano Brand-Specific 3D Exterior & Interior Architecture
 *
 * Builds bespoke, museum-detailed 3D assemblies for each of the 5 modern concert grands
 * (Steinway Model D, Fazioli F308, Bösendorfer Imperial 290, Yamaha CFX White, Crystal Grand),
 * while staying cleanly hidden on the historical 1780 Stein-Schule fortepiano:
 *   1. High-resolution Fallboard & Bentside Brand Logos (canvas decals)
 *   2. Unique Cast-Iron Concert Harp / Plate (struts, sound ports, agraffe bar, felt braid, medallion)
 *   3. Unique 3-Leg Concert Grand Tripod with Double-Wheel Brass/Chrome Casters (grounded at y = 0.0)
 *   4. Unique Carved Concert Music Desk positioned strictly BEHIND the score book
 *   5. Crystal Grand single-layer optical acrylic base plate (eliminates key-front double ghosting)
 */

import * as THREE from "three";

function createLogoTexture(text, subtext, colorHex, fontSpec, bgAlpha = 0.0, maxAniso = 8) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bgAlpha > 0) {
    ctx.fillStyle = `rgba(10, 10, 12, ${bgAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Subtle metallic embossing glow
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = colorHex || "#e6c36c";
  ctx.font = fontSpec || "600 66px Georgia, serif";
  ctx.fillText(text || "", canvas.width * 0.5, subtext ? 76 : 96);

  if (subtext) {
    ctx.shadowBlur = 3;
    ctx.fillStyle = colorHex || "#e6c36c";
    ctx.globalAlpha = 0.82;
    ctx.font = "500 24px 'Segoe UI', system-ui, sans-serif";
    ctx.fillText(subtext, canvas.width * 0.5, 138);
    ctx.globalAlpha = 1.0;

    // Fine ornamental rule flanking subtext
    ctx.strokeStyle = colorHex || "#e6c36c";
    ctx.globalAlpha = 0.48;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(220, 114);
    ctx.lineTo(804, 114);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso || 4);
  tex.needsUpdate = true;
  return tex;
}

function createSoundboardCrestTexture(brandName, accentColor, maxAniso = 8) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 512);

  // Ornamental circular medallion crest on cast-iron harp
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(256, 256, 210, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 256, 186, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 44px Georgia, serif";
  ctx.fillText(brandName, 256, 232);
  ctx.font = "italic 500 26px Georgia, serif";
  ctx.fillText("CONCERT GRAND", 256, 286);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAniso || 4);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Helper: build a single modern concert grand leg assembly grounded at y = 0.0
 * up to belly underside y = 0.662.
 */
function buildSingleModernLeg(style, woodMat, metalMat, crystalMat) {
  const leg = new THREE.Group();
  leg.name = `ModernLeg_${style}`;

  // 1. Concert Double-Wheel Swivel Caster (grounded strictly at y = 0.0)
  const wheelGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.011, 18);
  wheelGeo.rotateZ(Math.PI * 0.5);
  for (const wx of [-0.012, 0.012]) {
    const wheel = new THREE.Mesh(wheelGeo, metalMat);
    wheel.position.set(wx, 0.022, 0.0);
    leg.add(wheel);
  }
  const axle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.005, 0.032, 10).rotateZ(Math.PI * 0.5),
    metalMat
  );
  axle.position.set(0, 0.022, 0);
  leg.add(axle);

  const fork = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.032, 0.024), metalMat);
  fork.position.set(0, 0.044, 0);
  leg.add(fork);

  const casterCup = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.024, 16), metalMat);
  casterCup.position.set(0, 0.068, 0);
  leg.add(casterCup);

  const primaryMat = style === "crystal_prism" ? crystalMat : woodMat;

  if (style === "spade") {
    // Steinway Model D iconic octagonal tapered spade leg with square capital block
    const footCollar = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.036, 0.056), primaryMat);
    footCollar.position.set(0, 0.095, 0);
    leg.add(footCollar);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.029, 0.44, 8), primaryMat);
    shaft.rotation.y = Math.PI / 8;
    shaft.position.set(0, 0.33, 0);
    leg.add(shaft);

    const neckTrim = new THREE.Mesh(new THREE.BoxGeometry(0.096, 0.016, 0.096), primaryMat);
    neckTrim.position.set(0, 0.558, 0);
    leg.add(neckTrim);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.096, 0.112), primaryMat);
    capital.position.set(0, 0.614, 0);
    leg.add(capital);
  } else if (style === "italian_ferrule") {
    // Fazioli F308 sleek Italian tapered mahogany leg with gilded brass sabots & shoulder collar
    const sabot = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.023, 0.072, 20), metalMat);
    sabot.position.set(0, 0.112, 0);
    leg.add(sabot);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.028, 0.415, 24), primaryMat);
    shaft.position.set(0, 0.352, 0);
    leg.add(shaft);

    const upperBand = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.046, 0.016, 24), metalMat);
    upperBand.position.set(0, 0.566, 0);
    leg.add(upperBand);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.088, 0.104), primaryMat);
    capital.position.set(0, 0.618, 0);
    leg.add(capital);
  } else if (style === "viennese_fluted") {
    // Bösendorfer Imperial 290 fluted Viennese tapered column with stepped plinth & brass ring
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.034, 16), metalMat);
    baseRing.position.set(0, 0.096, 0);
    leg.add(baseRing);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.030, 0.44, 12), primaryMat);
    shaft.position.set(0, 0.332, 0);
    leg.add(shaft);

    const capitalCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.050, 0.026, 16), primaryMat);
    capitalCollar.position.set(0, 0.562, 0);
    leg.add(capitalCollar);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.114, 0.086, 0.114), primaryMat);
    capital.position.set(0, 0.619, 0);
    leg.add(capital);
  } else if (style === "modern_taper") {
    // Yamaha CFX sculptural curved-taper pearl-white leg with satin platinum collar
    const chromeShoe = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.025, 0.048, 20), metalMat);
    chromeShoe.position.set(0, 0.102, 0);
    leg.add(chromeShoe);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.028, 0.43, 4), primaryMat);
    shaft.rotation.y = Math.PI * 0.25;
    shaft.position.set(0, 0.34, 0);
    leg.add(shaft);

    const platinumRing = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.014, 0.092), metalMat);
    platinumRing.position.set(0, 0.562, 0);
    leg.add(platinumRing);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.106, 0.090, 0.106), primaryMat);
    capital.position.set(0, 0.617, 0);
    leg.add(capital);
  } else if (style === "kawai_sculpted") {
    // Shigeru Kawai SK-EX: sculpted Japanese flared concert leg with recessed crimson-gold collar
    const shoe = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.025, 0.044, 16), metalMat);
    shoe.position.set(0, 0.099, 0);
    leg.add(shoe);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.029, 0.435, 16), primaryMat);
    shaft.position.set(0, 0.338, 0);
    leg.add(shaft);

    const goldRing = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.048, 0.015, 16), metalMat);
    goldRing.position.set(0, 0.562, 0);
    leg.add(goldRing);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.110, 0.092, 0.110), primaryMat);
    capital.position.set(0, 0.616, 0);
    leg.add(capital);
  } else if (style === "bechstein_taper") {
    // C. Bechstein D 282: sleek Berlin architectural tapered square-bevel leg with bronze neck ring
    const baseBlock = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.034, 0.054), primaryMat);
    baseBlock.position.set(0, 0.094, 0);
    leg.add(baseBlock);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.027, 0.44, 4), primaryMat);
    shaft.rotation.y = Math.PI * 0.25;
    shaft.position.set(0, 0.334, 0);
    leg.add(shaft);

    const bronzeCollar = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.014, 0.094), metalMat);
    bronzeCollar.position.set(0, 0.560, 0);
    leg.add(bronzeCollar);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.092, 0.108), primaryMat);
    capital.position.set(0, 0.616, 0);
    leg.add(capital);
  } else if (style === "bluthner_column") {
    // Blüthner Model 1: classic Leipzig turned mahogany column leg with double gilded rings
    const lowerRing = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.038, 20), metalMat);
    lowerRing.position.set(0, 0.098, 0);
    leg.add(lowerRing);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.031, 0.43, 20), primaryMat);
    shaft.position.set(0, 0.334, 0);
    leg.add(shaft);

    const neckBead = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.008, 10, 22).rotateX(Math.PI * 0.5), metalMat);
    neckBead.position.set(0, 0.556, 0);
    leg.add(neckBead);

    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.114, 0.092, 0.114), primaryMat);
    capital.position.set(0, 0.616, 0);
    leg.add(capital);
  } else {
    // Crystal Grand faceted hexagonal optical prism leg with mirror-chrome core rod & collars
    const innerRod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.54, 12), metalMat);
    innerRod.position.set(0, 0.35, 0);
    leg.add(innerRod);

    const prismShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.030, 0.45, 6), primaryMat);
    prismShaft.position.set(0, 0.335, 0);
    leg.add(prismShaft);

    const lowerCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.030, 0.026, 6), metalMat);
    lowerCollar.position.set(0, 0.098, 0);
    leg.add(lowerCollar);

    const upperCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.052, 0.022, 6), metalMat);
    upperCollar.position.set(0, 0.568, 0);
    leg.add(upperCollar);

    const crystalCap = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.082, 0.102), primaryMat);
    crystalCap.position.set(0, 0.621, 0);
    leg.add(crystalCap);
  }

  return leg;
}

// Exact measured unscaled interior bentside wall X(z) of `stein_1780_fortepiano.glb`
// (`Resonanzboden_Anhangleiste_Rail`, straight bass spine inner wall at x = -0.456).
const HARP_BENTSIDE_CURVE = [
  [-0.34,  0.450],
  [-0.50,  0.446],
  [-0.60,  0.330],
  [-0.70,  0.225],
  [-0.80,  0.148],
  [-0.90,  0.091],
  [-1.00,  0.051],
  [-1.10,  0.012],
  [-1.20, -0.027],
  [-1.30, -0.053],
  [-1.40, -0.086],
  [-1.50, -0.117],
  [-1.60, -0.148],
  [-1.70, -0.181],
  [-1.80, -0.219],
  [-1.90, -0.280],
  [-2.00, -0.419],
  [-2.07, -0.456],
];

function getHarpBentsideMaxX(z) {
  if (z >= HARP_BENTSIDE_CURVE[0][0]) return HARP_BENTSIDE_CURVE[0][1];
  const last = HARP_BENTSIDE_CURVE[HARP_BENTSIDE_CURVE.length - 1];
  if (z <= last[0]) return last[1];
  for (let i = 0; i < HARP_BENTSIDE_CURVE.length - 1; i++) {
    const [z0, x0] = HARP_BENTSIDE_CURVE[i];
    const [z1, x1] = HARP_BENTSIDE_CURVE[i + 1];
    if (z <= z0 && z >= z1) {
      const t = (z - z0) / (z1 - z0);
      return x0 + (x1 - x0) * t;
    }
  }
  return last[1];
}

/**
 * Helper: build unique Cast-Iron Concert Harp / Plate assembly nestled strictly INSIDE the
 * measured curved bentside rim (`x in [-0.432 .. getHarpBentsideMaxX(z) - 0.028]`) and strictly
 * BELOW the closed lid underside (`y <= 0.878`, closed lid sits at `y = 0.895`).
 */
function buildBrandHarpAssembly(style, harpMat, feltMat, accentMat, crestTex) {
  const grp = new THREE.Group();
  grp.name = `ConcertHarp_${style}`;
  const yPlate = 0.852;

  // 1. Cast-iron Pinblock / Wrestplank Armor Plate across front cavity (behind dampers)
  const frontBar = new THREE.Mesh(new THREE.BoxGeometry(0.835, 0.012, 0.078), harpMat);
  frontBar.position.set(0.0, yPlate + 0.004, -0.355);
  grp.add(frontBar);

  // Brass / Platinum Agraffe & Capo d'Astro pressure bar
  const capoBar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.80, 12), accentMat);
  capoBar.rotation.z = Math.PI * 0.5;
  capoBar.position.set(0.0, yPlate + 0.013, -0.324);
  grp.add(capoBar);

  // Signature colored felt hitch-pin braid along front wrestplank & interior tail curve
  const frontFelt = new THREE.Mesh(new THREE.BoxGeometry(0.80, 0.007, 0.015), feltMat);
  frontFelt.position.set(0.0, yPlate + 0.011, -0.392);
  grp.add(frontFelt);

  const tailFelt = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.007, 0.013), feltMat);
  tailFelt.position.set(-0.365, yPlate + 0.010, -1.84);
  tailFelt.rotation.y = 0.68;
  grp.add(tailFelt);

  // 2. Curved Bentside Hitch-Pin Flange following the EXACT interior GLB rim with 0.032 m margin
  const rimPts = [
    [-0.422, -0.35],
    [-0.422, -1.94],
    [-0.365, -1.91],
    [-0.275, -1.80],
    [-0.215, -1.64],
    [-0.155, -1.42],
    [-0.088, -1.20],
    [-0.015, -1.00],
    [ 0.068, -0.84],
    [ 0.168, -0.70],
    [ 0.285, -0.58],
    [ 0.398, -0.49],
    [ 0.414, -0.35],
  ];
  for (let i = 0; i < rimPts.length - 1; i++) {
    const [x0, z0] = rimPts[i];
    const [x1, z1] = rimPts[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.014, len + 0.012), harpMat);
    beam.position.set((x0 + x1) * 0.5, yPlate + 0.004, (z0 + z1) * 0.5);
    beam.rotation.y = Math.atan2(dx, dz);
    grp.add(beam);
  }

  // Helper: place a structural cast-iron strut strictly clamped inside the bentside polygon & below y = 0.878
  const clampPoint = (x, z, margin = 0.036) => {
    const cz = Math.max(-1.90, Math.min(-0.36, z));
    const maxX = getHarpBentsideMaxX(cz) - margin;
    const minX = -0.416;
    return [Math.max(minX, Math.min(maxX, x)), cz];
  };

  const addStrut = (rawX0, rawZ0, rawX1, rawZ1, width = 0.024, height = 0.016, yOff = 0.008) => {
    let [x0, z0] = clampPoint(rawX0, rawZ0, 0.036 + width * 0.5);
    let [x1, z1] = clampPoint(rawX1, rawZ1, 0.036 + width * 0.5);

    // Ensure midpoint along concave bentside also stays strictly interior
    for (const frac of [0.25, 0.5, 0.75]) {
      const mx = x0 + (x1 - x0) * frac;
      const mz = z0 + (z1 - z0) * frac;
      const limitX = getHarpBentsideMaxX(mz) - (0.036 + width * 0.5);
      if (mx > limitX) {
        const shift = mx - limitX + 0.006;
        x1 = Math.max(-0.414, x1 - shift);
      }
    }

    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    if (len < 0.06) return;

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, len), harpMat);
    mesh.position.set((x0 + x1) * 0.5, yPlate + yOff, (z0 + z1) * 0.5);
    mesh.rotation.y = Math.atan2(dx, dz);
    grp.add(mesh);

    // Subtle beveled top rib on the strut (strictly <= yPlate + 0.023 = 0.875)
    const rib = new THREE.Mesh(new THREE.BoxGeometry(width * 0.44, 0.005, len * 0.96), accentMat);
    rib.position.set((x0 + x1) * 0.5, yPlate + yOff + height * 0.5 + 0.002, (z0 + z1) * 0.5);
    rib.rotation.y = Math.atan2(dx, dz);
    grp.add(rib);
  };

  // Safe sound-port torus helper (auto-clamps radius & position strictly inside bentside!)
  const addSoundPort = (px, pz, radius = 0.048, tube = 0.009, sx = 1.0, sz = 1.0) => {
    const radX = (radius + tube) * sx;
    const minX = -0.412 + radX;
    const maxX = getHarpBentsideMaxX(pz) - 0.032 - radX;
    if (maxX <= minX) return;
    const cx = Math.max(minX, Math.min(maxX, px));
    const portGeo = new THREE.TorusGeometry(radius, tube, 10, 24);
    portGeo.rotateX(Math.PI * 0.5);
    const ring = new THREE.Mesh(portGeo, harpMat);
    ring.position.set(cx, yPlate + 0.009, pz);
    ring.scale.set(sx, 1.0, sz);
    grp.add(ring);
  };

  if (style === "fazioli_radial") {
    // FAZIOLI F308: Radiant champagne-gold fan struts + 3 circular Italian sound ports
    addStrut(-0.35, -0.37, -0.36, -1.86, 0.026, 0.017, 0.009);
    addStrut(-0.15, -0.37, -0.27, -1.78, 0.024, 0.017, 0.009);
    addStrut( 0.08, -0.37, -0.14, -1.36, 0.022, 0.016, 0.009);
    addStrut( 0.28, -0.37,  0.07, -0.84, 0.020, 0.015, 0.009);
    addStrut(-0.36, -1.14, -0.06, -1.14, 0.020, 0.014, 0.007);

    addSoundPort(-0.30, -1.52, 0.046, 0.008, 1.0, 1.0);
    addSoundPort(-0.18, -1.24, 0.044, 0.008, 1.0, 1.0);
    addSoundPort(-0.02, -0.86, 0.040, 0.008, 1.0, 1.0);
  } else if (style === "steinway_fan") {
    // STEINWAY MODEL D: Classic bronzed-gold 4-strut fan with circular sound ports
    addStrut(-0.36, -0.37, -0.36, -1.86, 0.028, 0.017, 0.009);
    addStrut(-0.16, -0.37, -0.28, -1.80, 0.024, 0.017, 0.009);
    addStrut( 0.06, -0.37, -0.14, -1.36, 0.022, 0.016, 0.009);
    addStrut( 0.26, -0.37,  0.06, -0.85, 0.020, 0.015, 0.009);

    addSoundPort(-0.31, -1.56, 0.044, 0.008, 1.0, 1.0);
    addSoundPort(-0.20, -1.26, 0.044, 0.008, 1.0, 1.0);
  } else if (style === "bosendorfer_cross") {
    // BÖSENDORFER IMPERIAL 290: Antique gold Viennese X-bracing + crimson felt spine strip
    addStrut(-0.36, -0.37, -0.36, -1.86, 0.028, 0.017, 0.009);
    addStrut(-0.34, -0.40, -0.13, -1.36, 0.023, 0.016, 0.009);
    addStrut( 0.04, -0.40, -0.31, -1.72, 0.023, 0.016, 0.009);
    addStrut( 0.26, -0.37,  0.06, -0.84, 0.020, 0.015, 0.009);

    const spineFelt = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 1.44), feltMat);
    spineFelt.position.set(-0.398, yPlate + 0.011, -1.12);
    grp.add(spineFelt);
  } else if (style === "yamaha_swept") {
    // YAMAHA CFX: Brushed champagne-platinum swept modern V-frame + elongated oval aperture
    addStrut(-0.35, -0.37, -0.35, -1.86, 0.026, 0.017, 0.009);
    addStrut(-0.08, -0.37, -0.26, -1.76, 0.025, 0.017, 0.009);
    addStrut(-0.08, -0.37,  0.08, -0.84, 0.022, 0.016, 0.009);
    addStrut( 0.26, -0.37,  0.22, -0.64, 0.020, 0.015, 0.009);

    addSoundPort(-0.24, -1.32, 0.046, 0.008, 0.85, 1.38);
  } else if (style === "kawai_bar") {
    // SHIGERU KAWAI SK-EX: Konsei Katagi champagne-gold harp with asymmetrical fan + crimson felt ribbon
    addStrut(-0.35, -0.37, -0.35, -1.86, 0.026, 0.017, 0.009);
    addStrut(-0.12, -0.37, -0.26, -1.78, 0.024, 0.017, 0.009);
    addStrut( 0.10, -0.37, -0.13, -1.34, 0.022, 0.016, 0.009);
    addStrut( 0.30, -0.37,  0.09, -0.82, 0.020, 0.015, 0.009);
    addStrut(-0.35, -0.92,  0.02, -0.92, 0.018, 0.014, 0.007);

    const crimsonRimFelt = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.009, 1.42), feltMat);
    crimsonRimFelt.position.set(-0.396, yPlate + 0.011, -1.10);
    grp.add(crimsonRimFelt);
    addSoundPort(-0.22, -1.36, 0.046, 0.008, 1.0, 1.0);
  } else if (style === "bechstein_classic") {
    // C. BECHSTEIN D 282: Berlin bronze-gold 4-bar radial cast-iron frame with twin elliptic apertures
    addStrut(-0.36, -0.37, -0.35, -1.86, 0.027, 0.017, 0.009);
    addStrut(-0.15, -0.37, -0.27, -1.78, 0.024, 0.017, 0.009);
    addStrut( 0.07, -0.37, -0.14, -1.36, 0.022, 0.016, 0.009);
    addStrut( 0.27, -0.37,  0.06, -0.84, 0.020, 0.015, 0.009);

    addSoundPort(-0.29, -1.48, 0.042, 0.008, 0.85, 1.28);
    addSoundPort(-0.16, -1.16, 0.040, 0.008, 0.90, 1.25);
  } else if (style === "bluthner_aliquot") {
    // BLÜTHNER MODEL 1 · ALIQUOT: Antique Leipzig gold harp with 4th-string Aliquot duplex bridge
    addStrut(-0.36, -0.37, -0.35, -1.86, 0.028, 0.017, 0.009);
    addStrut(-0.14, -0.37, -0.26, -1.78, 0.024, 0.017, 0.009);
    addStrut( 0.07, -0.37, -0.13, -1.36, 0.022, 0.016, 0.009);
    addStrut( 0.27, -0.37,  0.06, -0.84, 0.020, 0.015, 0.009);

    // Raised 4th-string Aliquot duplex bridge rail strictly inside treble bentside & below lid (y = 0.872)
    const aliquotBridge = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.010, 0.014), accentMat);
    aliquotBridge.position.set(0.06, yPlate + 0.018, -0.58);
    aliquotBridge.rotation.y = 0.42;
    grp.add(aliquotBridge);

    // Shimmering Aliquot sympathetic string wires strictly inside treble curve
    for (let i = 0; i < 8; i++) {
      const f = i / 7;
      const sx = -0.02 + f * 0.28;
      const zStart = -0.37;
      const rawZEnd = -0.78 + f * 0.24;
      const maxXAtEnd = getHarpBentsideMaxX(rawZEnd) - 0.036;
      const clampedX = Math.min(sx, maxXAtEnd);
      const len = Math.max(0.14, zStart - rawZEnd);
      const strGeo = new THREE.CylinderGeometry(0.0009, 0.0009, len, 5).rotateX(Math.PI * 0.5);
      const str = new THREE.Mesh(strGeo, accentMat);
      str.position.set(clampedX, yPlate + 0.021, (zStart + rawZEnd) * 0.5);
      grp.add(str);
    }
    addSoundPort(-0.28, -1.46, 0.044, 0.008, 1.0, 1.0);
  } else {
    // CRYSTAL GRAND: Openwork mirror-chrome skeleton harp strictly inside curved acrylic rim
    addStrut(-0.37, -0.37, -0.36, -1.86, 0.020, 0.015, 0.009);
    addStrut(-0.12, -0.37, -0.25, -1.76, 0.018, 0.015, 0.009);
    addStrut( 0.14, -0.37, -0.04, -1.04, 0.017, 0.014, 0.009);

    const copperMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6a656,
      metalness: 0.96,
      roughness: 0.16,
      envMapIntensity: 1.85,
    });
    const steelMat = new THREE.MeshPhysicalMaterial({
      color: 0xf2f7ff,
      metalness: 0.98,
      roughness: 0.10,
      envMapIntensity: 1.95,
    });
    const unitStrGeo = new THREE.CylinderGeometry(1, 1, 1, 5);
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    // Overstrung exposed copper-wound bass fan strictly inside bentside
    for (let i = 0; i < 12; i++) {
      const f = i / 11;
      const x0 = -0.36 + f * 0.15;
      const z0 = -0.37;
      const z1 = -1.86 + f * 0.36;
      const x1 = Math.min(-0.34 + f * 0.20, getHarpBentsideMaxX(z1) - 0.04);
      pA.set(x0, yPlate + 0.017, z0);
      pB.set(x1, yPlate + 0.017, z1);
      dir.subVectors(pB, pA);
      const len = dir.length();
      dir.divideScalar(len);
      const sMesh = new THREE.Mesh(unitStrGeo, copperMat);
      sMesh.position.copy(pA).addScaledVector(dir, len * 0.5);
      sMesh.quaternion.setFromUnitVectors(up, dir);
      sMesh.scale.set(0.0014, len, 0.0014);
      grp.add(sMesh);
    }
    // Exposed gleaming steel treble strings strictly inside bentside
    for (let i = 0; i < 14; i++) {
      const f = i / 13;
      const x0 = -0.14 + f * 0.48;
      const z0 = -0.37;
      const z1 = -1.52 + Math.pow(f, 0.72) * 0.98;
      const x1 = Math.min(x0, getHarpBentsideMaxX(z1) - 0.04);
      pA.set(x0, yPlate + 0.013, z0);
      pB.set(x1, yPlate + 0.013, z1);
      dir.subVectors(pB, pA);
      const len = dir.length();
      dir.divideScalar(len);
      const sMesh = new THREE.Mesh(unitStrGeo, steelMat);
      sMesh.position.copy(pA).addScaledVector(dir, len * 0.5);
      sMesh.quaternion.setFromUnitVectors(up, dir);
      sMesh.scale.set(0.0009, len, 0.0009);
      grp.add(sMesh);
    }
  }

  // 3. Brand Crest Medallion resting neatly on the center-left cast-iron plate deck
  if (crestTex) {
    const crestMat = new THREE.MeshBasicMaterial({
      map: crestTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const crest = new THREE.Mesh(new THREE.PlaneGeometry(0.20, 0.20), crestMat);
    crest.rotation.x = -Math.PI * 0.5;
    crest.position.set(-0.22, yPlate + 0.022, -0.82);
    grp.add(crest);
  }

  return grp;
}

/**
 * Helper: build a bespoke carved concert music desk positioned strictly BEHIND the score book
 * (never occludes the sheet music!)
 */
function buildBrandMusicDesk(style, woodMat, metalMat, crystalMat) {
  const desk = new THREE.Group();
  desk.name = `BrandMusicDesk_${style}`;
  // Aligned with score book tilt (-0.34 rad) but shifted cleanly BEHIND z = -0.318
  desk.position.set(0.0, 0.992, -0.324);
  desk.rotation.x = -0.34;

  const frameMat = style === "crystal_easel" ? crystalMat : woodMat;
  const w = 0.58;
  const h = 0.245;

  // Bottom ledge supporting the score book + brass/chrome decorative strip
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.014, 0.042), frameMat);
  ledge.position.set(0, -h * 0.5 - 0.008, 0.022);
  desk.add(ledge);

  const ledgeTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.062, 0.004, 0.006), metalMat);
  ledgeTrim.position.set(0, -h * 0.5 - 0.006, 0.043);
  desk.add(ledgeTrim);

  // Outer perimeter rails (behind book edges)
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.016, 0.010), frameMat);
  topRail.position.set(0, h * 0.5, 0);
  desk.add(topRail);

  for (const sx of [-w * 0.5 + 0.010, w * 0.5 - 0.010]) {
    const sidePost = new THREE.Mesh(new THREE.BoxGeometry(0.020, h, 0.010), frameMat);
    sidePost.position.set(sx, 0, 0);
    desk.add(sidePost);
  }

  // Unique decorative side wings / scrollwork visible flanking the open score book!
  if (style === "italian_lyre") {
    // Fazioli: gilded curved brass side finials & recessed mahogany backplate
    const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.02, 0.005), frameMat);
    back.position.set(0, 0, -0.004);
    desk.add(back);
    for (const sx of [-w * 0.5 + 0.044, w * 0.5 - 0.044]) {
      const goldRail = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, h - 0.03, 10), metalMat);
      goldRail.position.set(sx, 0, 0.004);
      desk.add(goldRail);
    }
  } else if (style === "classic_ebony" || style === "viennese_fret") {
    // Steinway & Bösendorfer: classic concert openwork flanking fret bars
    const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.02, 0.005), frameMat);
    back.position.set(0, 0, -0.004);
    desk.add(back);
    for (const sx of [-0.255, -0.232, 0.232, 0.255]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.006, h - 0.024, 0.008), metalMat);
      bar.position.set(sx, 0, 0.003);
      desk.add(bar);
    }
  } else if (style === "modern_white") {
    // Yamaha CFX: clean pearl-white solid wing backplate with satin platinum top bar
    const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.02, 0.006), frameMat);
    back.position.set(0, 0, -0.003);
    desk.add(back);
    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.004, 0.005, 0.012), metalMat);
    topTrim.position.set(0, h * 0.5 + 0.009, 0);
    desk.add(topTrim);
  } else if (style === "kawai_slat") {
    // Shigeru Kawai SK-EX: sculpted ebony backing with dual vertical gold acoustic slats
    const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.02, 0.005), frameMat);
    back.position.set(0, 0, -0.004);
    desk.add(back);
    for (const sx of [-0.258, -0.240, 0.240, 0.258]) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.005, h - 0.026, 0.008), metalMat);
      slat.position.set(sx, 0, 0.003);
      desk.add(slat);
    }
    const crownBar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.005, 0.010), metalMat);
    crownBar.position.set(0, h * 0.5 + 0.008, 0);
    desk.add(crownBar);
  } else if (style === "bechstein_frame") {
    // C. Bechstein D 282: sleek framed Berlin concert desk with crisp bronze corner accents
    const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.02, 0.005), frameMat);
    back.position.set(0, 0, -0.004);
    desk.add(back);
    for (const sx of [-w * 0.5 + 0.036, w * 0.5 - 0.036]) {
      const accent = new THREE.Mesh(new THREE.BoxGeometry(0.007, h - 0.022, 0.008), metalMat);
      accent.position.set(sx, 0, 0.003);
      desk.add(accent);
    }
  } else if (style === "bluthner_carved") {
    // Blüthner Model 1: Leipzig burgundy-mahogany carved music desk with golden crest rail
    const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, h - 0.02, 0.006), frameMat);
    back.position.set(0, 0, -0.004);
    desk.add(back);
    const crestArch = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.007, 0.010), metalMat);
    crestArch.position.set(0, h * 0.5 + 0.008, 0.002);
    desk.add(crestArch);
    for (const sx of [-0.255, 0.255]) {
      const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, h - 0.026, 10), metalMat);
      finial.position.set(sx, 0, 0.004);
      desk.add(finial);
    }
  } else {
    // Crystal Grand: sleek transparent beveled optical crystal sheet with chrome corner bolts
    const crystalBack = new THREE.Mesh(new THREE.BoxGeometry(w - 0.01, h - 0.01, 0.007), crystalMat);
    crystalBack.position.set(0, 0, -0.003);
    desk.add(crystalBack);
    const boltGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.014, 12).rotateX(Math.PI * 0.5);
    for (const bx of [-w * 0.5 + 0.025, w * 0.5 - 0.025]) {
      for (const by of [-h * 0.5 + 0.025, h * 0.5 - 0.025]) {
        const bolt = new THREE.Mesh(boltGeo, metalMat);
        bolt.position.set(bx, by, 0.0);
        desk.add(bolt);
      }
    }
  }

  return desk;
}

export function buildBrandArchitecture(pianoAnchor, isSoftwareGL = false, maxAniso = 8, isMobile = false) {
  const lightweightGlass = Boolean(isSoftwareGL || isMobile);
  const archRoot = new THREE.Group();
  archRoot.name = "ConcertGrand_BrandArchitecture";
  pianoAnchor.add(archRoot);

  // Shared live-synced brand materials
  const caseMat = new THREE.MeshPhysicalMaterial({
    name: "BrandArch_Case",
    color: 0x0b0b0d,
    roughness: 0.05,
    metalness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.024,
    envMapIntensity: 1.5,
  });

  const hardwareMat = new THREE.MeshPhysicalMaterial({
    name: "BrandArch_Hardware",
    color: 0xd8b158,
    roughness: 0.20,
    metalness: 0.94,
    clearcoat: 0.35,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.55,
  });

  const harpMat = new THREE.MeshPhysicalMaterial({
    name: "BrandArch_HarpPlate",
    color: 0xc59a47,
    roughness: 0.24,
    metalness: 0.90,
    clearcoat: 0.40,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.65,
  });

  const feltMat = new THREE.MeshStandardMaterial({
    name: "BrandArch_Felt",
    color: 0x7a161c,
    roughness: 0.92,
    metalness: 0.0,
  });

  const crystalMat = new THREE.MeshPhysicalMaterial({
    name: "BrandArch_Crystal",
    color: 0xdff2ff,
    roughness: 0.04,
    metalness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.015,
    ior: 1.52,
    transparent: true,
    opacity: lightweightGlass ? 0.38 : 0.72,
    transmission: lightweightGlass ? 0.0 : 0.84,
    thickness: 0.22,
    depthWrite: false,
    envMapIntensity: 1.9,
  });

  // --------------------------------------------------------------------------
  // 1. MODERN FALLBOARD FASCIA + FALLBOARD BRAND LOGO + BENTSIDE BRAND LOGO
  //    Cleanly covers the hidden 1780 walnut/sycamore marquetry & diamond keyhole
  // --------------------------------------------------------------------------
  const fasciaGroup = new THREE.Group();
  fasciaGroup.name = "BrandArch_FallboardFascia";

  const fasciaBacking = new THREE.Mesh(
    new THREE.BoxGeometry(0.884, 0.104, 0.012),
    caseMat
  );
  // Placed flush across the nameboard opening, strictly behind the rear of keys (z = -0.146)
  fasciaBacking.position.set(0.0, 0.798, -0.146);
  fasciaGroup.add(fasciaBacking);

  // Subtle gold/chrome trim strip along bottom of fallboard just above red/blue keybed felt
  const fallboardFelt = new THREE.Mesh(
    new THREE.BoxGeometry(0.876, 0.008, 0.006),
    feltMat
  );
  fallboardFelt.position.set(0.0, 0.746, -0.140);
  fasciaGroup.add(fallboardFelt);

  const fallboardLogoMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const fallboardLogoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.078),
    fallboardLogoMat
  );
  fallboardLogoMesh.name = "BrandArch_FallboardLogo";
  fallboardLogoMesh.position.set(0.0, 0.802, -0.1385);
  fasciaGroup.add(fallboardLogoMesh);

  // Audience-facing Bentside Emblem along the treble exterior wall (visible from Корпус & Сцена)
  const bentsideLogoMat = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });
  const bentsideLogoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.36, 0.068),
    bentsideLogoMat
  );
  bentsideLogoMesh.name = "BrandArch_BentsideLogo";
  // Positioned flush along the straight treble cheek exterior facing +X audience (before bentside curves at z=-0.50)
  bentsideLogoMesh.position.set(0.470, 0.790, -0.25);
  bentsideLogoMesh.rotation.y = Math.PI * 0.5;
  fasciaGroup.add(bentsideLogoMesh);

  // Also a subtle left-spine logo for symmetric beauty when orbiting around bass side
  const spineLogoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.54, 0.100),
    bentsideLogoMat
  );
  spineLogoMesh.position.set(-0.486, 0.795, -1.04);
  spineLogoMesh.rotation.y = -Math.PI * 0.5;
  fasciaGroup.add(spineLogoMesh);

  archRoot.add(fasciaGroup);

  // --------------------------------------------------------------------------
  // 2. CRYSTAL GRAND CLEAN SINGLE-LAYER OPTICAL BASE PLATE & KEYSLIP
  //    Replaces hidden 1780 underside wooden planks to eliminate double-key ghosting
  // --------------------------------------------------------------------------
  const crystalFloorGroup = new THREE.Group();
  crystalFloorGroup.name = "BrandArch_CrystalBasePlate";
  const crystalKeybedFloor = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.018, 0.34),
    new THREE.MeshPhysicalMaterial({
      color: 0xdaf0ff,
      roughness: 0.06,
      metalness: 0.02,
      clearcoat: 1.0,
      transparent: true,
      opacity: lightweightGlass ? 0.42 : 0.60,
      transmission: lightweightGlass ? 0.0 : 0.76,
      side: THREE.FrontSide,
      depthWrite: false,
      envMapIntensity: 1.65,
    })
  );
  crystalKeybedFloor.position.set(0.0, 0.664, -0.11);
  crystalFloorGroup.add(crystalKeybedFloor);

  // Crisp single-layer front chrome/crystal lip edge beneath keys
  const crystalFrontEdge = new THREE.Mesh(
    new THREE.BoxGeometry(0.946, 0.010, 0.014),
    hardwareMat
  );
  crystalFrontEdge.position.set(0.0, 0.664, 0.060);
  crystalFloorGroup.add(crystalFrontEdge);
  crystalFloorGroup.visible = false;
  archRoot.add(crystalFloorGroup);

  // --------------------------------------------------------------------------
  // 3. PRE-BUILT BRAND VARIANTS (Legs, Cast-Iron Harps, Carved Music Desks)
  // --------------------------------------------------------------------------
  const LEG_POSITIONS = [
    [-0.392, 0.0, -0.105], // Front Bass
    [0.392, 0.0, -0.105],  // Front Treble
    [-0.275, 0.0, -1.84],  // Rear Tail
  ];

  const legGroupsByStyle = new Map();
  for (const lStyle of [
    "spade",
    "italian_ferrule",
    "viennese_fluted",
    "modern_taper",
    "kawai_sculpted",
    "bechstein_taper",
    "bluthner_column",
    "crystal_prism",
  ]) {
    const grp = new THREE.Group();
    grp.name = `BrandLegs_${lStyle}`;
    for (const [lx, ly, lz] of LEG_POSITIONS) {
      const leg = buildSingleModernLeg(lStyle, caseMat, hardwareMat, crystalMat);
      leg.position.set(lx, ly, lz);
      grp.add(leg);
    }
    grp.visible = false;
    archRoot.add(grp);
    legGroupsByStyle.set(lStyle, grp);
  }

  const crestTextures = {
    steinway_fan: createSoundboardCrestTexture("STEINWAY", "#f2d68a", maxAniso),
    fazioli_radial: createSoundboardCrestTexture("FAZIOLI", "#fff0b5", maxAniso),
    bosendorfer_cross: createSoundboardCrestTexture("BÖSENDORFER", "#ebd088", maxAniso),
    yamaha_swept: createSoundboardCrestTexture("YAMAHA CFX", "#f0f5fc", maxAniso),
    kawai_bar: createSoundboardCrestTexture("SHIGERU KAWAI", "#f0d8a8", maxAniso),
    bechstein_classic: createSoundboardCrestTexture("C. BECHSTEIN", "#e8c574", maxAniso),
    bluthner_aliquot: createSoundboardCrestTexture("BLÜTHNER", "#f5d784", maxAniso),
    crystal_skeleton: createSoundboardCrestTexture("CRYSTAL", "#eaf6ff", maxAniso),
  };

  const harpGroupsByStyle = new Map();
  for (const hStyle of [
    "steinway_fan",
    "fazioli_radial",
    "bosendorfer_cross",
    "yamaha_swept",
    "kawai_bar",
    "bechstein_classic",
    "bluthner_aliquot",
    "crystal_skeleton",
  ]) {
    const grp = buildBrandHarpAssembly(hStyle, harpMat, feltMat, hardwareMat, crestTextures[hStyle]);
    grp.visible = false;
    archRoot.add(grp);
    harpGroupsByStyle.set(hStyle, grp);
  }

  const deskGroupsByStyle = new Map();
  for (const dStyle of [
    "classic_ebony",
    "italian_lyre",
    "viennese_fret",
    "modern_white",
    "kawai_slat",
    "bechstein_frame",
    "bluthner_carved",
    "crystal_easel",
  ]) {
    const grp = buildBrandMusicDesk(dStyle, caseMat, hardwareMat, crystalMat);
    grp.visible = false;
    archRoot.add(grp);
    deskGroupsByStyle.set(dStyle, grp);
  }

  // Logo texture cache per piano model ID
  const logoTexCache = new Map();
  let activeDeskStyle = "classic_ebony";
  let isHistoricalModel = false;
  let deskOpenVisible = true;

  function syncPianoModelVisual(model) {
    if (!model?.visual) return;
    const v = model.visual;
    isHistoricalModel = Boolean(v.isHistorical);

    if (isHistoricalModel) {
      archRoot.visible = false;
      return;
    }

    archRoot.visible = true;

    // Update Fallboard & Bentside logo textures
    let logoTex = logoTexCache.get(model.id);
    if (!logoTex) {
      logoTex = createLogoTexture(
        v.brandLogo || model.label.toUpperCase(),
        v.brandSubtext || "",
        v.logoColor || "#e6c36c",
        v.logoFont,
        0.0,
        maxAniso
      );
      logoTexCache.set(model.id, logoTex);
    }
    fallboardLogoMat.map = logoTex;
    fallboardLogoMat.needsUpdate = true;
    bentsideLogoMat.map = logoTex;
    bentsideLogoMat.needsUpdate = true;

    // Update case, hardware, harp, and felt PBR finishes
    if (v.isCrystal) {
      fasciaBacking.material = crystalMat;
      crystalMat.color.setHex(v.caseColor || 0xdff2ff);
      crystalMat.needsUpdate = true;
    } else {
      fasciaBacking.material = caseMat;
      caseMat.color.setHex(v.caseColor ?? 0x030305);
      caseMat.roughness = v.caseRoughness ?? 0.08;
      caseMat.metalness = v.caseMetalness ?? 0.0;
      caseMat.clearcoat = v.caseClearcoat ?? 0.84;
      caseMat.clearcoatRoughness = v.caseClearcoatRoughness ?? 0.046;
      caseMat.envMapIntensity = v.caseEnvIntensity ?? 0.58;
      if ("reflectivity" in caseMat) caseMat.reflectivity = 0.48;
      caseMat.needsUpdate = true;
    }

    hardwareMat.color.setHex(v.hardwareColor ?? 0xd8b158);
    hardwareMat.metalness = v.hardwareMetalness ?? 0.94;
    hardwareMat.roughness = v.hardwareRoughness ?? 0.18;
    hardwareMat.needsUpdate = true;

    harpMat.color.setHex(v.harpColor ?? 0xc59a47);
    harpMat.metalness = v.harpMetalness ?? 0.88;
    harpMat.roughness = v.harpRoughness ?? 0.24;
    harpMat.needsUpdate = true;

    feltMat.color.setHex(v.feltAccentColor ?? v.clothColor ?? 0x7a161c);
    feltMat.needsUpdate = true;

    crystalFloorGroup.visible = Boolean(v.isCrystal);

    // Toggle exact brand Legs, Harp, and Carved Music Desk
    for (const [k, grp] of legGroupsByStyle.entries()) {
      grp.visible = k === v.legStyle;
    }
    for (const [k, grp] of harpGroupsByStyle.entries()) {
      grp.visible = k === v.harpStyle;
    }
    activeDeskStyle = v.deskStyle || "classic_ebony";
    for (const [k, grp] of deskGroupsByStyle.entries()) {
      grp.visible = deskOpenVisible && k === activeDeskStyle;
    }
  }

  function setDeskVisible(visible) {
    deskOpenVisible = Boolean(visible);
    for (const [k, grp] of deskGroupsByStyle.entries()) {
      grp.visible = !isHistoricalModel && deskOpenVisible && k === activeDeskStyle;
    }
  }

  function dispose() {
    for (const tex of logoTexCache.values()) tex.dispose();
    for (const tex of Object.values(crestTextures)) tex.dispose();
  }

  return {
    group: archRoot,
    syncPianoModelVisual,
    setDeskVisible,
    dispose,
  };
}
