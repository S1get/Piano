/**
 * Stage Concert Grand Piano Camera Controller for Koerner Hall
 *
 * Smoothly orbits, pans, and zooms around the 3D concert piano on stage with
 * inertial damping and curated studio presets, without any seating overhead.
 *
 * Coordinate Transform Invariant (Blender Z-up -> glTF/Three.js Y-up):
 *   x_three =  x_blender
 *   y_three =  z_blender
 *   z_three = -y_blender
 */

import * as THREE from "three";

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

// Curated Stage Piano Inspection Presets in piano local coordinates (lx, ly, lz)
// Transformed to Koerner Hall Three.js world space via (0.84 + lz, 0.96 + ly, 3.65 - lx)
export const PIANO_STAGE_PRESETS = {
  bentside: {
    key: "bentside",
    label: "Корпус",
    localPos: [1.72, 1.26, 1.06],
    localTarget: [-0.04, 0.78, -0.78],
    fov: 35.5,
  },
  pianist: {
    key: "pianist",
    label: "Клавиатура",
    localPos: [0.0, 1.18, 0.54],
    localTarget: [0.0, 0.75, -0.26],
    fov: 41.0,
  },
  harp: {
    key: "harp",
    label: "Дека",
    localPos: [1.08, 1.48, -0.34],
    localTarget: [-0.04, 0.83, -0.94],
    fov: 36.5,
  },
  action: {
    key: "action",
    label: "Механика",
    localPos: [0.62, 0.98, 0.48],
    localTarget: [0.05, 0.76, -0.14],
    fov: 31.5,
  },
  pedals: {
    key: "pedals",
    label: "Педали",
    localPos: [0.46, 0.38, 0.68],
    localTarget: [0.0, 0.24, -0.26],
    fov: 35.0,
  },
  hall_view: {
    key: "hall_view",
    label: "Сцена",
    localPos: [-0.88, 1.44, 1.62],
    localTarget: [0.72, 0.86, -0.72],
    fov: 43.0,
  },
};

const PRESET_ORDER = ["bentside", "pianist", "harp", "action", "pedals", "hall_view"];

function pianoLocalArrToWorld(arr, target = new THREE.Vector3()) {
  return target.set(0.84 + arr[2], 0.96 + arr[1], 3.65 - arr[0]);
}

export function blenderToThreeVec3(bx, by, bz, target = new THREE.Vector3()) {
  return target.set(bx, bz, -by);
}

export function threeToBlenderObj(vec3) {
  return { x: vec3.x, y: -vec3.z, z: vec3.y };
}

export function focalLengthToVerticalFov(focalMm, aspect = 1.6, matchBlenderAutoSensor = false) {
  if (matchBlenderAutoSensor) {
    const sensorWidth = 36.0;
    const effectiveHeight = aspect >= 1.0 ? sensorWidth / aspect : sensorWidth;
    return 2.0 * Math.atan(effectiveHeight / (2.0 * focalMm)) * RAD2DEG;
  }
  return 2.0 * Math.atan(24.0 / (2.0 * focalMm)) * RAD2DEG;
}

export function verticalFovToFocalLength(vfovDeg) {
  const halfRad = vfovDeg * DEG2RAD * 0.5;
  return 12.0 / Math.max(1e-4, Math.tan(halfRad));
}

export class KoernerCameraController {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.onPianoPresetChange = options.onPianoPresetChange || (() => {});
    this.onPoseTransition = options.onPoseTransition || null;
    this.onUserActivity = options.onUserActivity || (() => {});

    this.mode = "piano";
    this.activePianoPreset = "bentside";
    this._hasInitializedPose = false;

    // Smooth camera glide state (preset <-> preset)
    this._glideActive = false;
    this._glideElapsed = 0.0;
    this._glideDuration = 0.55;
    this._glideStartWallMs = 0;
    this._glideStartPos = new THREE.Vector3();
    this._glideEndPos = new THREE.Vector3();
    this._glideStartQuat = new THREE.Quaternion();
    this._glideEndQuat = new THREE.Quaternion();
    this._glideStartFov = 35.5;
    this._glideEndFov = 35.5;

