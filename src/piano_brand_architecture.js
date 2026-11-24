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

/**
 * Helper: build unique Cast-Iron Concert Harp / Plate assembly nestled inside the open rim
 * at y = 0.858..0.882 (visible prominently whenever the lid is open or on Crystal Grand).
 */
function buildBrandHarpAssembly(style, harpMat, feltMat, accentMat, crestTex) {
  const grp = new THREE.Group();
  grp.name = `ConcertHarp_${style}`;
  const yPlate = 0.862;

  // 1. Cast-iron Pinblock / Wrestplank Armor Plate across front cavity (behind dampers)
  const frontBar = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.016, 0.085), harpMat);
  frontBar.position.set(0.0, yPlate + 0.004, -0.34);
  grp.add(frontBar);

  // Brass / Platinum Agraffe & Capo d'Astro pressure bar
  const capoBar = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.81, 12), accentMat);
  capoBar.rotation.z = Math.PI * 0.5;
  capoBar.position.set(0.0, yPlate + 0.016, -0.308);
  grp.add(capoBar);

  // Signature colored felt hitch-pin braid along front wrestplank & tail curve
  const frontFelt = new THREE.Mesh(new THREE.BoxGeometry(0.81, 0.009, 0.018), feltMat);
  frontFelt.position.set(0.0, yPlate + 0.014, -0.382);
  grp.add(frontFelt);

  const tailFelt = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.009, 0.018), feltMat);
  tailFelt.position.set(-0.28, yPlate + 0.013, -1.86);
  tailFelt.rotation.y = 0.24;
  grp.add(tailFelt);

  // 2. Curved Bentside Hitch-Pin Flange (following the right-side rim gracefully)
  const rimPts = [
    [-0.415, -0.35],
    [-0.415, -1.88],
    [-0.19, -1.86],
    [0.04, -1.48],
    [0.24, -1.04],
    [0.415, -0.58],
    [0.415, -0.35],
  ];
  for (let i = 0; i < rimPts.length - 1; i++) {
    const [x0, z0] = rimPts[i];
    const [x1, z1] = rimPts[i + 1];
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.018, len + 0.02), harpMat);
    beam.position.set((x0 + x1) * 0.5, yPlate + 0.003, (z0 + z1) * 0.5);
    beam.rotation.y = Math.atan2(dx, dz);
    grp.add(beam);
  }

  // Helper to place a structural cast-iron strut from (x0,z0) to (x1,z1)
  const addStrut = (x0, z0, x1, z1, width = 0.028, height = 0.022, yOff = 0.012) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, len), harpMat);
    mesh.position.set((x0 + x1) * 0.5, yPlate + yOff, (z0 + z1) * 0.5);
    mesh.rotation.y = Math.atan2(dx, dz);
    grp.add(mesh);

    // Subtle beveled top rib on the strut for authentic sand-cast iron highlights
    const rib = new THREE.Mesh(new THREE.BoxGeometry(width * 0.46, 0.008, len * 0.96), accentMat);
    rib.position.set((x0 + x1) * 0.5, yPlate + yOff + height * 0.5 + 0.003, (z0 + z1) * 0.5);
    rib.rotation.y = Math.atan2(dx, dz);
    grp.add(rib);
  };

  if (style === "fazioli_radial") {
    // FAZIOLI F308: Iconic radiant champagne-gold fan struts + 3 circular Italian sound ports
    addStrut(-0.34, -0.36, -0.34, -1.84, 0.032, 0.024, 0.014);
    addStrut(-0.14, -0.36, -0.22, -1.82, 0.030, 0.024, 0.014);
    addStrut(0.10, -0.36, -0.02, -1.52, 0.028, 0.022, 0.014);
    addStrut(0.30, -0.36, 0.22, -1.04, 0.026, 0.022, 0.014);
    // Cross tie brace
    addStrut(-0.36, -1.16, 0.16, -1.16, 0.026, 0.018, 0.010);

    // Three signature Fazioli golden sound-port rings in the plate deck
    const portRingGeo = new THREE.TorusGeometry(0.068, 0.011, 12, 28);
    portRingGeo.rotateX(Math.PI * 0.5);
    for (const [px, pz, rScale] of [
      [-0.25, -1.52, 1.05],
      [-0.08, -1.24, 0.92],
      [0.14, -0.86, 0.80],
    ]) {
      const ring = new THREE.Mesh(portRingGeo, harpMat);
      ring.position.set(px, yPlate + 0.010, pz);
      ring.scale.setScalar(rScale);
      grp.add(ring);
    }
  } else if (style === "steinway_fan") {
    // STEINWAY MODEL D: Classic bronzed-gold 4-strut fan with Duplex bridge bar & circular ports
    addStrut(-0.36, -0.36, -0.36, -1.84, 0.034, 0.025, 0.014);
    addStrut(-0.16, -0.36, -0.26, -1.84, 0.030, 0.024, 0.014);
    addStrut(0.06, -0.36, 0.02, -1.48, 0.028, 0.022, 0.014);
    addStrut(0.28, -0.36, 0.24, -1.02, 0.026, 0.022, 0.014);

    // Classic Steinway treble bell/duplex bridge rail & tail sound ports
    const portGeo = new THREE.TorusGeometry(0.062, 0.012, 10, 24);
    portGeo.rotateX(Math.PI * 0.5);
    for (const [px, pz] of [
      [-0.28, -1.60],
      [-0.12, -1.32],
    ]) {
      const ring = new THREE.Mesh(portGeo, harpMat);
      ring.position.set(px, yPlate + 0.010, pz);
      grp.add(ring);
    }
  } else if (style === "bosendorfer_cross") {
    // BÖSENDORFER IMPERIAL 290: Antique gold Viennese X-bracing + solid bass cheek extension accent
    addStrut(-0.36, -0.36, -0.36, -1.85, 0.034, 0.024, 0.014);
    addStrut(-0.34, -0.40, 0.04, -1.46, 0.028, 0.022, 0.014);
    addStrut(0.06, -0.40, -0.32, -1.78, 0.028, 0.022, 0.014);
    addStrut(0.26, -0.36, 0.22, -1.02, 0.026, 0.022, 0.014);
    // Viennese crimson felt resonance strip along bass spine
    const spineFelt = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.010, 1.44), feltMat);
    spineFelt.position.set(-0.395, yPlate + 0.014, -1.12);
    grp.add(spineFelt);
  } else if (style === "yamaha_swept") {
    // YAMAHA CFX: Brushed champagne-platinum swept modern V-frame + royal navy felt
    addStrut(-0.35, -0.36, -0.34, -1.84, 0.032, 0.024, 0.015);
    addStrut(-0.08, -0.36, -0.22, -1.82, 0.032, 0.024, 0.015);
    addStrut(-0.08, -0.36, 0.24, -1.02, 0.028, 0.022, 0.015);
    addStrut(0.28, -0.36, 0.36, -0.68, 0.024, 0.020, 0.015);
    // Elongated oval sound window
    const oval = new THREE.Mesh(
      new THREE.TorusGeometry(0.074, 0.010, 10, 28).rotateX(Math.PI * 0.5),
      harpMat
    );
    oval.position.set(-0.18, yPlate + 0.011, -1.35);
    oval.scale.set(0.85, 1.0, 1.45);
    grp.add(oval);
  } else if (style === "kawai_bar") {
    // SHIGERU KAWAI SK-EX: Konsei Katagi champagne-gold harp with swept asymmetrical fan + crimson felt ribbon
    addStrut(-0.35, -0.36, -0.35, -1.84, 0.032, 0.024, 0.014);
    addStrut(-0.12, -0.36, -0.24, -1.82, 0.030, 0.024, 0.014);
    addStrut(0.12, -0.36, 0.04, -1.48, 0.028, 0.022, 0.014);
    addStrut(0.32, -0.36, 0.26, -0.98, 0.026, 0.021, 0.014);
    addStrut(-0.35, -0.94, 0.24, -0.94, 0.024, 0.018, 0.010);
    // Signature Shigeru crimson inner-rim accent strip
    const crimsonRimFelt = new THREE.Mesh(new THREE.BoxGeometry(0.020, 0.012, 1.42), feltMat);
    crimsonRimFelt.position.set(-0.392, yPlate + 0.015, -1.10);
    grp.add(crimsonRimFelt);
    const portRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.066, 0.011, 10, 26).rotateX(Math.PI * 0.5),
      harpMat
    );
    portRing.position.set(-0.16, yPlate + 0.011, -1.38);
    grp.add(portRing);
  } else if (style === "bechstein_classic") {
    // C. BECHSTEIN D 282: Berlin bronze-gold 4-bar radial cast-iron frame with twin elliptic sound apertures
    addStrut(-0.36, -0.36, -0.35, -1.84, 0.033, 0.024, 0.014);
    addStrut(-0.15, -0.36, -0.24, -1.82, 0.030, 0.024, 0.014);
    addStrut(0.08, -0.36, 0.02, -1.48, 0.028, 0.022, 0.014);
    addStrut(0.28, -0.36, 0.24, -1.02, 0.026, 0.022, 0.014);
    const portGeo = new THREE.TorusGeometry(0.058, 0.011, 10, 24).rotateX(Math.PI * 0.5);
    for (const [px, pz, sx] of [
      [-0.25, -1.52, 0.85],
      [-0.08, -1.18, 0.92],
    ]) {
      const ring = new THREE.Mesh(portGeo, harpMat);
      ring.position.set(px, yPlate + 0.011, pz);
      ring.scale.set(sx, 1.0, 1.32);
      grp.add(ring);
    }
  } else if (style === "bluthner_aliquot") {
    // BLÜTHNER MODEL 1 · ALIQUOT: Antique Leipzig gold harp with iconic 4th-string Aliquot bridge bar & gilded resonator bridge
    addStrut(-0.36, -0.36, -0.35, -1.85, 0.034, 0.024, 0.014);
    addStrut(-0.14, -0.36, -0.23, -1.82, 0.030, 0.024, 0.014);
    addStrut(0.08, -0.36, 0.02, -1.46, 0.028, 0.022, 0.014);
    addStrut(0.28, -0.36, 0.24, -1.02, 0.026, 0.022, 0.014);
    // Gleaming raised 4th-string Aliquot duplex bridge rail across upper-mid and treble registers!
    const aliquotBridge = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.014, 0.016), accentMat);
    aliquotBridge.position.set(0.14, yPlate + 0.026, -0.64);
    aliquotBridge.rotation.y = 0.34;
    grp.add(aliquotBridge);
    // Secondary shimmering Aliquot sympathetic string wires hovering cleanly over the treble bridge
    const aliqStrGeo = new THREE.CylinderGeometry(0.0010, 0.0010, 0.42, 6).rotateX(Math.PI * 0.5);
    for (let i = 0; i < 8; i++) {
      const f = i / 7;
      const str = new THREE.Mesh(aliqStrGeo, accentMat);
      str.position.set(0.02 + f * 0.32, yPlate + 0.031, -0.58 - (1 - f) * 0.14);
      grp.add(str);
    }
    const portRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.068, 0.012, 10, 26).rotateX(Math.PI * 0.5),
      harpMat
    );
    portRing.position.set(-0.24, yPlate + 0.011, -1.48);
    grp.add(portRing);
  } else {
    // CRYSTAL GRAND: Openwork mirror-chrome skeleton harp exposing luminous copper bass & steel treble strings
    addStrut(-0.37, -0.36, -0.36, -1.84, 0.024, 0.020, 0.015);
    addStrut(-0.10, -0.36, -0.20, -1.82, 0.022, 0.020, 0.015);
    addStrut(0.18, -0.36, 0.14, -1.18, 0.020, 0.018, 0.015);
    // Overstrung exposed gleaming copper-wound bass string fan across the skeleton harp
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
    const bassStrGeo = new THREE.CylinderGeometry(0.0016, 0.0016, 1.44, 6);
    bassStrGeo.rotateX(Math.PI * 0.5);
    for (let i = 0; i < 14; i++) {
      const f = i / 13;
      const sMesh = new THREE.Mesh(bassStrGeo, copperMat);
      sMesh.position.set(-0.34 + f * 0.24, yPlate + 0.022, -1.10);
      sMesh.rotation.y = -0.08 + f * 0.06;
      grp.add(sMesh);
    }
    const trebStrGeo = new THREE.CylinderGeometry(0.0010, 0.0010, 0.86, 6);
    trebStrGeo.rotateX(Math.PI * 0.5);
    for (let i = 0; i < 16; i++) {
      const f = i / 15;
      const sMesh = new THREE.Mesh(trebStrGeo, steelMat);
      const lenScale = 1.0 - f * 0.48;
      sMesh.scale.set(1, 1, lenScale);
      sMesh.position.set(-0.04 + f * 0.40, yPlate + 0.017, -0.40 - 0.40 * lenScale);
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
    const crest = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), crestMat);
    crest.rotation.x = -Math.PI * 0.5;
    crest.position.set(-0.22, yPlate + 0.026, -0.82);
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
    new THREE.PlaneGeometry(0.46, 0.086),
    bentsideLogoMat
  );
  bentsideLogoMesh.name = "BrandArch_BentsideLogo";
  // Positioned neatly along the straight cheek/bentside exterior facing +X audience
  bentsideLogoMesh.position.set(0.478, 0.795, -0.34);
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
      caseMat.color.setHex(v.caseColor ?? 0x0b0b0d);
      caseMat.roughness = v.caseRoughness ?? 0.05;
      caseMat.metalness = v.caseMetalness ?? 0.02;
      caseMat.clearcoat = v.caseClearcoat ?? 1.0;
      caseMat.clearcoatRoughness = v.caseClearcoatRoughness ?? 0.024;
      caseMat.envMapIntensity = v.caseEnvIntensity ?? 1.48;
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
