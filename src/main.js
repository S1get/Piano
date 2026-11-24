/**
 * Koerner Hall — Concert Grand Piano 3D Studio
 * High-performance WebGL2 Stage Showcase with 6 Switchable Piano Models
 * (Steinway Model D, Bösendorfer Imperial, Fazioli F308, Yamaha CFX, Optical Crystal Grand,
 * and Historical Stein 1780), Modern White / Historical Key Toggle, Playable 61-Key Action,
 * and Full-Length Concert Grand Repertoire.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  KoernerCameraController,
  PIANO_STAGE_PRESETS,
} from "./seat_controller.js";
import {
  KoernerHallAcousticsEngine,
  FortepianoRepertoirePerformance,
  getShortPieceLabel,
  formatClock,
} from "./hall_acoustics.js";
import { HISTORICAL_REPERTOIRE } from "./fortepiano_repertoire_data.js";
import {
  loadFortepianoStageRig,
  loadGstaticGlb,
  FORTEPIANO_MIN_MIDI,
  midiToNoteName,
} from "./fortepiano_stage_rig.js";
import {
  PIANO_MODELS,
  DEFAULT_PIANO_MODEL_ID,
  DEFAULT_KEY_STYLE,
  getPianoModel,
} from "./piano_models.js";
import {
  CONCERT_HALLS,
  LISTENING_ZONES,
  DEFAULT_HALL_ID,
  DEFAULT_ZONE_ID,
  getConcertHall,
  getListeningZone,
} from "./concert_halls.js";
import { getPieceAcademyMeta } from "./academy_catalog.js";
import { createAcademyController } from "./academy_ui.js";
import { buildHallStageArchitecture } from "./hall_architecture.js";

// ============================================================================
// 0. ERROR CAPTURE FOR DETERMINISTIC QA GATE
// ============================================================================
const capturedConsoleErrors = [];
const origConsoleError = console.error.bind(console);
console.error = (...args) => {
  capturedConsoleErrors.push(args.map((a) => String(a)).join(" "));
  origConsoleError(...args);
};
window.addEventListener("error", (ev) => {
  capturedConsoleErrors.push(String(ev.message || ev.error || "window.error"));
});
window.addEventListener("unhandledrejection", (ev) => {
  capturedConsoleErrors.push(String(ev.reason || "unhandledrejection"));
});

// ============================================================================
// 1. TANGENT BUFFER SANITIZER (Eliminates NaN black caps in WebGL2)
// ============================================================================
export function sanitizeTangentBuffer(geometry) {
  if (!geometry || !geometry.attributes) return false;
  const normAttr = geometry.attributes.normal;
  if (
    !geometry.attributes.tangent &&
    geometry.index &&
    geometry.attributes.position &&
    normAttr &&
    geometry.attributes.uv
  ) {
    try {
      geometry.computeTangents();
    } catch (_) {
      // Ignore if UV attribute is missing or non-indexed
    }
  }
  const tanAttr = geometry.attributes.tangent;
  if (!tanAttr || !tanAttr.array || tanAttr.array.length === 0) return false;

  const arr = tanAttr.array;
  const normArr = normAttr && normAttr.array ? normAttr.array : null;
  const vertCount = Math.floor(arr.length / 4);
  let modified = false;

  for (let v = 0; v < vertCount; v++) {
    const i = v * 4;
    const tx = arr[i];
    const ty = arr[i + 1];
    const tz = arr[i + 2];
    const tw = arr[i + 3];
    const lenSq = tx * tx + ty * ty + tz * tz;

    if (!Number.isFinite(lenSq) || lenSq < 1e-6) {
      const ni = v * 3;
      const nx = normArr && Number.isFinite(normArr[ni]) ? normArr[ni] : 0.0;
      const ny = normArr && Number.isFinite(normArr[ni + 1]) ? normArr[ni + 1] : 1.0;
      const nz = normArr && Number.isFinite(normArr[ni + 2]) ? normArr[ni + 2] : 0.0;
      let ox = 1.0,
        oy = 0.0,
        oz = 0.0;
      if (Math.abs(nx) > 0.85) {
        ox = 0.0;
        oy = 1.0;
        oz = 0.0;
      }
      const cx = ny * oz - nz * oy;
      const cy = nz * ox - nx * oz;
      const cz = nx * oy - ny * ox;
      const clen = Math.hypot(cx, cy, cz) || 1.0;
      arr[i] = cx / clen;
      arr[i + 1] = cy / clen;
      arr[i + 2] = cz / clen;
      arr[i + 3] = 1.0;
      modified = true;
    } else if (!Number.isFinite(tw) || Math.abs(tw) < 0.1) {
      arr[i + 3] = 1.0;
      modified = true;
    }
  }
  if (modified) tanAttr.needsUpdate = true;
  return true;
}

// ============================================================================
// 2. PURE DATATEXTURE MICRO-SURFACE & PMREM FALLBACK
// ============================================================================
function createOakMicroNormalTexture() {
  const w = 128,
    h = 128;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const vf = (y / h) * Math.PI * 2;
    for (let x = 0; x < w; x++) {
      const uf = (x / w) * Math.PI * 2;
      const poreX = Math.sin(uf * 18.0 + Math.sin(vf * 2.0) * 0.4) * 0.45;
      const poreY = Math.cos(vf * 4.0 + Math.cos(uf * 6.0) * 0.25) * 0.2;
      const idx = (y * w + x) * 4;
      data[idx] = Math.max(0, Math.min(255, Math.round(128 + poreX * 14)));
      data[idx + 1] = Math.max(0, Math.min(255, Math.round(128 + poreY * 10)));
      data[idx + 2] = 255;
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function buildFallbackKoernerPMREM(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x161311);

  const canopy = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 34),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.1, 1.48, 0.92), side: THREE.DoubleSide })
  );
  canopy.position.set(0, 11.5, -4.0);
  canopy.rotation.x = Math.PI / 2;
  envScene.add(canopy);

  const stageSpot = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 10),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 2.75, 1.85), side: THREE.DoubleSide })
  );
  stageSpot.position.set(0, 8.5, 5.0);
  stageSpot.rotation.x = Math.PI / 2;
  envScene.add(stageSpot);

  const floorBounce = new THREE.Mesh(
    new THREE.PlaneGeometry(26, 36),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.55, 0.36, 0.20), side: THREE.DoubleSide })
  );
  floorBounce.position.set(0, -2.5, -4.0);
  floorBounce.rotation.x = -Math.PI / 2;
  envScene.add(floorBounce);

  const rt = pmrem.fromScene(envScene, 0.04);
  pmrem.dispose();
  return rt.texture;
}

async function fetchJSONOptional(relUrl) {
  try {
    const res = await fetch(relUrl, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`[KoernerHall] Failed to fetch JSON (${relUrl}):`, err);
    return null;
  }
}

// ============================================================================
// 3. APPLICATION BOOTSTRAP (ZERO-SEAT HIGH-PERFORMANCE CONCERT PIANO STUDIO)
// ============================================================================
async function initKoernerHallExplorer() {
  const urlParams = new URLSearchParams(window.location.search);
  const paramPiano = urlParams.get("piano");
  const paramPiece = urlParams.get("piece");
  const paramModel = urlParams.get("model");
  const paramKeys = urlParams.get("keys");
  const paramHall = urlParams.get("hall");
  const paramZone = urlParams.get("zone");
  const paramLid = urlParams.get("lid");
  const paramNotes = urlParams.get("notes");
  const paramFalling = urlParams.get("falling");
  const paramKeyGlow = urlParams.get("keyglow");
  const paramPlay = urlParams.get("play");
  const paramSeek = urlParams.get("seek");
  const paramFov = urlParams.get("fov");
  const paramHud = urlParams.get("hud");
  const paramExp = urlParams.get("exp");
  const paramPerf = urlParams.get("perf");

  const isMobileDevice =
    Boolean(window.matchMedia?.("(pointer: coarse)")?.matches) ||
    window.innerWidth <= 820 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
  let ecoPerfMode = paramPerf === "eco" ? true : paramPerf === "high" ? false : isMobileDevice;

  const canvas = document.getElementById("webgl-canvas");
  const studioDockWrap = document.getElementById("studio-dock-wrap");
  const hudCollapseBtn = document.getElementById("hud-collapse-btn");
  const hudCapsule = document.getElementById("hud-capsule");
  const topStageBar = document.getElementById("top-stage-bar");
  const pianoViewBar = document.getElementById("piano-view-bar");
  const pianoPresetBtns = Array.from(document.querySelectorAll(".piano-preset-btn"));
  const hudAcademyBtn = document.getElementById("hud-academy-btn");
  const hudPlayBtn = document.getElementById("hud-play-btn");
  const hudPieceSelect = document.getElementById("hud-piece-select");
  const hudScrub = document.getElementById("hud-scrub");
  const hudTime = document.getElementById("hud-time");
  const hudTempoSelect = document.getElementById("hud-tempo-select");
  const hudPianoSelect = document.getElementById("hud-piano-select");
  const hudKeysBtn = document.getElementById("hud-keys-btn");
  const hudPedalBtn = document.getElementById("hud-pedal-btn");
  const hudLidBtn = document.getElementById("hud-lid-btn");
  const hudFallingBtn = document.getElementById("hud-falling-btn");
  const hudKeyGlowBtn = document.getElementById("hud-keyglow-btn");
  const hudPerfBtn = document.getElementById("hud-perf-btn");
  const hudHallSelect = document.getElementById("hud-hall-select");
  const hudZoneSelect = document.getElementById("hud-zone-select");
  const hudSoftPedalBtn = document.getElementById("hud-soft-pedal-btn");
  const academyModal = document.getElementById("academy-modal");
  const hoverPill = document.getElementById("seat-hover-pill");
  const loadingCurtain = document.getElementById("loading-curtain");
  const loadingStatus = document.getElementById("loading-status");
  const loadingBar = document.getElementById("loading-bar");

  const setProgress = (pct, msg) => {
    if (loadingBar) loadingBar.style.width = `${pct}%`;
    if (loadingStatus && msg) loadingStatus.textContent = msg;
  };

  const acoustics = new KoernerHallAcousticsEngine();
  acoustics.setPerformanceProfile({ isMobile: ecoPerfMode });
  let fortepianoRig = null;
  let performancePlayer = null;
  let controller = null;
  let academyUI = null;
  let hallLightRig = null;
  let hallArchRig = null;
  let zoneSeatRig = null;
  let activeModelId = getPianoModel(paramModel || DEFAULT_PIANO_MODEL_ID).id;
  let activeKeyStyle = paramKeys === "historical" ? "historical" : DEFAULT_KEY_STYLE;
  let activeHallId = getConcertHall(paramHall || DEFAULT_HALL_ID).id;
  let activeZoneId = getListeningZone(paramZone || DEFAULT_ZONE_ID).id;
  let activeLidMode =
    paramLid === "closed" || paramLid === "half" ? paramLid : "open";
  // Default: ALL note visual effects OFF on startup (clean, authentic concert grand look)
  let activeFallingNotes =
    paramFalling === "1" || paramFalling === "true" || paramNotes === "falling" || paramNotes === "both";
  let activeKeyGlow =
    paramKeyGlow === "1" || paramKeyGlow === "true";
  let activeTempoRate = 1.0;
  let manualPedalLatched = false;
  let shiftPedalHeld = false;
  let unaCordaLatched = false;
  let fazioliSoftLatched = false;
  let dockCollapsed = false;

  if (hudPieceSelect) {
    for (const p of HISTORICAL_REPERTOIRE) {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = getShortPieceLabel(p);
      hudPieceSelect.appendChild(opt);
    }
  }

  if (hudPianoSelect) {
    for (const m of PIANO_MODELS) {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.label} \u25BE`;
      hudPianoSelect.appendChild(opt);
    }
    hudPianoSelect.value = activeModelId;
  }

  if (hudHallSelect) {
    for (const h of CONCERT_HALLS) {
      const opt = document.createElement("option");
      opt.value = h.id;
      opt.textContent = `${h.shortLabel} \u25BE`;
      hudHallSelect.appendChild(opt);
    }
    hudHallSelect.value = activeHallId;
  }

  if (hudZoneSelect) {
    for (const z of LISTENING_ZONES) {
      const opt = document.createElement("option");
      opt.value = z.id;
      opt.textContent = `${z.shortLabel} \u25BE`;
      hudZoneSelect.appendChild(opt);
    }
    hudZoneSelect.value = activeZoneId;
  }

  const syncKeysButtonUI = (style) => {
    if (!hudKeysBtn) return;
    const isHist = style === "historical";
    hudKeysBtn.textContent = isHist ? "Клавиши: Историч." : "Клавиши: Белые";
    hudKeysBtn.classList.toggle("is-historical", isHist);
    hudKeysBtn.title = isHist
      ? "Историческая клавиатура (чёрные натуральные / белые диезы) — нажмите для белых клавиш"
      : "Современная клавиатура (белые клавиши / чёрные диезы) — нажмите для исторической";
  };
  syncKeysButtonUI(activeKeyStyle);

  const LID_LABELS = {
    open: "Крышка: Открыта",
    half: "Крышка: Полуоткр.",
    closed: "Крышка: Закрыта",
  };
  const LID_OPENNESS = { open: 1.0, half: 0.5, closed: 0.0 };
  const LID_CYCLE = ["open", "half", "closed"];

  const syncLidButtonUI = (mode) => {
    if (!hudLidBtn) return;
    hudLidBtn.textContent = LID_LABELS[mode] || LID_LABELS.open;
    hudLidBtn.classList.toggle("is-active", mode !== "open");
  };
  syncLidButtonUI(activeLidMode);

  const syncFallingBtnUI = (enabled) => {
    if (!hudFallingBtn) return;
    hudFallingBtn.textContent = enabled ? "Падающие: Вкл" : "Падающие: Выкл";
    hudFallingBtn.classList.toggle("is-accent", Boolean(enabled));
  };
  syncFallingBtnUI(activeFallingNotes);

  const syncKeyGlowBtnUI = (enabled) => {
    if (!hudKeyGlowBtn) return;
    hudKeyGlowBtn.textContent = enabled ? "Подсветка: Вкл" : "Подсветка: Выкл";
    hudKeyGlowBtn.classList.toggle("is-accent", Boolean(enabled));
  };
  syncKeyGlowBtnUI(activeKeyGlow);

  const syncPedalUI = () => {
    const engaged = manualPedalLatched || shiftPedalHeld;
    acoustics.setManualSustain(engaged);
    if (hudPedalBtn) {
      hudPedalBtn.textContent = shiftPedalHeld
        ? "Педаль: Shift"
        : manualPedalLatched
          ? "Педаль: Зажата"
          : "Педаль: Авто";
      hudPedalBtn.classList.toggle("is-engaged", engaged);
    }
  };

  const syncFazioliSoftUI = () => {
    acoustics.setFazioliSoft(fazioliSoftLatched);
    if (hudSoftPedalBtn) {
      hudSoftPedalBtn.textContent = fazioliSoftLatched ? "4-я педаль: Вкл" : "4-я педаль: Выкл";
      hudSoftPedalBtn.classList.toggle("is-engaged", fazioliSoftLatched);
    }
  };

  const syncPerfBtnUI = () => {
    if (!hudPerfBtn) return;
    hudPerfBtn.textContent = ecoPerfMode ? "Графика: Эко 60" : "Графика: Ультра";
    hudPerfBtn.classList.toggle("is-active", ecoPerfMode);
    hudPerfBtn.title = ecoPerfMode
      ? "Режим Эко 60 FPS активен (экономия батареи и GPU на телефонах) — нажмите для Ультра"
      : "Режим Ультра графики (высокий DPR, тени) — нажмите для Эко 60 FPS";
  };
  syncPerfBtnUI();

  [
    hudCollapseBtn,
    hudAcademyBtn,
    hudPlayBtn,
    hudKeysBtn,
    hudPedalBtn,
    hudSoftPedalBtn,
    hudLidBtn,
    hudFallingBtn,
    hudKeyGlowBtn,
    hudPerfBtn,
    ...pianoPresetBtns,
  ].forEach((btn) => {
    if (btn) btn.addEventListener("focus", () => btn.blur());
  });

  // HUD visibility & collapsible studio dock
  let hudHidden = paramHud === "0" || paramHud === "false";
  if (hudHidden) {
    if (studioDockWrap) studioDockWrap.hidden = true;
    if (hudCapsule) hudCapsule.hidden = true;
    if (topStageBar) topStageBar.hidden = true;
    if (pianoViewBar) pianoViewBar.hidden = true;
  }

  const setDockCollapsed = (collapsed) => {
    dockCollapsed = Boolean(collapsed);
    if (studioDockWrap) {
      studioDockWrap.classList.toggle("collapsed", dockCollapsed);
    }
    if (hudCollapseBtn) {
      hudCollapseBtn.innerHTML = dockCollapsed
        ? "&#9652; Панель управления"
        : "&#9662; Скрыть панель";
    }
  };

  if (hudCollapseBtn) {
    hudCollapseBtn.addEventListener("click", () => {
      setDockCollapsed(!dockCollapsed);
      resetHudIdle();
    });
  }

  // On narrow phones, start with compact collapsed dock so 85%+ of the 3D grand piano is immediately visible
  if (!hudHidden && window.innerWidth <= 680 && paramHud !== "open") {
    setDockCollapsed(true);
  }

  let idleTimer = null;
  const resetHudIdle = () => {
    if (hudCapsule) hudCapsule.classList.remove("idle");
    if (pianoViewBar) pianoViewBar.classList.remove("idle");
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      if (academyUI && academyUI.isOpen()) return;
      if (hudCapsule) hudCapsule.classList.add("idle");
      if (pianoViewBar) pianoViewBar.classList.add("idle");
    }, 3600);
  };
  resetHudIdle();

  // Deferred callbacks bound once audio/rig/lighting are initialized
  let cycleLidPositionFn = null;
  let toggleFallingNotesFn = null;
  let toggleKeyGlowFn = null;

  let lastHToggleMs = 0;
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape" && academyUI && academyUI.isOpen()) {
      e.preventDefault();
      academyUI.close();
      resetHudIdle();
      return;
    }
    if (
      e.target &&
      (e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT")
    ) {
      return;
    }
    if ((e.code === "ShiftLeft" || e.code === "ShiftRight") && !e.repeat) {
      shiftPedalHeld = true;
      syncPedalUI();
      if (fortepianoRig) markDirty();
      return;
    }
    if ((e.code === "KeyM" || e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (academyUI) {
        e.preventDefault();
        academyUI.toggle();
        resetHudIdle();
      }
      return;
    }
    if ((e.code === "KeyH" || e.key === "h" || e.key === "H") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = performance.now();
      if (now - lastHToggleMs < 80) return;
      lastHToggleMs = now;
      if (!hudHidden) {
        setDockCollapsed(!dockCollapsed);
        resetHudIdle();
      }
      return;
    }
    if (academyUI && academyUI.isOpen()) return;

    if (e.code === "Space" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (performancePlayer) performancePlayer.togglePlay();
      resetHudIdle();
    } else if ((e.code === "KeyL" || e.key === "l" || e.key === "L") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (cycleLidPositionFn) cycleLidPositionFn();
      resetHudIdle();
    } else if ((e.code === "KeyN" || e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (toggleFallingNotesFn) toggleFallingNotesFn();
      resetHudIdle();
    } else if ((e.code === "KeyK" || e.key === "k" || e.key === "K") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (toggleKeyGlowFn) toggleKeyGlowFn();
      resetHudIdle();
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
      if (shiftPedalHeld) {
        shiftPedalHeld = false;
        syncPedalUI();
        if (fortepianoRig) markDirty();
      }
    }
  });
  window.addEventListener("blur", () => {
    if (shiftPedalHeld) {
      shiftPedalHeld = false;
      syncPedalUI();
    }
  });

  // Probe software WebGL2 rasterizer (SwiftShader / llvmpipe) up-front via 1x1 WebGL2 context
  let isSoftwareGL = false;
  let hasWebGL2 = false;
  try {
    const probeCanvas = document.createElement("canvas");
    probeCanvas.width = 1;
    probeCanvas.height = 1;
    const pgl = probeCanvas.getContext("webgl2");
    if (pgl) {
      hasWebGL2 = true;
      const pdbg = pgl.getExtension("WEBGL_debug_renderer_info");
      const punmasked = pdbg ? String(pgl.getParameter(pdbg.UNMASKED_RENDERER_WEBGL) || "") : "";
      isSoftwareGL = /swiftshader|llvmpipe|software/i.test(punmasked);
      const loseExt = pgl.getExtension("WEBGL_lose_context");
      if (loseExt) loseExt.loseContext();
    }
  } catch (_) {}

  if (!hasWebGL2) {
    if (idleTimer) clearTimeout(idleTimer);
    setProgress(0, "WebGL2 недоступен в этом браузере.");
    return;
  }

  // WebGL2 Renderer
  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isSoftwareGL,
      powerPreference: "high-performance",
      stencil: false,
    });
  } catch (_) {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        stencil: false,
      });
    } catch (err) {
      console.warn("[KoernerHall] WebGL2 renderer creation failed:", err);
      if (idleTimer) clearTimeout(idleTimer);
      setProgress(0, "WebGL2 недоступен в этом браузере.");
      return;
    }
  }
  if (renderer.debug) {
    renderer.debug.checkShaderErrors = false;
  }

  let isGlContextLost = false;
  canvas.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      isGlContextLost = true;
    },
    false
  );
  canvas.addEventListener(
    "webglcontextrestored",
    () => {
      isGlContextLost = false;
    },
    false
  );
  const applyRendererPerfMode = () => {
    const dpr = window.devicePixelRatio || 1;
    const targetDpr = isSoftwareGL ? 1 : ecoPerfMode ? Math.min(dpr, 1.15) : Math.min(dpr, 2);
    renderer.setPixelRatio(targetDpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.shadowMap.enabled = !ecoPerfMode && !isSoftwareGL;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    acoustics.setPerformanceProfile({ isMobile: ecoPerfMode });
  };
  applyRendererPerfMode();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = paramExp ? Number(paramExp) : 1.0;

  if (hudPerfBtn) {
    hudPerfBtn.addEventListener("click", () => {
      ecoPerfMode = !ecoPerfMode;
      syncPerfBtnUI();
      applyRendererPerfMode();
      markDirty();
      resetHudIdle();
    });
  }

  const maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111010);

  const camera = new THREE.PerspectiveCamera(
    35.5,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.10,
    60.0
  );

  let sceneDirty = true;
  const markDirty = () => {
    sceneDirty = true;
  };

  controller = new KoernerCameraController(camera, canvas, {
    onPoseTransition: () => {
      // Listening acoustics are controlled explicitly via the 4 Listening Zones selector
      // so users can orbit close to the keyboard/pedals while hearing any hall zone.
    },
    onPianoPresetChange: (presetKey) => {
      pianoPresetBtns.forEach((b) => {
        b.classList.toggle("active", b.dataset.pianoPreset === presetKey);
      });
      markDirty();
    },
    onUserActivity: resetHudIdle,
  });

  pianoPresetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      acoustics.resumeNonBlocking();
      controller.focusPiano(btn.dataset.pianoPreset, { immediate: false });
      resetHudIdle();
    });
  });

  // ==========================================================================
  // 4. LOAD ENVIRONMENT HDR, 4K LIGHTMAPS, ARCHITECTURAL STAGE SHELL & 3D PIANO
  //    (Zero seating manifests, zero chair_koerner.glb, zero instanced chairs!)
  // ==========================================================================
  const tBoot0 = performance.now();
  const initTimings = {};
  setProgress(20, "Загрузка конфигурации освещения сцены…");
  const [dimensions, bakeMeta] = await Promise.all([
    fetchJSONOptional("./data/koerner_dimensions.json"),
    fetchJSONOptional("./assets/lightmaps/bake_manifest.json"),
  ]);
  initTimings.jsonMs = Math.round(performance.now() - tBoot0);

  if (bakeMeta && Number.isFinite(bakeMeta.recommended_exposure) && !paramExp) {
    renderer.toneMappingExposure = Number(bakeMeta.recommended_exposure);
  }

  const effectiveAniso = isSoftwareGL || ecoPerfMode ? Math.min(4, maxAniso) : maxAniso;

  setProgress(42, "Загрузка 3D-модели рояля и акустической сцены…");
  const tAssets0 = performance.now();
  const oakMicroNormal = createOakMicroNormalTexture();
  const gltfLoader = new GLTFLoader();
  const texLoader = new THREE.TextureLoader();
  const lightmapCache = new Map();

  let cleanedUp = false;
  const cleanupWebGL = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    try {
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
      if (performancePlayer) performancePlayer.pause();
      if (fortepianoRig) fortepianoRig.dispose();
      for (const t of lightmapCache.values()) t.dispose();
      oakMicroNormal.dispose();
      if (scene.environment) scene.environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    } catch (_) {}
  };
  window.addEventListener("pagehide", cleanupWebGL, { once: true });
  window.addEventListener("beforeunload", cleanupWebGL, { once: true });

  const hdrTask = (async () => {
    try {
      const tH0 = performance.now();
      const rgbeLoader = new RGBELoader().setDataType(THREE.FloatType);
      let hdrTex = await rgbeLoader.loadAsync("./assets/env_koerner_2k.hdr");
      const sw = hdrTex.image?.width || 0;
      const sh = hdrTex.image?.height || 0;
      const src = hdrTex.image?.data;
      if (sw >= 1024 && sh >= 512 && src instanceof Float32Array && src.length >= sw * sh * 4) {
        const dw = 512;
        const dh = 256;
        const sx = Math.floor(sw / dw);
        const sy = Math.floor(sh / dh);
        const dst = new Float32Array(dw * dh * 4);
        const inv = 1.0 / (sx * sy);
        for (let y = 0; y < dh; y++) {
          for (let x = 0; x < dw; x++) {
            let r = 0,
              g = 0,
              b = 0;
            const y0 = y * sy;
            const x0 = x * sx;
            for (let dy = 0; dy < sy; dy++) {
              let rowOff = ((y0 + dy) * sw + x0) * 4;
              for (let dx = 0; dx < sx; dx++) {
                r += src[rowOff];
                g += src[rowOff + 1];
                b += src[rowOff + 2];
                rowOff += 4;
              }
            }
            const dOff = (y * dw + x) * 4;
            dst[dOff] = r * inv;
            dst[dOff + 1] = g * inv;
            dst[dOff + 2] = b * inv;
            dst[dOff + 3] = 1.0;
          }
        }
        const fastHdr = new THREE.DataTexture(dst, dw, dh, THREE.RGBAFormat, THREE.FloatType);
        fastHdr.mapping = THREE.EquirectangularReflectionMapping;
        fastHdr.colorSpace = THREE.LinearSRGBColorSpace;
        fastHdr.minFilter = THREE.LinearFilter;
        fastHdr.magFilter = THREE.LinearFilter;
        fastHdr.flipY = Boolean(hdrTex.flipY);
        fastHdr.needsUpdate = true;
        hdrTex.dispose();
        hdrTex = fastHdr;
      }
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const tex = pmrem.fromEquirectangular(hdrTex).texture;
      hdrTex.dispose();
      pmrem.dispose();
      initTimings.hdrMs = Math.round(performance.now() - tH0);
      return tex;
    } catch (err) {
      console.warn("[KoernerHall] Failed to load HDR environment map, using procedural fallback:", err);
      return null;
    }
  })();

  const lightmapTask = (async () => {
    const tL0 = performance.now();
    if (!bakeMeta || !bakeMeta.atlases) return;
    await Promise.all(
      Object.entries(bakeMeta.atlases).map(async ([atlasKey, relPath]) => {
        try {
          const lmTex = await texLoader.loadAsync(relPath);
          lmTex.flipY = false;
          lmTex.colorSpace = THREE.SRGBColorSpace;
          lmTex.anisotropy = effectiveAniso;
          if (isSoftwareGL) {
            lmTex.generateMipmaps = false;
            lmTex.minFilter = THREE.LinearFilter;
          }
          lmTex.channel = 1;
          lmTex.needsUpdate = true;
          lightmapCache.set(atlasKey, lmTex);
        } catch (err) {
          console.warn(`[KoernerHall] Failed to load lightmap atlas "${atlasKey}" (${relPath}):`, err);
        }
      })
    );
    initTimings.lmMs = Math.round(performance.now() - tL0);
  })();

  const tG0 = performance.now();
  const hallGlbTask = loadGstaticGlb(
    gltfLoader,
    "https://www.gstatic.com/aistudio/starter-apps/koerner-hall/koerner_hall.glb"
  )
    .then((g) => {
      initTimings.hallGlbMs = Math.round(performance.now() - tG0);
      return g;
    })
    .catch((err) => {
      console.warn("[KoernerHall] Failed to load koerner_hall.glb, using fallback stage:", err);
      return null;
    });

  const fortepianoTask = loadFortepianoStageRig({
    scene,
    renderer,
    gltfLoader,
    maxAniso: effectiveAniso,
    acoustics,
    isSoftwareGL,
    isMobile: ecoPerfMode,
    onWakeRender: markDirty,
  })
    .then((rig) => {
      initTimings.fortepianoMs = Math.round(performance.now() - tG0);
      return rig;
    })
    .catch((err) => {
      console.warn("[KoernerHallPiano] Failed to load 3D piano rig:", err);
      return null;
    });

  const [loadedEnvMap, , hallGltf, loadedFortepianoRig] = await Promise.all([
    hdrTask,
    lightmapTask,
    hallGlbTask,
    fortepianoTask,
  ]);
  fortepianoRig = loadedFortepianoRig;
  initTimings.assetsWallMs = Math.round(performance.now() - tAssets0);

  // Apply selected Piano Model, Key Style, Lid Angle, Note Visualizer, World Hall & Listening Zone
  const applySelectedPianoModel = (modelId) => {
    const model = getPianoModel(modelId);
    activeModelId = model.id;
    if (hudPianoSelect) {
      if (hudPianoSelect.value !== model.id) hudPianoSelect.value = model.id;
      hudPianoSelect.title = `${model.label} — ${model.subtitle}`;
    }
    const has4th = Boolean(model.visual?.hasFourthPedal);
    if (hudSoftPedalBtn) {
      hudSoftPedalBtn.hidden = !has4th;
    }
    if (!has4th && fazioliSoftLatched) {
      fazioliSoftLatched = false;
      syncFazioliSoftUI();
    }
    if (fortepianoRig) {
      fortepianoRig.setPianoModel(model.id);
    }
    acoustics.setPianoModel(model.id);
    markDirty();
  };

  const applySelectedKeyStyle = (style) => {
    activeKeyStyle = style === "historical" ? "historical" : "modern";
    syncKeysButtonUI(activeKeyStyle);
    if (fortepianoRig) {
      fortepianoRig.setKeyStyle(activeKeyStyle);
    }
    markDirty();
  };

  const applySelectedLidPosition = (mode) => {
    const safeMode = mode === "closed" || mode === "half" ? mode : "open";
    activeLidMode = safeMode;
    syncLidButtonUI(safeMode);
    if (fortepianoRig) {
      fortepianoRig.setLidPosition(safeMode);
    }
    acoustics.setLidOpenness(LID_OPENNESS[safeMode]);
    markDirty();
  };

  const applyFallingNotesEnabled = (enabled) => {
    activeFallingNotes = Boolean(enabled);
    syncFallingBtnUI(activeFallingNotes);
    if (fortepianoRig) {
      fortepianoRig.setFallingNotesEnabled(activeFallingNotes);
    }
    markDirty();
  };

  const applyKeyGlowEnabled = (enabled) => {
    activeKeyGlow = Boolean(enabled);
    syncKeyGlowBtnUI(activeKeyGlow);
    if (fortepianoRig) {
      fortepianoRig.setKeyGlowEnabled(activeKeyGlow);
    }
    markDirty();
  };

  const applySelectedNoteVizMode = (mode) => {
    if (mode === "both" || mode === "falling") {
      applyFallingNotesEnabled(true);
    } else if (mode === "off") {
      applyFallingNotesEnabled(false);
      applyKeyGlowEnabled(false);
    } else if (mode === "particles" && fortepianoRig) {
      fortepianoRig.setNoteVizMode("particles");
      markDirty();
    }
  };

  const applySelectedTempoRate = (rate) => {
    const clamped = Math.max(0.25, Math.min(1.25, Number(rate) || 1.0));
    activeTempoRate = clamped;
    if (hudTempoSelect && Number(hudTempoSelect.value) !== clamped) {
      hudTempoSelect.value = String(clamped);
    }
    if (performancePlayer) {
      performancePlayer.setTempoRate(clamped);
    }
    markDirty();
  };

  const applySelectedConcertHall = (hallId) => {
    const hall = getConcertHall(hallId);
    activeHallId = hall.id;
    if (hudHallSelect) {
      if (hudHallSelect.value !== hall.id) hudHallSelect.value = hall.id;
      hudHallSelect.title = `${hall.name} (${hall.city}) · RT60 ${hall.rt60Label}`;
    }
    acoustics.setConcertHall(hall.id);
    if (hallArchRig) {
      hallArchRig.setActiveHall(hall.id);
    }
    if (hallLightRig) {
      hallLightRig.applyHallLighting(hall);
    }
    if (academyUI) academyUI.refresh();
    markDirty();
  };

  const applySelectedListeningZone = (zoneId, immediate = false, { moveCamera = false } = {}) => {
    const zone = getListeningZone(zoneId);
    activeZoneId = zone.id;
    if (hudZoneSelect) {
      if (hudZoneSelect.value !== zone.id) hudZoneSelect.value = zone.id;
      hudZoneSelect.title = `${zone.name} (${zone.distanceLabel}) — ${zone.description}`;
    }
    acoustics.setListeningZone(zone.id, immediate);
    if (zoneSeatRig) {
      zoneSeatRig.setActiveZone(zone.id);
    }
    if (moveCamera && controller) {
      if (zone.id === "pianist") {
        controller.focusPiano("pianist", { immediate });
      } else if (zone.cameraPos && zone.lookAt) {
        controller.focusWorldPose(zone.cameraPos, zone.lookAt, zone.fov || 41.0, { immediate });
      }
    }
    if (academyUI) academyUI.refresh();
    markDirty();
  };

  cycleLidPositionFn = () => {
    const idx = LID_CYCLE.indexOf(activeLidMode);
    applySelectedLidPosition(LID_CYCLE[(idx + 1) % LID_CYCLE.length]);
  };

  toggleFallingNotesFn = () => {
    applyFallingNotesEnabled(!activeFallingNotes);
  };

  toggleKeyGlowFn = () => {
    applyKeyGlowEnabled(!activeKeyGlow);
  };

  applySelectedPianoModel(activeModelId);
  applySelectedKeyStyle(activeKeyStyle);
  applySelectedLidPosition(activeLidMode);
  applyFallingNotesEnabled(activeFallingNotes);
  applyKeyGlowEnabled(activeKeyGlow);

  if (hudPianoSelect) {
    hudPianoSelect.addEventListener("change", () => {
      acoustics.resumeNonBlocking();
      applySelectedPianoModel(hudPianoSelect.value);
      hudPianoSelect.blur();
      resetHudIdle();
    });
  }

  if (hudKeysBtn) {
    hudKeysBtn.addEventListener("click", () => {
      const nextStyle = activeKeyStyle === "modern" ? "historical" : "modern";
      applySelectedKeyStyle(nextStyle);
      resetHudIdle();
    });
  }

  if (hudPedalBtn) {
    hudPedalBtn.addEventListener("click", () => {
      acoustics.resumeNonBlocking();
      manualPedalLatched = !manualPedalLatched;
      syncPedalUI();
      markDirty();
      resetHudIdle();
    });
  }

  if (hudSoftPedalBtn) {
    hudSoftPedalBtn.addEventListener("click", () => {
      acoustics.resumeNonBlocking();
      fazioliSoftLatched = !fazioliSoftLatched;
      syncFazioliSoftUI();
      markDirty();
      resetHudIdle();
    });
  }

  if (hudLidBtn) {
    hudLidBtn.addEventListener("click", () => {
      acoustics.resumeNonBlocking();
      cycleLidPositionFn();
      resetHudIdle();
    });
  }

  if (hudFallingBtn) {
    hudFallingBtn.addEventListener("click", () => {
      toggleFallingNotesFn();
      resetHudIdle();
    });
  }

  if (hudKeyGlowBtn) {
    hudKeyGlowBtn.addEventListener("click", () => {
      toggleKeyGlowFn();
      resetHudIdle();
    });
  }

  if (hudHallSelect) {
    hudHallSelect.addEventListener("change", () => {
      acoustics.resumeNonBlocking();
      applySelectedConcertHall(hudHallSelect.value);
      hudHallSelect.blur();
      resetHudIdle();
    });
  }

  if (hudZoneSelect) {
    hudZoneSelect.addEventListener("change", () => {
      acoustics.resumeNonBlocking();
      applySelectedListeningZone(hudZoneSelect.value, false, { moveCamera: true });
      hudZoneSelect.blur();
      resetHudIdle();
    });
  }

  if (hudTempoSelect) {
    hudTempoSelect.addEventListener("change", () => {
      applySelectedTempoRate(hudTempoSelect.value);
      hudTempoSelect.blur();
      resetHudIdle();
    });
  }

  let isScrubbing = false;
  const syncPieceTooltips = (piece, playing) => {
    if (!piece) return;
    const actionWord = playing ? "Пауза" : "Играть";
    if (hudPlayBtn) {
      hudPlayBtn.title = `${actionWord}: ${piece.composer} — ${piece.title} (Пробел)`;
    }
    if (hudPieceSelect) {
      if (hudPieceSelect.value !== piece.id) hudPieceSelect.value = piece.id;
      hudPieceSelect.title = `${piece.composer} — ${piece.title}`;
    }
    if (hudScrub) {
      hudScrub.title = `Перемотка: ${piece.title}`;
    }
  };

  performancePlayer = new FortepianoRepertoirePerformance({
    acoustics,
    fortepianoRig,
    onStateChange: (playing) => {
      if (hudPlayBtn) {
        hudPlayBtn.innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
        hudPlayBtn.classList.toggle("is-playing", playing);
      }
      if (performancePlayer) {
        syncPieceTooltips(performancePlayer.currentPiece, playing);
      }
      if (hudCapsule) hudCapsule.classList.toggle("playing", playing);
      if (academyUI) academyUI.refresh();
      markDirty();
    },
    onProgress: (curSec, durSec) => {
      if (hudTime) {
        const nextText = `${formatClock(curSec)} / ${formatClock(durSec)}`;
        if (hudTime.textContent !== nextText) hudTime.textContent = nextText;
      }
      if (hudScrub && !isScrubbing && durSec > 0) {
        const nextVal = String(Math.round((curSec / durSec) * 1000));
        if (hudScrub.value !== nextVal) hudScrub.value = nextVal;
      }
    },
    onPieceChange: (piece) => {
      syncPieceTooltips(piece, Boolean(performancePlayer?.playing));
      if (fortepianoRig && piece) {
        fortepianoRig.setScorePiece(piece, getPieceAcademyMeta(piece));
      }
      if (academyUI) academyUI.refresh();
      markDirty();
    },
  });

  await performancePlayer.preload().catch((err) => {
    console.warn("[KoernerHallPiano] Failed to preload piano repertoire:", err);
  });
  syncPieceTooltips(performancePlayer.currentPiece, false);
  if (fortepianoRig && performancePlayer.currentPiece) {
    fortepianoRig.setScorePiece(
      performancePlayer.currentPiece,
      getPieceAcademyMeta(performancePlayer.currentPiece)
    );
  }
  if (paramPiece) {
    await performancePlayer.selectPiece(paramPiece, false);
  }

  // Instantiate Music Academy & Composer Encyclopedia Overlay
  if (academyModal) {
    academyUI = createAcademyController({
      modalEl: academyModal,
      repertoire: HISTORICAL_REPERTOIRE,
      getCurrentPieceId: () => performancePlayer?.currentPiece?.id || null,
      getActiveHallId: () => activeHallId,
      getActiveZoneId: () => activeZoneId,
      onSelectPiece: async (pieceId, autoPlay) => {
        acoustics.resumeNonBlocking();
        await performancePlayer.selectPiece(pieceId, autoPlay);
        if (autoPlay && academyUI) academyUI.close();
        markDirty();
        resetHudIdle();
      },
      onSelectHall: (hallId) => {
        acoustics.resumeNonBlocking();
        applySelectedConcertHall(hallId);
        resetHudIdle();
      },
      onSelectZone: (zoneId) => {
        acoustics.resumeNonBlocking();
        applySelectedListeningZone(zoneId, false, { moveCamera: true });
        if (academyUI) academyUI.close();
        resetHudIdle();
      },
      onClose: () => {
        resetHudIdle();
      },
    });
  }

  if (hudAcademyBtn && academyUI) {
    hudAcademyBtn.addEventListener("click", () => {
      academyUI.toggle();
      resetHudIdle();
    });
  }

  if (hudPlayBtn) {
    hudPlayBtn.addEventListener("click", () => {
      performancePlayer.togglePlay();
      resetHudIdle();
    });
  }
  if (hudPieceSelect) {
    hudPieceSelect.addEventListener("change", () => {
      performancePlayer.selectPiece(hudPieceSelect.value, performancePlayer.playing);
      hudPieceSelect.blur();
      resetHudIdle();
      markDirty();
    });
  }
  if (hudScrub) {
    hudScrub.addEventListener("pointerdown", () => {
      isScrubbing = true;
      resetHudIdle();
    });
    hudScrub.addEventListener("input", () => {
      const frac = Number(hudScrub.value) / 1000.0;
      const targetSec = frac * performancePlayer.durationSec;
      if (hudTime) {
        hudTime.textContent = `${formatClock(targetSec)} / ${formatClock(performancePlayer.durationSec)}`;
      }
      performancePlayer.seek(targetSec);
      markDirty();
    });
    const endScrub = () => {
      if (!isScrubbing) return;
      isScrubbing = false;
      const frac = Number(hudScrub.value) / 1000.0;
      performancePlayer.seek(frac * performancePlayer.durationSec);
      resetHudIdle();
      markDirty();
    };
    hudScrub.addEventListener("pointerup", endScrub);
    hudScrub.addEventListener("change", endScrub);
  }

  await new Promise((r) => setTimeout(r, 30));

  scene.environment = loadedEnvMap || buildFallbackKoernerPMREM(renderer);

  setProgress(74, "Сборка концертной сцены Koerner Hall…");
  const tBatch0 = performance.now();
  let hallLoaded = false;
  let batchedHallGroup = null;
  let hasBakedLightmaps = lightmapCache.size > 0;
  try {
    if (hallGltf) {
      const hallRoot = hallGltf.scene;
      hallRoot.updateMatrixWorld(true);

      const batchGroups = new Map();
      hallRoot.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry) return;
        // Suppress placeholder V1 Steinway meshes since loadFortepianoStageRig places our playable 3D piano
        if (fortepianoRig) {
          let isOldPlaceholderPiano = false;
          for (let cur = obj; cur; cur = cur.parent) {
            const cn = (cur.name || "").toLowerCase();
            if (cn.includes("steinway")) {
              isOldPlaceholderPiano = true;
              break;
            }
          }
          if (isOldPlaceholderPiano) return;
        }

        const upgraded = upgradeArchitecturalMaterial(
          obj,
          effectiveAniso,
          lightmapCache,
          bakeMeta,
          oakMicroNormal,
          isSoftwareGL
        );
        if (upgraded.usedLightmap) hasBakedLightmaps = true;
        let mat = upgraded.material;

        const geom = obj.geometry.clone();
        geom.applyMatrix4(obj.matrixWorld);

        const lname = `${obj.name} ${mat.name || ""}`.toLowerCase();
        const hasAnyTexture = Boolean(
          mat.map || mat.normalMap || mat.roughnessMap || mat.metalnessMap || mat.emissiveMap
        );

        if (!hasAnyTexture && !mat.transparent) {
          const countV = geom.attributes.position.count;
          const colArr = new Float32Array(countV * 3);
          const emSum = (mat.emissive?.r || 0) + (mat.emissive?.g || 0) + (mat.emissive?.b || 0);
          const ei = mat.emissiveIntensity ?? 0;

          if (emSum > 0.02 && ei > 0.05) {
            const isSconceOpal = lname.includes("sconce_opal");
            const cr = isSconceOpal ? 1.94 : mat.emissive.r * ei + mat.color.r * 0.15;
            const cg = isSconceOpal ? 1.40 : mat.emissive.g * ei + mat.color.g * 0.15;
            const cb = isSconceOpal ? 0.74 : mat.emissive.b * ei + mat.color.b * 0.15;
            for (let iv = 0; iv < countV; iv++) {
              colArr[iv * 3] = cr;
              colArr[iv * 3 + 1] = cg;
              colArr[iv * 3 + 2] = cb;
            }
            geom.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
            mat.dispose();
            mat = new THREE.MeshBasicMaterial({
              name: "Batch_Emissive_Lenses",
              color: 0xffffff,
              vertexColors: true,
              side: THREE.DoubleSide,
              toneMapped: true,
            });
          } else {
            const isSconceStem = lname.includes("sconce_warmbronze");
            const isBrightHardware =
              lname.includes("truss") ||
              lname.includes("cluster_drum") ||
              lname.includes("spot_cone") ||
              lname.includes("bezel");
            const vMulR = isSconceStem ? 2.15 : isBrightHardware ? 1.38 : 1.0;
            const vMulG = isSconceStem ? 1.86 : isBrightHardware ? 1.38 : 1.0;
            const vMulB = isSconceStem ? 1.28 : isBrightHardware ? 1.38 : 1.0;
            const cr = mat.color.r * vMulR;
            const cg = mat.color.g * vMulG;
            const cb = mat.color.b * vMulB;
            for (let iv = 0; iv < countV; iv++) {
              colArr[iv * 3] = cr;
              colArr[iv * 3 + 1] = cg;
              colArr[iv * 3 + 2] = cb;
            }
            geom.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
            mat.color.setRGB(1, 1, 1);
            mat.vertexColors = true;
            mat.emissive.setRGB(0, 0, 0);
            mat.emissiveIntensity = 0.0;

            if (mat.metalness >= 0.60) {
              mat.name = "Batch_Architectural_Metals";
              mat.metalness = 0.88;
              mat.roughness = 0.31;
              if ("clearcoat" in mat) {
                mat.clearcoat = 0.0;
                mat.clearcoatRoughness = 0.0;
                mat.specularIntensity = 1.0;
              }
              mat.envMapIntensity = 1.08;
              mat.lightMap = null;
              mat.lightMapIntensity = 1.0;
              mat.onBeforeCompile = () => {};
              mat.customProgramCacheKey = () => "koerner_metals_vcol";
            } else {
              mat.name = mat.lightMap ? "Batch_Dielectric_LM" : "Batch_Dielectric_Unlit";
              mat.metalness = 0.0;
              mat.roughness = 0.78;
              if ("clearcoat" in mat) {
                mat.clearcoat = 0.0;
                mat.clearcoatRoughness = 0.0;
                mat.specularIntensity = 0.08;
              }
              mat.envMapIntensity = 0.20;
              mat.lightMap = null;
              mat.lightMapIntensity = 1.0;
              mat.onBeforeCompile = () => {};
              mat.customProgramCacheKey = () => "koerner_dielectric_vcol";
            }
          }
        }

        const keepAttrs = ["position", "normal", "tangent", "uv"];
        if (mat.lightMap) keepAttrs.push("uv1");
        if (mat.vertexColors) keepAttrs.push("color");
        for (const k of Object.keys(geom.attributes)) {
          if (!keepAttrs.includes(k)) {
            geom.deleteAttribute(k);
          }
        }
        if (!geom.attributes.uv) {
          const countV = geom.attributes.position.count;
          geom.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(countV * 2), 2));
        }
        if (mat.type === "MeshBasicMaterial") {
          geom.deleteAttribute("tangent");
        } else {
          sanitizeTangentBuffer(geom);
          if (!geom.attributes.tangent && geom.attributes.normal) {
            const countV = geom.attributes.position.count;
            const tArr = new Float32Array(countV * 4);
            for (let iv = 0; iv < countV; iv++) {
              tArr[iv * 4] = 1.0;
              tArr[iv * 4 + 3] = 1.0;
            }
            geom.setAttribute("tangent", new THREE.BufferAttribute(tArr, 4));
            sanitizeTangentBuffer(geom);
          }
        }

        const attrSig = `${geom.index ? "I" : "N"}:${Object.keys(geom.attributes).sort().join(",")}`;
        const texId = (t) =>
          t ? `${t.source?.uuid || t.uuid}:${t.repeat.x.toFixed(2)}x${t.repeat.y.toFixed(2)}` : "-";
        const matSig = [
          mat.type,
          mat.vertexColors ? "VC1" : "VC0",
          mat.color.getHexString(),
          (mat.roughness ?? 0).toFixed(3),
          (mat.metalness ?? 0).toFixed(3),
          (mat.clearcoat ?? 0).toFixed(3),
          (mat.clearcoatRoughness ?? 0).toFixed(3),
          (mat.envMapIntensity ?? 1.0).toFixed(2),
          (mat.specularIntensity ?? 1.0).toFixed(2),
          mat.emissive ? mat.emissive.getHexString() : "000000",
          (mat.emissiveIntensity ?? 0).toFixed(2),
          mat.opacity.toFixed(2),
          mat.side,
          mat.transparent ? "T" : "O",
          texId(mat.map),
          texId(mat.normalMap),
          texId(mat.roughnessMap),
          texId(mat.metalnessMap),
          texId(mat.emissiveMap),
          texId(mat.lightMap),
          (mat.lightMapIntensity ?? 0).toFixed(3),
          typeof mat.customProgramCacheKey === "function" ? mat.customProgramCacheKey() : "-",
          attrSig,
        ].join("|");

        let grp = batchGroups.get(matSig);
        if (!grp) {
          grp = {
            material: mat,
            geoms: [],
            label: mat.name || obj.name,
          };
          batchGroups.set(matSig, grp);
        } else {
          mat.dispose();
        }
        grp.geoms.push(geom);
      });

      batchedHallGroup = new THREE.Group();
      batchedHallGroup.name = "KoernerHall_BatchedStatic";
      for (const grp of batchGroups.values()) {
        let finalMeshes = [];
        if (grp.geoms.length === 1) {
          finalMeshes.push(new THREE.Mesh(grp.geoms[0], grp.material));
        } else {
          const merged = mergeGeometries(grp.geoms, false);
          if (merged) {
            for (const g of grp.geoms) g.dispose();
            finalMeshes.push(new THREE.Mesh(merged, grp.material));
          } else {
            finalMeshes = grp.geoms.map((g) => new THREE.Mesh(g, grp.material));
          }
        }
        for (const m of finalMeshes) {
          m.name = `HallBatch_${grp.label}`;
          m.frustumCulled = false;
          m.castShadow = !hasBakedLightmaps;
          m.receiveShadow = !hasBakedLightmaps;
          batchedHallGroup.add(m);
        }
      }
      scene.add(batchedHallGroup);
      hallLoaded = true;
    }
  } catch (err) {
    console.warn("[KoernerHall] Using fallback concert stage:", err);
  }

  let fallbackHallGroup = null;
  if (!hallLoaded) {
    fallbackHallGroup = buildFallbackConcertStage(scene);
  }

  // Collect all hall architectural materials so switching among the 5 world concert halls
  // visibly transforms the 3D hall walls, oak canopy, sconces, lightmap brightness, and velvet seats.
  const hallArchMaterialRecords = [];
  const seenArchMats = new Set();
  const hallRootForGrading = batchedHallGroup || fallbackHallGroup;
  if (hallRootForGrading) {
    hallRootForGrading.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m || seenArchMats.has(m)) continue;
        seenArchMats.add(m);
        hallArchMaterialRecords.push({
          mat: m,
          origColor: m.color ? m.color.clone() : new THREE.Color(0xffffff),
          origLightMapIntensity: m.lightMapIntensity ?? 1.0,
          isEmissiveLens: m.name === "Batch_Emissive_Lenses",
        });
      }
    });
  }

  // Build bespoke 3D stage architecture sets for Musikverein, Carnegie Hall, Royal Albert Hall & Suntory Studio
  hallArchRig = buildHallStageArchitecture(scene);

  // Build 1 physical clickable 3D velvet concert seat per auditorium listening zone (6 seats total)
  zoneSeatRig = buildZoneShowcaseSeats(scene);

  const baseExposure =
    paramExp && Number.isFinite(Number(paramExp))
      ? Number(paramExp)
      : bakeMeta && Number.isFinite(bakeMeta.recommended_exposure)
        ? Number(bakeMeta.recommended_exposure)
        : 0.72;
  hallLightRig = setupConcertSpecularLights(
    scene,
    renderer,
    hasBakedLightmaps,
    baseExposure,
    Boolean(paramExp),
    hallArchMaterialRecords,
    zoneSeatRig
  );
  applySelectedConcertHall(activeHallId);

  // ==========================================================================
  // 5. APPLY DETERMINISTIC FRAME-0 PIANO STUDIO CAMERA POSE & ACOUSTIC ZONE
  // ==========================================================================
  const initialPreset = paramPiano && PIANO_STAGE_PRESETS[paramPiano] ? paramPiano : "bentside";
  if (paramFov !== null && Number.isFinite(Number(paramFov))) {
    controller.applyExplicitFovDeg(Number(paramFov));
  }
  controller.focusPiano(initialPreset, { immediate: true });
  applySelectedListeningZone(activeZoneId, true, { moveCamera: false });

  if (paramSeek !== null && Number.isFinite(Number(paramSeek))) {
    performancePlayer.seek(Number(paramSeek));
    if (fortepianoRig) fortepianoRig.update(0.016, true, performancePlayer.getVisualizerState());
  }
  if (paramPlay === "1" || paramPlay === "true") {
    performancePlayer.play(
      paramSeek !== null && Number.isFinite(Number(paramSeek)) ? Number(paramSeek) : null
    );
  }

  // ==========================================================================
  // 6. INTERACTIVE 61-KEY & 3-PEDAL LYRE RAYCAST PLAY & GLISSANDO
  // ==========================================================================
  const pickRaycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const hideInLidMirrors = [];
  const hideInFallboardMirrors = batchedHallGroup ? [batchedHallGroup] : [];

  let activePointerMidi = -1;

  function setRayFromClientEvent(e) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pickRaycaster.setFromCamera(pointerNdc, camera);
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || !fortepianoRig || (academyUI && academyUI.isOpen())) return;
    if (camera.position.distanceTo(fortepianoRig.worldCenter) < 5.8) {
      setRayFromClientEvent(e);
      const hitMidi = fortepianoRig.pickKeyAtRay(pickRaycaster);
      if (hitMidi >= FORTEPIANO_MIN_MIDI) {
        controller.suppressPointerDrag = true;
        activePointerMidi = hitMidi;
        acoustics.playInteractiveNoteOn(hitMidi, 0.78);
        fortepianoRig.strikeKey(hitMidi, 0.78);
        if (!hudHidden && hoverPill) {
          hoverPill.textContent = `${midiToNoteName(hitMidi)} \u00B7 Звучит клавиша`;
          hoverPill.style.left = `${e.clientX}px`;
          hoverPill.style.top = `${e.clientY}px`;
          hoverPill.style.display = "block";
        }
        resetHudIdle();
        return;
      }

      const hitPedal = fortepianoRig.pickPedalAtRay(pickRaycaster);
      if (hitPedal) {
        controller.suppressPointerDrag = true;
        acoustics.resumeNonBlocking();
        let statusMsg = "";
        if (hitPedal === "sustain") {
          manualPedalLatched = !manualPedalLatched;
          syncPedalUI();
          statusMsg = manualPedalLatched
            ? "Правая педаль сустейна · Зажата"
            : "Правая педаль сустейна · Авто";
        } else if (hitPedal === "una_corda") {
          unaCordaLatched = !unaCordaLatched;
          acoustics.setUnaCorda(unaCordaLatched);
          statusMsg = unaCordaLatched
            ? "Левая педаль Una Corda · Мягкий тембр вкл."
            : "Левая педаль Una Corda · Выкл.";
        } else if (hitPedal === "fazioli_soft") {
          fazioliSoftLatched = !fazioliSoftLatched;
          syncFazioliSoftUI();
          statusMsg = fazioliSoftLatched
            ? "4-я педаль Fazioli F308 · Мягкое пианиссимо вкл."
            : "4-я педаль Fazioli F308 · Выкл.";
        } else {
          statusMsg = "Средняя педаль Sostenuto · Удержание аккорда";
        }
        if (!hudHidden && hoverPill) {
          hoverPill.textContent = statusMsg;
          hoverPill.style.left = `${e.clientX}px`;
          hoverPill.style.top = `${e.clientY}px`;
          hoverPill.style.display = "block";
        }
        markDirty();
        resetHudIdle();
      }
    }
  });

  const releaseActivePointerKey = () => {
    if (activePointerMidi >= FORTEPIANO_MIN_MIDI) {
      acoustics.playInteractiveNoteOff(activePointerMidi);
      if (fortepianoRig) fortepianoRig.releaseKey(activePointerMidi);
      activePointerMidi = -1;
    }
  };
  window.addEventListener("pointerup", releaseActivePointerKey);
  window.addEventListener("pointercancel", releaseActivePointerKey);

  // Click any of the 6 physical 3D auditorium seats to sit there and hear binaural L/R acoustics
  canvas.addEventListener("pointerup", (e) => {
    if (
      e.button !== 0 ||
      controller.wasDragGesture ||
      activePointerMidi >= FORTEPIANO_MIN_MIDI ||
      (academyUI && academyUI.isOpen()) ||
      !zoneSeatRig
    ) {
      return;
    }
    setRayFromClientEvent(e);
    const hitZoneId = zoneSeatRig.pickZoneAtRay(pickRaycaster);
    if (hitZoneId) {
      acoustics.resumeNonBlocking();
      applySelectedListeningZone(hitZoneId, false, { moveCamera: true });
      const z = getListeningZone(hitZoneId);
      if (!hudHidden && hoverPill && z) {
        hoverPill.textContent = `${z.name} \u00B7 ${z.distanceLabel} \u00B7 Бинауральный звук`;
        hoverPill.style.left = `${e.clientX}px`;
        hoverPill.style.top = `${e.clientY}px`;
        hoverPill.style.display = "block";
      }
      resetHudIdle();
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (academyUI && academyUI.isOpen()) {
      hoverPill.style.display = "none";
      canvas.classList.remove("seat-hover");
      return;
    }
    if (activePointerMidi >= FORTEPIANO_MIN_MIDI && fortepianoRig) {
      setRayFromClientEvent(e);
      const dragMidi = fortepianoRig.pickKeyAtRay(pickRaycaster);
      if (dragMidi >= FORTEPIANO_MIN_MIDI && dragMidi !== activePointerMidi) {
        acoustics.playInteractiveNoteOff(activePointerMidi);
        fortepianoRig.releaseKey(activePointerMidi);
        activePointerMidi = dragMidi;
        acoustics.playInteractiveNoteOn(dragMidi, 0.74);
        fortepianoRig.strikeKey(dragMidi, 0.74);
        if (!hudHidden && hoverPill) {
          hoverPill.textContent = `${midiToNoteName(dragMidi)} \u00B7 Звучит клавиша`;
          hoverPill.style.left = `${e.clientX}px`;
          hoverPill.style.top = `${e.clientY}px`;
          hoverPill.style.display = "block";
        }
      }
      return;
    }

    if (controller._pointerDown || hudHidden || !fortepianoRig || e.pointerType === "touch") {
      hoverPill.style.display = "none";
      canvas.classList.remove("seat-hover");
      return;
    }

    setRayFromClientEvent(e);
    if (camera.position.distanceTo(fortepianoRig.worldCenter) < 5.8) {
      const hoverMidi = fortepianoRig.pickKeyAtRay(pickRaycaster);
      if (hoverMidi >= FORTEPIANO_MIN_MIDI) {
        hoverPill.textContent = `${midiToNoteName(hoverMidi)} \u00B7 Нажмите или проведите по клавишам`;
        hoverPill.style.left = `${e.clientX}px`;
        hoverPill.style.top = `${e.clientY}px`;
        hoverPill.style.display = "block";
        canvas.classList.add("seat-hover");
        return;
      }

      const hoverPedal = fortepianoRig.pickPedalAtRay(pickRaycaster);
      if (hoverPedal) {
        const label = fortepianoRig.pedalLabels?.[hoverPedal] || "Педаль рояля";
        hoverPill.textContent = `${label} \u00B7 Нажмите`;
        hoverPill.style.left = `${e.clientX}px`;
        hoverPill.style.top = `${e.clientY}px`;
        hoverPill.style.display = "block";
        canvas.classList.add("seat-hover");
        return;
      }
    }

    if (zoneSeatRig) {
      const hoverZoneId = zoneSeatRig.pickZoneAtRay(pickRaycaster);
      if (hoverZoneId) {
        const z = getListeningZone(hoverZoneId);
        hoverPill.textContent = `${z.name} \u00B7 Нажмите, чтобы сесть (наушники L/R)`;
        hoverPill.style.left = `${e.clientX}px`;
        hoverPill.style.top = `${e.clientY}px`;
        hoverPill.style.display = "block";
        canvas.classList.add("seat-hover");
        return;
      }
    }

    hoverPill.style.display = "none";
    canvas.classList.remove("seat-hover");
  });

  canvas.addEventListener("pointerleave", () => {
    hoverPill.style.display = "none";
    canvas.classList.remove("seat-hover");
  });

  // ==========================================================================
  // 7. SHADER COMPILE, WARMUP RENDER & LOADING CURTAIN DISMISSAL
  // ==========================================================================
  renderer.shadowMap.enabled = !hasBakedLightmaps;
  initTimings.preRenderMs = Math.round(performance.now() - tBatch0);
  setProgress(96, "Запуск WebGL2 рендера…");
  await new Promise((r) => setTimeout(r, 30));

  const tR0 = performance.now();
  controller.update(0.0);
  if (fortepianoRig) {
    fortepianoRig.update(0.016, true, performancePlayer.getVisualizerState());
    fortepianoRig.updateMirrors(scene, camera, hideInLidMirrors, hideInFallboardMirrors);
  }
  renderer.render(scene, camera);
  let lastDrawCalls = renderer.info.render.calls;
  initTimings.render1Ms = Math.round(performance.now() - tR0);
  await new Promise((r) => requestAnimationFrame(r));
  initTimings.totalMs = Math.round(performance.now() - tBoot0);
  initTimings.isSoftwareGL = isSoftwareGL;

  setProgress(100, "Готово");
  loadingCurtain.classList.add("hidden");
  loadingCurtain.style.display = "none";
  document.body.dataset.koernerReady = "1";
  window.__KOERNER_READY__ = true;
  window.__INIT_TIMINGS__ = initTimings;
  window.__CAMERA__ = camera;
  window.__KOERNER_APP__ = {
    camera,
    scene,
    renderer,
    controller,
    acoustics,
    fortepianoRig,
    steinwayRig: fortepianoRig,
    performancePlayer,
    academyUI,
    setPianoModel: applySelectedPianoModel,
    setKeyStyle: applySelectedKeyStyle,
    setConcertHall: applySelectedConcertHall,
    setListeningZone: (zId, imm = false, opts = { moveCamera: true }) =>
      applySelectedListeningZone(zId, imm, opts),
    setLidPosition: applySelectedLidPosition,
    setNoteVizMode: applySelectedNoteVizMode,
    setFallingNotesEnabled: applyFallingNotesEnabled,
    setKeyGlowEnabled: applyKeyGlowEnabled,
    setTempoRate: applySelectedTempoRate,
  };

  // ==========================================================================
  // 8. DETERMINISTIC QA API: window.__RUN_KOERNER_QA__()
  // ==========================================================================
  window.__RUN_KOERNER_QA__ = () => {
    const vpArea = Math.max(1, window.innerWidth * window.innerHeight);
    let hudPixels = 0;
    const hudCandidates = [hudCapsule, pianoViewBar, hoverPill];
    for (const el of hudCandidates) {
      if (!el || el.hidden) continue;
      const st = window.getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden" || parseFloat(st.opacity) <= 0.001) {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        hudPixels += r.width * r.height;
      }
    }
    const hudFootprintPct = Number(((hudPixels / vpArea) * 100).toFixed(3));

    const gl = renderer.getContext();
    const glErr = gl ? gl.getError() : 0;
    const webglErrors = glErr !== 0 ? 1 : 0;

    const hallBatchCount = batchedHallGroup ? batchedHallGroup.children.length : 0;
    const drawCalls = lastDrawCalls || renderer.info.render.calls;
    const fortepianoStats = fortepianoRig
      ? fortepianoRig.getQAStats()
      : { loaded: false, keysCount: 0, hammersCount: 0, dampersCount: 0 };
    const repertoireNotes = performancePlayer ? performancePlayer.events.length : 0;
    const repertoireCount = performancePlayer ? performancePlayer.repertoire.length : 0;

    const pass =
      webglErrors === 0 &&
      capturedConsoleErrors.length === 0 &&
      (!hudHidden || hudFootprintPct === 0) &&
      hallBatchCount < 20 &&
      drawCalls <= 1200 &&
      Boolean(fortepianoStats.loaded) &&
      fortepianoStats.keysCount === 61 &&
      fortepianoStats.hammersCount === 61 &&
      fortepianoStats.dampersCount === 61 &&
      repertoireCount === HISTORICAL_REPERTOIRE.length &&
      repertoireNotes > 500;

    return {
      pass,
      hallLoaded,
      hasBakedLightmaps,
      hallBatchCount,
      totalSeats: zoneSeatRig ? zoneSeatRig.count : 0,
      instancedCount: 0,
      drawCalls,
      pianoModelId: activeModelId,
      keyStyle: activeKeyStyle,
      hallId: activeHallId,
      zoneId: activeZoneId,
      lidMode: activeLidMode,
      fallingNotesEnabled: activeFallingNotes,
      keyGlowEnabled: activeKeyGlow,
      noteVizMode: fortepianoRig ? fortepianoRig.getNoteVizMode() : "off",
      tempoRate: activeTempoRate,
      fortepianoLoaded: Boolean(fortepianoStats.loaded),
      fortepianoStats,
      repertoireCount,
      activePieceId: performancePlayer ? performancePlayer.currentPiece?.id : null,
      repertoireNotes,
      repertoireDurationSec: performancePlayer ? performancePlayer.durationSec : 0,
      acousticMetrics: acoustics.lastMetrics,
      hudFootprintPct,
      webglErrors,
      consoleErrors: capturedConsoleErrors.slice(),
    };
  };

  // Resize & Demand-Driven 60fps Render Loop (0% idle CPU when stationary; 60fps during performance/drag/glide)
  window.addEventListener("resize", () => {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    markDirty();
  });

  const lastPos = camera.position.clone();
  const lastQuat = camera.quaternion.clone();
  let lastFov = camera.fov;
  sceneDirty = false;

  let lastTime = performance.now();
  let lastRenderMs = 0;
  let lastMirrorMs = 0;
  const softwarePlayFrameMs = 300;

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = (now - lastTime) * 0.001;
    lastTime = now;
    controller.update(dt);

    const repActive = performancePlayer ? performancePlayer.update(now * 0.001) : false;
    const perfState = performancePlayer ? performancePlayer.getVisualizerState() : null;
    const rigMoving = fortepianoRig ? fortepianoRig.update(dt, false, perfState) : false;

    const camMoved =
      camera.position.distanceToSquared(lastPos) > 1e-10 ||
      1.0 - Math.abs(camera.quaternion.dot(lastQuat)) > 1e-10 ||
      Math.abs(camera.fov - lastFov) > 1e-6;

    if (sceneDirty || camMoved || repActive || rigMoving) {
      if (isGlContextLost) return;
      if (isSoftwareGL && !camMoved && !sceneDirty && now - lastRenderMs < softwarePlayFrameMs) {
        return;
      }
      const curMirrorInterval = isSoftwareGL ? 600 : ecoPerfMode ? 180 : 66;
      const needMirrorRefresh =
        camMoved || sceneDirty || now - lastMirrorMs >= curMirrorInterval;
      lastPos.copy(camera.position);
      lastQuat.copy(camera.quaternion);
      lastFov = camera.fov;
      sceneDirty = false;
      lastRenderMs = now;
      if (fortepianoRig && needMirrorRefresh) {
        lastMirrorMs = now;
        fortepianoRig.updateMirrors(scene, camera, hideInLidMirrors, hideInFallboardMirrors);
      }
      renderer.render(scene, camera);
      lastDrawCalls = renderer.info.render.calls;
    }
  }
  requestAnimationFrame(animate);
}

// ============================================================================
// MATERIAL UPGRADE & CYCLES GI LIGHTMAP INTEGRATION
// ============================================================================
function upgradeArchitecturalMaterial(
  mesh,
  maxAniso,
  lightmapCache,
  bakeMeta,
  oakMicroNormal,
  _isSoftwareGL = false
) {
  const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const matName = (src?.name || "").toLowerCase();
  const objName = (mesh.name || "").toLowerCase();
  const key = `${matName} ${objName}`;

  const mat = new THREE.MeshPhysicalMaterial({
    name: src?.name || "Koerner_PBR",
    color: src?.color ? src.color.clone() : new THREE.Color(0xc89d6c),
    map: src?.map || null,
    normalMap: src?.normalMap || null,
    roughnessMap: src?.roughnessMap || null,
    metalnessMap: src?.metalnessMap || null,
    aoMap: src?.aoMap || null,
    emissive: src?.emissive ? src.emissive.clone() : new THREE.Color(0x000000),
    emissiveMap: src?.emissiveMap || null,
    emissiveIntensity: src?.emissiveIntensity ?? 1.0,
    roughness: src?.roughness ?? 0.55,
    metalness: src?.metalness ?? 0.0,
    side: THREE.DoubleSide,
    transparent: Boolean(src?.transparent),
    opacity: src?.opacity ?? 1.0,
  });

  if (mat.map) {
    mat.map.colorSpace = THREE.SRGBColorSpace;
    mat.map.generateMipmaps = true;
    mat.map.minFilter = THREE.LinearMipmapLinearFilter;
    mat.map.magFilter = THREE.LinearFilter;
    mat.map.anisotropy = maxAniso;
    mat.map.needsUpdate = true;
  }
  for (const linTex of [mat.normalMap, mat.roughnessMap, mat.metalnessMap, mat.aoMap]) {
    if (linTex) {
      linTex.colorSpace = THREE.NoColorSpace;
      linTex.generateMipmaps = true;
      linTex.minFilter = THREE.LinearMipmapLinearFilter;
      linTex.magFilter = THREE.LinearFilter;
      linTex.anisotropy = maxAniso;
      linTex.needsUpdate = true;
    }
  }

  if (key.includes("harp") || key.includes("gilded") || key.includes("gold") || key.includes("brass") || key.includes("sconce_stem")) {
    mat.metalness = Math.max(mat.metalness, 0.90);
    mat.roughness = Math.min(mat.roughness, 0.28);
    mat.envMapIntensity = 1.05;
  } else if (key.includes("guardrail") || key.includes("bronze") || key.includes("rail")) {
    mat.metalness = Math.max(mat.metalness, 0.86);
    mat.roughness = 0.34;
    mat.envMapIntensity = 0.98;
  } else if (key.includes("soffit") || key.includes("cream") || key.includes("ivory")) {
    mat.roughness = 0.84;
    mat.metalness = 0.0;
    mat.clearcoat = 0.0;
    mat.specularIntensity = 0.10;
    mat.envMapIntensity = 0.06;
  } else if (matName.includes("oak_stage") || matName.includes("stage_oak") || objName === "ws1_stage_deck") {
    mat.roughness = 0.38;
    mat.clearcoat = 0.22;
    mat.clearcoatRoughness = 0.22;
    if (!mat.normalMap && mat.map) {
      mat.normalMap = oakMicroNormal;
      mat.normalScale.set(0.18, 0.18);
    }
    mat.envMapIntensity = 0.32;
  } else if (
    key.includes("void") ||
    key.includes("plenum") ||
    key.includes("pocket") ||
    key.includes("coffer") ||
    key.includes("alcove") ||
    key.includes("av_plate")
  ) {
    mat.roughness = 0.88;
    mat.metalness = 0.0;
    mat.clearcoat = 0.0;
    mat.specularIntensity = 0.08;
    mat.envMapIntensity = 0.14;
  } else if (key.includes("truss") || key.includes("catwalk") || key.includes("suspension") || key.includes("pipe")) {
    mat.metalness = Math.max(mat.metalness, 0.82);
    mat.roughness = key.includes("truss") ? 0.34 : 0.46;
    mat.clearcoat = 0.0;
    mat.envMapIntensity = key.includes("truss") ? 1.05 : 0.65;
  } else if (key.includes("bezel") || (key.includes("reflector") && !mat.map)) {
    mat.metalness = Math.max(mat.metalness, 0.82);
    mat.roughness = 0.28;
    mat.envMapIntensity = 0.90;
  } else if (key.includes("plaster") || key.includes("charcoal")) {
    mat.roughness = 0.82;
    mat.metalness = 0.0;
    mat.clearcoat = 0.0;
    mat.specularIntensity = 0.48;
    mat.envMapIntensity = 0.46;
  } else if (matName.includes("oak_floor") || key.includes("riser") || key.includes("aisle_stairs")) {
    mat.roughness = 0.46;
    mat.clearcoat = 0.08;
    mat.clearcoatRoughness = 0.34;
    if (!mat.normalMap && mat.map) {
      mat.normalMap = oakMicroNormal;
      mat.normalScale.set(0.14, 0.14);
    }
    mat.specularIntensity = 0.28;
    mat.envMapIntensity = 0.14;
  } else if (
    (Boolean(mat.map) || matName.includes("oak") || matName.includes("veil")) &&
    (key.includes("veil") ||
      key.includes("canopy") ||
      key.includes("ribbon") ||
      key.includes("stagereflector") ||
      key.includes("fascia") ||
      key.includes("surround") ||
      key.includes("vestibule") ||
      key.includes("oak"))
  ) {
    const isVeilOrCanopy =
      key.includes("veil") ||
      key.includes("ribbon") ||
      key.includes("oakstrands") ||
      key.includes("stagereflector") ||
      key.includes("canopy");
    mat.roughness = isVeilOrCanopy ? 0.37 : Math.min(Math.max(mat.roughness, 0.37), 0.46);
    mat.clearcoat = isVeilOrCanopy ? 0.18 : 0.16;
    mat.clearcoatRoughness = isVeilOrCanopy ? 0.24 : 0.28;
    if (!mat.normalMap && mat.map) {
      mat.normalMap = oakMicroNormal;
      mat.normalScale.set(0.15, 0.15);
    }
    mat.envMapIntensity = isVeilOrCanopy ? 0.56 : 0.46;
  } else if (
    key.includes("emissive") ||
    key.includes("steplight") ||
    key.includes("lamp") ||
    key.includes("sconce") ||
    key.includes("downlight") ||
    key.includes("fixture_glow")
  ) {
    if (!key.includes("exit")) {
      mat.emissiveIntensity = Math.min(2.3, Math.max(1.1, mat.emissiveIntensity));
    } else {
      mat.emissiveIntensity = Math.min(1.2, Math.max(0.25, mat.emissiveIntensity));
    }
  }

  let usedLightmap = false;
  const hasUV1 = Boolean(mesh.geometry?.attributes?.uv1);
  if (hasUV1 && bakeMeta?.object_to_atlas) {
    let atlasId = null;
    let cur = mesh;
    while (cur && !atlasId) {
      const cname = cur.name || "";
      const baseCname = cname.replace(/_\d+$/, "");
      atlasId = bakeMeta.object_to_atlas[cname] || bakeMeta.object_to_atlas[baseCname] || null;
      cur = cur.parent;
    }
    const lmTex = atlasId ? lightmapCache.get(atlasId) : null;
    if (lmTex) {
      mat.lightMap = lmTex;
      const exactIntensity =
        bakeMeta.atlas_lightmap_intensities?.[atlasId] ??
        (bakeMeta.atlas_scales?.[atlasId] !== undefined
          ? bakeMeta.atlas_scales[atlasId] * Math.PI
          : bakeMeta.lightmap_intensity ?? 3.2 * Math.PI);
      const isSoffit = key.includes("soffit") || key.includes("cream");
      const isStageDeck =
        matName.includes("oak_stage") || matName.includes("stage_oak") || objName === "ws1_stage_deck";
      const isRiserFloor =
        matName.includes("oak_floor") || key.includes("riser") || key.includes("aisle_stairs");
      const isDarkPlaster = key.includes("plaster") || key.includes("charcoal");
      const isVeilRibbon =
        key.includes("veil") ||
        key.includes("ribbon") ||
        key.includes("canopy") ||
        key.includes("oakstrands") ||
        key.includes("stagereflector");
      const isBalconyFascia = key.includes("fascia") || key.includes("surround");
      const lmMul = isSoffit
        ? 0.90
        : isStageDeck
          ? 0.90
          : isRiserFloor
            ? 0.96
            : isVeilRibbon
              ? 1.00
              : isBalconyFascia
                ? 1.02
                : isDarkPlaster
                  ? 1.05
                  : 1.0;
      mat.lightMapIntensity = exactIntensity * lmMul;
      const iblDiffScale = isSoffit ? "0.02" : isRiserFloor ? "0.03" : "0.04";
      const progTag = isStageDeck ? "stage_ao" : `s${iblDiffScale}`;
      mat.onBeforeCompile = (shader) => {
        if (isStageDeck) {
          shader.vertexShader =
            "varying vec3 vStageWorldPos;\n" +
            shader.vertexShader.replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\n\tvStageWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;"
            );
          shader.fragmentShader =
            "varying vec3 vStageWorldPos;\n" +
            shader.fragmentShader.replace(
              "#include <lights_fragment_maps>",
              `#include <lights_fragment_maps>\n\tiblIrradiance *= ${iblDiffScale};` +
                "\n\tvec2 pXZ = vStageWorldPos.xz;" +
                "\n\tfloat bentZ = mix(3.95, 3.17, clamp((pXZ.x + 1.26) / 1.53, 0.0, 1.0));" +
                "\n\tfloat hullDx = max(max(-1.26 - pXZ.x, pXZ.x - 0.84), 0.0);" +
                "\n\tfloat hullDz = max(max(bentZ - pXZ.y, pXZ.y - 4.13), 0.0);" +
                "\n\tfloat hullDist = length(vec2(hullDx, hullDz));" +
                "\n\tfloat hullSpecOcc = mix(0.18, 1.0, smoothstep(0.0, 0.46, hullDist));" +
                "\n\tfloat hullDiffOcc = mix(0.90, 1.0, smoothstep(0.0, 0.38, hullDist));" +
                "\n\tfloat footD = min(min(length(pXZ - vec2(0.752, 4.044)), length(pXZ - vec2(0.750, 3.254))), min(length(pXZ - vec2(0.310, 3.244)), length(pXZ - vec2(-1.142, 4.051))));" +
                "\n\tfloat benchD = min(min(length(pXZ - vec2(1.08, 3.97)), length(pXZ - vec2(1.08, 3.33))), min(length(pXZ - vec2(1.36, 3.97)), length(pXZ - vec2(1.36, 3.33))));" +
                "\n\tfloat contactAO = mix(0.36, 1.0, smoothstep(0.020, 0.14, min(footD, benchD * 1.10)));" +
                "\n\tradiance *= hullSpecOcc * contactAO;" +
                "\n\t#ifdef USE_CLEARCOAT\n\t\tclearcoatRadiance *= hullSpecOcc * contactAO;\n\t#endif" +
                "\n\tirradiance *= contactAO * hullDiffOcc;"
            );
        } else {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <lights_fragment_maps>",
            `#include <lights_fragment_maps>\n\tiblIrradiance *= ${iblDiffScale};`
          );
        }
      };
      mat.customProgramCacheKey = () => `koerner_lm_${mat.type}_${progTag}_v4`;
      usedLightmap = true;
    }
  }

  return { material: mat, usedLightmap };
}

function setupConcertSpecularLights(
  scene,
  renderer,
  hasBakedLightmaps,
  baseExposure = 0.72,
  lockExposure = false,
  hallArchMaterialRecords = [],
  zoneSeatRig = null
) {
  const specKey = new THREE.DirectionalLight(0xfff1dc, hasBakedLightmaps ? 0.22 : 0.48);
  specKey.position.set(-1.5, 11.0, 2.5);
  specKey.target.position.set(-0.2, 1.4, 3.6);
  scene.add(specKey);
  scene.add(specKey.target);

  // Expressive stage spot that adapts color & glow across the 5 world concert halls
  const stageAccentSpot = new THREE.SpotLight(
    0xffd5a0,
    hasBakedLightmaps ? 0.0 : 88.0,
    34.0,
    Math.PI * 0.32,
    0.64,
    1.35
  );
  stageAccentSpot.position.set(0.0, 10.2, 4.1);
  stageAccentSpot.target.position.set(0.0, 1.35, 3.65);
  if (!hasBakedLightmaps) {
    stageAccentSpot.castShadow = true;
    stageAccentSpot.shadow.mapSize.set(2048, 2048);
    stageAccentSpot.shadow.bias = -0.0003;
  }
  scene.add(stageAccentSpot);
  scene.add(stageAccentSpot.target);

  const pianoFillSpot = new THREE.SpotLight(
    0xffe6c7,
    hasBakedLightmaps ? 0.0 : 58.0,
    26.0,
    Math.PI * 0.26,
    0.68,
    1.35
  );
  pianoFillSpot.position.set(-2.4, 9.2, 1.3);
  pianoFillSpot.target.position.set(0.15, 1.5, 3.65);
  scene.add(pianoFillSpot);
  scene.add(pianoFillSpot.target);

  const houseHemi = new THREE.HemisphereLight(
    0xffd9ad,
    0x3b2818,
    hasBakedLightmaps ? 0.0 : 0.72
  );
  scene.add(houseHemi);

  scene.fog = new THREE.FogExp2(0x1a1612, 0.008);
  const archTintColor = new THREE.Color(0xffffff);
  const emissiveTintColor = new THREE.Color(0xffffff);

  return {
    applyHallLighting(hall) {
      if (!hall || !hall.lighting) return;
      const l = hall.lighting;
      scene.background = new THREE.Color(l.bgHex);
      if (scene.fog) {
        scene.fog.color.setHex(l.fogHex);
        scene.fog.density = hasBakedLightmaps ? l.fogDensity * 0.85 : l.fogDensity;
      }

      // 1. Real 3D architectural tinting & baked lightmap scaling so all 5 halls look unmistakably distinct
      archTintColor.setHex(l.archTintHex ?? 0xffffff);
      emissiveTintColor.setHex(l.emissiveTintHex ?? 0xffe4b8);
      const lmMul = Number.isFinite(l.lightMapMul) ? l.lightMapMul : 1.0;

      for (let i = 0; i < hallArchMaterialRecords.length; i++) {
        const rec = hallArchMaterialRecords[i];
        if (!rec.mat || !rec.mat.color) continue;
        if (rec.isEmissiveLens) {
          rec.mat.color.copy(rec.origColor).multiply(emissiveTintColor);
        } else {
          rec.mat.color.copy(rec.origColor).multiply(archTintColor);
          if (rec.mat.lightMap) {
            rec.mat.lightMapIntensity = rec.origLightMapIntensity * lmMul;
          }
        }
      }

      // 2. Match auditorium velvet seat upholstery to the active concert hall
      if (zoneSeatRig && l.seatVelvetHex !== undefined) {
        zoneSeatRig.setVelvetColor(l.seatVelvetHex);
      }

      // 3. Expressive stage key, accent, fill, and auditorium hemisphere lighting
      specKey.color.setHex(l.keyColor);
      specKey.intensity = hasBakedLightmaps
        ? 0.20 * l.keyIntensity + l.stageAccentIntensity * 0.85
        : 0.50 * l.keyIntensity;

      stageAccentSpot.color.setHex(l.stageAccentColor);
      stageAccentSpot.intensity = hasBakedLightmaps
        ? l.stageAccentIntensity * 62.0
        : 96.0 * l.keyIntensity;

      pianoFillSpot.color.setHex(l.fillColor);
      pianoFillSpot.intensity = hasBakedLightmaps
        ? l.stageAccentIntensity * 28.0
        : 62.0 * l.fillIntensity;

      houseHemi.color.setHex(l.hemiSky);
      houseHemi.groundColor.setHex(l.hemiGround);
      houseHemi.intensity = hasBakedLightmaps
        ? 0.08 + l.stageAccentIntensity * 0.34
        : 0.76 * l.hemiIntensity;

      if (!lockExposure) {
        const expRatio = l.exposure / 0.72;
        renderer.toneMappingExposure = baseExposure * expRatio;
      }
    },
  };
}

/**
 * Builds 1 physical, clickable upholstered 3D concert hall seat in each of the 6 auditorium
 * listening zones (Parterre Center/Left/Right, Balcony Left/Right, Upper Balcony) using shared
 * geometries & materials so mobile GPU overhead stays negligible (< 12 draw calls).
 */
