/**
 * Koerner Hall (RCM / KPMB / Sound Space Vision) — Real-Time 3D Room Acoustics Engine
 * & Synchronized 1780 Stein-Schule Historical Fortepiano Performance Controller.
 *
 * Models 6 physical seat- & orientation-dependent acoustic phenomena in Three.js Y-up space:
 *   1. Direct-Sound Inverse-Distance Law (0.9 m stage nearfield -> 28.5 m Upper Balcony)
 *   2. 1780 Fortepiano 48.5° Open Walnut Deckel Lid Directivity (+1.3 dB toward Orchestra/Balconies
 *      vs -5.2 dB solid walnut lid high-frequency shadow in the Choir Loft behind the spine)
 *   3. Architectural Under-Balcony Soffit Overhang Shadow (Rear Orchestra Rows P-U & Rear Lower Balcony)
 *   4. ISO 9613-1 Distance Air Absorption + Compact 2.10 m Spruce Soundboard Stereo Subtense (Mid/Side)
 *   5. Head-Tracked Binaural Azimuth Pan + Contralateral Head-Shadow ILD Shelving
 *   6. Zero-Doppler 4-Bank Silent-Latch Early Reflections (Left Wall, Right Wall, Baillie Oak Veil,
 *      Rear Balcony Fascia) + True Stereo 1.96s RT60 Koerner Hall Diffuse Impulse Convolver.
 */

import * as THREE from "three";
import { HISTORICAL_REPERTOIRE } from "./fortepiano_repertoire_data.js";
import {
  CONCERT_GRAND_MIN_MIDI,
  CONCERT_GRAND_MAX_MIDI,
  foldMidiIntoFortepianoCompass,
} from "./fortepiano_stage_rig.js";
import { DEFAULT_PIANO_MODEL_ID, getPianoModel } from "./piano_models.js";
import {
  DEFAULT_HALL_ID,
  DEFAULT_ZONE_ID,
  getConcertHall,
  getListeningZone,
} from "./concert_halls.js";
import {
  hasRealMidiScore,
  loadRealMidiScoreAsync,
  unpackRealMidiScore,
} from "./classical_midi_scores.js";
import {
  DEFAULT_PIECE_VERSION_ID,
  applyVersionToScore,
  getAlternateScoreIdForVersion,
} from "./piece_versions.js";

const SPEED_OF_SOUND = 343.0; // m/s at 20 °C
const HEAD_RADIUS_M = 0.0875;
const SAMPLE_MIDIS = [24, 36, 43, 48, 52, 55, 60, 63, 67, 72, 76, 79, 84, 88, 91, 96];
const SAMPLE_CACHE_NAME = "koerner-piano-samples-v3";

// 1. Salamander Yamaha C5 Concert Grand (30 studio zones, 16s natural decay — Tone.js CDN)
const SALAMANDER_ZONES = [
  [21, "A0.mp3"], [24, "C1.mp3"], [27, "Ds1.mp3"], [30, "Fs1.mp3"], [33, "A1.mp3"],
  [36, "C2.mp3"], [39, "Ds2.mp3"], [42, "Fs2.mp3"], [45, "A2.mp3"], [48, "C3.mp3"],
  [51, "Ds3.mp3"], [54, "Fs3.mp3"], [57, "A3.mp3"], [60, "C4.mp3"], [63, "Ds4.mp3"],
  [66, "Fs4.mp3"], [69, "A4.mp3"], [72, "C5.mp3"], [75, "Ds5.mp3"], [78, "Fs5.mp3"],
  [81, "A5.mp3"], [84, "C6.mp3"], [87, "Ds6.mp3"], [90, "Fs6.mp3"], [93, "A6.mp3"],
  [96, "C7.mp3"], [99, "Ds7.mp3"], [102, "Fs7.mp3"], [105, "A7.mp3"], [108, "C8.mp3"],
];

// 2. Public-Domain Akai Steinway Concert Grand ("Splendid Grand Piano" — 2 real velocity layers: PP + MF)
const SPLENDID_MF_ZONES = [
  [23, "Mf B-1.m4a"], [27, "Mf D#0.m4a"], [31, "Mf G0.m4a"], [35, "Mf B0.m4a"],
  [40, "MF E1.m4a"], [45, "MF A1.m4a"], [50, "MF D2.m4a"], [55, "MF G2.m4a"],
  [59, "MF B2.m4a"], [64, "MF E3.m4a"], [69, "MF A3.m4a"], [74, "Mf D4.m4a"],
  [79, "Mf G4.m4a"], [83, "Mf B4.m4a"], [87, "Mf D#5.m4a"], [91, "Mf G5.m4a"],
  [95, "Mf B5.m4a"], [99, "Mf D#6.m4a"], [103, "Mf G6.m4a"], [107, "Mf B6.m4a"],
  [108, "Mf C7.m4a"],
];
const SPLENDID_PP_ZONES = [
  [23, "PP B-1.m4a"], [27, "PP D#0.m4a"], [31, "PP G0.m4a"], [35, "PP B0.m4a"],
  [40, "PP E1.m4a"], [45, "PP A1.m4a"], [50, "PP D2.m4a"], [55, "PP G2.m4a"],
  [59, "PP B2.m4a"], [64, "PP E3.m4a"], [69, "PP A3.m4a"], [74, "PP D4.m4a"],
  [79, "PP G4.m4a"], [83, "PP B4.m4a"], [87, "PP D#5.m4a"], [91, "PP G5.m4a"],
  [95, "PP B5.m4a"], [99, "PP D#6.m4a"], [103, "PP G6.m4a"], [107, "PP B6.m4a"],
  [108, "PP C7.m4a"],
];

