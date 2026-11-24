/**
 * Bespoke 3D Concert Hall Architectural Stage Sets (Mobile 60 FPS Optimized)
 *
 * Gives each of the 5 world concert halls an unmistakable architectural identity
 * right behind and above the concert grand piano on stage:
 *  - koerner_hall: Pure Koerner Hall Canadian white-oak Baillie Veil (no overlay)
 *  - musikverein_vienna: Golden Hall 3-tower gilded pipe organ, classical pilasters & coffered beams
 *  - carnegie_hall: Warm ivory Renaissance arched proscenium colonnade & burgundy velvet wing drapes
 *  - royal_albert_hall: Monumental Victorian grand organ, crimson gallery bays & iconic ceiling "mushrooms"
 *  - suntory_salon: Modern Japanese vertical cedar acoustic slat wall & floating slate canopy reflectors
 *
 * All geometries and materials are shared / instanced so each active hall adds < 18 draw calls.
 */

import * as THREE from "three";

function populateInstances(instMesh, transforms) {
  const dummy = new THREE.Object3D();
  for (let i = 0; i < transforms.length; i++) {
    const t = transforms[i];
    dummy.position.set(t.x || 0, t.y || 0, t.z || 0);
    dummy.rotation.set(t.rx || 0, t.ry || 0, t.rz || 0);
    dummy.scale.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    dummy.updateMatrix();
    instMesh.setMatrixAt(i, dummy.matrix);
  }
  instMesh.count = transforms.length;
  instMesh.instanceMatrix.needsUpdate = true;
}

/**
 * 1. MUSIKVEREIN · GOLDEN HALL (VIENNA)
 * Gilded 3-tower classical pipe organ facade, Corinthian gilded pilasters, crimson frieze & coffered beams
 */
