/**
 * World Concert Halls & 7-Zone Spatial Listening Seats (1 Clickable Seat per Zone)
 *
 * Defines 5 iconic world concert venues (acoustic RT60/convolver parameters +
 * full 3D architectural color-grading & stage lighting atmosphere) and 7 distinct
 * listening positions — Pianist + 6 physical 3D auditorium seats across Left/Right
 * Parterre, Center Parterre, Left/Right Balcony, and Upper Balcony for authentic
 * binaural headphone spatialization (ITD + ILD + side-wall reflections + open lid).
 */

export const DEFAULT_HALL_ID = "koerner_hall";
export const DEFAULT_ZONE_ID = "parterre_center";

export const CONCERT_HALLS = [
  {
    id: "koerner_hall",
    name: "Koerner Hall",
    shortLabel: "Koerner Hall (Торонто)",
    city: "Торонто, Канада",
    opened: "2009",
    capacity: "1 135 мест",
    rt60Label: "1.95 сек",
    tagline: "Тёплый дубовый купол и эталонная камерно-концертная ясность",
    description:
      "Один из самых совершенных современных залов мира. Волнистый акустический «парус» из канадского белого дуба над сценой отражает чистые обертоны рояля без гулкости, сохраняя бархатную глубину басов.",
    acoustics: {
      rt60: 1.95,
      irDurationSec: 2.45,
      preDelaySec: 0.016,
      lowDecayMul: 1.18,
      highDecayMul: 0.54,
      reverbWetScale: 1.0,
      reverbBrightnessHz: 5600,
      earlyGainScale: 1.0,
      warmthDb: 0.4,
      airTiltDb: 0.0,
    },
    lighting: {
      exposure: 0.72,
      bgHex: 0x161412,
      fogHex: 0x1a1612,
      fogDensity: 0.007,
      archTintHex: 0xffffff,
      lightMapMul: 1.0,
      emissiveTintHex: 0xffe4b8,
      seatVelvetHex: 0x6e1a20,
      keyColor: 0xffdfba,
      keyIntensity: 1.0,
      fillColor: 0xffe4c4,
      fillIntensity: 1.0,
      hemiSky: 0xffd9ad,
      hemiGround: 0x3b2818,
      hemiIntensity: 1.0,
      stageAccentColor: 0xffd5a0,
      stageAccentIntensity: 0.15,
    },
  },
  {
    id: "musikverein_vienna",
    name: "Musikverein · Золотой зал",
    shortLabel: "Musikverein (Вена)",
    city: "Вена, Австрия",
    opened: "1870",
    capacity: "1 744 места",
    rt60Label: "2.38 сек",
    tagline: "Легендарная «коробка» с золотым сиянием и медовым венским звуком",
    description:
      "Золотой зал Венского музыкального общества считается акустическим чудом XIX века. Пропорции классического параллелепипеда и позолоченный кессонный потолок создают богатое, певучее и обволакивающее звучание.",
    acoustics: {
      rt60: 2.38,
      irDurationSec: 2.95,
      preDelaySec: 0.021,
      lowDecayMul: 1.28,
      highDecayMul: 0.60,
      reverbWetScale: 1.24,
      reverbBrightnessHz: 6100,
      earlyGainScale: 1.18,
      warmthDb: 1.8,
      airTiltDb: 0.6,
    },
    lighting: {
      exposure: 0.84,
      bgHex: 0x261b0a,
      fogHex: 0x33230c,
      fogDensity: 0.011,
      archTintHex: 0xffd170,
      lightMapMul: 1.26,
      emissiveTintHex: 0xffcf64,
      seatVelvetHex: 0x8a1c1c,
      keyColor: 0xffcb68,
      keyIntensity: 1.38,
      fillColor: 0xffe28c,
      fillIntensity: 1.28,
      hemiSky: 0xffcf70,
      hemiGround: 0x5c3a12,
      hemiIntensity: 1.25,
      stageAccentColor: 0xffb838,
      stageAccentIntensity: 1.35,
    },
  },
  {
    id: "carnegie_hall",
    name: "Carnegie Hall · Stern Auditorium",
    shortLabel: "Carnegie Hall (Нью-Йорк)",
    city: "Нью-Йорк, США",
    opened: "1891",
    capacity: "2 804 места",
    rt60Label: "2.08 сек",
    tagline: "Величественная сцена величайших пианистов XX и XXI веков",
    description:
      "Открытый концертом под управлением П. И. Чайковского, зал Карнеги славится мощной проекцией концертного рояля: каждый штрих слышен даже на самом верхнем ярусе, сохраняя благородную глубину.",
    acoustics: {
      rt60: 2.08,
      irDurationSec: 2.65,
      preDelaySec: 0.019,
      lowDecayMul: 1.14,
      highDecayMul: 0.58,
      reverbWetScale: 1.10,
      reverbBrightnessHz: 6350,
      earlyGainScale: 1.06,
      warmthDb: 0.9,
      airTiltDb: 0.9,
    },
    lighting: {
      exposure: 0.77,
      bgHex: 0x1c1416,
      fogHex: 0x261a1e,
      fogDensity: 0.009,
      archTintHex: 0xf7ded9,
      lightMapMul: 1.08,
      emissiveTintHex: 0xfff0e6,
      seatVelvetHex: 0x8f1826,
      keyColor: 0xfff2e8,
      keyIntensity: 1.22,
      fillColor: 0xffcbbd,
      fillIntensity: 1.06,
      hemiSky: 0xffe6dd,
      hemiGround: 0x4a1d24,
      hemiIntensity: 1.02,
      stageAccentColor: 0xffbfa8,
      stageAccentIntensity: 0.95,
    },
  },
  {
    id: "royal_albert_hall",
    name: "Royal Albert Hall",
    shortLabel: "Royal Albert Hall (Лондон)",
    city: "Лондон, Великобритания",
    opened: "1871",
    capacity: "5 272 места",
    rt60Label: "2.95 сек",
    tagline: "Огромный викторианский купол, рубиновый бархат и соборное эхо",
    description:
      "Гигантский викторианский амфитеатр под стеклянно-чугунным куполом. Длинный, бархатный шлейф реверберации превращает медленные сонаты и ноктюрны в масштабные соборные полотна.",
    acoustics: {
      rt60: 2.95,
      irDurationSec: 3.45,
      preDelaySec: 0.032,
      lowDecayMul: 1.32,
      highDecayMul: 0.44,
      reverbWetScale: 1.46,
      reverbBrightnessHz: 4550,
      earlyGainScale: 0.88,
      warmthDb: 2.2,
      airTiltDb: -1.4,
    },
    lighting: {
      exposure: 0.67,
      bgHex: 0x220c12,
      fogHex: 0x2b1018,
      fogDensity: 0.015,
      archTintHex: 0xd98988,
      lightMapMul: 0.86,
      emissiveTintHex: 0xff9c84,
      seatVelvetHex: 0x7c1022,
      keyColor: 0xffb388,
      keyIntensity: 1.15,
      fillColor: 0xe67b78,
      fillIntensity: 1.0,
      hemiSky: 0xff9c84,
      hemiGround: 0x521220,
      hemiIntensity: 0.96,
      stageAccentColor: 0xe0584c,
      stageAccentIntensity: 1.45,
    },
  },
  {
    id: "suntory_salon",
    name: "Suntory Intimate Studio",
    shortLabel: "Suntory Studio (Токио)",
    city: "Токио, Япония",
    opened: "1986",
    capacity: "384 места",
    rt60Label: "1.18 сек",
    tagline: "Кристальный прохладный свет, сухой фокус и студийная чёткость",
    description:
      "Интимная камерная акустика в духе малого зала Suntory Blue Rose. Минимальный хвост реверберации позволяет отчётливо слышать каждую ноту, педаль и прикосновение молоточка — идеально для обучения.",
    acoustics: {
      rt60: 1.18,
      irDurationSec: 1.55,
      preDelaySec: 0.008,
      lowDecayMul: 0.96,
      highDecayMul: 0.68,
      reverbWetScale: 0.58,
      reverbBrightnessHz: 7400,
      earlyGainScale: 0.92,
      warmthDb: -0.6,
      airTiltDb: 1.3,
    },
    lighting: {
      exposure: 0.80,
      bgHex: 0x0d1522,
      fogHex: 0x121d2e,
      fogDensity: 0.006,
      archTintHex: 0xa6c8f2,
      lightMapMul: 1.08,
      emissiveTintHex: 0xd8ecff,
      seatVelvetHex: 0x1d3b66,
      keyColor: 0xe6f2ff,
      keyIntensity: 1.18,
      fillColor: 0xa8d0ff,
      fillIntensity: 1.18,
      hemiSky: 0xc2dfff,
      hemiGround: 0x1a283d,
      hemiIntensity: 1.14,
      stageAccentColor: 0x7cb8ff,
      stageAccentIntensity: 1.25,
    },
  },
];

