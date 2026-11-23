/**
 * World Concert Halls & 4-Zone Spatial Listening Profiles
 *
 * Defines 5 iconic world concert venues (acoustic RT60/convolver parameters +
 * stage lighting atmosphere) and 4 high-performance acoustic listening zones
 * (from Pianist at Keyboard to Upper Balcony) with zero seating-mesh overhead.
 */

export const DEFAULT_HALL_ID = "koerner_hall";
export const DEFAULT_ZONE_ID = "front_row";

export const CONCERT_HALLS = [
  {
    id: "koerner_hall",
    name: "Koerner Hall",
    shortLabel: "Koerner Hall",
    city: "Торонто, Канада",
    opened: "2009",
    capacity: "1 135 мест",
    rt60Label: "1.95 сек",
    tagline: "Тёплый дубовый купол и эталонная камерно-концертная ясность",
    description:
      "Один из самых совершенных современных залов мира. Волнистый акустический «парус» из белого дуба над сценой отражает чистые обертоны рояля без гулкости, сохраняя бархатную глубину басов.",
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
      fogDensity: 0.008,
      keyColor: 0xffdfba,
      keyIntensity: 1.0,
      fillColor: 0xffe4c4,
      fillIntensity: 1.0,
      hemiSky: 0xffd9ad,
      hemiGround: 0x3b2818,
      hemiIntensity: 1.0,
      stageAccentColor: 0xffd5a0,
      stageAccentIntensity: 0.0,
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
      exposure: 0.78,
      bgHex: 0x1d160d,
      fogHex: 0x241a0e,
      fogDensity: 0.010,
      keyColor: 0xffcb78,
      keyIntensity: 1.22,
      fillColor: 0xffe19c,
      fillIntensity: 1.16,
      hemiSky: 0xffcf7d,
      hemiGround: 0x4d3214,
      hemiIntensity: 1.15,
      stageAccentColor: 0xffc052,
      stageAccentIntensity: 0.95,
    },
  },
  {
    id: "carnegie_hall",
    name: "Carnegie Hall · Stern Auditorium",
    shortLabel: "Carnegie Hall (США)",
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
      exposure: 0.73,
      bgHex: 0x161213,
      fogHex: 0x1b1516,
      fogDensity: 0.009,
      keyColor: 0xfff0dd,
      keyIntensity: 1.14,
      fillColor: 0xffd2b8,
      fillIntensity: 0.96,
      hemiSky: 0xffe6cc,
      hemiGround: 0x3b1f22,
      hemiIntensity: 0.95,
      stageAccentColor: 0xffc8a8,
      stageAccentIntensity: 0.55,
    },
  },
  {
    id: "royal_albert_hall",
    name: "Royal Albert Hall",
    shortLabel: "Royal Albert (Лондон)",
    city: "Лондон, Великобритания",
    opened: "1871",
    capacity: "5 272 места",
    rt60Label: "2.95 сек",
    tagline: "Огромный купольный объём и длинное торжественное эхо",
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
      exposure: 0.68,
      bgHex: 0x190f12,
      fogHex: 0x201216,
      fogDensity: 0.013,
      keyColor: 0xffc899,
      keyIntensity: 1.08,
      fillColor: 0xe69588,
      fillIntensity: 0.92,
      hemiSky: 0xffba94,
      hemiGround: 0x451822,
      hemiIntensity: 0.90,
      stageAccentColor: 0xd96858,
      stageAccentIntensity: 1.05,
    },
  },
  {
    id: "suntory_salon",
    name: "Suntory Intimate Studio",
    shortLabel: "Камерный салон (Токио)",
    city: "Токио, Япония",
    opened: "1986",
    capacity: "384 места",
    rt60Label: "1.18 сек",
    tagline: "Кристальная близость, сухой фокус и идеальный разбор деталей",
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
      exposure: 0.77,
      bgHex: 0x11151b,
      fogHex: 0x151b24,
      fogDensity: 0.006,
      keyColor: 0xedf4ff,
      keyIntensity: 1.05,
      fillColor: 0xcce0ff,
      fillIntensity: 1.04,
      hemiSky: 0xdbeaff,
      hemiGround: 0x222c3a,
      hemiIntensity: 1.02,
      stageAccentColor: 0x9ec8ff,
      stageAccentIntensity: 0.85,
    },
  },
];

export const CONCERT_HALL_BY_ID = new Map(CONCERT_HALLS.map((h) => [h.id, h]));

export function getConcertHall(hallId) {
  return CONCERT_HALL_BY_ID.get(hallId) || CONCERT_HALLS[0];
}

/**
 * 4 High-Performance Acoustic Listening Zones in the Auditorium.
 * Coordinates are in Koerner Hall Three.js world space (piano stage source ≈ [0.22, 1.85, 3.65]).
 */
export const LISTENING_ZONES = [
  {
    id: "pianist",
    name: "У клавиатуры",
    shortLabel: "Пианист",
    distanceLabel: "0.8 м",
    tier: "Stage",
    description: "Широкое стерео клавиатуры, максимальная чёткость атаки молоточков и дыхание струн.",
    listenerPos: [0.84, 2.08, 3.65],
    lookAt: [0.15, 1.72, 3.65],
    wetMul: 0.72,
    directBoostDb: 1.6,
  },
  {
    id: "front_row",
    name: "Первый ряд партера",
    shortLabel: "Партер (близко)",
    distanceLabel: "4.6 м",
    tier: "Orchestra",
    description: "Прямой фокус из-под открытой крышки рояля — яркие обертоны и живое присутствие сцены.",
    listenerPos: [0.35, 1.68, -0.95],
    lookAt: [0.22, 1.78, 3.65],
    wetMul: 0.96,
    directBoostDb: 0.4,
  },
  {
    id: "hall_center",
    name: "Центр зала",
    shortLabel: "Центр зала",
    distanceLabel: "12.5 м",
    tier: "Orchestra",
    description: "Золотое сечение концертного зала: гармоничный сплав прямого тембра и тёплого объёма стен.",
    listenerPos: [0.0, 2.35, -8.85],
    lookAt: [0.22, 1.85, 3.65],
    wetMul: 1.24,
    directBoostDb: -0.6,
  },
  {
    id: "upper_balcony",
    name: "Верхний балкон",
    shortLabel: "Балкон",
    distanceLabel: "21.5 м",
    tier: "Upper Balcony",
    description: "Воздушная мягкость на высоте купола: сглаженная атака, деликатные верха и глубокое эхо зала.",
    listenerPos: [0.0, 8.95, -16.8],
    lookAt: [0.22, 1.85, 3.65],
    wetMul: 1.56,
    directBoostDb: -1.8,
  },
];

export const LISTENING_ZONE_BY_ID = new Map(LISTENING_ZONES.map((z) => [z.id, z]));

export function getListeningZone(zoneId) {
  return LISTENING_ZONE_BY_ID.get(zoneId) || LISTENING_ZONES[1];
}