function buildMusikvereinSet() {
  const group = new THREE.Group();
  group.name = "HallArch_MusikvereinVienna";

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd8a848,
    roughness: 0.28,
    metalness: 0.88,
  });
  const pipeMat = new THREE.MeshStandardMaterial({
    color: 0xe8c978,
    roughness: 0.22,
    metalness: 0.92,
  });
  const creamMarbleMat = new THREE.MeshStandardMaterial({
    color: 0xe6d4b2,
    roughness: 0.48,
    metalness: 0.04,
  });
  const crimsonVelvetMat = new THREE.MeshStandardMaterial({
    color: 0x6b141a,
    roughness: 0.85,
    metalness: 0.0,
  });
  const darkWalnutMat = new THREE.MeshStandardMaterial({
    color: 0x3b2212,
    roughness: 0.42,
    metalness: 0.06,
  });

  // Rear classical backdrop wall (stage deck y = 0.96, rear z = 9.4)
  const backdrop = new THREE.Mesh(new THREE.BoxGeometry(15.2, 7.8, 0.35), creamMarbleMat);
  backdrop.position.set(0, 4.86, 9.55);
  group.add(backdrop);

  // Lower crimson velvet acoustic dado & golden rail across the stage width
  const dado = new THREE.Mesh(new THREE.BoxGeometry(15.0, 1.85, 0.22), crimsonVelvetMat);
  dado.position.set(0, 1.9, 9.35);
  group.add(dado);

  const dadoRail = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.14, 0.32), goldMat);
  dadoRail.position.set(0, 2.86, 9.32);
  group.add(dadoRail);

  // Grand Classical Organ Case (center z = 9.1, y = 2.8..8.6)
  const organBase = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1.1, 0.95), darkWalnutMat);
  organBase.position.set(0, 3.4, 9.0);
  group.add(organBase);

  const organBack = new THREE.Mesh(new THREE.BoxGeometry(6.4, 4.4, 0.55), crimsonVelvetMat);
  organBack.position.set(0, 6.0, 9.15);
  group.add(organBack);

  // Gilded organ crown pediment & cornice
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.32, 1.12), goldMat);
  cornice.position.set(0, 8.28, 8.95);
  group.add(cornice);

  const crownArch = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.45, 24, 1, false, 0, Math.PI), goldMat);
  crownArch.rotation.z = Math.PI * 0.5;
  crownArch.rotation.y = Math.PI * 0.5;
  crownArch.position.set(0, 8.42, 8.88);
  group.add(crownArch);

  // Instanced Golden Organ Pipes (3 classical towers + 2 flats = 39 pipes in 1 draw call!)
  const pipeGeo = new THREE.CylinderGeometry(0.065, 0.055, 1.0, 10);
  const pipeTransforms = [];
  const pipeCount = 39;
  for (let i = 0; i < pipeCount; i++) {
    const frac = i / (pipeCount - 1);
    const x = (frac - 0.5) * 6.0;
    // Iconic 3-tower V-curve silhouette (tall center + tall outer towers)
    const distCenter = Math.abs(x);
    const towerCenter = Math.max(0, 1.0 - distCenter / 1.35);
    const towerSide = Math.max(0, 1.0 - Math.abs(distCenter - 2.45) / 0.85);
    const h = 2.35 + Math.max(towerCenter * 1.85, towerSide * 1.45);
    const rScale = 0.72 + Math.max(towerCenter * 0.65, towerSide * 0.45);
    const zCurve = 8.76 - Math.max(towerCenter * 0.22, towerSide * 0.16);
    pipeTransforms.push({
      x,
      y: 3.96 + h * 0.5,
      z: zCurve,
      sx: rScale,
      sy: h,
      sz: rScale,
    });
  }
  const pipesMesh = new THREE.InstancedMesh(pipeGeo, pipeMat, pipeTransforms.length);
  populateInstances(pipesMesh, pipeTransforms);
  group.add(pipesMesh);

  // 8 Gilded Classical Pilasters (rear & stage side wings) in 1 instanced draw call
  const pilGeo = new THREE.CylinderGeometry(0.22, 0.25, 6.9, 14);
  const pilCapGeo = new THREE.BoxGeometry(0.68, 0.36, 0.68);
  const pilPositions = [
    [-6.9, 9.18],
    [-4.35, 9.18],
    [4.35, 9.18],
    [6.9, 9.18],
    [-7.35, 6.4],
    [7.35, 6.4],
    [-7.35, 3.6],
    [7.35, 3.6],
  ];
  const pilMesh = new THREE.InstancedMesh(pilGeo, goldMat, pilPositions.length);
  const capMesh = new THREE.InstancedMesh(pilCapGeo, goldMat, pilPositions.length * 2);
  populateInstances(
    pilMesh,
    pilPositions.map(([x, z]) => ({ x, y: 4.42, z }))
  );
  const capTransforms = [];
  for (const [x, z] of pilPositions) {
    capTransforms.push({ x, y: 7.92, z });
    capTransforms.push({ x, y: 1.14, z });
  }
  populateInstances(capMesh, capTransforms);
  group.add(pilMesh, capMesh);

  // Overhead Gilded Coffered Beams across the stage ceiling (y = 8.55)
  const beamGeo = new THREE.BoxGeometry(15.0, 0.28, 0.42);
  const beamMesh = new THREE.InstancedMesh(beamGeo, goldMat, 4);
  populateInstances(
    beamMesh,
    [2.6, 4.6, 6.6, 8.6].map((z) => ({ x: 0, y: 8.55, z }))
  );
  group.add(beamMesh);

  return group;
}

/**
 * 2. CARNEGIE HALL · STERN AUDITORIUM (NEW YORK)
 * Warm cream-ivory Renaissance arched colonnade, gilded rosettes & deep burgundy velvet stage curtains
 */