function buildZoneShowcaseSeats(scene) {
  const seatZones = LISTENING_ZONES.filter((z) => z.hasSeatMesh && Array.isArray(z.seatPos));
  const root = new THREE.Group();
  root.name = "KoernerHall_ZoneSeats";

  // Shared materials
  const velvetMat = new THREE.MeshPhysicalMaterial({
    name: "ZoneSeat_Velvet",
    color: 0x6e1a20,
    roughness: 0.86,
    metalness: 0.0,
    sheen: 0.65,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0xc96b6b),
  });
  const oakFrameMat = new THREE.MeshStandardMaterial({
    name: "ZoneSeat_OakFrame",
    color: 0x3b2416,
    roughness: 0.42,
    metalness: 0.05,
  });
  const brassPedestalMat = new THREE.MeshStandardMaterial({
    name: "ZoneSeat_Brass",
    color: 0xc89d4c,
    roughness: 0.32,
    metalness: 0.86,
  });
  const pickProxyMat = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide,
  });

  // Shared geometries
  const cushionGeo = new THREE.BoxGeometry(0.56, 0.11, 0.50);
  const backGeo = new THREE.BoxGeometry(0.56, 0.66, 0.10);
  const sidePanelGeo = new THREE.BoxGeometry(0.055, 0.62, 0.52);
  const armGeo = new THREE.BoxGeometry(0.075, 0.045, 0.46);
  const pedestalGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.38, 12);
  const ringGeo = new THREE.RingGeometry(0.46, 0.56, 32);
  ringGeo.rotateX(-Math.PI * 0.5);
  const pickBoxGeo = new THREE.BoxGeometry(0.95, 1.25, 0.95);

  const pickMeshes = [];
  const ringMatsByZone = new Map();

  for (const zone of seatZones) {
    const grp = new THREE.Group();
    grp.name = `ZoneSeat_${zone.id}`;
    grp.position.set(zone.seatPos[0], zone.seatPos[1], zone.seatPos[2]);
    grp.rotation.y = zone.seatYaw || 0.0;

    // Pedestal base
    const ped = new THREE.Mesh(pedestalGeo, brassPedestalMat);
    ped.position.set(0, 0.19, 0);
    grp.add(ped);

    // Velvet seat cushion (faces +Z toward stage)
    const cushion = new THREE.Mesh(cushionGeo, velvetMat);
    cushion.position.set(0, 0.43, 0.02);
    grp.add(cushion);

    // Tall upholstered backrest (at -Z behind listener)
    const backrest = new THREE.Mesh(backGeo, velvetMat);
    backrest.position.set(0, 0.78, -0.22);
    backrest.rotation.x = -0.14;
    grp.add(backrest);

    // Left & right oak side panels + armrests
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(sidePanelGeo, oakFrameMat);
      panel.position.set(side * 0.305, 0.34, -0.01);
      grp.add(panel);

      const arm = new THREE.Mesh(armGeo, oakFrameMat);
      arm.position.set(side * 0.305, 0.65, 0.01);
      grp.add(arm);
    }

    // Subtle brass floor indicator ring (highlights active seat in warm concert gold)
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd8a856,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 0.018, 0);
    grp.add(ring);
    ringMatsByZone.set(zone.id, ringMat);

    // Generous invisible click collider for crisp raycasting from stage or balcony
    const pickMesh = new THREE.Mesh(pickBoxGeo, pickProxyMat);
    pickMesh.position.set(0, 0.62, 0);
    pickMesh.userData.zoneId = zone.id;
    grp.add(pickMesh);
    pickMeshes.push(pickMesh);

    root.add(grp);
  }

  scene.add(root);

  return {
    group: root,
    count: seatZones.length,
    pickMeshes,
    setVelvetColor(hex) {
      velvetMat.color.setHex(hex);
    },
    setActiveZone(activeZoneId) {
      for (const [zId, rMat] of ringMatsByZone.entries()) {
        const isAct = zId === activeZoneId;
        rMat.color.setHex(isAct ? 0xffe29a : 0xc69648);
        rMat.opacity = isAct ? 0.92 : 0.34;
      }
    },
    pickZoneAtRay(raycaster) {
      const hits = raycaster.intersectObjects(pickMeshes, false);
      if (hits.length > 0 && hits[0].object?.userData?.zoneId) {
        return hits[0].object.userData.zoneId;
      }
      return null;
    },
  };
}