// 3. VCSL Close-Miked Steinway Model B Concert Grand (2 real velocity layers: vl2 soft + vl4 forte, 28s sustain)
const STEINWAY_B_LOUD_ZONES = [
  [22, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_A#0_vl4_rr1.m4a"],
  [26, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_D1_vl4_rr1.m4a"],
  [30, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_F#1_vl4_rr1.m4a"],
  [34, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_A#1_vl4_rr1.m4a"],
  [38, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_D2_vl4_rr1.m4a"],
  [42, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_F#2_vl4_rr1.m4a"],
  [46, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_A#2_vl4_rr1.m4a"],
  [50, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_D3_vl4_rr1.m4a"],
  [54, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_F#3_vl4_rr1.m4a"],
  [58, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_A#3_vl4_rr1.m4a"],
  [62, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_D4_vl4_rr1.m4a"],
  [66, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_F#4_vl4_rr1.m4a"],
  [70, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_A#4_vl4_rr1.m4a"],
  [74, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_D5_vl4_rr1.m4a"],
  [78, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_F#5_vl4_rr1.m4a"],
  [82, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_A#5_vl4_rr1.m4a"],
  [86, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_D6_vl4_rr1.m4a"],
  [90, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_F#6_vl4_rr1.m4a"],
  [94, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_A#6_vl4_rr1.m4a"],
  [98, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_D7_vl4_rr1.m4a"],
  [102, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_F#7_vl4_rr1.m4a"],
  [104, "Grand Piano, Steinway B/Sus/JHPiano_Sus_Close_G#7_vl4_rr1.m4a"],
];
const STEINWAY_B_SOFT_ZONES = STEINWAY_B_LOUD_ZONES.map(([m, p]) => [m, p.replace("_vl4_", "_vl2_")]);

// 4. VCSL Real Kawai Concert Grand (Player mic, 2 real velocity layers: v3 mezzo + v4 forte, 27s sustain)
const KAWAI_LOUD_ZONES = [
  [22, "Grand Piano, Kawai/Sustains/GPiano_sus_A#-1_v4_rr1_Player.m4a"],
  [27, "Grand Piano, Kawai/Sustains/GPiano_sus_D#0_v4_rr1_Player.m4a"],
  [33, "Grand Piano, Kawai/Sustains/GPiano_sus_A0_v4_rr1_Player.m4a"],
  [39, "Grand Piano, Kawai/Sustains/GPiano_sus_D#1_v4_rr1_Player.m4a"],
  [45, "Grand Piano, Kawai/Sustains/GPiano_sus_A1_v4_rr1_Player.m4a"],
  [50, "Grand Piano, Kawai/Sustains/GPiano_sus_D2_v4_rr1_Player.m4a"],
  [54, "Grand Piano, Kawai/Sustains/GPiano_sus_F#2_v4_rr1_Player.m4a"],
  [58, "Grand Piano, Kawai/Sustains/GPiano_sus_A#2_v4_rr1_Player.m4a"],
  [62, "Grand Piano, Kawai/Sustains/GPiano_sus_D3_v4_rr1_Player.m4a"],
  [66, "Grand Piano, Kawai/Sustains/GPiano_sus_F#3_v4_rr1_Player.m4a"],
  [70, "Grand Piano, Kawai/Sustains/GPiano_sus_A#3_v4_rr1_Player.m4a"],
  [74, "Grand Piano, Kawai/Sustains/GPiano_sus_D4_v4_rr1_Player.m4a"],
  [78, "Grand Piano, Kawai/Sustains/GPiano_sus_F#4_v4_rr1_Player.m4a"],
  [84, "Grand Piano, Kawai/Sustains/GPiano_sus_C5_v4_rr1_Player.m4a"],
  [90, "Grand Piano, Kawai/Sustains/GPiano_sus_F#5_v4_rr1_Player.m4a"],
  [96, "Grand Piano, Kawai/Sustains/GPiano_sus_C6_v4_rr1_Player.m4a"],
  [102, "Grand Piano, Kawai/Sustains/GPiano_sus_F#6_v4_rr1_Player.m4a"],
  [108, "Grand Piano, Kawai/Sustains/GPiano_sus_C7_v4_rr1_Player.m4a"],
];
const KAWAI_SOFT_ZONES = KAWAI_LOUD_ZONES.map(([m, p]) => [m, p.replace("_v4_", "_v3_")]);

// 5. VCSL Real Knight British Upright Piano (Player mic, warm intimate felt/wood upright, vl1 + vl2)
const KNIGHT_LOUD_ZONES = [
  [21, "Upright Piano, Knight/Sustains/Player_vl2_rr1_A-1.m4a"],
  [25, "Upright Piano, Knight/Sustains/Player_vl2_rr1_C#0.m4a"],
  [29, "Upright Piano, Knight/Sustains/Player_vl2_rr1_F0.m4a"],
  [33, "Upright Piano, Knight/Sustains/Player_vl2_rr1_A0.m4a"],
  [37, "Upright Piano, Knight/Sustains/Player_vl2_rr1_C#1.m4a"],
  [41, "Upright Piano, Knight/Sustains/Player_vl2_rr1_F1.m4a"],
  [45, "Upright Piano, Knight/Sustains/Player_vl2_rr1_A1.m4a"],
  [49, "Upright Piano, Knight/Sustains/Player_vl2_rr1_C#2.m4a"],
  [53, "Upright Piano, Knight/Sustains/Player_vl2_rr1_F2.m4a"],
  [57, "Upright Piano, Knight/Sustains/Player_vl2_rr1_A2.m4a"],
  [61, "Upright Piano, Knight/Sustains/Player_vl2_rr1_C#3.m4a"],
  [65, "Upright Piano, Knight/Sustains/Player_vl2_rr1_F3.m4a"],
  [69, "Upright Piano, Knight/Sustains/Player_vl2_rr1_A3.m4a"],
  [73, "Upright Piano, Knight/Sustains/Player_vl2_rr1_C#4.m4a"],
  [77, "Upright Piano, Knight/Sustains/Player_vl2_rr1_F4.m4a"],
  [81, "Upright Piano, Knight/Sustains/Player_vl2_rr1_A4.m4a"],
  [85, "Upright Piano, Knight/Sustains/Player_vl2_rr1_C#5.m4a"],
  [89, "Upright Piano, Knight/Sustains/Player_vl2_rr1_F5.m4a"],
  [93, "Upright Piano, Knight/Sustains/Player_vl2_rr1_A5.m4a"],
  [97, "Upright Piano, Knight/Sustains/Player_vl2_rr1_C#6.m4a"],
  [101, "Upright Piano, Knight/Sustains/Player_vl2_rr1_F6.m4a"],
  [105, "Upright Piano, Knight/Sustains/Player_vl2_rr1_A6.m4a"],
  [108, "Upright Piano, Knight/Sustains/Player_vl2_rr1_C7.m4a"],
];
const KNIGHT_SOFT_ZONES = KNIGHT_LOUD_ZONES.map(([m, p]) => [m, p.replace("_vl2_", "_vl1_")]);

// 6. VCSL Real 17th-Century Flemish (Antwerp Ruckers) Harpsichord (8' stop, F#1..C6 compass)
const FLEMISH_HARPSI_ZONES = [
  [30, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_F#0_rr1.m4a"],
  [34, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_A#0_rr1.m4a"],
  [38, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_D1_rr1.m4a"],
  [42, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_F#1_rr1.m4a"],
  [46, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_A#1_rr1.m4a"],
  [50, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_D2_rr1.m4a"],
  [54, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_F#2_rr1.m4a"],
  [58, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_A#2_rr1.m4a"],
  [62, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_D3_rr1.m4a"],
  [66, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_F#3_rr1.m4a"],
  [70, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_A#3_rr1.m4a"],
  [74, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_D4_rr1.m4a"],
  [78, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_F#4_rr1.m4a"],
  [82, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_A#4_rr1.m4a"],
  [84, "Harpsichord, Flemish/Sustains/Low/HarpsiRH_Low_Far_C5_rr1.m4a"],
];

// 7. FreePats Vintage Acoustic Saloon Piano FB (CC0 authentic aged acoustic upright)
const OLD_PIANO_ZONES = [
  [21, "samples/A0.m4a"], [24, "samples/C1.m4a"], [27, "samples/D#1.m4a"], [30, "samples/F#1.m4a"],
  [33, "samples/A1.m4a"], [36, "samples/C2.m4a"], [39, "samples/D#2.m4a"], [44, "samples/G#2.m4a"],
  [47, "samples/B2.m4a"], [50, "samples/D3.m4a"], [53, "samples/F3.m4a"], [56, "samples/G#3.m4a"],
  [59, "samples/B3.m4a"], [62, "samples/D4.m4a"], [65, "samples/F4.m4a"], [68, "samples/G#4.m4a"],
  [71, "samples/B4.m4a"], [74, "samples/D5.m4a"], [77, "samples/F5.m4a"], [80, "samples/G#5.m4a"],
  [83, "samples/B5.m4a"], [86, "samples/D6.m4a"], [89, "samples/F6.m4a"], [92, "samples/G#6.m4a"],
  [95, "samples/B6.m4a"], [98, "samples/D7.m4a"], [101, "samples/F7.m4a"], [104, "samples/G#7.m4a"],
  [107, "samples/B7.m4a"],
];

function encodeSampleUrl(baseUrl, relPath) {
  return baseUrl + relPath.split("/").map(encodeURIComponent).join("/");
}

// Per-bank uniform loudness calibration measured via ffmpeg RMS (preserves natural per-key & velocity dynamics!)
const REMOTE_SAMPLE_BANKS = {
  splendid_steinway: {
    baseUrl: "https://smpldsnds.github.io/sfzinstruments-splendid-grand-piano/samples/",
    zones: SPLENDID_MF_ZONES,
    softZones: SPLENDID_PP_ZONES,
    gainTrim: 0.62,
    softGainTrim: 0.66,
  },
  vcsl_steinway_b: {
    baseUrl: "https://smpldsnds.github.io/sgossner-vcsl/Chordophones/Zithers/",
    zones: STEINWAY_B_LOUD_ZONES,
    softZones: STEINWAY_B_SOFT_ZONES,
    gainTrim: 0.84,
    softGainTrim: 0.88,
  },
  salamander: {
    baseUrl: "https://tonejs.github.io/audio/salamander/",
    zones: SALAMANDER_ZONES,
    gainTrim: 1.50,
  },
  vcsl_kawai: {
    baseUrl: "https://smpldsnds.github.io/sgossner-vcsl/Chordophones/Zithers/",
    zones: KAWAI_LOUD_ZONES,
    softZones: KAWAI_SOFT_ZONES,
    gainTrim: 3.15,
    softGainTrim: 4.35,
  },
  vcsl_knight_upright: {
    baseUrl: "https://smpldsnds.github.io/sgossner-vcsl/Chordophones/Zithers/",
    zones: KNIGHT_LOUD_ZONES,
    softZones: KNIGHT_SOFT_ZONES,
    gainTrim: 2.10,
    softGainTrim: 4.20,
  },
  vcsl_flemish_harpsichord: {
    baseUrl: "https://smpldsnds.github.io/sgossner-vcsl/Chordophones/Zithers/",
    zones: FLEMISH_HARPSI_ZONES,
    compassMin: 30,
    compassMax: 84,
    gainTrim: 2.85,
  },
  freepats_old_piano: {
    baseUrl: "https://smpldsnds.github.io/freepats-old-piano-fb/",
    zones: OLD_PIANO_ZONES,
    gainTrim: 0.68,
  },
};

// 1780 Stein-Schule Fortepiano acoustic radiation center in Koerner Hall Three.js world space:
// Anchor at (0.84, 0.96, 3.65), rotY = +PI/2 -> Haselfichte spruce soundboard centroid at (-0.08, 1.78, 3.65)
export const PIANO_ACOUSTIC_SOURCE = new THREE.Vector3(-0.08, 1.78, 3.65);

// 48.5° Open walnut Deckel lid primary specular projection axis (hinged on upstage spine z=+4.13, opening toward -Z house)
const LID_PROJECTION_AXIS = new THREE.Vector3(0.06, 0.22, -0.974).normalize();

// 1st-order Koerner Hall shoebox boundary planes for image-source early reflections:
const IMAGE_SOURCES = {
  leftWall: new THREE.Vector3(-21.6 - PIANO_ACOUSTIC_SOURCE.x, PIANO_ACOUSTIC_SOURCE.y, PIANO_ACOUSTIC_SOURCE.z),
  rightWall: new THREE.Vector3(21.6 - PIANO_ACOUSTIC_SOURCE.x, PIANO_ACOUSTIC_SOURCE.y, PIANO_ACOUSTIC_SOURCE.z),
  oakVeil: new THREE.Vector3(PIANO_ACOUSTIC_SOURCE.x, 21.2 - PIANO_ACOUSTIC_SOURCE.y, PIANO_ACOUSTIC_SOURCE.z),
  rearFascia: new THREE.Vector3(PIANO_ACOUSTIC_SOURCE.x, PIANO_ACOUSTIC_SOURCE.y + 1.2, -45.2 - PIANO_ACOUSTIC_SOURCE.z),
};

const PIECE_SHORT_LABELS = {
  alberti_op1_no5_fortepiano_cc_by4: "Alberti Op. 1/5 \u00B7 18th-c. Fortepiano (CC BY) \u25BE",
  dittersdorf_sonata_a_mvt1_walter1790: "Dittersdorf I. Allegro \u00B7 Walter 1790 (CC BY-SA) \u25BE",
  dittersdorf_sonata_a_mvt2_walter1790: "Dittersdorf II. Andante \u00B7 Walter 1790 (CC BY-SA) \u25BE",
  dittersdorf_sonata_a_mvt3_walter1790: "Dittersdorf III. Finale \u00B7 Walter 1790 (CC BY-SA) \u25BE",
  dittersdorf_hocus_pocus_ouverture_walter1790: "Dittersdorf Ouverture \u00B7 Walter 1790 (CC BY-SA) \u25BE",
  beethoven_fur_elise_woo59: "К Элизе · Бетховен ▾",
  beethoven_moonlight_sonata_op27_no2: "Лунная соната (I ч.) · Бетховен ▾",
  beethoven_moonlight_mvt3_presto: "Лунная соната (III ч. Presto) · Бетховен ▾",
  chopin_nocturne_op9_no2: "Ноктюрн Op. 9 № 2 · Шопен ▾",
  chopin_fantaisie_impromptu_op66: "Фантазия-экспромт Op. 66 · Шопен ▾",
  liszt_la_campanella_s141_no3: "La Campanella · Лист ▾",
  liszt_liebestraum_no3_s541: "Грёзы любви № 3 · Лист ▾",
  chopin_winter_wind_op25_no11: "Зимний ветер · Шопен ▾",
  mozart_fantasia_d_minor_k397: "Фантазия ре минор · Моцарт ▾",
  bach_prelude_c_major_bwv846: "Прелюдия до мажор · Бах ▾",
  debussy_clair_de_lune: "Clair de Lune · Дебюсси ▾",
  rachmaninoff_prelude_c_sharp_minor_op3_no2: "Прелюдия cis-moll · Рахманинов ▾",
  rachmaninoff_prelude_g_minor_op23_no5: "Прелюдия соль минор Op. 23 № 5 · Рахманинов ▾",
  tchaikovsky_june_barcarolle_op37a_no6: "Июнь. Баркарола · Чайковский ▾",
  satie_gymnopedie_no1: "Гимнопедия № 1 · Сати ▾",
  mozart_rondo_alla_turca_k331: "Турецкий марш · Моцарт ▾",
  chopin_waltz_c_sharp_minor_op64_no2: "Вальс Op. 64 № 2 · Шопен ▾",
  schumann_traumerei_op15_no7: "Грёзы (Träumerei) · Шуман ▾",
  chopin_prelude_e_minor_op28_no4: "Прелюдия № 4 ми минор · Шопен ▾",
  debussy_fille_aux_cheveux_de_lin: "Девушка с волосами цвета льна · Дебюсси ▾",
  liszt_consolation_no3_s172: "Утешение № 3 · Лист ▾",
  bach_air_on_g_string_bwv1068: "Ария (Air) · Бах ▾",
  mozart_sonata_11_k331_mvt1: "Соната № 11 (ч. I) · Моцарт ▾",
  beethoven_pathetique_mvt2: "Патетическая соната (ч. II) · Бетховен ▾",
  chopin_ballade_no1_op23: "Баллада № 1 соль минор · Шопен ▾",
  chopin_raindrop_prelude_op28_no15: "Прелюдия «Капли дождя» · Шопен ▾",
  chopin_heroic_polonaise_op53: "Героический полонез Op. 53 · Шопен ▾",
  liszt_hungarian_rhapsody_no2: "Венгерская рапсодия № 2 · Лист ▾",
  schubert_impromptu_op90_no3: "Экспромт Op. 90 № 3 · Шуберт ▾",
  schubert_moment_musical_no3: "Музыкальный момент № 3 · Шуберт ▾",
  brahms_intermezzo_op117_no1: "Интермеццо Op. 117 № 1 · Брамс ▾",
  grieg_wedding_day_at_troldhaugen: "Свадебный день в Трольхаугене · Григ ▾",
  grieg_march_of_the_dwarfs: "Шествие гномов · Григ ▾",
  mendelssohn_venetian_boat_song: "Венецианская гондольера · Мендельсон ▾",
  mussorgsky_promenade_pictures: "Картинки с выставки · Мусоргский ▾",
  tchaikovsky_october_autumn_song: "Октябрь. Осенняя песнь · Чайковский ▾",
  sakamoto_drowning_love_chasing_kou: "Drowning Love · Сакамото ▾",
  silo_meaningful_love: "Meaningful Love · Неоклассика ▾",
  madk1d_dinastiya: "Династия · madk1d ▾",
  anime_tokyo_ghoul_unravel: "Токийский гуль: Unravel · Animenz ▾",
  anime_demon_slayer_gurenge: "Клинок: Gurenge · Animenz ▾",
  anime_aot_vogel_im_kafig: "Атака титанов: Vogel im Käfig ▾",
  anime_howls_merry_go_round: "Ходячий замок: Карусель жизни ▾",
  anime_evangelion_cruel_angel: "Евангелион: Cruel Angel's Thesis ▾",
  anime_naruto_blue_bird: "Наруто: Blue Bird · OP3 ▾",
  anime_your_lie_hikaru_nara: "Твоя апрельская ложь: Hikaru Nara ▾",
  anime_sao_crossing_field: "SAO: Crossing Field · Animenz ▾",
  anime_oshi_no_ko_idol: "Звёздное дитя: Idol · YOASOBI ▾",
  anime_chainsaw_man_kick_back: "Человек-бензопила: KICK BACK ▾",
};

export function getShortPieceLabel(piece) {
  if (!piece) return "Alberti Op. 1/5 \u00B7 18th-c. Fortepiano (CC BY)";
  return PIECE_SHORT_LABELS[piece.id] || piece.title || "Fortepiano";
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function formatClock(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export class KoernerHallAcousticsEngine {
  constructor() {
    this.ctx = null;
    this.graphReady = false;
    this.sourceBus = null;
    this.mediaElementSource = null;
    this.boundAudioEl = null;

    // Interactive & Repertoire Multi-Bank Grand Piano Voicing Engine
    this.pianoModelId = DEFAULT_PIANO_MODEL_ID;
    this.pianoAudioProfile = getPianoModel(DEFAULT_PIANO_MODEL_ID).audio;
    this.sampleBuffers = new Map(); // Local 1830 Kremsegg Pleyel recordings
    this.samplesLoadingPromise = null;
    this.sampleBankBuffers = new Map(); // bankId -> Map<midi, AudioBuffer> (main / forte layer)
    this.sampleBankSoftBuffers = new Map(); // bankId -> Map<midi, AudioBuffer> (optional soft velocity layer)
    this.sampleBankPromises = new Map(); // bankId -> Promise
    this.sampleBankMidPromises = new Map(); // bankId -> Promise (mid register ready)
    this._rawByteCache = new Map(); // url -> ArrayBuffer (prefetched before AudioContext exists)
    this._damperNoiseBuf = null;
    this._lastFeltThumpMs = 0;
    this._lastDamperNoiseMs = 0;
    this.concertPitchHz = this.pianoAudioProfile.a4Hz || 440.0;
    this.moderator = false;
    this.damperSustain = false; // Auto repertoire damper pedal
    this.manualSustain = false; // User manual sustain pedal (Shift / HUD / 3D pedal)
    this.unaCordaActive = false; // Soft pedal (left pedal)
    this.fazioliSoftActive = false; // Fazioli F308 4th pedal (vertical hammer-travel soft pedal)
    this.lidOpenness = 1.0; // 0 = closed, 0.5 = half, 1.0 = full open
    this.hallId = DEFAULT_HALL_ID;
    this.hallProfile = getConcertHall(DEFAULT_HALL_ID);
    this.zoneId = DEFAULT_ZONE_ID;
    this.zoneProfile = getListeningZone(DEFAULT_ZONE_ID);
    this._hallIrCache = new Map();
    this.keysDown = new Set();
    this.activeVoices = new Map();
    this.repertoireKeysDown = new Set();
    this.repertoireVoices = [];
    this.isMobileProfile = false;

    // Scratch vectors for spatial evaluation
    this._toSource = new THREE.Vector3();
    this._camFwd = new THREE.Vector3();
    this._camRight = new THREE.Vector3();
    this._camUp = new THREE.Vector3();
    this._imgVec = new THREE.Vector3();

    // Analytical AudioParam knot trackers & silent-latch ER bank crossfade state
    // Guarantees DelayNode.delayTime is NEVER modulated while audible (zero Doppler / record-scratch!)
    this._paramKnots = new Map();
    this.erBanks = [];
    this._activeErBankIdx = 0;
    this._erAnchorPos = new THREE.Vector3(0.0, 1.55, -9.2);
    this._lastErCrossfadeTime = -10.0;
    this._glideTargetPos = new THREE.Vector3(0.0, 1.55, -9.2);
    this._glideTargetQuat = new THREE.Quaternion();
    this._glideWallEndMs = 0.0;

    this.lastMetrics = this.computeMetrics(
      new THREE.Vector3(0.0, 1.55, -9.2),
      new THREE.Quaternion(),
      null
    );
  }

  /**
   * Deterministically computes full Koerner Hall room-acoustic parameters for any 3D listener pose.
   */
  computeMetrics(listenerPos, listenerQuat, activeSeat = null) {
    this._toSource.copy(PIANO_ACOUSTIC_SOURCE).sub(listenerPos);
    const rawDist = this._toSource.length();
    const d = Math.max(0.80, rawDist);
    const dirToPiano = this._toSource.clone().divideScalar(Math.max(1e-5, rawDist));

    this._camFwd.set(0, 0, -1).applyQuaternion(listenerQuat).normalize();
    this._camRight.set(1, 0, 0).applyQuaternion(listenerQuat).normalize();
    this._camUp.set(0, 1, 0).applyQuaternion(listenerQuat).normalize();

    const rightDot = clamp(dirToPiano.dot(this._camRight), -1.0, 1.0);
    const fwdDot = clamp(dirToPiano.dot(this._camFwd), -1.0, 1.0);
    const azimuthRad = Math.atan2(rightDot, fwdDot);

    // 1. Direct-sound inverse-distance pressure gain (normalized cleanly to prevent nearfield clipping)
    const dRef = 13.5;
    const directGain = clamp(Math.pow(dRef / Math.max(1.35, d), 0.44), 0.45, 1.22);

    // 2. 1780 Fortepiano 48.5° open walnut Deckel lid radiation directivity
    const radDirX = -dirToPiano.x;
    const radDirY = -dirToPiano.y;
    const radDirZ = -dirToPiano.z;
    const lidAlign =
      radDirX * LID_PROJECTION_AXIS.x +
      radDirY * LID_PROJECTION_AXIS.y +
      radDirZ * LID_PROJECTION_AXIS.z;

    // Behind upstage straight walnut spine (z > +4.18m) the raised walnut lid shadows >1.8 kHz direct radiation
    let lidShadowFactor = 0.0;
    if (listenerPos.z > 4.18) {
      lidShadowFactor = clamp((listenerPos.z - 4.18) / 5.0, 0.0, 1.0);
    }
    let hfLidDb = 0.0;
    if (d < 2.8 && listenerPos.x > 0.55) {
      // Klaviatur nearfield: crisp Hirschleder buckskin hammer & bichord brass/iron immediacy
      hfLidDb = 1.75;
    } else if (lidShadowFactor > 0.01) {
      hfLidDb = -5.2 * lidShadowFactor + 0.45 * (1.0 - lidShadowFactor);
    } else {
      // Specular 48.5° walnut lid lobe toward Orchestra & Balconies
      hfLidDb = clamp(lidAlign * 1.50, -1.6, 1.40);
    }

    // 3. Architectural Under-Balcony Soffit Overhang Shadow
    let overhang = 0.0;
    if (listenerPos.y < 3.92 && listenerPos.z < -16.5) {
      overhang = clamp((-listenerPos.z - 16.5) / 5.6, 0.0, 1.0);
    } else if (listenerPos.y >= 3.92 && listenerPos.y < 7.95 && listenerPos.z < -18.8) {
      overhang = clamp((-listenerPos.z - 18.8) / 4.4, 0.0, 0.72);
    }

    // 4. Atmospheric Air Absorption (ISO 9613-1) + Overhang Grazing HF Roll-off
    const airCutoffHz = Math.round(
      clamp(
        20000.0 * Math.exp(-0.020 * Math.max(0.0, d - 1.3)) * (1.0 - 0.42 * overhang) * (1.0 - 0.15 * lidShadowFactor),
        6800.0,
        20000.0
      )
    );

    // 5. Compact 2.10m Spruce Soundboard Angular Subtense Stereo Width (Mid/Side) + Binaural ITD / ILD
    const stereoWidth = clamp(0.22 + 1.38 / Math.sqrt(Math.max(0.95, d)), 0.24, 1.24);
    const binauralPan = clamp(rightDot * clamp((d - 0.75) / 2.2, 0.35, 0.94), -0.92, 0.92);

    const absAz = Math.abs(azimuthRad);
    const woodworthSec =
      (HEAD_RADIUS_M / SPEED_OF_SOUND) * (Math.min(Math.PI * 0.5, absAz) + Math.sin(Math.min(Math.PI * 0.5, absAz)));
    const delayLeftSec = rightDot > 0 ? woodworthSec : 0.0;
    const delayRightSec = rightDot < 0 ? woodworthSec : 0.0;

    const rearPinnaDb = fwdDot < 0 ? fwdDot * 2.1 : 0.0;
    const leftHeadHighDb = (rightDot > 0 ? -4.4 * rightDot : 0.7 * -rightDot) + rearPinnaDb;
    const rightHeadHighDb = (rightDot < 0 ? -4.4 * -rightDot : 0.7 * rightDot) + rearPinnaDb;

    // 6. 1st-Order Image-Source Early Reflections (delays & gains)
    const propDelaySec = clamp(d / SPEED_OF_SOUND, 0.0024, 0.12);
    const calcTap = (imgPos, reflCoeff, extraAtten = 1.0) => {
      const imgDist = listenerPos.distanceTo(imgPos);
      const deltaM = Math.max(1.1, imgDist - d);
      const relDelaySec = clamp(deltaM / SPEED_OF_SOUND, 0.004, 0.185);
      const gain = clamp((dRef / Math.max(4.0, imgDist)) * reflCoeff * extraAtten, 0.02, 0.42);
      this._imgVec.copy(imgPos).sub(listenerPos).normalize();
      const pan = clamp(this._imgVec.dot(this._camRight) * 0.85, -0.88, 0.88);
      return { delaySec: relDelaySec, gain, pan };
    };

    // Keep early reflections subtle & natural (prevents comb-filtering/hollowness on real studio recordings)
    const tapLeft = calcTap(IMAGE_SOURCES.leftWall, 0.11, 1.0 - 0.15 * overhang);
    const tapRight = calcTap(IMAGE_SOURCES.rightWall, 0.11, 1.0 - 0.15 * overhang);
    const tapVeil = calcTap(IMAGE_SOURCES.oakVeil, 0.13, 1.0 - 0.74 * overhang);
    const tapRear = calcTap(IMAGE_SOURCES.rearFascia, 0.07, 1.0);

    const itdgMs = Number(
      (Math.min(tapLeft.delaySec, tapRight.delaySec, tapVeil.delaySec) * 1000.0).toFixed(1)
    );

    // Diffuse Koerner Hall reverberant field: tasteful concert-hall air without washing out natural piano clarity
    const upperCanopyBoost = listenerPos.y > 7.5 ? 1.12 : 1.0;
    const reverbSendGain = clamp(0.24 * upperCanopyBoost * (1.0 - 0.30 * overhang), 0.11, 0.34);

    const earlyEnergy =
      directGain * directGain +
      tapLeft.gain * tapLeft.gain +
      tapRight.gain * tapRight.gain +
      tapVeil.gain * tapVeil.gain;
    const lateEnergy = Math.pow(reverbSendGain * 1.50, 2);
    const directToReverbDb = Number((10.0 * Math.log10((directGain * directGain) / Math.max(1e-5, lateEnergy))).toFixed(1));
    const clarityC80Db = Number((10.0 * Math.log10(earlyEnergy / Math.max(1e-5, lateEnergy))).toFixed(1));

    const tier = activeSeat?.tier || "";
    let zoneLabel = "Open Lid Axis";
    if (d < 4.0 && listenerPos.z > -0.5) {
      zoneLabel = d < 2.1 ? "Stage Nearfield" : "Stage Apron";
    } else if (lidShadowFactor > 0.25 || tier === "Choir Loft") {
      zoneLabel = "Choir \u00B7 Lid Shadow";
    } else if (overhang > 0.22) {
      zoneLabel = "Under-Balcony Soffit";
    } else if (Math.abs(listenerPos.x) > 6.8 && d > 7.0) {
      zoneLabel = "Side Loge Lateral";
    } else if (listenerPos.y > 8.2 || tier === "Upper Balcony") {
      zoneLabel = "Upper Canopy Bloom";
    } else if (listenerPos.y > 4.2 || tier === "Lower Balcony") {
      zoneLabel = "Balcony Panorama";
    } else if (d < 9.5) {
      zoneLabel = "Front Intimate Direct";
    } else {
      zoneLabel = "Orchestra Sweet Spot";
    }

    return {
      distanceM: Number(d.toFixed(1)),
      propDelaySec,
      directGain,
      hfLidDb: Number(hfLidDb.toFixed(1)),
      lidShadowFactor,
      overhang,
      overhangPct: Math.round(overhang * 100),
      airCutoffHz,
      stereoWidth,
      stereoWidthPct: Math.round(clamp((stereoWidth / 1.24) * 100, 18, 100)),
      binauralPan,
      delayLeftSec,
      delayRightSec,
      leftHeadHighDb,
      rightHeadHighDb,
      tapLeft,
      tapRight,
      tapVeil,
      tapRear,
      reverbSendGain,
      itdgMs,
      directToReverbDb,
      clarityC80Db,
      zoneLabel,
    };
  }

  ensureContext() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this.ctx = new AC({ latencyHint: "interactive" });
    this._buildSpatialGraph();
    return this.ctx;
  }

  async resumeNonBlocking() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      await Promise.race([
        ctx.resume().catch(() => {}),
        new Promise((r) => setTimeout(r, 420)),
      ]);
    }
  }

  _buildKoernerImpulseResponse(hallSpec = null) {
    const hall = hallSpec || this.hallProfile || getConcertHall(DEFAULT_HALL_ID);
    const cacheKey = hall.id;
    if (this._hallIrCache.has(cacheKey)) {
      return this._hallIrCache.get(cacheKey);
    }

    const ac = hall.acoustics;
    const sr = this.ctx.sampleRate || 44100;
    const durationSec = ac.irDurationSec || 2.45;
    const len = Math.floor(sr * durationSec);
    const buf = this.ctx.createBuffer(2, len, sr);

    const rt60 = Math.max(0.8, ac.rt60 || 1.95);
    const kLow = -Math.log(1000.0) / (rt60 * (ac.lowDecayMul || 1.15));
    const kMid = -Math.log(1000.0) / rt60;
    const kHigh = -Math.log(1000.0) / (rt60 * (ac.highDecayMul || 0.56));

    for (let ch = 0; ch < 2; ch++) {
      const out = buf.getChannelData(ch);
      let seed = ch === 0 ? 0x9e3779b9 : 0x85ebca6b;
      const rand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return (seed / 0xffffffff) * 2.0 - 1.0;
      };

      let lpLow = 0.0;
      let lpMid = 0.0;
      const preDelaySamples = Math.floor(sr * (ac.preDelaySec || 0.016));
      for (let i = 0; i < len; i++) {
        if (i < preDelaySamples) {
          out[i] = 0.0;
          continue;
        }
        const t = (i - preDelaySamples) / sr;
        const buildUp = Math.min(1.0, (i - preDelaySamples) / (sr * 0.024));
        const w = rand();
        lpLow = lpLow * 0.955 + w * 0.045;
        lpMid = lpMid * 0.72 + w * 0.28;
        const bandLow = lpLow;
        const bandMid = lpMid - lpLow;
        const bandHigh = w - lpMid;

        const sample =
          bandLow * Math.exp(kLow * t) * 1.15 +
          bandMid * Math.exp(kMid * t) * 1.0 +
          bandHigh * Math.exp(kHigh * t) * 0.62;

        out[i] = sample * buildUp * 0.24;
      }
    }
    this._hallIrCache.set(cacheKey, buf);
    return buf;
  }

  _buildSpatialGraph() {
    if (this.graphReady || !this.ctx) return;
    const ctx = this.ctx;

    this.sourceBus = ctx.createGain();
    this.sourceBus.gain.value = 1.0;

    // --- 0. PIANO MODEL VOICING & SOUNDBOARD RESONANCE TONE BUS ---
    // Shapes tone dynamically per selected piano brand (Steinway D / Bösendorfer / Fazioli / Yamaha CFX / Crystal / Stein 1780)
    const pAudio = this.pianoAudioProfile;
    const eq = pAudio.eq;

    this.voiceLowShelf = ctx.createBiquadFilter();
    this.voiceLowShelf.type = "lowshelf";
    this.voiceLowShelf.frequency.value = eq.lowShelfFreq;
    this.voiceLowShelf.gain.value = eq.lowShelfGainDb;

    this.voiceBodyPeak = ctx.createBiquadFilter();
    this.voiceBodyPeak.type = "peaking";
    this.voiceBodyPeak.frequency.value = eq.bodyPeakFreq;
    this.voiceBodyPeak.Q.value = eq.bodyPeakQ;
    this.voiceBodyPeak.gain.value = eq.bodyPeakGainDb;

    this.voiceHarshDip = ctx.createBiquadFilter();
    this.voiceHarshDip.type = "peaking";
    this.voiceHarshDip.frequency.value = eq.harshDipFreq;
    this.voiceHarshDip.Q.value = eq.harshDipQ;
    this.voiceHarshDip.gain.value = eq.harshDipGainDb;

    this.voiceAirShelf = ctx.createBiquadFilter();
    this.voiceAirShelf.type = "highshelf";
    this.voiceAirShelf.frequency.value = eq.airShelfFreq;
    this.voiceAirShelf.gain.value = eq.airShelfGainDb;

    this.voiceOutGain = ctx.createGain();
    this.voiceOutGain.gain.value = pAudio.outputGain;

    // Lid Angle & Una Corda Acoustic Modulator (smoothly softens & warms sound when lid closes or Una Corda pressed)
    this.lidAngleShelf = ctx.createBiquadFilter();
    this.lidAngleShelf.type = "highshelf";
    this.lidAngleShelf.frequency.value = 1750.0;
    this.lidAngleShelf.gain.value = 0.0;

    this.hallWarmthShelf = ctx.createBiquadFilter();
    this.hallWarmthShelf.type = "lowshelf";
    this.hallWarmthShelf.frequency.value = 240.0;
    this.hallWarmthShelf.gain.value = this.hallProfile?.acoustics?.warmthDb || 0.4;

    this.unaCordaGain = ctx.createGain();
    this.unaCordaGain.gain.value = 1.0;

    this.voiceFormant2 = ctx.createBiquadFilter();
    this.voiceFormant2.type = "peaking";
    const f2 = pAudio.formant2 || { freq: 880, gainDb: 1.5, Q: 1.2 };
    this.voiceFormant2.frequency.value = f2.freq;
    this.voiceFormant2.gain.value = f2.gainDb;
    this.voiceFormant2.Q.value = f2.Q;

    // Zero-latency Aliquot / Duplex harmonic overtone sheen (Blüthner / Fazioli / Crystal — zero comb filtering!)
    this.aliquotShelf = ctx.createBiquadFilter();
    this.aliquotShelf.type = "peaking";
    this.aliquotShelf.frequency.value = 3400.0;
    this.aliquotShelf.Q.value = 0.85;
    this.aliquotShelf.gain.value = clamp((pAudio.aliquotMix || 0.0) * 9.5, 0.0, 3.4);

    this.spatialBus = ctx.createGain();
    this.spatialBus.gain.value = 1.0;

    this.sourceBus.connect(this.voiceLowShelf);
    this.voiceLowShelf.connect(this.voiceBodyPeak);
    this.voiceBodyPeak.connect(this.voiceFormant2);
    this.voiceFormant2.connect(this.voiceHarshDip);
    this.voiceHarshDip.connect(this.voiceAirShelf);
    this.voiceAirShelf.connect(this.aliquotShelf);
    this.aliquotShelf.connect(this.voiceOutGain);
    this.voiceOutGain.connect(this.lidAngleShelf);
    this.lidAngleShelf.connect(this.hallWarmthShelf);
    this.hallWarmthShelf.connect(this.unaCordaGain);
    this.unaCordaGain.connect(this.spatialBus);

    // --- 0B. PHASE-COHERENT SYMPATHETIC PEDAL BLOOM BUS (Routed cleanly into Convolver, ZERO comb feedback!) ---
    this.sympWarmBP = ctx.createBiquadFilter();
    this.sympWarmBP.type = "bandpass";
    this.sympWarmBP.frequency.value = 540.0;
    this.sympWarmBP.Q.value = 0.45;

    this.sympatheticPedalGain = ctx.createGain();
    this.sympatheticPedalGain.gain.value = 0.0001;

    this.spatialBus.connect(this.sympWarmBP);
    this.sympWarmBP.connect(this.sympatheticPedalGain);

    // --- A. PHASE-COHERENT DIRECT PATH (Zero DelayNodes = 0.00 cents Doppler / record-scratch!) ---
    const splitter = ctx.createChannelSplitter(2);
    this.spatialBus.connect(splitter);

    this.midSum = ctx.createGain();
    this.midSum.gain.value = 0.5;
    this.sideSub = ctx.createGain();
    this.sideSub.gain.value = 0.5;
    const invR = ctx.createGain();
    invR.gain.value = -1.0;

    splitter.connect(this.midSum, 0);
    splitter.connect(this.midSum, 1);
    splitter.connect(this.sideSub, 0);
    splitter.connect(invR, 1);
    invR.connect(this.sideSub);

    this.sideWidthGain = ctx.createGain();
    this.sideWidthGain.gain.value = 0.34;
    this.sideSub.connect(this.sideWidthGain);

    const dirL = ctx.createGain();
    const dirR = ctx.createGain();
    const negSide = ctx.createGain();
    negSide.gain.value = -1.0;
    this.sideWidthGain.connect(negSide);

    this.midSum.connect(dirL);
    this.sideWidthGain.connect(dirL);
    this.midSum.connect(dirR);
    negSide.connect(dirR);

    const directMerger = ctx.createChannelMerger(2);
    dirL.connect(directMerger, 0, 0);
    dirR.connect(directMerger, 0, 1);

    // 48.5° Walnut Deckel Lid Directivity High-Shelf (> 1.85 kHz silvery bichord overtones vs Choir Loft lid shadow)
    this.lidShelfFilter = ctx.createBiquadFilter();
    this.lidShelfFilter.type = "highshelf";
    this.lidShelfFilter.frequency.value = 1850.0;
    this.lidShelfFilter.gain.value = 0.9;

    // Neutral direct soundboard contour (let each real piano recording speak authentically without artificial coloration)
    this.spruceFormant = ctx.createBiquadFilter();
    this.spruceFormant.type = "peaking";
    this.spruceFormant.frequency.value = 960.0;
    this.spruceFormant.Q.value = 1.0;
    this.spruceFormant.gain.value = 0.0;

    // Gentle room-boundary nearfield low-shelf (< 180 Hz)
    this.bodyLowShelf = ctx.createBiquadFilter();
    this.bodyLowShelf.type = "lowshelf";
    this.bodyLowShelf.frequency.value = 180.0;
    this.bodyLowShelf.gain.value = 0.0;

    // Atmospheric Air Absorption + Under-Balcony Overhang Lowpass
    this.airLowpass = ctx.createBiquadFilter();
    this.airLowpass.type = "lowpass";
    this.airLowpass.frequency.value = 16500.0;
    this.airLowpass.Q.value = 0.55;

    this.directGainNode = ctx.createGain();
    this.directGainNode.gain.value = 1.0;

    this.directPanner = ctx.createStereoPanner();
    this.directPanner.pan.value = 0.0;

    const earSplit = ctx.createChannelSplitter(2);
    this.earShadowL = ctx.createBiquadFilter();
    this.earShadowL.type = "highshelf";
    this.earShadowL.frequency.value = 2400.0;
    this.earShadowR = ctx.createBiquadFilter();
    this.earShadowR.type = "highshelf";
    this.earShadowR.frequency.value = 2400.0;
    // Woodworth Interaural Time Difference (ITD, max ~0.66 ms) for authentic headphone left/right localization
    this.earDelayL = ctx.createDelay(0.01);
    this.earDelayL.delayTime.value = 0.0;
    this.earDelayR = ctx.createDelay(0.01);
    this.earDelayR.delayTime.value = 0.0;
    const earMerge = ctx.createChannelMerger(2);

    directMerger.connect(this.lidShelfFilter);
    this.lidShelfFilter.connect(this.spruceFormant);
    this.spruceFormant.connect(this.bodyLowShelf);
    this.bodyLowShelf.connect(this.airLowpass);
    this.airLowpass.connect(this.directGainNode);
    this.directGainNode.connect(this.directPanner);
    this.directPanner.connect(earSplit);

    earSplit.connect(this.earShadowL, 0);
    this.earShadowL.connect(this.earDelayL);
    this.earDelayL.connect(earMerge, 0, 0);

    earSplit.connect(this.earShadowR, 1);
    this.earShadowR.connect(this.earDelayR);
    this.earDelayR.connect(earMerge, 0, 1);

    // --- B. 4-BANK SILENT-LATCH EARLY REFLECTION CROSSFADER ---
    // DelayNode.delayTime on any bank is ONLY ever set while that bank's masterGain is strictly 0.0,
    // then equal-power crossfaded (cos/sin) against the outgoing bank — 0% Doppler / record-scratch!
    const makeReflectionTap = (destBus, cutoffHz, warmBoostDb = 0.0) => {
      const delay = ctx.createDelay(0.25);
      delay.delayTime.value = 0.02;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = cutoffHz;
      lp.Q.value = 0.5;
      const eq = ctx.createBiquadFilter();
      eq.type = "peaking";
      eq.frequency.value = 410.0;
      eq.Q.value = 0.85;
      eq.gain.value = warmBoostDb;
      const gain = ctx.createGain();
      gain.gain.value = 0.12;
      const pan = ctx.createStereoPanner();
      this.midSum.connect(delay);
      delay.connect(eq);
      eq.connect(lp);
      lp.connect(gain);
      gain.connect(pan);
      pan.connect(destBus);
      return { delay, lp, gain, pan };
    };

    // --- C. KOERNER HALL DIFFUSE REVERBERATION CONVOLVER (Lush Concert Grand Bloom) ---
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.44;

    this.voiceReverbScale = ctx.createGain();
    this.voiceReverbScale.gain.value = pAudio.reverbScale || 1.25;

    const revHP = ctx.createBiquadFilter();
    revHP.type = "highpass";
    revHP.frequency.value = 95.0;
    revHP.Q.value = 0.65;

    // Keep bass/tenor strings warm & clear inside the concert hall bloom
    const revClarityDip = ctx.createBiquadFilter();
    revClarityDip.type = "peaking";
    revClarityDip.frequency.value = 265.0;
    revClarityDip.Q.value = 0.85;
    revClarityDip.gain.value = -1.2;

    this.reverbAirLP = ctx.createBiquadFilter();
    this.reverbAirLP.type = "lowpass";
    this.reverbAirLP.frequency.value = this.hallProfile?.acoustics?.reverbBrightnessHz || 5600.0;

    this.hallWetGain = ctx.createGain();
    this.hallWetGain.gain.value =
      (this.hallProfile?.acoustics?.reverbWetScale || 1.0) *
      (this.zoneProfile?.wetMul || 0.96);

    this.convolver = ctx.createConvolver();
    this.convolver.buffer = this._buildKoernerImpulseResponse(this.hallProfile);

    this.spatialBus.connect(this.reverbSend);
    this.reverbSend.connect(this.voiceReverbScale);
    this.voiceReverbScale.connect(this.hallWetGain);
    this.hallWetGain.connect(revHP);
    this.sympatheticPedalGain.connect(revHP);
    revHP.connect(revClarityDip);
    revClarityDip.connect(this.reverbAirLP);
    this.reverbAirLP.connect(this.convolver);

    // --- D. MASTER CONCERT HALL OUTPUT BUS (Transparent Mastering Limiter) ---
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.88;

    this.erBanks = [];
    for (let i = 0; i < 4; i++) {
      const bankBus = ctx.createGain();
      const initGain = i === 0 ? 1.0 : 0.0;
      bankBus.gain.value = initGain;
      bankBus.connect(this.masterGain);
      this.erBanks.push({
        masterGain: bankBus,
        gainKnots: [[0.0, initGain]],
        left: makeReflectionTap(bankBus, 4800.0, 0.55),
        right: makeReflectionTap(bankBus, 4800.0, 0.55),
        veil: makeReflectionTap(bankBus, 6200.0, 1.85), // Signature warm laminated Baillie White-Oak Veil reflection
        rear: makeReflectionTap(bankBus, 3800.0, 0.60),
      });
    }
    this._activeErBankIdx = 0;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -1.5;
    limiter.knee.value = 6.0;
    limiter.ratio.value = 6.0;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.12;

    earMerge.connect(this.masterGain);
    this.convolver.connect(this.masterGain);

    this.masterGain.connect(limiter);
    limiter.connect(ctx.destination);

    this.graphReady = true;
    this._applyImmediateMetrics(this.lastMetrics);
    this._refreshLidAndUnaCordaTone();
  }

  bindMediaElement(audioEl) {
    this.ensureContext();
    if (!this.ctx || !audioEl) return;
    if (this.boundAudioEl === audioEl && this.mediaElementSource) return;
    this.boundAudioEl = audioEl;
    this.mediaElementSource = this.ctx.createMediaElementSource(audioEl);
    this.mediaElementSource.connect(this.sourceBus);
  }

  _sampleKnots(knots, t) {
    if (!knots || knots.length === 0) return 0.0;
    if (t <= knots[0][0]) return knots[0][1];
    for (let i = 0; i < knots.length - 1; i++) {
      const t0 = knots[i][0];
      const t1 = knots[i + 1][0];
      if (t <= t1) {
        const span = Math.max(1e-6, t1 - t0);
        const u = clamp((t - t0) / span, 0.0, 1.0);
        return knots[i][1] + (knots[i + 1][1] - knots[i][1]) * u;
      }
    }
    return knots[knots.length - 1][1];
  }

  _holdParam(param, knots, now, fallbackVal) {
    const cur = knots && knots.length > 0 ? this._sampleKnots(knots, now) : fallbackVal;
    try {
      if (typeof param.cancelAndHoldAtTime === "function") {
        param.cancelAndHoldAtTime(now);
      } else {
        param.cancelScheduledValues(now);
      }
    } catch (_) {
      try {
        param.cancelScheduledValues(now);
      } catch (__) {}
    }
    param.setValueAtTime(cur, now);
    return cur;
  }

  _setParamImmediate(key, param, val, now) {
    try {
      param.cancelScheduledValues(now);
    } catch (_) {}
    param.setValueAtTime(val, now);
    this._paramKnots.set(key, [[now, val]]);
  }

  _scheduleSCurve(key, param, targetVal, now, durationSec, isLog = false) {
    const vStart = this._holdParam(param, this._paramKnots.get(key), now, param.value);
    const knots = [[now, vStart]];
    const steps = 8;
    const dur = Math.max(0.08, durationSec);
    const safeStart = Math.max(1e-4, vStart);
    const safeEnd = Math.max(1e-4, targetVal);
    for (let k = 1; k <= steps; k++) {
      const p = k / steps;
      const s = k === steps ? 1.0 : 0.5 - 0.5 * Math.cos(Math.PI * p);
      const t = now + p * dur;
      const v = isLog ? safeStart * Math.pow(safeEnd / safeStart, s) : vStart + (targetVal - vStart) * s;
      param.linearRampToValueAtTime(v, t);
      knots.push([t, v]);
    }
    this._paramKnots.set(key, knots);
  }

  _slewParam(key, param, targetVal, now, slewSec = 0.16) {
    const vStart = this._holdParam(param, this._paramKnots.get(key), now, param.value);
    const tEnd = now + slewSec;
    param.linearRampToValueAtTime(targetVal, tEnd);
    this._paramKnots.set(key, [
      [now, vStart],
      [tEnd, targetVal],
    ]);
  }

  _latchSilentErBankTaps(bank, m, latchTime) {
    const applyTap = (nodeTap, tapSpec) => {
      nodeTap.delay.delayTime.cancelScheduledValues(latchTime);
      nodeTap.delay.delayTime.setValueAtTime(tapSpec.delaySec, latchTime);
      nodeTap.gain.gain.cancelScheduledValues(latchTime);
      nodeTap.gain.gain.setValueAtTime(tapSpec.gain, latchTime);
      nodeTap.pan.pan.cancelScheduledValues(latchTime);
      nodeTap.pan.pan.setValueAtTime(tapSpec.pan, latchTime);
    };
    applyTap(bank.left, m.tapLeft);
    applyTap(bank.right, m.tapRight);
    applyTap(bank.veil, m.tapVeil);
    applyTap(bank.rear, m.tapRear);
  }

  _applyImmediateMetrics(m) {
    if (!this.graphReady || !this.ctx) return;
    const now = this.ctx.currentTime;
    const bassLift = m.distanceM < 2.6 ? 0.35 : m.lidShadowFactor > 0.2 ? 0.55 : 0.0;
    const revLP = 6000.0 * (1.0 - 0.28 * m.overhang);

    this._setParamImmediate("sideWidth", this.sideWidthGain.gain, m.stereoWidth * 0.5, now);
    this._setParamImmediate("lidShelf", this.lidShelfFilter.gain, m.hfLidDb, now);
    this._setParamImmediate("bodyLow", this.bodyLowShelf.gain, bassLift, now);
    this._setParamImmediate("airLP", this.airLowpass.frequency, m.airCutoffHz, now);
    this._setParamImmediate("directGain", this.directGainNode.gain, m.directGain, now);
    this._setParamImmediate("directPan", this.directPanner.pan, m.binauralPan, now);
    this._setParamImmediate("earShadowL", this.earShadowL.gain, m.leftHeadHighDb, now);
    this._setParamImmediate("earShadowR", this.earShadowR.gain, m.rightHeadHighDb, now);
    if (this.earDelayL) this.earDelayL.delayTime.setValueAtTime(m.delayLeftSec || 0.0, now);
    if (this.earDelayR) this.earDelayR.delayTime.setValueAtTime(m.delayRightSec || 0.0, now);
    this._setParamImmediate("reverbSend", this.reverbSend.gain, m.reverbSendGain, now);
    this._setParamImmediate("reverbAirLP", this.reverbAirLP.frequency, revLP, now);

    for (let i = 0; i < this.erBanks.length; i++) {
      const bank = this.erBanks[i];
      const g = i === 0 ? 1.0 : 0.0;
      try {
        bank.masterGain.gain.cancelScheduledValues(now);
      } catch (_) {}
      bank.masterGain.gain.setValueAtTime(g, now);
      bank.gainKnots = [[now, g]];
      if (i === 0) {
        this._latchSilentErBankTaps(bank, m, now);
      }
    }
    this._activeErBankIdx = 0;
  }

  _crossfadeErBanksTo(mTarget, targetPos, durationSec = 0.72) {
    if (!this.graphReady || !this.ctx || this.erBanks.length === 0) return;
    const now = this.ctx.currentTime;
    const nBanks = this.erBanks.length;

    const curGains = new Array(nBanks);
    for (let i = 0; i < nBanks; i++) {
      const b = this.erBanks[i];
      curGains[i] = this._holdParam(
        b.masterGain.gain,
        b.gainKnots,
        now,
        i === this._activeErBankIdx ? 1.0 : 0.0
      );
    }

    let nextIdx = (this._activeErBankIdx + 1) % nBanks;
    let minG = Infinity;
    for (let i = 0; i < nBanks; i++) {
      if (i === this._activeErBankIdx) continue;
      if (curGains[i] < minG) {
        minG = curGains[i];
        nextIdx = i;
      }
    }

    const nextBank = this.erBanks[nextIdx];
    let tFadeStart = now + 0.005;
    const nextKnots = [[now, curGains[nextIdx]]];

    if (curGains[nextIdx] > 0.0003) {
      const tMute = now + 0.030;
      nextBank.masterGain.gain.linearRampToValueAtTime(0.0, tMute);
      nextKnots.push([tMute, 0.0]);
      this._latchSilentErBankTaps(nextBank, mTarget, tMute + 0.003);
      tFadeStart = tMute + 0.006;
      nextBank.masterGain.gain.setValueAtTime(0.0, tFadeStart);
      nextKnots.push([tFadeStart, 0.0]);
    } else {
      nextBank.masterGain.gain.setValueAtTime(0.0, now);
      nextKnots[0][1] = 0.0;
      this._latchSilentErBankTaps(nextBank, mTarget, now + 0.001);
      nextBank.masterGain.gain.setValueAtTime(0.0, tFadeStart);
      nextKnots.push([tFadeStart, 0.0]);
    }

    const steps = 8;
    const dur = Math.max(0.18, durationSec);

    for (let k = 1; k <= steps; k++) {
      const p = k / steps;
      const t = tFadeStart + p * dur;
      const g = k === steps ? 1.0 : Math.sin(p * Math.PI * 0.5);
      nextBank.masterGain.gain.linearRampToValueAtTime(g, t);
      nextKnots.push([t, g]);
    }
    nextBank.gainKnots = nextKnots;

    for (let i = 0; i < nBanks; i++) {
      if (i === nextIdx) continue;
      const b = this.erBanks[i];
      const g0 = curGains[i];
      if (g0 <= 0.0001) {
        b.masterGain.gain.setValueAtTime(0.0, now);
        b.gainKnots = [[now, 0.0]];
        continue;
      }
      const knots = [[now, g0]];
      if (tFadeStart > now + 0.001) {
        b.masterGain.gain.setValueAtTime(g0, tFadeStart);
        knots.push([tFadeStart, g0]);
      }
      for (let k = 1; k <= steps; k++) {
        const p = k / steps;
        const t = tFadeStart + p * dur;
        const g = k === steps ? 0.0 : g0 * Math.cos(p * Math.PI * 0.5);
        b.masterGain.gain.linearRampToValueAtTime(g, t);
        knots.push([t, g]);
      }
      b.gainKnots = knots;
    }

    this._activeErBankIdx = nextIdx;
    if (targetPos) this._erAnchorPos.copy(targetPos);
    this._lastErCrossfadeTime = now;
  }

  /**
   * Subtle endpoint-to-endpoint acoustic crossfade when gliding to a seat or onto the stage.
   * Avoids flying the virtual microphone across the stage mid-glide and never touches live DelayNodes.
   */
  transitionToPose(targetPos, targetQuat, activeSeat = null, { immediate = false, durationSec = 0.72 } = {}) {
    const m = this.computeMetrics(targetPos, targetQuat, activeSeat);
    this.lastMetrics = m;
    this._glideTargetPos.copy(targetPos);
    this._glideTargetQuat.copy(targetQuat);

    if (immediate) {
      this._glideWallEndMs = 0.0;
      this._erAnchorPos.copy(targetPos);
      this._applyImmediateMetrics(m);
      return m;
    }

    const dur = clamp(Number(durationSec) || 0.72, 0.35, 1.35);
    this._glideWallEndMs = performance.now() + dur * 1000.0;

    if (!this.graphReady || !this.ctx) return m;
    const now = this.ctx.currentTime;
    const bassLift = m.distanceM < 2.6 ? 0.35 : m.lidShadowFactor > 0.2 ? 0.55 : 0.0;
    const revLP = 6000.0 * (1.0 - 0.28 * m.overhang);

    this._scheduleSCurve("sideWidth", this.sideWidthGain.gain, m.stereoWidth * 0.5, now, dur, false);
    this._scheduleSCurve("lidShelf", this.lidShelfFilter.gain, m.hfLidDb, now, dur, false);
    this._scheduleSCurve("bodyLow", this.bodyLowShelf.gain, bassLift, now, dur, false);
    this._scheduleSCurve("airLP", this.airLowpass.frequency, m.airCutoffHz, now, dur, true);
    this._scheduleSCurve("directGain", this.directGainNode.gain, m.directGain, now, dur, true);
    this._scheduleSCurve("directPan", this.directPanner.pan, m.binauralPan, now, dur, false);
    this._scheduleSCurve("earShadowL", this.earShadowL.gain, m.leftHeadHighDb, now, dur, false);
    this._scheduleSCurve("earShadowR", this.earShadowR.gain, m.rightHeadHighDb, now, dur, false);
    if (this.earDelayL) this.earDelayL.delayTime.setTargetAtTime(m.delayLeftSec || 0.0, now, 0.05);
    if (this.earDelayR) this.earDelayR.delayTime.setTargetAtTime(m.delayRightSec || 0.0, now, 0.05);
    this._scheduleSCurve("reverbSend", this.reverbSend.gain, m.reverbSendGain, now, dur, true);
    this._scheduleSCurve("reverbAirLP", this.reverbAirLP.frequency, revLP, now, dur, true);

    this._crossfadeErBanksTo(m, targetPos, dur);
    return m;
  }

  updateListener(listenerPos, listenerQuat, activeSeat = null, immediate = false) {
    if (immediate) {
      return this.transitionToPose(listenerPos, listenerQuat, activeSeat, { immediate: true });
    }

    if (
      performance.now() < this._glideWallEndMs &&
      listenerPos.distanceToSquared(this._glideTargetPos) < 1e-4 &&
      1.0 - Math.abs(listenerQuat.dot(this._glideTargetQuat)) < 1e-4
    ) {
      return this.lastMetrics;
    }

    const m = this.computeMetrics(listenerPos, listenerQuat, activeSeat);
    this.lastMetrics = m;
    if (!this.graphReady || !this.ctx) return m;

    const now = this.ctx.currentTime;
    const bassLift = m.distanceM < 2.6 ? 0.35 : m.lidShadowFactor > 0.2 ? 0.55 : 0.0;
    const revLP = 6000.0 * (1.0 - 0.28 * m.overhang);
    const slewSec = 0.16;

    this._slewParam("sideWidth", this.sideWidthGain.gain, m.stereoWidth * 0.5, now, slewSec);
    this._slewParam("lidShelf", this.lidShelfFilter.gain, m.hfLidDb, now, slewSec);
    this._slewParam("bodyLow", this.bodyLowShelf.gain, bassLift, now, slewSec);
    this._slewParam("airLP", this.airLowpass.frequency, m.airCutoffHz, now, slewSec);
    this._slewParam("directGain", this.directGainNode.gain, m.directGain, now, slewSec);
    this._slewParam("directPan", this.directPanner.pan, m.binauralPan, now, slewSec);
    this._slewParam("earShadowL", this.earShadowL.gain, m.leftHeadHighDb, now, slewSec);
    this._slewParam("earShadowR", this.earShadowR.gain, m.rightHeadHighDb, now, slewSec);
    if (this.earDelayL) this.earDelayL.delayTime.setTargetAtTime(m.delayLeftSec || 0.0, now, 0.045);
    if (this.earDelayR) this.earDelayR.delayTime.setTargetAtTime(m.delayRightSec || 0.0, now, 0.045);
    this._slewParam("reverbSend", this.reverbSend.gain, m.reverbSendGain, now, slewSec);
    this._slewParam("reverbAirLP", this.reverbAirLP.frequency, revLP, now, slewSec);

    if (
      listenerPos.distanceTo(this._erAnchorPos) >= 1.35 &&
      now - this._lastErCrossfadeTime >= 0.55
    ) {
      this._crossfadeErBanksTo(m, listenerPos, 0.55);
    } else if (this.erBanks[this._activeErBankIdx]) {
      const activeBank = this.erBanks[this._activeErBankIdx];
      const slewTapPanGain = (tapNode, tapSpec) => {
        tapNode.gain.gain.setTargetAtTime(tapSpec.gain, now, 0.075);
        tapNode.pan.pan.setTargetAtTime(tapSpec.pan, now, 0.075);
      };
      slewTapPanGain(activeBank.left, m.tapLeft);
      slewTapPanGain(activeBank.right, m.tapRight);
      slewTapPanGain(activeBank.veil, m.tapVeil);
      slewTapPanGain(activeBank.rear, m.tapRear);
    }

    return m;
  }

  // ==========================================================================
  // 8-BANK AUTHENTIC STUDIO MULTI-SAMPLE ENGINE WITH CACHE API PERSISTENCE
  // ==========================================================================
  /**
   * Preserves the genuine acoustic balance and velocity dynamics of each studio recording
   * (never flattening per-note peaks!), while trimming leading silence (> 3 ms) for crisp
   * zero-latency hammer attacks and applying a smooth 25 ms end-of-buffer anti-click fade.
   */
  _prepareSampleBuffer(audioBuf, decodeCtx) {
    if (!audioBuf || !audioBuf.numberOfChannels || !audioBuf.length) return audioBuf;
    const chCount = audioBuf.numberOfChannels;
    const sr = audioBuf.sampleRate;
    const len = audioBuf.length;

    // Detect peak in the first 0.5s to locate true hammer-strike transient
    const scanLen = Math.min(len, Math.floor(sr * 0.5));
    let maxAbs = 0;
    for (let c = 0; c < chCount; c++) {
      const data = audioBuf.getChannelData(c);
      for (let i = 0; i < scanLen; i++) {
        const a = Math.abs(data[i]);
        if (a > maxAbs) maxAbs = a;
      }
    }

    let trimStart = 0;
    if (maxAbs > 0.001) {
      const thr = maxAbs * 0.015;
      let firstIdx = 0;
      outer: for (let i = 0; i < scanLen; i++) {
        for (let c = 0; c < chCount; c++) {
          if (Math.abs(audioBuf.getChannelData(c)[i]) > thr) {
            firstIdx = i;
            break outer;
          }
        }
      }
      const preRoll = Math.floor(sr * 0.002);
      if (firstIdx > Math.floor(sr * 0.004)) {
        trimStart = Math.max(0, firstIdx - preRoll);
      }
    }

    let outBuf = audioBuf;
    if (trimStart > 0 && decodeCtx && len - trimStart > Math.floor(sr * 0.35)) {
      const newLen = len - trimStart;
      outBuf = decodeCtx.createBuffer(chCount, newLen, sr);
      const fadeIn = Math.min(Math.floor(sr * 0.0015), newLen);
      for (let c = 0; c < chCount; c++) {
        const src = audioBuf.getChannelData(c);
        const dst = outBuf.getChannelData(c);
        dst.set(src.subarray(trimStart));
        for (let i = 0; i < fadeIn; i++) {
          dst[i] *= i / fadeIn;
        }
      }
    }

    // Gentle 28 ms cosine fade-out at buffer end prevents any buffer-tail click
    const outLen = outBuf.length;
    const fadeOut = Math.min(Math.floor(sr * 0.028), Math.floor(outLen * 0.1));
    if (fadeOut > 16) {
      const fadeStart = outLen - fadeOut;
      for (let c = 0; c < chCount; c++) {
        const data = outBuf.getChannelData(c);
        for (let i = 0; i < fadeOut; i++) {
          const t = i / (fadeOut - 1);
          data[fadeStart + i] *= 0.5 * (1.0 + Math.cos(Math.PI * t));
        }
      }
    }
    return outBuf;
  }

  async _fetchWithRetry(url, retries = 1) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, { mode: "cors" });
        if (res.ok) return res;
        if (attempt < retries && (res.status === 403 || res.status === 429 || res.status >= 500)) {
          await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
          continue;
        }
        return null;
      } catch {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
          continue;
        }
        return null;
      }
    }
    return null;
  }

  async _fetchCachedArrayBuffer(url) {
    if (this._rawByteCache.has(url)) {
      return this._rawByteCache.get(url);
    }
    let ab = null;
    if (typeof caches !== "undefined") {
      try {
        const cache = await caches.open(SAMPLE_CACHE_NAME);
        const cached = await cache.match(url);
        if (cached && cached.ok) {
          ab = await cached.arrayBuffer();
        } else {
          const res = await this._fetchWithRetry(url, 1);
          if (res && res.ok) {
            cache.put(url, res.clone()).catch(() => {});
            ab = await res.arrayBuffer();
          }
        }
      } catch {
        ab = null;
      }
    }
    if (!ab) {
      const res = await this._fetchWithRetry(url, 1);
      if (!res || !res.ok) return null;
      ab = await res.arrayBuffer();
    }
    if (ab && ab.byteLength > 128) {
      this._rawByteCache.set(url, ab);
    }
    return ab;
  }

  preloadKeySamples() {
    const activeBank = this.pianoAudioProfile?.sampleBank || "splendid_steinway";
    if (activeBank !== "kremsegg_1830") {
      this.preloadSampleBank(activeBank);
    }
    // Always warm Salamander as a fast studio fallback if active bank is different
    if (activeBank !== "salamander") {
      this.preloadSampleBank("salamander");
    }

    // Only decode AudioBuffers once the real hardware AudioContext exists
    if (!this.ctx) {
      for (const m of SAMPLE_MIDIS) {
        for (const layer of ["mp", "f"]) {
          const u = `./assets/sandbox_audio/kremsegg_pleyel/m${m}_${layer}.mp3`;
          if (!this._rawByteCache.has(u)) {
            this._fetchCachedArrayBuffer(u).catch(() => {});
          }
        }
      }
      return Promise.resolve();
    }

    if (this.samplesLoadingPromise) return this.samplesLoadingPromise;
    const decodeCtx = this.ctx;
    const jobs = [];
    for (const m of SAMPLE_MIDIS) {
      for (const layer of ["mp", "f"]) {
        jobs.push(
          (async () => {
            try {
              const url = `./assets/sandbox_audio/kremsegg_pleyel/m${m}_${layer}.mp3`;
              const ab = await this._fetchCachedArrayBuffer(url);
              if (!ab) return;
              const audioBuf = this._prepareSampleBuffer(
                await decodeCtx.decodeAudioData(ab.slice(0)),
                decodeCtx
              );
              this.sampleBuffers.set(`${m}_${layer}`, audioBuf);
            } catch (err) {
              console.warn(`[KoernerHallAcoustics] Failed to preload sample m${m}_${layer}.mp3:`, err);
            }
          })()
        );
      }
    }
    this.samplesLoadingPromise = Promise.all(jobs).then(() => {
      if (this.sampleBuffers.size === 0) {
        this.samplesLoadingPromise = null;
      }
    });
    return this.samplesLoadingPromise;
  }

  setPerformanceProfile({ isMobile = false } = {}) {
    this.isMobileProfile = Boolean(isMobile);
  }

  preloadSampleBank(bankId = "splendid_steinway") {
    const spec = REMOTE_SAMPLE_BANKS[bankId];
    if (!spec) return Promise.resolve();

    const filterMobile = (list) =>
      this.isMobileProfile
        ? list.filter((_, idx) => idx % 2 === 0 || idx === list.length - 1)
        : list;

    const activeZones = filterMobile(spec.zones);
    const activeSoftZones = spec.softZones ? filterMobile(spec.softZones) : [];

    const runWithConcurrency = async (items, limit, worker) => {
      let cursor = 0;
      const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (cursor < items.length) {
          const idx = cursor++;
          await worker(items[idx]);
        }
      });
      await Promise.all(runners);
    };

    if (!this.ctx) {
      const midPrefetch = activeZones.filter(([m]) => m >= 48 && m <= 84);
      runWithConcurrency(midPrefetch, 4, async ([, relPath]) => {
        const u = encodeSampleUrl(spec.baseUrl, relPath);
        if (!this._rawByteCache.has(u)) {
          await this._fetchCachedArrayBuffer(u).catch(() => {});
        }
      });
      return Promise.resolve();
    }

    if (this.sampleBankPromises.has(bankId)) return this.sampleBankPromises.get(bankId);
    const decodeCtx = this.ctx;

    if (!this.sampleBankBuffers.has(bankId)) {
      this.sampleBankBuffers.set(bankId, new Map());
    }
    if (activeSoftZones.length > 0 && !this.sampleBankSoftBuffers.has(bankId)) {
      this.sampleBankSoftBuffers.set(bankId, new Map());
    }
    const targetMap = this.sampleBankBuffers.get(bankId);
    const softMap = this.sampleBankSoftBuffers.get(bankId);

    const loadInto = (destMap) => async ([midi, relPath]) => {
      if (destMap.has(midi)) return;
      try {
        const ab = await this._fetchCachedArrayBuffer(encodeSampleUrl(spec.baseUrl, relPath));
        if (!ab) return;
        const audioBuf = this._prepareSampleBuffer(
          await decodeCtx.decodeAudioData(ab.slice(0)),
          decodeCtx
        );
        destMap.set(midi, audioBuf);
      } catch (_) {
        // Silent per-zone fallback
      }
    };

    // Priority 1: Middle concert register (C3..C6) main layer -> audible in < 0.7s!
    const midZones = activeZones.filter(([m]) => m >= 48 && m <= 84);
    const outerZones = activeZones.filter(([m]) => m < 48 || m > 84);

    const midPromise = runWithConcurrency(midZones, 5, loadInto(targetMap));
    this.sampleBankMidPromises.set(bankId, midPromise);

    const fullPromise = (async () => {
      await midPromise;
      // Priority 2: Full 88-key bass & treble main layer
      await runWithConcurrency(outerZones, 4, loadInto(targetMap));
      // Priority 3: Soft velocity layer (PP / vl2 / v3 / vl1) for true real-hammer dynamic timbre
      if (softMap && activeSoftZones.length > 0) {
        const midSoft = activeSoftZones.filter(([m]) => m >= 48 && m <= 84);
        const outerSoft = activeSoftZones.filter(([m]) => m < 48 || m > 84);
        await runWithConcurrency(midSoft, 4, loadInto(softMap));
        await runWithConcurrency(outerSoft, 3, loadInto(softMap));
      }
      if (targetMap.size < 6) {
        this.sampleBankPromises.delete(bankId);
        this.sampleBankMidPromises.delete(bankId);
      }
    })();
    this.sampleBankPromises.set(bankId, fullPromise);
    return fullPromise;
  }

  preloadSalamanderSamples() {
    return this.preloadSampleBank("salamander");
  }

  async waitForActivePianoSamples() {
    this.preloadKeySamples();
    const bankId = this.pianoAudioProfile?.sampleBank || "splendid_steinway";
    if (bankId === "kremsegg_1830") {
      if (this.samplesLoadingPromise) await this.samplesLoadingPromise;
      return;
    }
    const midP = this.sampleBankMidPromises.get(bankId);
    if (midP) {
      await midP;
      const bufMap = this.sampleBankBuffers.get(bankId);
      if (bufMap && bufMap.size >= 4) return;
    }
    const salMid = this.sampleBankMidPromises.get("salamander");
    if (salMid) {
      await salMid;
      const salMap = this.sampleBankBuffers.get("salamander");
      if (salMap && salMap.size >= 4) return;
    }
    if (this.samplesLoadingPromise) {
      await this.samplesLoadingPromise;
    }
  }

  _nearestSampleMidi(midi) {
    let best = SAMPLE_MIDIS[0];
    let bestDist = Math.abs(midi - best);
    for (const s of SAMPLE_MIDIS) {
      const d = Math.abs(midi - s);
      if (d < bestDist) {
        best = s;
        bestDist = d;
      }
    }
    return best;
  }

  _nearestBankMidi(bankMap, midi) {
    if (!bankMap || bankMap.size === 0) return -1;
    let best = -1;
    let bestDist = Infinity;
    for (const s of bankMap.keys()) {
      const d = Math.abs(midi - s);
      if (d < bestDist) {
        best = s;
        bestDist = d;
      }
    }
    return best;
  }

  _ensureDamperNoiseBuffer() {
    if (this._damperNoiseBuf || !this.ctx) return this._damperNoiseBuf;
    const sr = this.ctx.sampleRate || 44100;
    const len = Math.floor(sr * 0.045);
    const buf = this.ctx.createBuffer(1, len, sr);
    const ch = buf.getChannelData(0);
    let seed = 0x2f6e2b1;
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const white = (seed / 0xffffffff) * 2.0 - 1.0;
      const env = Math.sin(Math.min(1.0, i / (len * 0.16)) * Math.PI * 0.5) * Math.pow(1.0 - i / len, 2.2);
      ch[i] = white * env;
    }
    this._damperNoiseBuf = buf;
    return buf;
  }

  _triggerDamperFeltRelease(midi) {
    const prof = this.pianoAudioProfile;
    const mix = prof?.damperNoiseMix || 0;
    if (mix <= 0.005 || !this.ctx || !this.sourceBus) return;
    const nowWall = performance.now();
    if (nowWall - this._lastDamperNoiseMs < 48) return;
    this._lastDamperNoiseMs = nowWall;

    const buf = this._ensureDamperNoiseBuffer();
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = midi < 48 ? 220 : 310;
    lp.Q.value = 0.7;

    const g = this.ctx.createGain();
    g.gain.value = clamp(mix * 0.65, 0.01, 0.09);

    src.connect(lp);
    lp.connect(g);
    g.connect(this.sourceBus);
    src.start(now);
  }

  _triggerFeltHammerThump(midi, vel, t0) {
    const prof = this.pianoAudioProfile;
    const thumpMix = prof?.feltThumpMix || 0;
    if (thumpMix <= 0.08 || !this.ctx || !this.sourceBus) return;
    const nowWall = performance.now();
    if (nowWall - this._lastFeltThumpMs < 36) return;
    this._lastFeltThumpMs = nowWall;

    const buf = this._ensureDamperNoiseBuffer();
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 0.72 + clamp((midi - 21) / 87, 0, 1) * 0.48;

    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 140 + clamp((midi - 21) / 87, 0, 1) * 260;
    bp.Q.value = 1.4;

    const g = this.ctx.createGain();
    g.gain.value = clamp(thumpMix * (0.045 + vel * 0.085), 0.01, 0.14);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.sourceBus);
    src.start(t0);
  }

  get isSustainActive() {
    return Boolean(this.damperSustain || this.manualSustain);
  }

  _resolveCompassMidi(rawMidi) {
    if (this.pianoModelId === "stein_1780") {
      return foldMidiIntoFortepianoCompass(rawMidi);
    }
    return clamp(Math.round(rawMidi), CONCERT_GRAND_MIN_MIDI, CONCERT_GRAND_MAX_MIDI);
  }

  _refreshSympatheticPedalBus() {
    if (!this.graphReady || !this.ctx || !this.sympatheticPedalGain) return;
    const now = this.ctx.currentTime;
    const sympMix = this.pianoAudioProfile?.sympatheticMix ?? 0.24;
    const target = this.isSustainActive ? clamp(sympMix * 0.42, 0.04, 0.18) : 0.0001;
    const tau = this.isSustainActive ? 0.08 : 0.16;
    this.sympatheticPedalGain.gain.setTargetAtTime(target, now, tau);
  }

  isDamperLifted(midi) {
    const m = this._resolveCompassMidi(midi);
    // Uppermost concert grand treble notes (MIDI >= 91) are naturally undamped on real grand pianos
    if (this.pianoModelId !== "stein_1780" && m >= 91) return true;
    if (this.isSustainActive) return true;
    if (this.keysDown.has(m)) return true;
    return false;
  }

  setKneeLever(engaged) {
    this.damperSustain = Boolean(engaged);
    this._refreshSympatheticPedalBus();
    if (!this.isSustainActive) {
      for (const m of this.activeVoices.keys()) {
        this._evaluateDampingForMidi(m);
      }
      this._evaluateRepertoireDamping();
    }
  }

  setManualSustain(engaged) {
    this.manualSustain = Boolean(engaged);
    this._refreshSympatheticPedalBus();
    if (!this.isSustainActive) {
      for (const m of this.activeVoices.keys()) {
        this._evaluateDampingForMidi(m);
      }
      this._evaluateRepertoireDamping();
    }
  }

  _refreshLidAndUnaCordaTone() {
    if (!this.graphReady || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Closed lid = -5.6 dB above 1.75 kHz; Half = -2.2 dB; Open = 0 dB
    // Una Corda shifts hammers sideways (-3.4 dB treble & 0.76x gain); Fazioli 4th Soft Pedal lowers travel cleanly (-1.1 dB & 0.72x gain)
    const lidDb = this.lidOpenness <= 0.1 ? -5.6 : this.lidOpenness <= 0.7 ? -2.2 : 0.0;
    const unaDb = this.unaCordaActive ? -3.4 : 0.0;
    const fazioliDb = this.fazioliSoftActive ? -1.1 : 0.0;
    const hallAir = this.hallProfile?.acoustics?.airTiltDb || 0.0;
    this.lidAngleShelf.gain.setTargetAtTime(lidDb + unaDb + fazioliDb + hallAir, now, 0.08);
    this.unaCordaGain.gain.setTargetAtTime(
      (this.unaCordaActive ? 0.76 : 1.0) *
        (this.fazioliSoftActive ? 0.72 : 1.0) *
        (this.lidOpenness <= 0.1 ? 0.86 : this.lidOpenness <= 0.7 ? 0.94 : 1.0),
      now,
      0.08
    );
  }

  setLidOpenness(openness = 1.0) {
    this.lidOpenness = clamp(Number(openness), 0.0, 1.0);
    this._refreshLidAndUnaCordaTone();
  }

  setUnaCorda(engaged) {
    this.unaCordaActive = Boolean(engaged);
    this._refreshLidAndUnaCordaTone();
  }

  setFazioliSoft(engaged) {
    this.fazioliSoftActive = Boolean(engaged);
    this._refreshLidAndUnaCordaTone();
  }

  setConcertHall(hallId) {
    const hall = getConcertHall(hallId);
    this.hallId = hall.id;
    this.hallProfile = hall;
    if (!this.graphReady || !this.ctx) return hall;

    const now = this.ctx.currentTime;
    const ac = hall.acoustics;
    try {
      this.convolver.buffer = this._buildKoernerImpulseResponse(hall);
    } catch (_) {}
    this.hallWetGain.gain.setTargetAtTime(
      (ac.reverbWetScale || 1.0) * (this.zoneProfile?.wetMul || 0.96),
      now,
      0.12
    );
    this.reverbAirLP.frequency.setTargetAtTime(ac.reverbBrightnessHz || 5600.0, now, 0.12);
    this.hallWarmthShelf.gain.setTargetAtTime(ac.warmthDb || 0.0, now, 0.12);
    this._refreshLidAndUnaCordaTone();
    return hall;
  }

  setListeningZone(zoneId, immediate = false) {
    const zone = getListeningZone(zoneId);
    this.zoneId = zone.id;
    this.zoneProfile = zone;

    const pos = new THREE.Vector3(...zone.listenerPos);
    const target = new THREE.Vector3(...(zone.headLookAt || zone.lookAt));
    const m4 = new THREE.Matrix4().lookAt(pos, target, new THREE.Vector3(0, 1, 0));
    const quat = new THREE.Quaternion().setFromRotationMatrix(m4);
    const fakeSeat = { tier: zone.tier, label: zone.name };

    if (this.graphReady && this.ctx) {
      const now = this.ctx.currentTime;
      this.hallWetGain.gain.setTargetAtTime(
        (this.hallProfile?.acoustics?.reverbWetScale || 1.0) * (zone.wetMul || 1.0),
        now,
        0.12
      );
    }
    this.transitionToPose(pos, quat, fakeSeat, { immediate, durationSec: 0.55 });
    return zone;
  }

  setPianoModel(modelId) {
    const model = getPianoModel(modelId);
    this.pianoModelId = model.id;
    const pAudio = model.audio;
    this.pianoAudioProfile = pAudio;
    this.concertPitchHz = pAudio.a4Hz || 440.0;

    // Trigger on-demand cached loading of this instrument's dedicated sample bank!
    const bankId = pAudio.sampleBank || "salamander";
    if (bankId !== "kremsegg_1830") {
      this.preloadSampleBank(bankId);
    } else {
      this.preloadKeySamples();
    }

    if (!this.graphReady || !this.ctx) return model;
    const now = this.ctx.currentTime;
    const slew = 0.14;
    const eq = pAudio.eq;

    this.voiceLowShelf.frequency.setTargetAtTime(eq.lowShelfFreq, now, slew * 0.4);
    this.voiceLowShelf.gain.setTargetAtTime(eq.lowShelfGainDb, now, slew * 0.4);

    this.voiceBodyPeak.frequency.setTargetAtTime(eq.bodyPeakFreq, now, slew * 0.4);
    this.voiceBodyPeak.Q.setTargetAtTime(eq.bodyPeakQ, now, slew * 0.4);
    this.voiceBodyPeak.gain.setTargetAtTime(eq.bodyPeakGainDb, now, slew * 0.4);

    if (this.voiceFormant2) {
      const f2 = pAudio.formant2 || { freq: 880, gainDb: 1.5, Q: 1.2 };
      this.voiceFormant2.frequency.setTargetAtTime(f2.freq, now, slew * 0.4);
      this.voiceFormant2.Q.setTargetAtTime(f2.Q, now, slew * 0.4);
      this.voiceFormant2.gain.setTargetAtTime(f2.gainDb, now, slew * 0.4);
    }

    this.voiceHarshDip.frequency.setTargetAtTime(eq.harshDipFreq, now, slew * 0.4);
    this.voiceHarshDip.Q.setTargetAtTime(eq.harshDipQ, now, slew * 0.4);
    this.voiceHarshDip.gain.setTargetAtTime(eq.harshDipGainDb, now, slew * 0.4);

    this.voiceAirShelf.frequency.setTargetAtTime(eq.airShelfFreq, now, slew * 0.4);
    this.voiceAirShelf.gain.setTargetAtTime(eq.airShelfGainDb, now, slew * 0.4);

    this.voiceOutGain.gain.setTargetAtTime(pAudio.outputGain || 1.1, now, slew * 0.4);
    if (this.voiceReverbScale) {
      this.voiceReverbScale.gain.setTargetAtTime(pAudio.reverbScale || 1.25, now, slew * 0.4);
    }
    if (this.aliquotShelf) {
      this.aliquotShelf.gain.setTargetAtTime(
        clamp((pAudio.aliquotMix || 0.0) * 9.5, 0.0, 3.4),
        now,
        slew * 0.4
      );
    }
    this._refreshSympatheticPedalBus();
    return model;
  }

  /**
   * Builds an Authentic Studio Multi-Velocity Piano / Harpsichord / Fortepiano voice:
   * - Uses genuine studio acoustic recordings (Splendid Steinway, VCSL Steinway B, Salamander Yamaha C5,
   *   VCSL Kawai Grand, VCSL Knight Upright, VCSL Flemish Harpsichord, FreePats Vintage Piano, Kremsegg 1830).
   * - Crossfades real soft & forte velocity sample layers without artificial synthesizer filter sweeps.
   * - Preserves original acoustic decay, hammer transients, and natural concert-grand resonance.
   */
  _createGrandVoiceNodes(midi, vel, ampScale, panSpread, whenSec = null) {
    const now = this.ctx.currentTime;
    const t0 = Math.max(now, Number.isFinite(whenSec) ? whenSec : now);
    const prof = this.pianoAudioProfile;
    const freq = this.concertPitchHz * Math.pow(2.0, (midi - 69) / 12.0);
    const bankId = prof.sampleBank || "splendid_steinway";
    const bankSpec = REMOTE_SAMPLE_BANKS[bankId] || null;

    // Fold extreme modern 88-key notes only when instrument has an authentic historical compass (e.g. Flemish Harpsichord)
    let sampleMidi = midi;
    if (bankSpec && Number.isFinite(bankSpec.compassMin) && Number.isFinite(bankSpec.compassMax)) {
      while (sampleMidi < bankSpec.compassMin) sampleMidi += 12;
      while (sampleMidi > bankSpec.compassMax) sampleMidi -= 12;
    }

    let remoteBuf = null;
    let remoteZoneMidi = -1;
    let remoteSoftBuf = null;
    let remoteSoftZoneMidi = -1;
    let bankGainTrim = 1.0;
    let softBankGainTrim = 1.0;
    let resolvedBankId = bankId;

    if (bankId !== "kremsegg_1830") {
      const bankMap = this.sampleBankBuffers.get(bankId);
      const zMidi = this._nearestBankMidi(bankMap, sampleMidi);
      // Require decoded zones within <= 6 semitones so notes NEVER sound pitch-warped
      if (bankMap && bankMap.size >= 6 && zMidi >= 0 && Math.abs(sampleMidi - zMidi) <= 6) {
        remoteBuf = bankMap.get(zMidi);
        remoteZoneMidi = zMidi;
        bankGainTrim = bankSpec?.gainTrim || 1.0;
        const softMap = this.sampleBankSoftBuffers.get(bankId);
        const sMidi = this._nearestBankMidi(softMap, sampleMidi);
        if (softMap && softMap.size >= 6 && sMidi >= 0 && Math.abs(sampleMidi - sMidi) <= 6) {
          remoteSoftBuf = softMap.get(sMidi);
          remoteSoftZoneMidi = sMidi;
          softBankGainTrim = bankSpec?.softGainTrim || bankGainTrim;
        }
      } else {
        // Seamless studio fallback to Salamander or Splendid while a newly selected bank finishes streaming
        const fallbackOrder = bankId === "salamander" ? ["splendid_steinway"] : ["salamander", "splendid_steinway"];
        for (const fbId of fallbackOrder) {
          const fbMap = this.sampleBankBuffers.get(fbId);
          const fMidi = this._nearestBankMidi(fbMap, midi);
          if (fbMap && fbMap.size >= 4 && fMidi >= 0 && Math.abs(midi - fMidi) <= 8) {
            remoteBuf = fbMap.get(fMidi);
            remoteZoneMidi = fMidi;
            sampleMidi = midi;
            resolvedBankId = fbId;
            bankGainTrim = REMOTE_SAMPLE_BANKS[fbId]?.gainTrim || 1.0;
            break;
          }
        }
      }
    }

    const refMidi = this._nearestSampleMidi(midi);
    const bufMp = this.sampleBuffers.get(`${refMidi}_mp`);
    const bufF = this.sampleBuffers.get(`${refMidi}_f`);

    // Transparent acoustic tone filter — stays wide open for real studio recordings; gentle wool roll-off only on Felt/Moderator
    const registerNorm = clamp((midi - CONCERT_GRAND_MIN_MIDI) / 87.0, 0.0, 1.0);
    const registerBright = 0.90 + registerNorm * 0.28;
    const hasFeltMod = Boolean(prof.moderatorCutoffHz);
    const minPeakHz = hasFeltMod ? 1650 : 4800;
    const minSettledHz = hasFeltMod ? 1250 : 3800;
    const maxPeakHz = hasFeltMod ? prof.moderatorCutoffHz * 1.95 : 20000;

    const peakCutoff = clamp(
      (prof.lpBaseHz + Math.pow(vel, 0.85) * prof.lpVelSpanHz) *
        registerBright *
        (this.moderator ? 0.48 : 1.0),
      minPeakHz,
      maxPeakHz
    );
    const settledCutoff = clamp(peakCutoff * (prof.lpDecayRatio || 0.88), minSettledHz, maxPeakHz * 0.96);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.Q.value = prof.lpQ || 0.45;
    filter.frequency.setValueAtTime(peakCutoff, t0);
    filter.frequency.exponentialRampToValueAtTime(settledCutoff, t0 + 0.95);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = clamp(((midi - CONCERT_GRAND_MIN_MIDI) / 87.0 - 0.5) * panSpread, -0.74, 0.74);

    const voiceGain = this.ctx.createGain();
    // Expressive natural concert velocity curve (calibrated against per-bank RMS trim)
    const amp = Math.pow(vel, 1.24) * ampScale;
    const baseAttack = clamp(prof.attackSec || 0.0025, 0.0012, 0.015);
    const attackSec = baseAttack + (this.fazioliSoftActive ? 0.0025 : 0.0);
    voiceGain.gain.value = 0.0001;
    voiceGain.gain.setValueAtTime(0.0001, t0);
    voiceGain.gain.linearRampToValueAtTime(amp, t0 + attackSec);

    filter.connect(panner);
    panner.connect(voiceGain);
    voiceGain.connect(this.sourceBus);

    // Optional physical felt-hammer thump on Felt Cinema & historical instruments
    if ((prof.feltThumpMix || 0) > 0.08) {
      this._triggerFeltHammerThump(midi, vel, t0);
    }

    const sources = [];
    if (remoteBuf) {
      const pitchBase = this.concertPitchHz / 440.0;
      if (remoteSoftBuf && resolvedBankId === bankId) {
        // True 2-layer acoustic velocity crossfade (real soft hammer <-> real forte hammer)
        const loudWeight = clamp(
          ((vel - 0.30) / 0.46) * (0.72 + (prof.fMixBias ?? 0.55) * 0.52) * (this.moderator ? 0.35 : 1.0),
          0.0,
          1.0
        );
        const softWeight = 1.0 - loudWeight;
        if (softWeight > 0.02) {
          const sSoft = this.ctx.createBufferSource();
          sSoft.buffer = remoteSoftBuf;
          sSoft.playbackRate.value = pitchBase * Math.pow(2.0, (sampleMidi - remoteSoftZoneMidi) / 12.0);
          const gSoft = this.ctx.createGain();
          gSoft.gain.value = softWeight * softBankGainTrim;
          sSoft.connect(gSoft);
          gSoft.connect(filter);
          sSoft.start(t0);
          sources.push(sSoft);
        }
        if (loudWeight > 0.02) {
          const sLoud = this.ctx.createBufferSource();
          sLoud.buffer = remoteBuf;
          sLoud.playbackRate.value = pitchBase * Math.pow(2.0, (sampleMidi - remoteZoneMidi) / 12.0);
          const gLoud = this.ctx.createGain();
          gLoud.gain.value = loudWeight * bankGainTrim;
          sLoud.connect(gLoud);
          gLoud.connect(filter);
          sLoud.start(t0);
          sources.push(sLoud);
        }
      } else {
        const src = this.ctx.createBufferSource();
        src.buffer = remoteBuf;
        src.playbackRate.value = pitchBase * Math.pow(2.0, (sampleMidi - remoteZoneMidi) / 12.0);
        const gMain = this.ctx.createGain();
        gMain.gain.value = bankGainTrim;
        src.connect(gMain);
        gMain.connect(filter);
        src.start(t0);
        sources.push(src);
      }
    } else if (bufMp || bufF) {
      // Authentic Schloss Kremsegg 1830 Pleyel fortepiano multi-samples (verified A4 = 440.0 Hz)
      const pitchRatio = (this.concertPitchHz / 440.0) * Math.pow(2.0, (midi - refMidi) / 12.0);
      const kremseggTrim = 1.28;
      const fMix = clamp(
        clamp((vel - 0.28) / 0.58, 0, 1) *
          (prof.fMixBias ?? 0.65) *
          (this.moderator ? 0.45 : 1.0),
        0,
        1
      );
      const mpMix = 1.0 - fMix;
      if (bufMp && mpMix > 0.02) {
        const sMp = this.ctx.createBufferSource();
        sMp.buffer = bufMp;
        sMp.playbackRate.value = pitchRatio;
        const gMp = this.ctx.createGain();
        gMp.gain.value = mpMix * kremseggTrim;
        sMp.connect(gMp);
        gMp.connect(filter);
        sMp.start(t0);
        sources.push(sMp);
      }
      if (bufF && fMix > 0.02) {
        const sF = this.ctx.createBufferSource();
        sF.buffer = bufF;
        sF.playbackRate.value = pitchRatio;
        const gF = this.ctx.createGain();
        gF.gain.value = fMix * kremseggTrim;
        sF.connect(gF);
        gF.connect(filter);
        sF.start(t0);
        sources.push(sF);
      }
    } else {
      // Clean velvet piano fallback only while network sample bank is still decoding
      const decayBase = clamp(3.6 - registerNorm * 1.9, 1.3, 4.2);
      for (const [harm, hGain] of [[1, 0.52], [2, 0.22], [3, 0.08], [4, 0.025]]) {
        const osc = this.ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq * harm;
        const hg = this.ctx.createGain();
        hg.gain.setValueAtTime(0.0001, t0);
        hg.gain.linearRampToValueAtTime(hGain, t0 + attackSec * 1.2);
        hg.gain.exponentialRampToValueAtTime(0.0001, t0 + decayBase / Math.pow(harm, 0.9));
        osc.connect(hg);
        hg.connect(filter);
        osc.start(t0);
        osc.stop(t0 + decayBase + 0.15);
        sources.push(osc);
      }
    }

    return { voiceGain, sources, startTime: t0 };
  }

  playInteractiveNoteOn(rawMidi, velocity = 0.80) {
    const midi = this._resolveCompassMidi(rawMidi);
    if (midi < CONCERT_GRAND_MIN_MIDI || midi > CONCERT_GRAND_MAX_MIDI) return;
    this.keysDown.add(midi);
    this.ensureContext();
    this.resumeNonBlocking();
    this.preloadKeySamples();
    if (!this.ctx || !this.sourceBus) return;

    const vel = clamp(velocity, 0.16, 1.0);
    const { voiceGain, sources } = this._createGrandVoiceNodes(midi, vel, 0.50, 0.80);

    const voice = { midi, voiceGain, sources, damped: false };
    if (!this.activeVoices.has(midi)) this.activeVoices.set(midi, []);
    this.activeVoices.get(midi).push(voice);
    setTimeout(() => this._cleanupVoice(midi, voice), 10000);
  }

  playInteractiveNoteOff(rawMidi) {
    const midi = this._resolveCompassMidi(rawMidi);
    this.keysDown.delete(midi);
    this._evaluateDampingForMidi(midi);
  }

  _evaluateDampingForMidi(midi) {
    if (this.isDamperLifted(midi)) return;
    const list = this.activeVoices.get(midi);
    if (!list || !this.ctx) return;
    const now = this.ctx.currentTime;
    const scale = this.pianoAudioProfile?.sustainReleaseScale || 1.5;
    const releaseTau = (midi < 45 ? 0.072 : 0.044) * scale;
    let dampedAny = false;
    for (const v of list) {
      if (v.damped) continue;
      v.damped = true;
      dampedAny = true;
      try {
        v.voiceGain.gain.cancelScheduledValues(now);
        v.voiceGain.gain.setTargetAtTime(0.00001, now, releaseTau);
      } catch (_) {}
      setTimeout(() => {
        for (const s of v.sources) {
          try {
            s.stop();
          } catch (_) {}
        }
        this._cleanupVoice(midi, v);
      }, Math.ceil(releaseTau * 6500));
    }
    if (dampedAny) {
      this._triggerDamperFeltRelease(midi);
    }
  }

  _cleanupVoice(midi, voice) {
    const list = this.activeVoices.get(midi);
    if (!list) return;
    const idx = list.indexOf(voice);
    if (idx !== -1) list.splice(idx, 1);
  }

  // ==========================================================================
  // POLYPHONIC CONCERT GRAND REPERTOIRE VOICE ENGINE (96 Desktop / 48 Mobile)
  // ==========================================================================
  _selectStealVictim(now) {
    // Priority 1: steal any voice already fading out
    for (let i = 0; i < this.repertoireVoices.length; i++) {
      if (this.repertoireVoices[i].damped) return this.repertoireVoices[i];
    }
    // Priority 2: musical voice stealing — prefer oldest quiet inner-register voice (46..76),
    // protecting deep bass roots (< 46) and top singing melody (> 76)
    let bestVictim = this.repertoireVoices[0];
    let bestScore = -Infinity;
    for (let i = 0; i < this.repertoireVoices.length; i++) {
      const v = this.repertoireVoices[i];
      const age = Math.max(0, now - (v.startTime || now));
      const isMiddle = v.midi >= 46 && v.midi <= 76 ? 1.0 : 0.0;
      const quietBonus = 1.0 - (v.vel || 0.5);
      const score = age * 1.4 + isMiddle * 1.15 + quietBonus * 0.9;
      if (score > bestScore) {
        bestScore = score;
        bestVictim = v;
      }
    }
    return bestVictim;
  }

  playRepertoireNoteOn(rawMidi, velocity = 0.72, whenSec = null) {
    const midi = clamp(Math.round(rawMidi), CONCERT_GRAND_MIN_MIDI, CONCERT_GRAND_MAX_MIDI);
    this.repertoireKeysDown.add(midi);
    this.ensureContext();
    this.resumeNonBlocking();
    this.preloadKeySamples();
    if (!this.ctx || !this.sourceBus) return null;

    const vel = clamp(velocity, 0.16, 1.0);
    const now = this.ctx.currentTime;
    const t0 = Math.max(now, Number.isFinite(whenSec) ? whenSec : now);

    // Gracefully damp any older ringing voice on the exact same pitch right before re-strike
    for (const v of this.repertoireVoices) {
      if (v.midi === midi && !v.damped && (v.startTime || 0) <= t0 - 0.005) {
        this._fadeAndStopRepertoireVoice(v, 0.036, Math.max(now, t0 - 0.012));
      }
    }

    // Expanded studio concert polyphony (96 desktop / 48 mobile) for virtuoso Liszt/Rachmaninoff cascades
    const MAX_POLYPHONY = this.isMobileProfile ? 48 : 96;
    if (this.repertoireVoices.length >= MAX_POLYPHONY) {
      const victim = this._selectStealVictim(now);
      if (victim) {
        this._fadeAndStopRepertoireVoice(victim, 0.026, now);
      }
    }

    const { voiceGain, sources, startTime } = this._createGrandVoiceNodes(midi, vel, 0.22, 0.72, t0);
    const voice = { midi, vel, voiceGain, sources, startTime, damped: false, cleaned: false, timerId: null };

    this.repertoireVoices.push(voice);
    voice.timerId = setTimeout(() => this._removeRepertoireVoice(voice), 9500);
    return voice;
  }

  playRepertoireNoteOff(rawMidi, whenSec = null, targetVoice = null) {
    const midi = clamp(Math.round(rawMidi), CONCERT_GRAND_MIN_MIDI, CONCERT_GRAND_MAX_MIDI);
    this.repertoireKeysDown.delete(midi);
    if (this.isSustainActive) return;
    // Uppermost treble strings (MIDI >= 91) ring freely without dampers on concert grands
    if (this.pianoModelId !== "stein_1780" && midi >= 91) return;
    const scale = this.pianoAudioProfile?.sustainReleaseScale || 1.5;
    const releaseTau = (midi < 45 ? 0.088 : 0.052) * scale;
    if (targetVoice) {
      if (!targetVoice.damped) this._fadeAndStopRepertoireVoice(targetVoice, releaseTau, whenSec);
      return;
    }
    for (const v of this.repertoireVoices) {
      if (v.midi === midi && !v.damped) {
        this._fadeAndStopRepertoireVoice(v, releaseTau, whenSec);
      }
    }
  }

  _evaluateRepertoireDamping() {
    if (this.isSustainActive) return;
    const scale = this.pianoAudioProfile?.sustainReleaseScale || 1.5;
    for (const v of this.repertoireVoices) {
      if (!v.damped && !this.repertoireKeysDown.has(v.midi)) {
        const releaseTau = (v.midi < 45 ? 0.088 : 0.052) * scale;
        this._fadeAndStopRepertoireVoice(v, releaseTau);
      }
    }
  }

  _fadeAndStopRepertoireVoice(voice, releaseTau = 0.045, whenSec = null) {
    if (!voice || voice.damped) return;
    voice.damped = true;
    let delayMs = Math.ceil(releaseTau * 6000) + 25;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const minAfterAttack = (voice.startTime || now) + 0.018;
      const tFade = Math.max(now, minAfterAttack, Number.isFinite(whenSec) ? whenSec : now);
      delayMs = Math.ceil((tFade - now + releaseTau * 6.0) * 1000) + 35;
      try {
        voice.voiceGain.gain.cancelScheduledValues(tFade);
        voice.voiceGain.gain.setTargetAtTime(0.00001, tFade, releaseTau);
      } catch (_) {}
    }
    setTimeout(() => {
      for (const s of voice.sources) {
        try {
          s.stop();
        } catch (_) {}
      }
      this._removeRepertoireVoice(voice);
    }, delayMs);
  }

  _removeRepertoireVoice(voice) {
    if (!voice || voice.cleaned) return;
    voice.cleaned = true;
    if (voice.timerId) {
      clearTimeout(voice.timerId);
      voice.timerId = null;
    }
    const idx = this.repertoireVoices.indexOf(voice);
    if (idx !== -1) this.repertoireVoices.splice(idx, 1);
  }

  stopAllRepertoireVoices() {
    this.repertoireKeysDown.clear();
    const copy = this.repertoireVoices.slice();
    for (const v of copy) {
      this._fadeAndStopRepertoireVoice(v, 0.022);
    }
  }
}

/**
 * Period-Instrument Fortepiano Repertoire Performance Controller:
 * Synchronizes 10 historical Stein / Walter / Schantz / Haschka recordings of Beethoven & Schubert
 * (defaulting to Beethoven's Kurfürsten Sonata No. 2 in F Minor, WoO 47 on a 1788 J. A. Stein replica)
 * with the 61-key 3D Prellmechanik action on Koerner Hall's concert stage.
 */
export class FortepianoRepertoirePerformance {
  constructor({ acoustics, fortepianoRig, onStateChange, onProgress, onPieceChange }) {
    this.acoustics = acoustics;
    this.fortepianoRig = fortepianoRig;
    this.onStateChange = onStateChange || (() => {});
    this.onProgress = onProgress || (() => {});
    this.onPieceChange = onPieceChange || (() => {});

    this.repertoire = HISTORICAL_REPERTOIRE;
    this.currentPieceIndex = 0;
    this.versionId = DEFAULT_PIECE_VERSION_ID;
    this._selectRequestToken = 0;

    this.loaded = false;
    this.playing = false;
    this.isSampledPiece = false;
    this.durationSec = 228.88;
    this.a4Hz = 425.0;
    this.events = [];
    this.pedalIntervals = [];
    this.eventPtr = 0;
    this.audioEventPtr = 0;
    this.scheduledOffs = [];
    this.scheduledAudioOffs = [];

    this.pausedAtSec = 0.0;
    this.startWallSec = 0.0;
    this.audioClockBase = 0.0;
    this.seekBaseSec = 0.0;
    this.tempoRate = 1.0;
    this.audioEl = null;

    this._loadPieceData(0);
  }

  get currentPiece() {
    return this.repertoire[this.currentPieceIndex] || this.repertoire[0];
  }

  setTempoRate(rate = 1.0) {
    const nextRate = clamp(Number(rate) || 1.0, 0.25, 1.5);
    if (Math.abs(nextRate - this.tempoRate) < 1e-4) return this.tempoRate;
    const nowSec = performance.now() * 0.001;
    if (this.playing) {
      const curT = this.getCurrentTimeSec(nowSec);
      this.seekBaseSec = curT;
      this.pausedAtSec = curT;
      this.startWallSec = nowSec;
      if (this.acoustics?.ctx) {
        this.audioClockBase = this.acoustics.ctx.currentTime;
      }
    }
    this.tempoRate = nextRate;
    if (this.audioEl) {
      try {
        this.audioEl.preservesPitch = true;
        this.audioEl.playbackRate = nextRate;
      } catch (_) {}
    }
    return this.tempoRate;
  }

  getVisualizerState() {
    return {
      events: this.events,
      currentTimeSec: this.getCurrentTimeSec(),
      tempoRate: this.tempoRate,
      playing: this.playing,
      piece: this.currentPiece,
      versionId: this.versionId,
    };
  }

  _isPedalDownAt(t) {
    if (!this.pedalIntervals || this.pedalIntervals.length === 0) return false;
    for (let i = 0; i < this.pedalIntervals.length; i++) {
      const iv = this.pedalIntervals[i];
      if (t >= iv[0] && t < iv[1]) return true;
      if (iv[0] > t) break;
    }
    return false;
  }

  _buildEventsWithInnerVoiceClarity(rawNotes) {
    if (!rawNotes || rawNotes.length === 0) return [];

    // Compute piece-level velocity quantiles (p15 and p95) so quiet inner voices are NEVER buried
    // while authentic musical crescendos and phrasing remain expressive.
    const rawVels = new Array(rawNotes.length);
    for (let i = 0; i < rawNotes.length; i++) {
      rawVels[i] = clamp(Number(rawNotes[i][5] ?? 0.65), 0.08, 1.0);
    }
    const sortedVels = rawVels.slice().sort((a, b) => a - b);
    const p15 = sortedVels[Math.floor(sortedVels.length * 0.15)] || 0.25;
    const p95 = sortedVels[Math.min(sortedVels.length - 1, Math.floor(sortedVels.length * 0.95))] || 0.85;
    const span = Math.max(0.18, p95 - p15);
    const isFlatLoudMidi = p15 > 0.64;

    const events = rawNotes
      .map((n, i) => {
        const rawMidi = Number(n[4] ?? 60);
        const handTag = n[6] === "LH" || n[6] === "RH" ? n[6] : rawMidi >= 60 ? "RH" : "LH";
        const exactMidi = clamp(Math.round(rawMidi), CONCERT_GRAND_MIN_MIDI, CONCERT_GRAND_MAX_MIDI);
        const rawV = rawVels[i];
        const norm = clamp((rawV - p15) / span, 0.0, 1.0);
        // Remap into [0.24 .. 0.86] so pp accompaniment stays legible while preserving 11 dB concert headroom
        let clarityVel = 0.24 + norm * 0.62;
        if (isFlatLoudMidi && handTag === "LH") {
          clarityVel *= 0.80; // Let singing RH melody shine over flat-velocity LH accompaniment
        }
        return {
          t: Number(n[0] ?? 0),
          dur: Number(n[1] ?? 0.22),
          beat: Number(n[2] ?? 0),
          durBeats: Number(n[3] ?? 0.5),
          midi: exactMidi,
          audioMidi: exactMidi,
          vel: clamp(clarityVel, 0.20, 0.88),
          hand: handTag,
        };
      })
      .sort((a, b) => a.t - b.t || a.midi - b.midi);

    // Ensure crisp escapement releases ~20 ms prior to same-key re-strike
    const lastPerMidi = new Map();
    for (const ev of events) {
      const prev = lastPerMidi.get(ev.midi);
      if (prev && prev.t + prev.dur > ev.t - 0.020) {
        prev.dur = Math.max(0.020, ev.t - prev.t - 0.020);
      }
      lastPerMidi.set(ev.midi, ev);
    }
    return events;
  }

  _loadPieceData(index, scoreOverride = null) {
    const safeIdx = clamp(Math.floor(Number(index) || 0), 0, this.repertoire.length - 1);
    this.currentPieceIndex = safeIdx;
    const piece = this.repertoire[safeIdx];
    this.isSampledPiece = !piece.audioUrl || piece.playbackMode === "sampled";

    let activeScore = scoreOverride;
    if (!activeScore && this.isSampledPiece) {
      const baseNotes = piece.alignedNotes || [];
      const basePedal = Array.isArray(piece.kneePedal) ? piece.kneePedal : [];
      if (baseNotes.length > 0) {
        activeScore = applyVersionToScore(
          piece,
          {
            alignedNotes: baseNotes,
            kneePedal: basePedal,
            durationSec: piece.durationSec,
            bpm: piece.bpm,
          },
          this.versionId
        );
      }
    }

    const rawNotes = activeScore ? activeScore.alignedNotes : (piece.alignedNotes || []);
    const events = this.isSampledPiece
      ? this._buildEventsWithInnerVoiceClarity(rawNotes)
      : rawNotes
          .map((n) => {
            const rawMidi = Number(n[4] ?? 60);
            const handTag = n[6] === "LH" || n[6] === "RH" ? n[6] : rawMidi >= 60 ? "RH" : "LH";
            const exactMidi = clamp(Math.round(rawMidi), CONCERT_GRAND_MIN_MIDI, CONCERT_GRAND_MAX_MIDI);
            return {
              t: Number(n[0] ?? 0),
              dur: Number(n[1] ?? 0.22),
              beat: Number(n[2] ?? 0),
              durBeats: Number(n[3] ?? 0.5),
              midi: exactMidi,
              audioMidi: exactMidi,
              vel: clamp(Number(n[5] ?? 0.80), 0.14, 1.0),
              hand: handTag,
            };
          })
          .sort((a, b) => a.t - b.t || a.midi - b.midi);

    this.events = events;
    this.activeAlignedNotes = rawNotes;
    this.pedalIntervals = activeScore
      ? activeScore.kneePedal
      : Array.isArray(piece.kneePedal)
        ? piece.kneePedal
        : [];
    this.durationSec = Number(activeScore?.durationSec || piece.durationSec || 228.88);
    this.a4Hz = this.isSampledPiece
      ? Number(this.acoustics?.pianoAudioProfile?.a4Hz || 440.0)
      : Number(piece.tuningA4 || 425.0);
    if (this.acoustics) {
      if (!this.isSampledPiece) {
        this.acoustics.concertPitchHz = this.a4Hz;
      } else {
        this.acoustics.concertPitchHz = this.acoustics.pianoAudioProfile?.a4Hz || 440.0;
      }
      this.acoustics.stopAllRepertoireVoices();
      if (this.isSampledPiece) {
        this.acoustics.preloadKeySamples();
      }
    }
    this.loaded = true;
    this.pausedAtSec = 0.0;
    this.seekBaseSec = 0.0;
    this.eventPtr = 0;
    this.audioEventPtr = 0;
    this.scheduledOffs = [];
    this.scheduledAudioOffs = [];

    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch (_) {}
      if (!this.isSampledPiece && piece.audioUrl) {
        const cleanRel = piece.audioUrl.replace("./", "");
        if (!this.audioEl.src.endsWith(cleanRel)) {
          this.audioEl.src = piece.audioUrl;
        }
      }
    }

    this.onPieceChange(piece, safeIdx, this.versionId);
    this.onProgress(0.0, this.durationSec);
  }

  async _resolveScoreForPieceAndVersion(piece, versionId) {
    if (!piece) return null;
    const isSampled = !piece.audioUrl || piece.playbackMode === "sampled";
    if (!isSampled) return null;

    // Check if this piece + version uses a real alternate virtuoso MIDI recording (e.g. Moonlight III Presto!)
    const altId = getAlternateScoreIdForVersion(piece.id, versionId);
    if (altId && hasRealMidiScore(altId)) {
      const altScore = await loadRealMidiScoreAsync(altId);
      if (altScore) {
        return { ...altScore, _isAlternateMidi: true, versionId };
      }
    }

    let rawScore = null;
    if (hasRealMidiScore(piece.id)) {
      rawScore = unpackRealMidiScore(piece.id) || (await loadRealMidiScoreAsync(piece.id));
    } else if (Array.isArray(piece.alignedNotes) && piece.alignedNotes.length > 0) {
      rawScore = {
        alignedNotes: piece.alignedNotes,
        kneePedal: Array.isArray(piece.kneePedal) ? piece.kneePedal : [],
        durationSec: piece.durationSec,
        bpm: piece.bpm,
      };
    }

    if (!rawScore) return null;
    return applyVersionToScore(piece, rawScore, versionId);
  }

  async preload() {
    const piece = this.currentPiece;
    if (piece && this.isSampledPiece && this.events.length === 0) {
      const resolved = await this._resolveScoreForPieceAndVersion(piece, this.versionId);
      if (resolved) {
        this._loadPieceData(this.currentPieceIndex, resolved);
      }
    }
    return true;
  }

  async setVersion(versionId = DEFAULT_PIECE_VERSION_ID) {
    const nextVersion = versionId || DEFAULT_PIECE_VERSION_ID;
    if (nextVersion === this.versionId && this.events.length > 0) return nextVersion;
    this.versionId = nextVersion;
    const wasPlaying = this.playing;
    if (this.playing) this.pause();

    const token = ++this._selectRequestToken;
    const piece = this.currentPiece;
    const resolved = await this._resolveScoreForPieceAndVersion(piece, this.versionId);
    if (token !== this._selectRequestToken) return this.versionId;

    this._loadPieceData(this.currentPieceIndex, resolved);
    this._syncKinematicsToTime(0.0);
    if (wasPlaying) {
      await this.play(0.0);
    }
    return this.versionId;
  }

  async selectPiece(idOrIndex, autoPlay = false, versionOverride = null) {
    const wasPlaying = this.playing;
    if (this.playing) {
      this.pause();
    }
    if (versionOverride) {
      this.versionId = versionOverride;
    }

    let idx = 0;
    if (typeof idOrIndex === "number" || /^\d+$/.test(String(idOrIndex))) {
      idx = clamp(parseInt(String(idOrIndex), 10), 0, this.repertoire.length - 1);
    } else {
      const q = String(idOrIndex).trim().toLowerCase();
      const found = this.repertoire.findIndex(
        (p) => p.id.toLowerCase() === q || p.id.toLowerCase().includes(q)
      );
      if (found >= 0) idx = found;
    }

    const token = ++this._selectRequestToken;
    const piece = this.repertoire[idx];
    const resolved = await this._resolveScoreForPieceAndVersion(piece, this.versionId);
    if (token !== this._selectRequestToken) return;

    this._loadPieceData(idx, resolved);
    this._syncKinematicsToTime(0.0);
    if (autoPlay || wasPlaying) {
      await this.play(0.0);
    }
  }

  _ensureAudioElement() {
    const piece = this.currentPiece;
    if (!this.audioEl) {
      const el = new Audio();
      el.crossOrigin = "anonymous";
      el.preload = "auto";
      el.preservesPitch = true;
      el.playbackRate = this.tempoRate;
      el.src = piece.audioUrl;
      this.audioEl = el;
      this.acoustics.bindMediaElement(el);
    } else if (piece?.audioUrl) {
      this.audioEl.preservesPitch = true;
      this.audioEl.playbackRate = this.tempoRate;
      const cleanRel = piece.audioUrl.replace("./", "");
      if (!this.audioEl.src.endsWith(cleanRel)) {
        this.audioEl.src = piece.audioUrl;
      }
    }
    return this.audioEl;
  }

  _syncKinematicsToTime(targetSec) {
    if (this.fortepianoRig) this.fortepianoRig.releaseAllKeysAndPedals();
    this.scheduledOffs = [];
    this.scheduledAudioOffs = [];
    this.acoustics.keysDown.clear();
    this.acoustics.stopAllRepertoireVoices();

    const t = clamp(Number(targetSec) || 0, 0, this.durationSec);
    this.acoustics.setKneeLever(this._isPedalDownAt(t));
    this.eventPtr = 0;

    while (this.eventPtr < this.events.length && this.events[this.eventPtr].t <= t) {
      const ev = this.events[this.eventPtr++];
      const offTime = ev.t + Math.max(0.050, ev.dur * 0.94);
      if (offTime > t) {
        if (this.fortepianoRig) this.fortepianoRig.holdKeyMidNote(ev.midi, ev.vel, ev.hand);
        this.acoustics.keysDown.add(ev.midi);
        this.scheduledOffs.push({ offTime, midi: ev.midi, audioMidi: ev.audioMidi });
      }
    }
    this.audioEventPtr = this.eventPtr;

    this.onProgress(t, this.durationSec);
  }

  async play(seekSec = null) {
    await this.preload();
    await this.acoustics.resumeNonBlocking();

    const startAt =
      seekSec !== null
        ? clamp(Number(seekSec), 0, this.durationSec - 0.05)
        : this.pausedAtSec >= this.durationSec - 0.2
          ? 0.0
          : this.pausedAtSec;

    if (this.isSampledPiece) {
      if (this.audioEl) {
        try {
          this.audioEl.pause();
        } catch (_) {}
      }
      // Wait for Studio Salamander Concert Grand middle register (or Kremsegg on Stein 1780) before Note 1
      await Promise.race([
        this.acoustics.waitForActivePianoSamples(),
        new Promise((r) => setTimeout(r, 2200)),
      ]);
      this.seekBaseSec = startAt;
      this.startWallSec = performance.now() * 0.001;
      const ctx = this.acoustics?.ctx;
      this._wasAudioRunning = Boolean(ctx && ctx.state === "running");
      if (ctx) {
        this.audioClockBase = ctx.currentTime + 0.025;
      }
      this._syncKinematicsToTime(startAt);
      this.playing = true;
      this.onStateChange(true);
      return;
    }

    const el = this._ensureAudioElement();
    this.seekBaseSec = startAt;
    this.startWallSec = performance.now() * 0.001;
    this._syncKinematicsToTime(startAt);

    try {
      if (Math.abs((el.currentTime || 0) - startAt) > 0.08) {
        el.currentTime = startAt;
      }
    } catch (_) {}

    this.playing = true;
    this.onStateChange(true);

    Promise.race([
      el.play().catch(() => {}),
      new Promise((r) => setTimeout(r, 150)),
    ]).then(() => {
      if (this.playing && el && !el.paused && Math.abs(el.currentTime - startAt) > 0.35) {
        try {
          el.currentTime = startAt;
        } catch (_) {}
      }
      this.startWallSec = performance.now() * 0.001;
    });
  }

  pause() {
    if (!this.playing) return;
    this.pausedAtSec = this.getCurrentTimeSec();
    this.playing = false;
    if (this.audioEl) {
      try {
        this.audioEl.pause();
      } catch (_) {}
    }
    this.acoustics.stopAllRepertoireVoices();
    if (this.fortepianoRig) this.fortepianoRig.releaseAllKeysAndPedals();
    this.acoustics.keysDown.clear();
    this.acoustics.setKneeLever(false);
    this.scheduledAudioOffs = [];
    this.onStateChange(false);
    this.onProgress(this.pausedAtSec, this.durationSec);
  }

  togglePlay() {
    if (this.playing) this.pause();
    else this.play();
  }

  seek(targetSec) {
    const clamped = clamp(Number(targetSec) || 0, 0, this.durationSec - 0.05);
    this.pausedAtSec = clamped;
    this.seekBaseSec = clamped;
    this.startWallSec = performance.now() * 0.001;
    if (this.acoustics?.ctx) {
      this.audioClockBase = this.acoustics.ctx.currentTime + 0.02;
    }
    if (!this.isSampledPiece && this.audioEl) {
      try {
        this.audioEl.currentTime = clamped;
      } catch (_) {}
    }
    this._syncKinematicsToTime(clamped);
  }

  getCurrentTimeSec(nowSec = performance.now() * 0.001) {
    if (!this.playing) return this.pausedAtSec;
    if (this.isSampledPiece) {
      const ctx = this.acoustics?.ctx;
      const running = Boolean(ctx && ctx.state === "running");
      if (running) {
        if (!this._wasAudioRunning) {
          // Seamless re-anchor when AudioContext finishes resuming after playback started
          const wallT = this.seekBaseSec + Math.max(0, nowSec - this.startWallSec) * this.tempoRate;
          this.audioClockBase = ctx.currentTime - (wallT - this.seekBaseSec) / this.tempoRate;
          this._wasAudioRunning = true;
        }
        return this.seekBaseSec + Math.max(0, ctx.currentTime - this.audioClockBase) * this.tempoRate;
      }
      this._wasAudioRunning = false;
      return this.seekBaseSec + Math.max(0, nowSec - this.startWallSec) * this.tempoRate;
    }
    if (
      this.audioEl &&
      !this.audioEl.paused &&
      Number.isFinite(this.audioEl.currentTime) &&
      this.audioEl.readyState >= 2
    ) {
      const audioT = this.audioEl.currentTime;
      const wallElapsed = Math.max(0, nowSec - this.startWallSec);
      if (wallElapsed < 0.25 || audioT > this.seekBaseSec + 0.02) {
        return audioT;
      }
    }
    return this.seekBaseSec + Math.max(0, nowSec - this.startWallSec) * this.tempoRate;
  }

  update(nowSec = performance.now() * 0.001) {
    if (!this.playing || !this.loaded) return false;
    const t = this.getCurrentTimeSec(nowSec);
    this.pausedAtSec = t;
    this.onProgress(t, this.durationSec);

    if (this.pedalIntervals.length > 0) {
      const shouldPedal = this._isPedalDownAt(t);
      if (shouldPedal !== this.acoustics.damperSustain) {
        this.acoustics.setKneeLever(shouldPedal);
      }
    }

    // 1. Sample-accurate Web Audio Hardware Lookahead Scheduler (95 ms ahead = ZERO frame-rate rhythm jitter!)
    if (this.isSampledPiece) {
      const ctx = this.acoustics?.ctx;
      const useHardwareClock = Boolean(ctx && ctx.state === "running");
      const lookaheadScoreSec = (useHardwareClock ? 0.095 : 0.0) * this.tempoRate;
      const audioHorizon = t + lookaheadScoreSec;

      while (
        this.audioEventPtr < this.events.length &&
        this.events[this.audioEventPtr].t <= audioHorizon
      ) {
        const ev = this.events[this.audioEventPtr++];
        if (ev.t >= t - 0.14 * this.tempoRate) {
          const whenAudioSec = useHardwareClock
            ? Math.max(ctx.currentTime, this.audioClockBase + (ev.t - this.seekBaseSec) / this.tempoRate)
            : null;
          const voice = this.acoustics.playRepertoireNoteOn(ev.audioMidi, ev.vel, whenAudioSec);
          this.scheduledAudioOffs.push({
            offTime: ev.t + Math.max(0.050, ev.dur * 0.94),
            audioMidi: ev.audioMidi,
            voice,
          });
        }
      }

      for (let i = this.scheduledAudioOffs.length - 1; i >= 0; i--) {
        const aOff = this.scheduledAudioOffs[i];
        if (audioHorizon >= aOff.offTime) {
          const whenOffSec = useHardwareClock
            ? Math.max(ctx.currentTime, this.audioClockBase + (aOff.offTime - this.seekBaseSec) / this.tempoRate)
            : null;
          this.acoustics.playRepertoireNoteOff(aOff.audioMidi, whenOffSec, aOff.voice);
          this.scheduledAudioOffs.splice(i, 1);
        }
      }
    }

    // 2. Frame-synchronized 3D Piano Key & Hammer Kinematics (exact visual beat lock)
    while (this.eventPtr < this.events.length && this.events[this.eventPtr].t <= t) {
      const ev = this.events[this.eventPtr++];
      for (let k = this.scheduledOffs.length - 1; k >= 0; k--) {
        if (this.scheduledOffs[k].midi === ev.midi) this.scheduledOffs.splice(k, 1);
      }
      if (this.fortepianoRig) {
        this.fortepianoRig.strikeKey(ev.midi, ev.vel, ev.hand);
      }
      if (!this.isSampledPiece) {
        this.acoustics.keysDown.add(ev.midi);
      }
      this.scheduledOffs.push({
        offTime: ev.t + Math.max(0.050, ev.dur * 0.94),
        midi: ev.midi,
        audioMidi: ev.audioMidi,
      });
    }

    for (let i = this.scheduledOffs.length - 1; i >= 0; i--) {
      const off = this.scheduledOffs[i];
      if (t >= off.offTime) {
        if (this.fortepianoRig) this.fortepianoRig.releaseKey(off.midi);
        if (!this.isSampledPiece) {
          this.acoustics.keysDown.delete(off.midi);
        }
        this.scheduledOffs.splice(i, 1);
      }
    }

    if ((!this.isSampledPiece && this.audioEl && this.audioEl.ended) || t >= this.durationSec + 0.1) {
      this.pausedAtSec = 0.0;
      this.pause();
      return false;
    }
    return true;
  }
}