function buildCarnegieHallSet() {
  const group = new THREE.Group();
  group.name = "HallArch_CarnegieHall";

  const ivoryMat = new THREE.MeshStandardMaterial({
    color: 0xf0e4d0,
    roughness: 0.56,
    metalness: 0.02,
  });
  const warmPlasterMat = new THREE.MeshStandardMaterial({
    color: 0xdccbb0,
    roughness: 0.68,
    metalness: 0.0,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xcfa04e,
    roughness: 0.32,
    metalness: 0.82,
  });
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x6b1220,
    roughness: 0.88,
    metalness: 0.0,
  });

  // Warm ivory classical rear wall
  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(15.4, 7.9, 0.35), warmPlasterMat);
  rearWall.position.set(0, 4.9, 9.55);
  group.add(rearWall);

  // Cream wainscoting + golden frieze band
  const wainscot = new THREE.Mesh(new THREE.BoxGeometry(15.2, 2.2, 0.22), ivoryMat);
  wainscot.position.set(0, 2.06, 9.35);
  group.add(wainscot);

  const frieze = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.32, 0.42), goldTrimMat);
  frieze.position.set(0, 8.2, 9.25);
  group.add(frieze);

  // 5 Renaissance Proscenium Arches & Pilasters across rear stage
  const pillarGeo = new THREE.BoxGeometry(0.42, 6.9, 0.52);
  const archGeo = new THREE.TorusGeometry(1.12, 0.12, 10, 20, Math.PI);
  const medallionGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 18);
  medallionGeo.rotateX(Math.PI * 0.5);

  const pillarXs = [-6.0, -3.6, -1.2, 1.2, 3.6, 6.0];
  const pillarMesh = new THREE.InstancedMesh(pillarGeo, ivoryMat, pillarXs.length);
  populateInstances(
    pillarMesh,
    pillarXs.map((x) => ({ x, y: 4.5, z: 9.22 }))
  );
  group.add(pillarMesh);

  const archXs = [-4.8, -2.4, 0.0, 2.4, 4.8];
  const archMesh = new THREE.InstancedMesh(archGeo, goldTrimMat, archXs.length);
  const medMesh = new THREE.InstancedMesh(medallionGeo, goldTrimMat, archXs.length);
  populateInstances(
    archMesh,
    archXs.map((x) => ({ x, y: 6.1, z: 9.18 }))
  );
  populateInstances(
    medMesh,
    archXs.map((x) => ({ x, y: 7.55, z: 9.24 }))
  );
  group.add(archMesh, medMesh);

  // Deep Burgundy Pleated Velvet Stage Wing Curtains (left & right flanks)
  const pleatGeo = new THREE.CylinderGeometry(0.24, 0.28, 7.5, 10);
  const pleatTransforms = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const z = 4.2 + i * 0.72;
      const x = side * (7.25 - Math.sin(i * 0.55) * 0.16);
      pleatTransforms.push({ x, y: 4.72, z });
    }
  }
  const curtainMesh = new THREE.InstancedMesh(pleatGeo, curtainMat, pleatTransforms.length);
  populateInstances(curtainMesh, pleatTransforms);
  group.add(curtainMesh);

  // Grand Proscenium Arch Valance Curtain across top front of stage (y = 8.35, z = 2.1)
  const valance = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.85, 0.36), curtainMat);
  valance.position.set(0, 8.45, 2.2);
  group.add(valance);
  const valanceTrim = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.09, 0.42), goldTrimMat);
  valanceTrim.position.set(0, 8.0, 2.2);
  group.add(valanceTrim);

  return group;
}

/**
 * 3. ROYAL ALBERT HALL (LONDON)
 * Monumental Victorian Henry Willis Organ, crimson-terracotta gallery arcades & iconic suspended acoustic "mushrooms"
 */