export const CONCERT_HALL_BY_ID = new Map(CONCERT_HALLS.map((h) => [h.id, h]));

export function getConcertHall(hallId) {
  return CONCERT_HALL_BY_ID.get(hallId) || CONCERT_HALLS[0];
}

/**
 * 7 Acoustic Listening Zones — Pianist + 6 Physical Clickable 3D Seats (1 per zone).
 *
 * CRITICAL BINAURAL DESIGN:
 * Piano acoustic source in Koerner Hall Three.js space = [0.22, 1.85, 3.65].
 * Auditorium seats sit at z < 0 looking toward +Z (the stage).
 * Each off-axis seat keeps `headLookAt` facing mostly straight toward the stage front (+Z)
 * so that sitting on the LEFT side places the piano audibly to your RIGHT ear (positive binauralPan,
 * right-ear lead ITD, left-ear head-shadow ILD + strong left-wall reflection), and sitting on the
 * RIGHT side places the piano audibly to your LEFT ear (negative binauralPan + bright open-lid lobe!).
 */
export const LISTENING_ZONES = [
  {
    id: "pianist",
    name: "У клавиатуры (Пианист)",
    shortLabel: "Пианист (сцена)",
    distanceLabel: "0.8 м",
    tier: "Stage",
    hasSeatMesh: false,
    description:
      "Максимальная чёткость клавиш и механики: низкие струны слева, верхние справа, мгновенный отклик молоточков.",
    listenerPos: [0.84, 2.08, 3.65],
    headLookAt: [0.15, 1.72, 3.65],
    cameraPos: [1.38, 2.14, 3.65],
    lookAt: [0.58, 1.71, 3.65],
    fov: 41.0,
    wetMul: 0.68,
    directBoostDb: 1.6,
  },
  {
    id: "parterre_center",
    name: "Партер · Центр",
    shortLabel: "Партер · Центр",
    distanceLabel: "8.9 м",
    tier: "Orchestra",
    hasSeatMesh: true,
    seatPos: [0.0, 0.14, -5.24],
    seatYaw: 0.0,
    description:
      "Идеальный центральный баланс (ряд B): прямой фокус из-под открытой крышки рояля и симметричный объём стен зала.",
    listenerPos: [0.0, 1.28, -5.24],
    headLookAt: [0.0, 1.72, 6.0],
    cameraPos: [0.0, 1.38, -5.04],
    lookAt: [0.18, 1.85, 3.65],
    fov: 40.0,
    wetMul: 0.96,
    directBoostDb: 0.5,
  },
  {
    id: "parterre_left",
    name: "Партер · Слева",
    shortLabel: "Партер · Слева",
    distanceLabel: "11.1 м",
    tier: "Orchestra",
    hasSeatMesh: true,
    seatPos: [5.45, 0.19, -6.18],
    seatYaw: -0.22,
    description:
      "В наушниках рояль звучит правее центра, а слева чувствуется тёплое раннее отражение от левой стены зала.",
    listenerPos: [5.45, 1.32, -6.18],
    headLookAt: [4.75, 1.72, 8.0],
    cameraPos: [5.45, 1.42, -5.98],
    lookAt: [0.18, 1.85, 3.65],
    fov: 41.0,
    wetMul: 1.04,
    directBoostDb: 0.1,
  },
  {
    id: "parterre_right",
    name: "Партер · Справа",
    shortLabel: "Партер · Справа",
    distanceLabel: "11.1 м",
    tier: "Orchestra",
    hasSeatMesh: true,
    seatPos: [-5.45, 0.19, -6.18],
    seatYaw: 0.22,
    description:
      "Ось открытой крышки рояля: в наушниках инструмент смещён в левое ухо с ярким блеском верхних обертонов.",
    listenerPos: [-5.45, 1.32, -6.18],
    headLookAt: [-4.75, 1.72, 8.0],
    cameraPos: [-5.45, 1.42, -5.98],
    lookAt: [0.18, 1.85, 3.65],
    fov: 41.0,
    wetMul: 1.02,
    directBoostDb: 0.2,
  },
  {
    id: "balcony_left",
    name: "Балкон · Слева",
    shortLabel: "Балкон · Слева",
    distanceLabel: "14.1 м",
    tier: "Lower Balcony",
    hasSeatMesh: true,
    seatPos: [8.64, 4.24, -7.2],
    seatYaw: -0.42,
    description:
      "Левая ложа нижнего балкона: объёмный верхний зал, рояль отчётливо слышен справа-внизу, слева — тёплая боковая реверберация.",
    listenerPos: [8.64, 5.36, -7.2],
    headLookAt: [7.4, 4.7, 8.0],
    cameraPos: [8.52, 5.44, -7.0],
    lookAt: [0.18, 1.85, 3.65],
    fov: 42.0,
    wetMul: 1.32,
    directBoostDb: -0.9,
  },
  {
    id: "balcony_right",
    name: "Балкон · Справа",
    shortLabel: "Балкон · Справа",
    distanceLabel: "14.1 м",
    tier: "Lower Balcony",
    hasSeatMesh: true,
    seatPos: [-8.64, 4.24, -7.2],
    seatYaw: 0.42,
    description:
      "Правая ложа нижнего балкона: панорамный взгляд на струны и деку, в наушниках рояль поёт в левом канале с воздушным ореолом.",
    listenerPos: [-8.64, 5.36, -7.2],
    headLookAt: [-7.4, 4.7, 8.0],
    cameraPos: [-8.52, 5.44, -7.0],
    lookAt: [0.18, 1.85, 3.65],
    fov: 42.0,
    wetMul: 1.30,
    directBoostDb: -0.8,
  },
  {
    id: "upper_balcony",
    name: "Верхний балкон · Центр",
    shortLabel: "Верхний балкон",
    distanceLabel: "24.2 м",
    tier: "Upper Balcony",
    hasSeatMesh: true,
    seatPos: [0.0, 8.34, -19.65],
    seatYaw: 0.0,
    description:
      "Первый ряд верхнего балкона под куполом: мягкая бархатная атака, богатейший концертный шлейф и панорама всего зала.",
    listenerPos: [0.0, 9.48, -19.65],
    headLookAt: [0.0, 7.6, 6.0],
    cameraPos: [0.0, 9.56, -19.45],
    lookAt: [0.18, 2.0, 3.65],
    fov: 43.0,
    wetMul: 1.58,
    directBoostDb: -1.8,
  },
];

export const LISTENING_ZONE_BY_ID = new Map(LISTENING_ZONES.map((z) => [z.id, z]));

// Preserve backward compatibility with old URL zone IDs
const ZONE_ALIASES = {
  front_row: "parterre_center",
  hall_center: "parterre_center",
};

export function getListeningZone(zoneId) {
  const resolved = ZONE_ALIASES[zoneId] || zoneId;
  return LISTENING_ZONE_BY_ID.get(resolved) || LISTENING_ZONES[1];
}