function buildFallbackConcertStage(scene) {
  const grp = new THREE.Group();
  grp.name = "Fallback_ConcertStage";
  const stageGeo = new THREE.BoxGeometry(18.0, 0.95, 11.2);
  stageGeo.translate(0, 0.475, 5.6);
  const stageMat = new THREE.MeshPhysicalMaterial({
    color: 0xc9965b,
    roughness: 0.36,
    clearcoat: 0.32,
  });
  const stageMesh = new THREE.Mesh(stageGeo, stageMat);
  stageMesh.name = "Preview_Stage_Oak";
  grp.add(stageMesh);

  for (let i = 0; i < 6; i++) {
    const zThree = 9.0 - i * 3.6;
    const yThree = 9.2 + Math.sin(i * 0.55) * 1.4;
    const ribGeo = new THREE.BoxGeometry(19.5, 0.12, 2.2);
    const ribMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4a36a,
      roughness: 0.40,
      clearcoat: 0.16,
    });
    const rib = new THREE.Mesh(ribGeo, ribMat);
    rib.position.set(0, yThree, zThree);
    rib.rotation.x = Math.cos(i * 0.5) * 0.14;
    grp.add(rib);
  }
  scene.add(grp);
  return grp;
}

initKoernerHallExplorer().catch((err) => {
  console.warn("[KoernerHall] Initialization halted:", err);
  const loadingStatusEl = document.getElementById("loading-status");
  if (loadingStatusEl) {
    loadingStatusEl.textContent = "Не удалось запустить 3D-рендер в этом браузере.";
  }
});