function buildRoyalAlbertHallSet() {
  const group = new THREE.Group();
  group.name = "HallArch_RoyalAlbertHall";

  const terracottaMat = new THREE.MeshStandardMaterial({
    color: 0x7c2428,
    roughness: 0.72,
    metalness: 0.05,
  });
  const royalGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd19b42,
    roughness: 0.30,
    metalness: 0.86,
  });
  const organPewterMat = new THREE.MeshStandardMaterial({
    color: 0xc9b58c,
    roughness: 0.26,
    metalness: 0.88,
  });
  const mushroomMat = new THREE.MeshStandardMaterial({
    color: 0xf2e8d8,
    roughness: 0.42,
    metalness: 0.04,
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x331618,
    roughness: 0.52,
    metalness: 0.05,
  });

  // Curved Victorian Amphitheater Rear Facade (3 angled segments)
  const centerWall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 8.2, 0.4), terracottaMat);
  centerWall.position.set(0, 5.06, 9.65);
  group.add(centerWall);

  for (const side of [-1, 1]) {
    const wingWall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 8.2, 0.4), terracottaMat);
    wingWall.position.set(side * 6.4, 5.06, 8.6);
    wingWall.rotation.y = side * -0.42;
    group.add(wingWall);

    // Gilded gallery balcony rails along Victorian amphitheater wings
    for (const railY of [3.5, 6.2]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.26, 0.52), royalGoldMat);
      rail.position.set(side * 6.25, railY, 8.42);
      rail.rotation.y = side * -0.42;
      group.add(rail);
    }
  }

  // Monumental Willis Grand Organ Case + 45 towering pipes (1 instanced draw call)
  const organCase = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.4, 1.15), darkWoodMat);
  organCase.position.set(0, 1.72, 9.1);
  group.add(organCase);

  const organBand = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.26, 1.24), royalGoldMat);
  organBand.position.set(0, 2.46, 9.08);
  group.add(organBand);

  const pipeGeo = new THREE.CylinderGeometry(0.08, 0.068, 1.0, 10);
  const pipeTransforms = [];
  const pipeCount = 45;
  for (let i = 0; i < pipeCount; i++) {
    const frac = i / (pipeCount - 1);
    const x = (frac - 0.5) * 8.1;
    const dist = Math.abs(x);
    // Massive central Victorian pipe peak + sweeping side wings
    const centerPeak = Math.exp(-Math.pow(dist / 2.2, 2)) * 2.8;
    const outerPeak = Math.exp(-Math.pow((dist - 3.4) / 0.85, 2)) * 2.1;
    const h = 3.2 + Math.max(centerPeak, outerPeak);
    const rScale = 0.78 + Math.max(centerPeak, outerPeak) * 0.24;
    pipeTransforms.push({
      x,
      y: 2.55 + h * 0.5,
      z: 8.95 - (dist < 1.6 ? 0.18 : 0.0),
      sx: rScale,
      sy: h,
      sz: rScale,
    });
  }
  const pipesMesh = new THREE.InstancedMesh(pipeGeo, organPewterMat, pipeTransforms.length);
  populateInstances(pipesMesh, pipeTransforms);
  group.add(pipesMesh);

  // Iconic Royal Albert Hall Suspended Acoustic "Mushroom" Diffusers overhead (12 saucers in 1 draw call!)
  const mushroomGeo = new THREE.SphereGeometry(0.92, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42);
  const mushroomCoords = [
    [-4.2, 7.65, 3.0],
    [-1.4, 7.85, 2.8],
    [1.4, 7.85, 2.8],
    [4.2, 7.65, 3.0],
    [-5.2, 7.85, 5.2],
    [-2.4, 8.15, 5.0],
    [0.0, 8.25, 4.9],
    [2.4, 8.15, 5.0],
    [5.2, 7.85, 5.2],
    [-3.2, 8.05, 7.2],
    [0.0, 8.20, 7.1],
    [3.2, 8.05, 7.2],
  ];
  const mushroomMesh = new THREE.InstancedMesh(mushroomGeo, mushroomMat, mushroomCoords.length);
  populateInstances(
    mushroomMesh,
    mushroomCoords.map(([x, y, z]) => ({ x, y, z, sx: 1.0, sy: 0.42, sz: 1.0 }))
  );
  group.add(mushroomMesh);

  return group;
}

/**
 * 4. SUNTORY INTIMATE STUDIO (TOKYO)
 * Contemporary Japanese vertical hinoki-cedar acoustic slat wall, dark slate floating ceiling clouds & studio light blades
 */