    // Stage Piano damped spherical orbit & pan state
    this.pianoTarget = new THREE.Vector3(0.06, 1.74, 3.69);
    this.pianoTargetGoal = this.pianoTarget.clone();
    this.pianoRadius = 2.65;
    this.pianoRadiusGoal = 2.65;
    this.pianoTheta = 0.65;
    this.pianoThetaGoal = 0.65;
    this.pianoPhi = 1.32;
    this.pianoPhiGoal = 1.32;
    this.suppressPointerDrag = false;

    this.explicitFovOverrideDeg = null;

    // Pointer drag tracking
    this._pointerDown = false;
    this._pointerButton = 0;
    this._pointerId = null;
    this._downX = 0;
    this._downY = 0;
    this._lastX = 0;
    this._lastY = 0;
    this.wasDragGesture = false;

    this._vecTmp = new THREE.Vector3();
    this._rightTmp = new THREE.Vector3();
    this._upTmp = new THREE.Vector3();
    this._lookMatTmp = new THREE.Matrix4();

    this._bindEvents();
  }

  /**
   * Focus smoothly on any curated 3D piano angle.
   */
  focusPiano(presetKey = "bentside", { immediate = false } = {}) {
    const preset = PIANO_STAGE_PRESETS[presetKey] || PIANO_STAGE_PRESETS.bentside;
    this.mode = "piano";
    this.activePianoPreset = preset.key;

    const endPos = pianoLocalArrToWorld(preset.localPos);
    const endTarget = pianoLocalArrToWorld(preset.localTarget);

    this.pianoTarget.copy(endTarget);
    this.pianoTargetGoal.copy(endTarget);
    const offset = this._vecTmp.copy(endPos).sub(endTarget);
    const radius = Math.max(0.46, Math.min(30.0, offset.length() || 2.6));
    const phi = Math.acos(Math.max(-0.98, Math.min(0.98, offset.y / radius)));
    const theta = Math.atan2(offset.x, offset.z);

    this.pianoRadius = radius;
    this.pianoRadiusGoal = radius;
    this.pianoPhi = phi;
    this.pianoPhiGoal = phi;
    this.pianoTheta = theta;
    this.pianoThetaGoal = theta;

    this._lookMatTmp.lookAt(endPos, endTarget, new THREE.Vector3(0, 1, 0));
    const endQuat = new THREE.Quaternion().setFromRotationMatrix(this._lookMatTmp);
    const endFov = this.explicitFovOverrideDeg !== null ? this.explicitFovOverrideDeg : preset.fov;

    const isImmediate = Boolean(immediate || !this._hasInitializedPose);
    if (isImmediate) {
      this._hasInitializedPose = true;
      this._glideActive = false;
      this.camera.position.copy(endPos);
      this.camera.quaternion.copy(endQuat);
      this.camera.fov = endFov;
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld(true);
    } else {
      this._glideActive = true;
      this._glideElapsed = 0.0;
      this._glideStartWallMs = performance.now();
      const dist = this.camera.position.distanceTo(endPos);
      this._glideDuration = Math.min(0.82, Math.max(0.42, 0.36 + dist * 0.05));
      this._glideStartPos.copy(this.camera.position);
      this._glideEndPos.copy(endPos);
      this._glideStartQuat.copy(this.camera.quaternion);
      this._glideEndQuat.copy(endQuat);
      this._glideStartFov = this.camera.fov;
      this._glideEndFov = endFov;
    }

    if (this.onPoseTransition) {
      this.onPoseTransition({
        endPos,
        endQuat,
        activeSeat: null,
        immediate: isImmediate,
        durationSec: isImmediate ? 0.0 : Math.max(0.55, this._glideDuration * 1.1),
      });
    }

    this.onPianoPresetChange(this.activePianoPreset);
  }

  /**
   * Smoothly glide camera to an arbitrary world-space auditorium listening seat
   * (e.g., Parterre Left/Center/Right, Balcony Left/Right, Upper Balcony) looking at the grand piano.
   */
  focusWorldPose(worldPosArr, worldTargetArr, fov = 40.0, { immediate = false } = {}) {
    if (!Array.isArray(worldPosArr) || !Array.isArray(worldTargetArr)) return;
    this.mode = "seat";
    this.activePianoPreset = null;

    const endPos = new THREE.Vector3(worldPosArr[0], worldPosArr[1], worldPosArr[2]);
    const endTarget = new THREE.Vector3(worldTargetArr[0], worldTargetArr[1], worldTargetArr[2]);

    this.pianoTarget.copy(endTarget);
    this.pianoTargetGoal.copy(endTarget);
    const offset = this._vecTmp.copy(endPos).sub(endTarget);
    const radius = Math.max(0.46, Math.min(30.0, offset.length() || 6.0));
    const phi = Math.acos(Math.max(-0.98, Math.min(0.98, offset.y / radius)));
    const theta = Math.atan2(offset.x, offset.z);

    this.pianoRadius = radius;
    this.pianoRadiusGoal = radius;
    this.pianoPhi = phi;
    this.pianoPhiGoal = phi;
    this.pianoTheta = theta;
    this.pianoThetaGoal = theta;

    this._lookMatTmp.lookAt(endPos, endTarget, new THREE.Vector3(0, 1, 0));
    const endQuat = new THREE.Quaternion().setFromRotationMatrix(this._lookMatTmp);
    const endFov = this.explicitFovOverrideDeg !== null ? this.explicitFovOverrideDeg : fov;

    const isImmediate = Boolean(immediate || !this._hasInitializedPose);
    if (isImmediate) {
      this._hasInitializedPose = true;
      this._glideActive = false;
      this.camera.position.copy(endPos);
      this.camera.quaternion.copy(endQuat);
      this.camera.fov = endFov;
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld(true);
    } else {
      this._glideActive = true;
      this._glideElapsed = 0.0;
      this._glideStartWallMs = performance.now();
      const dist = this.camera.position.distanceTo(endPos);
      this._glideDuration = Math.min(1.05, Math.max(0.50, 0.42 + dist * 0.032));
      this._glideStartPos.copy(this.camera.position);
      this._glideEndPos.copy(endPos);
      this._glideStartQuat.copy(this.camera.quaternion);
      this._glideEndQuat.copy(endQuat);
      this._glideStartFov = this.camera.fov;
      this._glideEndFov = endFov;
    }

    if (this.onPoseTransition) {
      this.onPoseTransition({
        endPos,
        endQuat,
        activeSeat: true,
        immediate: isImmediate,
        durationSec: isImmediate ? 0.0 : Math.max(0.55, this._glideDuration * 1.1),
      });
    }

    this.onPianoPresetChange(null);
  }

  applyExplicitFovDeg(vfovDeg) {
    this.explicitFovOverrideDeg = Number(vfovDeg);
    this.camera.fov = this.explicitFovOverrideDeg;
    this.camera.updateProjectionMatrix();
  }

  get isGliding() {
    return this._glideActive;
  }

  update(dt) {
    const clampedDt = Math.min(0.05, Math.max(0.0, dt));

    if (this._glideActive) {
      this._glideElapsed = Math.max(
        0.0,
        (performance.now() - (this._glideStartWallMs || performance.now())) * 0.001
      );
      const rawT = Math.min(1.0, this._glideElapsed / this._glideDuration);
      const ease = 1.0 - Math.pow(1.0 - rawT, 4);
      this.camera.position.lerpVectors(this._glideStartPos, this._glideEndPos, ease);
      this.camera.quaternion.slerpQuaternions(this._glideStartQuat, this._glideEndQuat, ease);
      const nextFov = this._glideStartFov + (this._glideEndFov - this._glideStartFov) * ease;
      if (Math.abs(nextFov - this.camera.fov) > 1e-4) {
        this.camera.fov = nextFov;
        this.camera.updateProjectionMatrix();
      }
      if (rawT >= 1.0) {
        this._glideActive = false;
      }
      return;
    }

    // Smooth exponential damping for buttery orbit, zoom, and pan around the piano
    const damp = clampedDt > 0 ? 1.0 - Math.exp(-13.0 * clampedDt) : 1.0;
    this.pianoTheta += (this.pianoThetaGoal - this.pianoTheta) * damp;
    this.pianoPhi += (this.pianoPhiGoal - this.pianoPhi) * damp;
    this.pianoRadius += (this.pianoRadiusGoal - this.pianoRadius) * damp;
    this.pianoTarget.lerp(this.pianoTargetGoal, damp);

    const sinP = Math.sin(this.pianoPhi);
    let px = this.pianoTarget.x + this.pianoRadius * sinP * Math.sin(this.pianoTheta);
    let py = this.pianoTarget.y + this.pianoRadius * Math.cos(this.pianoPhi);
    let pz = this.pianoTarget.z + this.pianoRadius * sinP * Math.cos(this.pianoTheta);

    // Keep camera inside Koerner Hall walls & above stage deck
    px = Math.max(-9.8, Math.min(9.8, px));
    pz = Math.max(-24.0, Math.min(12.2, pz));
    const minFloorY = pz > 0.2 ? 1.12 : 0.48;
    if (py < minFloorY) py = minFloorY;

    this.camera.position.set(px, py, pz);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.pianoTarget);
  }

  _bindEvents() {
    this.domElement.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    this.domElement.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      this._pointerDown = true;
      this._pointerButton = e.button;
      this._pointerId = e.pointerId;
      this._downX = e.clientX;
      this._downY = e.clientY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this.wasDragGesture = false;
      this.domElement.classList.add("dragging");
      try {
        this.domElement.setPointerCapture(e.pointerId);
      } catch (_) {}
      this.onUserActivity();
    });

    this.domElement.addEventListener("pointermove", (e) => {
      this.onUserActivity();
      if (!this._pointerDown || e.pointerId !== this._pointerId) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;

      if (Math.hypot(e.clientX - this._downX, e.clientY - this._downY) > 4.5) {
        this.wasDragGesture = true;
      }

      if (this.suppressPointerDrag) return;

      this._glideActive = false;
      if (this._pointerButton === 2 || e.shiftKey) {
        const panScale = Math.max(0.0008, this.pianoRadiusGoal * 0.0011);
        this._rightTmp.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
        this._upTmp.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
        this.pianoTargetGoal.addScaledVector(this._rightTmp, -dx * panScale);
        this.pianoTargetGoal.addScaledVector(this._upTmp, dy * panScale);
        this.pianoTargetGoal.x = Math.max(-2.2, Math.min(2.2, this.pianoTargetGoal.x));
        this.pianoTargetGoal.y = Math.max(1.10, Math.min(2.60, this.pianoTargetGoal.y));
        this.pianoTargetGoal.z = Math.max(2.10, Math.min(5.10, this.pianoTargetGoal.z));
      } else {
        this.pianoThetaGoal -= dx * 0.0056;
        this.pianoPhiGoal = Math.max(0.14, Math.min(Math.PI * 0.64, this.pianoPhiGoal - dy * 0.0052));
      }
    });

    const endDrag = (e) => {
      if (this._pointerDown && e.pointerId === this._pointerId) {
        this._pointerDown = false;
        this._pointerId = null;
        this.suppressPointerDrag = false;
        this.domElement.classList.remove("dragging");
        try {
          this.domElement.releasePointerCapture(e.pointerId);
        } catch (_) {}
      }
    };
    this.domElement.addEventListener("pointerup", endDrag);
    this.domElement.addEventListener("pointercancel", endDrag);

    this.domElement.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.onUserActivity();
        this._glideActive = false;
        this.pianoRadiusGoal = Math.max(
          0.46,
          Math.min(30.0, this.pianoRadiusGoal + e.deltaY * 0.0036)
        );
      },
      { passive: false }
    );

    window.addEventListener("keydown", (e) => {
      if (
        e.target &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.tagName === "SELECT")
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.code === "KeyP") {
        this.focusPiano("bentside", { immediate: false });
        this.onUserActivity();
      } else if (/^Digit[1-6]$/.test(e.code)) {
        const idx = Number(e.code.slice(-1)) - 1;
        if (PRESET_ORDER[idx]) {
          this.focusPiano(PRESET_ORDER[idx], { immediate: false });
          this.onUserActivity();
        }
      }
    });
  }
}