function buildSuntorySalonSet() {
  const group = new THREE.Group();
  group.name = "HallArch_SuntorySalon";

  const darkAcousticMat = new THREE.MeshStandardMaterial({
    color: 0x151c28,
    roughness: 0.84,
    metalness: 0.08,
  });
  const hinokiWoodMat = new THREE.MeshStandardMaterial({
    color: 0xc8a47c,
    roughness: 0.42,
    metalness: 0.02,
  });
  const slateCloudMat = new THREE.MeshStandardMaterial({
    color: 0x263246,
    roughness: 0.48,
    metalness: 0.25,
  });
  const ledBladeMat = new THREE.MeshBasicMaterial({
    color: 0xdbeeff,
  });
  const brushedSteelMat = new THREE.MeshStandardMaterial({
    color: 0x9aa8ba,
    roughness: 0.28,
    metalness: 0.85,
  });

  // Deep acoustic backing wall
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(15.2, 7.6, 0.28), darkAcousticMat);
  backPanel.position.set(0, 4.76, 9.48);
  group.add(backPanel);

  // 48 Vertical Japanese Hinoki-Cedar Acoustic Timber Slats (1 instanced draw call!)
  const slatGeo = new THREE.BoxGeometry(0.11, 7.3, 0.22);
  const slatTransforms = [];
  const slatCount = 48;
  for (let i = 0; i < slatCount; i++) {
    const frac = i / (slatCount - 1);
    const x = (frac - 0.5) * 14.4;
    // Gentle Japanese wave depth modulation across the acoustic wall
    const zWave = 9.22 - Math.cos(frac * Math.PI * 3.0) * 0.14;
    slatTransforms.push({ x, y: 4.66, z: zWave });
  }
  const slatsMesh = new THREE.InstancedMesh(slatGeo, hinokiWoodMat, slatTransforms.length);
  populateInstances(slatsMesh, slatTransforms);
  group.add(slatsMesh);

  // Flanking modern dark-slate acoustic wing baffles (left & right stage walls)
  const wingGeo = new THREE.BoxGeometry(0.18, 6.8, 1.35);
  const wingTransforms = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      wingTransforms.push({
        x: side * 7.2,
        y: 4.45,
        z: 3.4 + i * 1.65,
        ry: side * 0.24,
      });
    }
  }
  const wingMesh = new THREE.InstancedMesh(wingGeo, slateCloudMat, wingTransforms.length);
  populateInstances(wingMesh, wingTransforms);
  group.add(wingMesh);

  // 5 Floating Angled Slate Acoustic Canopy Clouds with cool-white Studio LED edges
  const cloudGeo = new THREE.BoxGeometry(9.8, 0.14, 1.05);
  const ledGeo = new THREE.BoxGeometry(9.6, 0.035, 0.05);
  const cloudZs = [2.4, 4.0, 5.6, 7.2, 8.6];
  const cloudMesh = new THREE.InstancedMesh(cloudGeo, slateCloudMat, cloudZs.length);
  const ledMesh = new THREE.InstancedMesh(ledGeo, ledBladeMat, cloudZs.length);
  populateInstances(
    cloudMesh,
    cloudZs.map((z, idx) => ({
      x: 0,
      y: 7.75 + idx * 0.14,
      z,
      rx: -0.10,
    }))
  );
  populateInstances(
    ledMesh,
    cloudZs.map((z, idx) => ({
      x: 0,
      y: 7.66 + idx * 0.14,
      z: z - 0.48,
    }))
  );
  group.add(cloudMesh, ledMesh);

  // Minimalist brushed-steel modern rail across rear base
  const rail = new THREE.Mesh(new THREE.BoxGeometry(14.6, 0.06, 0.08), brushedSteelMat);
  rail.position.set(0, 1.88, 8.95);
  group.add(rail);

  return group;
}

/**
 * Mounts all 4 bespoke concert hall stage sets onto the scene (initially hidden for Koerner Hall)
 * and returns a zero-allocation `setActiveHall(hallId)` switcher.
 */
export function buildHallStageArchitecture(scene) {
  const root = new THREE.Group();
  root.name = "ConcertHall_StageArchitecture";

  const sets = {
    musikverein_vienna: buildMusikvereinSet(),
    carnegie_hall: buildCarnegieHallSet(),
    royal_albert_hall: buildRoyalAlbertHallSet(),
    suntory_salon: buildSuntorySalonSet(),
  };

  for (const grp of Object.values(sets)) {
    grp.visible = false;
    root.add(grp);
  }

  scene.add(root);

  return {
    root,
    setActiveHall(hallId) {
      for (const [id, grp] of Object.entries(sets)) {
        grp.visible = id === hallId;
      }
    },
  };
}
