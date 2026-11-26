/**
 * Interactive Piano & Music Theory School inside the Music Academy ("Обучение" tab)
 *
 * Playable directly inside the modal using the active 3D piano's real Web Audio engine
 * (Steinway D, Fazioli F308, Bösendorfer Imperial, Felt Cinema, Harpsichord, etc.).
 *
 * Modules:
 *  1. Ноты и клавиатура — visual landmark guide (2/3 black keys, octaves, fingerings)
 *     + live "Найди ноту" trainer with streak & audio feedback.
 *  2. Слух и интервалы — 8 essential musical intervals with live melodic/harmonic playback
 *     + interactive ear-training quiz ("Угадай интервал на слух").
 *  3. Аккорды, гаммы и гармония — root × chord/scale explorer with fingering markers,
 *     live chord/arpeggio playback, and 4 classic chord progressions.
 *  4. Практика мелодий — step-by-step guided interactive play-along for 5 famous themes
 *     (Für Elise, Ode to Joy, Moonlight Sonata, Bach Prelude C, Gymnopédie No. 1) +
 *     1-click launch into full 3D piano slow practice (0.5x + Key Glow).
 */

const START_MIDI = 60; // C4
const END_MIDI = 83; // B5 (24 keys = 2 full octaves)

const NOTE_RU = ["До", "До♯", "Ре", "Ре♯", "Ми", "Фа", "Фа♯", "Соль", "Соль♯", "Ля", "Ля♯", "Си"];
const NOTE_EN = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

// Laptop keyboard mapping for playable 2-octave keyboard (C4..E5)
const PC_KEY_TO_MIDI = {
  KeyA: 60,
  KeyW: 61,
  KeyS: 62,
  KeyE: 63,
  KeyD: 64,
  KeyF: 65,
  KeyT: 66,
  KeyG: 67,
  KeyY: 68,
  KeyH: 69,
  KeyU: 70,
  KeyJ: 71,
  KeyK: 72,
  KeyO: 73,
  KeyL: 74,
  KeyP: 75,
  Semicolon: 76,
};

const MIDI_TO_PC_LABEL = {
  60: "A",
  61: "W",
  62: "S",
  63: "E",
  64: "D",
  65: "F",
  66: "T",
  67: "G",
  68: "Y",
  69: "H",
  70: "U",
  71: "J",
  72: "K",
  73: "O",
  74: "L",
  75: "P",
  76: ";",
};

const INTERVALS = [
  { semitones: 1, name: "Малая секунда", short: "м2", mood: "Напряжённый полутон", ref: "«К Элизе» (Ми–Ре♯) и тема «Челюстей»" },
  { semitones: 2, name: "Большая секунда", short: "б2", mood: "Мягкий шаг (целый тон)", ref: "Начало «Оды к радости» (Ми–Фа–Соль)" },
  { semitones: 3, name: "Малая терция", short: "м3", mood: "Лиричный, минорный", ref: "Начало «Колыбельной» и минорного аккорда" },
  { semitones: 4, name: "Большая терция", short: "б3", mood: "Светлый, мажорный", ref: "Начало «Весны» Вивальди и мажорного трезвучия" },
  { semitones: 5, name: "Чистая кварта", short: "ч4", mood: "Торжественный призыв", ref: "Свадебный марш Вагнера и гимны" },
  { semitones: 7, name: "Чистая квинта", short: "ч5", mood: "Открытый, благородный", ref: "Тема «Звёздных войн» и звон колоколов" },
  { semitones: 8, name: "Малая секста", short: "м6", mood: "Романтический взлёт", ref: "Ноктюрны Шопена и «История любви»" },
  { semitones: 12, name: "Чистая октава", short: "ч8", mood: "Совершенное слияние", ref: "Та же нота в два раза выше по частоте" },
];

const CHORD_AND_SCALE_PRESETS = [
  {
    id: "maj",
    kind: "Аккорд",
    name: "Мажорное трезвучие",
    formula: "0 – 4 – 7",
    semitones: [0, 4, 7],
    fingers: [1, 3, 5],
    desc: "Светлое, устойчивое созвучие из большой терции и чистой квинты — основа радостной и торжественной музыки.",
  },
  {
    id: "min",
    kind: "Аккорд",
    name: "Минорное трезвучие",
    formula: "0 – 3 – 7",
    semitones: [0, 3, 7],
    fingers: [1, 3, 5],
    desc: "Лиричное, задумчивое созвучие: достаточно опустить среднюю ноту мажора всего на один полутон!",
  },
  {
    id: "maj7",
    kind: "Аккорд",
    name: "Большой мажорный септаккорд (Maj7)",
    formula: "0 – 4 – 7 – 11",
    semitones: [0, 4, 7, 11],
    fingers: [1, 2, 3, 5],
    desc: "Воздушное, мечтательное звучание — любимая краска Эрика Сати, Клода Дебюсси и современной киномузыки.",
  },
  {
    id: "dom7",
    kind: "Аккорд",
    name: "Доминантсептаккорд (7)",
    formula: "0 – 4 – 7 – 10",
    semitones: [0, 4, 7, 10],
    fingers: [1, 2, 3, 5],
    desc: "Создаёт сильное гармоническое притяжение, которое стремится разрешиться обратно в главную тонику.",
  },
  {
    id: "scale_maj",
    kind: "Гамма",
    name: "Мажорная гамма (Тон–Тон–Полутон…)",
    formula: "0 – 2 – 4 – 5 – 7 – 9 – 11 – 12",
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
    fingers: [1, 2, 3, 1, 2, 3, 4, 5],
    desc: "Семь ступеней светлого лада. Обратите внимание на подкладывание 1-го (большого) пальца под 3-й при движении вверх!",
  },
  {
    id: "scale_min",
    kind: "Гамма",
    name: "Натуральный минор",
    formula: "0 – 2 – 3 – 5 – 7 – 8 – 10 – 12",
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
    fingers: [1, 2, 3, 1, 2, 3, 4, 5],
    desc: "Певучий и выразительный минорный лад — основа «К Элизе», «Лунной сонаты» и «Осенней песни» Чайковского.",
  },
  {
    id: "pentatonic",
    kind: "Гамма",
    name: "Мажорная пентатоника",
    formula: "0 – 2 – 4 – 7 – 9 – 12",
    semitones: [0, 2, 4, 7, 9, 12],
    fingers: [1, 2, 3, 1, 2, 5],
    desc: "Пять нот без полутонов — любая импровизация по этим клавишам звучит гармонично, как в пьесах Дебюсси.",
  },
];

const CHORD_PROGRESSIONS = [
  {
    id: "classic",
    name: "Классическая каденция",
    roman: "I — IV — V — I (До мажор)",
    desc: "Фундамент Моцарта, Баха и Бетховена: дом → путь → напряжение → возвращение домой.",
    chords: [
      { label: "C", notes: [60, 64, 67] },
      { label: "F", notes: [65, 69, 72] },
      { label: "G", notes: [67, 71, 74] },
      { label: "C", notes: [60, 64, 67, 72] },
    ],
  },
  {
    id: "romantic",
    name: "Романтическая баллада",
    roman: "I — V — vi — IV (До мажор)",
    desc: "Самая узнаваемая эмоциональная последовательность от классических романсов до современной неоклассики.",
    chords: [
      { label: "C", notes: [60, 64, 67] },
      { label: "G", notes: [62, 67, 71] },
      { label: "Am", notes: [60, 64, 69] },
      { label: "F", notes: [60, 65, 69] },
    ],
  },
  {
    id: "pachelbel",
    name: "Гармония Канона Пахельбеля",
    roman: "I — V — vi — iii — IV — I",
    desc: "Плавное нисходящее движение гармонии, создающее ощущение вечного спокойного течения времени.",
    chords: [
      { label: "C", notes: [60, 64, 67] },
      { label: "G", notes: [62, 67, 71] },
      { label: "Am", notes: [60, 64, 69] },
      { label: "Em", notes: [64, 67, 71] },
      { label: "F", notes: [65, 69, 72] },
      { label: "C", notes: [60, 64, 67] },
    ],
  },
  {
    id: "cinema",
    name: "Кино-минор и меланхолия",
    roman: "vi — IV — I — V (Ля минор)",
    desc: "Драматичная и кинематографичная последовательность, близкая к саундтрекам Сакамото и неоклассике.",
    chords: [
      { label: "Am", notes: [60, 64, 69] },
      { label: "F", notes: [60, 65, 69] },
      { label: "C", notes: [60, 64, 67] },
      { label: "G", notes: [62, 67, 71] },
    ],
  },
];

const PRACTICE_MELODIES = [
  {
    id: "fur_elise",
    title: "К Элизе (главный мотив)",
    composer: "Л. ван Бетховен",
    level: "Начальный",
    pieceId: "beethoven_fur_elise_woo59",
    tip: "Чередуйте 5-й и 4-й пальцы на знаменитом покачивании Ми–Ре♯–Ми–Ре♯–Ми.",
    stepMs: 330,
    steps: [
      { midi: 76, finger: 5 },
      { midi: 75, finger: 4 },
      { midi: 76, finger: 5 },
      { midi: 75, finger: 4 },
      { midi: 76, finger: 5 },
      { midi: 71, finger: 2 },
      { midi: 74, finger: 4 },
      { midi: 72, finger: 3 },
      { midi: 69, finger: 1 },
      { midi: 60, finger: 1 },
      { midi: 64, finger: 2 },
      { midi: 69, finger: 4 },
      { midi: 71, finger: 5 },
      { midi: 64, finger: 1 },
      { midi: 68, finger: 3 },
      { midi: 71, finger: 4 },
      { midi: 72, finger: 5 },
    ],
  },
  {
    id: "ode_to_joy",
    title: "Ода к радости (Симфония № 9)",
    composer: "Л. ван Бетховен",
    level: "Начальный",
    pieceId: "beethoven_pathetique_mvt2",
    tip: "Вся мелодия ложится под пять соседних пальцев (До–Ре–Ми–Фа–Соль) без единого переноса руки!",
    stepMs: 390,
    steps: [
      { midi: 64, finger: 3 },
      { midi: 64, finger: 3 },
      { midi: 65, finger: 4 },
      { midi: 67, finger: 5 },
      { midi: 67, finger: 5 },
      { midi: 65, finger: 4 },
      { midi: 64, finger: 3 },
      { midi: 62, finger: 2 },
      { midi: 60, finger: 1 },
      { midi: 60, finger: 1 },
      { midi: 62, finger: 2 },
      { midi: 64, finger: 3 },
      { midi: 64, finger: 3 },
      { midi: 62, finger: 2 },
      { midi: 62, finger: 2 },
    ],
  },
  {
    id: "moonlight",
    title: "Лунная соната (вступление)",
    composer: "Л. ван Бетховен",
    level: "Начальный",
    pieceId: "beethoven_moonlight_sonata_op27_no2",
    tip: "Играйте триоли Соль♯–До♯–Ми предельно ровно и мягко, создавая лунную звуковую дымку.",
    stepMs: 410,
    steps: [
      { midi: 68, finger: 1 },
      { midi: 73, finger: 3 },
      { midi: 76, finger: 5 },
      { midi: 68, finger: 1 },
      { midi: 73, finger: 3 },
      { midi: 76, finger: 5 },
      { midi: 68, finger: 1 },
      { midi: 73, finger: 3 },
      { midi: 76, finger: 5 },
      { midi: 69, finger: 1 },
      { midi: 73, finger: 3 },
      { midi: 76, finger: 5 },
      { midi: 69, finger: 1 },
      { midi: 74, finger: 3 },
      { midi: 78, finger: 5 },
    ],
  },
  {
    id: "bach_prelude",
    title: "Прелюдия до мажор, BWV 846",
    composer: "И. С. Бах",
    level: "Начальный",
    pieceId: "bach_prelude_c_major_bwv846",
    tip: "Первые два такта строятся на одном чистом до-мажорном арпеджио, затем плавно перетекают в ре минор.",
    stepMs: 280,
    steps: [
      { midi: 60, finger: 1 },
      { midi: 64, finger: 2 },
      { midi: 67, finger: 3 },
      { midi: 72, finger: 4 },
      { midi: 76, finger: 5 },
      { midi: 67, finger: 2 },
      { midi: 72, finger: 4 },
      { midi: 76, finger: 5 },
      { midi: 60, finger: 1 },
      { midi: 62, finger: 2 },
      { midi: 69, finger: 3 },
      { midi: 74, finger: 4 },
      { midi: 77, finger: 5 },
      { midi: 69, finger: 2 },
      { midi: 74, finger: 4 },
      { midi: 77, finger: 5 },
    ],
  },
  {
    id: "gymnopedie",
    title: "Гимнопедия № 1 (мелодия)",
    composer: "Э. Сати",
    level: "Начальный",
    pieceId: "satie_gymnopedie_no1",
    tip: "Не торопитесь: дайте каждой длинной ноте свободно прозвучать и растаять в воздухе зала.",
    stepMs: 520,
    steps: [
      { midi: 78, finger: 2 },
      { midi: 81, finger: 5 },
      { midi: 79, finger: 4 },
      { midi: 78, finger: 3 },
      { midi: 73, finger: 1 },
      { midi: 71, finger: 2 },
      { midi: 73, finger: 3 },
      { midi: 74, finger: 4 },
      { midi: 69, finger: 1 },
      { midi: 66, finger: 2 },
      { midi: 69, finger: 4 },
      { midi: 71, finger: 5 },
    ],
  },
];

function formatMidiNote(midi) {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  const freq = (440 * Math.pow(2, (midi - 69) / 12)).toFixed(1);
  return {
    ru: `${NOTE_RU[pc]}${oct}`,
    en: `${NOTE_EN[pc]}${oct}`,
    shortRu: NOTE_RU[pc],
    shortEn: NOTE_EN[pc],
    freq,
    isBlack: IS_BLACK[pc],
  };
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createLessonsController({ onPlayNoteOn, onPlayNoteOff, onPracticePieceSlow }) {
  const state = {
    moduleId: "notes", // "notes" | "intervals" | "chords" | "melodies"
    showLabels: true,
    lastNoteMidi: 60,

    // Module 1: Note finder quiz
    includeSharps: false,
    quizTargetMidi: 64,
    quizStreak: 0,
    quizCorrect: 0,
    quizHintShown: false,
    quizStatus: "Нажмите нужную клавишу на клавиатуре ниже (или используйте клавиши A–K на компьютере).",
    quizFeedbackType: "neutral", // "neutral" | "ok" | "err"

    // Module 2: Interval ear trainer
    earQuizActive: false,
    earBaseMidi: 60,
    earTargetInterval: INTERVALS[3],
    earOptions: [],
    earScore: 0,
    earStreak: 0,
    earStatus: "Нажмите «Начать проверку слуха», чтобы угадывать интервалы на слух.",
    earAnswered: false,

    // Module 3: Chords & Scales explorer
    chordRootPc: 0, // C
    chordPresetId: "maj",

    // Module 4: Step-by-step melody practice
    melodyId: "fur_elise",
    melodyStepIdx: 0,
    melodyCompleted: false,
    melodyStatus: "Нажимайте подсвеченную золотую клавишу шаг за шагом — или сначала послушайте образец.",
  };

  let containerEl = null;
  let activeTimers = [];
  let transientHighlights = new Map(); // midi -> { kind: "demo" | "pressed" | "err", badge?: string }
  let keydownHandler = null;
  let keyupHandler = null;
  const heldPcKeys = new Set();

  function clearDemoTimers() {
    for (const id of activeTimers) clearTimeout(id);
    activeTimers = [];
    transientHighlights.clear();
  }

  function schedule(fn, ms) {
    const id = setTimeout(() => {
      activeTimers = activeTimers.filter((x) => x !== id);
      fn();
    }, ms);
    activeTimers.push(id);
    return id;
  }

  function playTimedNote(midi, durMs = 460, vel = 0.72, kind = "demo", badge = "") {
    onPlayNoteOn?.(midi, vel);
    transientHighlights.set(midi, { kind, badge });
    syncKeyboardVisuals();
    schedule(() => {
      onPlayNoteOff?.(midi);
      const cur = transientHighlights.get(midi);
      if (cur && cur.kind === kind) {
        transientHighlights.delete(midi);
        syncKeyboardVisuals();
      }
    }, durMs);
  }

  function pickNextNoteQuiz() {
    const pool = [];
    for (let m = 60; m <= 79; m++) {
      const pc = m % 12;
      if (!state.includeSharps && IS_BLACK[pc]) continue;
      if (m !== state.quizTargetMidi) pool.push(m);
    }
    state.quizTargetMidi = pool[Math.floor(Math.random() * pool.length)] || 60;
    state.quizHintShown = false;
    const info = formatMidiNote(state.quizTargetMidi);
    state.quizStatus = `Найдите и нажмите ноту ${info.ru} (${info.en}) на клавиатуре.`;
    state.quizFeedbackType = "neutral";
  }

  function startEarQuestion() {
    clearDemoTimers();
    const basePool = [60, 62, 64, 65, 67];
    state.earBaseMidi = basePool[Math.floor(Math.random() * basePool.length)];
    const target = INTERVALS[Math.floor(Math.random() * INTERVALS.length)];
    state.earTargetInterval = target;

    const others = INTERVALS.filter((i) => i.semitones !== target.semitones)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    state.earOptions = [target, ...others].sort((a, b) => a.semitones - b.semitones);
    state.earQuizActive = true;
    state.earAnswered = false;
    state.earStatus = "Вслушайтесь в расстояние между двумя нотами и выберите название интервала.";
    renderCurrent();
    playEarInterval(false);
  }

  function playEarInterval(revealKeys = false) {
    clearDemoTimers();
    const m1 = state.earBaseMidi;
    const m2 = m1 + state.earTargetInterval.semitones;
    onPlayNoteOn?.(m1, 0.72);
    if (revealKeys) {
      transientHighlights.set(m1, { kind: "demo", badge: "1" });
      syncKeyboardVisuals();
    }
    schedule(() => {
      onPlayNoteOff?.(m1);
      onPlayNoteOn?.(m2, 0.74);
      if (revealKeys) {
        transientHighlights.set(m2, { kind: "demo", badge: state.earTargetInterval.short });
        syncKeyboardVisuals();
      }
    }, 480);
    schedule(() => {
      onPlayNoteOff?.(m2);
      // Harmonic confirmation
      onPlayNoteOn?.(m1, 0.64);
      onPlayNoteOn?.(m2, 0.68);
    }, 1020);
    schedule(() => {
      onPlayNoteOff?.(m1);
      onPlayNoteOff?.(m2);
      if (revealKeys) {
        transientHighlights.clear();
        syncKeyboardVisuals();
      }
    }, 1780);
  }

  function playIntervalDemo(interval) {
    clearDemoTimers();
    const m1 = 60;
    const m2 = m1 + interval.semitones;
    playTimedNote(m1, 430, 0.72, "demo", "1");
    schedule(() => playTimedNote(m2, 430, 0.75, "demo", interval.short), 450);
    schedule(() => {
      playTimedNote(m1, 760, 0.64, "demo", "1");
      playTimedNote(m2, 760, 0.68, "demo", interval.short);
    }, 980);
  }

  function getActiveChordNotes() {
    const preset = CHORD_AND_SCALE_PRESETS.find((p) => p.id === state.chordPresetId) || CHORD_AND_SCALE_PRESETS[0];
    const rootMidi = 60 + state.chordRootPc;
    return {
      preset,
      rootMidi,
      notes: preset.semitones.map((st, idx) => ({
        midi: rootMidi + st,
        finger: preset.fingers[idx] || "",
      })).filter((n) => n.midi <= END_MIDI),
    };
  }

  function playActiveChord(arpeggio = false) {
    clearDemoTimers();
    const { notes } = getActiveChordNotes();
    if (arpeggio) {
      notes.forEach((n, idx) => {
        schedule(() => playTimedNote(n.midi, 420, 0.72, "demo", String(n.finger)), idx * 210);
      });
    } else {
      notes.forEach((n) => {
        playTimedNote(n.midi, 980, 0.64, "demo", String(n.finger));
      });
    }
  }

  function playProgressionDemo(prog) {
    clearDemoTimers();
    prog.chords.forEach((ch, idx) => {
      schedule(() => {
        ch.notes.forEach((m) => playTimedNote(m, 760, 0.64, "demo", ch.label));
      }, idx * 840);
    });
  }

  function getActiveMelody() {
    return PRACTICE_MELODIES.find((m) => m.id === state.melodyId) || PRACTICE_MELODIES[0];
  }

  function playMelodyDemo() {
    clearDemoTimers();
    const mel = getActiveMelody();
    mel.steps.forEach((st, idx) => {
      schedule(() => {
        playTimedNote(st.midi, Math.max(220, mel.stepMs - 40), 0.74, "demo", String(st.finger));
      }, idx * mel.stepMs);
    });
  }

  function getPersistentHighlights() {
    const map = new Map(); // midi -> { kind: "target" | "chord", badge: string }
    if (state.moduleId === "notes" && state.quizHintShown) {
      map.set(state.quizTargetMidi, { kind: "target", badge: "★" });
    } else if (state.moduleId === "chords") {
      const { notes } = getActiveChordNotes();
      notes.forEach((n, idx) => {
        map.set(n.midi, {
          kind: idx === 0 ? "target" : "chord",
          badge: String(n.finger || idx + 1),
        });
      });
    } else if (state.moduleId === "melodies" && !state.melodyCompleted) {
      const mel = getActiveMelody();
      const step = mel.steps[state.melodyStepIdx];
      if (step) {
        map.set(step.midi, { kind: "target", badge: String(step.finger) });
      }
    }
    return map;
  }

  function syncKeyboardVisuals() {
    if (!containerEl) return;
    const persistent = getPersistentHighlights();
    const keys = containerEl.querySelectorAll(".ac-kb-key");
    keys.forEach((el) => {
      const midi = Number(el.dataset.midi);
      const tr = transientHighlights.get(midi);
      const pe = persistent.get(midi);
      el.classList.toggle("is-target", pe?.kind === "target");
      el.classList.toggle("is-chord", pe?.kind === "chord");
      el.classList.toggle("is-demo", tr?.kind === "demo");
      el.classList.toggle("is-pressed", tr?.kind === "pressed");
      el.classList.toggle("is-err", tr?.kind === "err");
      const badgeEl = el.querySelector(".ac-kb-badge");
      if (badgeEl) {
        const txt = tr?.badge || pe?.badge || "";
        badgeEl.textContent = txt;
        badgeEl.hidden = !txt;
      }
    });

    const readoutEl = containerEl.querySelector("#ac-kb-readout");
    if (readoutEl) {
      const info = formatMidiNote(state.lastNoteMidi);
      readoutEl.textContent = `${info.ru} · ${info.en} · ${info.freq} Гц`;
    }
  }

  function handleInteractiveKeyPress(midi) {
    state.lastNoteMidi = midi;
    onPlayNoteOn?.(midi, 0.78);
    transientHighlights.set(midi, { kind: "pressed" });
    syncKeyboardVisuals();

    // Evaluate module-specific interactive goals
    if (state.moduleId === "notes") {
      if (midi === state.quizTargetMidi) {
        state.quizCorrect += 1;
        state.quizStreak += 1;
        const info = formatMidiNote(midi);
        state.quizStatus = `Верно! Это ${info.ru} (${info.en}). Следующая нота…`;
        state.quizFeedbackType = "ok";
        updateModuleFeedback();
        schedule(() => {
          pickNextNoteQuiz();
          renderCurrent();
        }, 680);
      } else {
        state.quizStreak = 0;
        const pressedInfo = formatMidiNote(midi);
        const targetInfo = formatMidiNote(state.quizTargetMidi);
        state.quizStatus = `Вы нажали ${pressedInfo.ru} (${pressedInfo.en}), а нужна ${targetInfo.ru} (${targetInfo.en}). Попробуйте ещё раз!`;
        state.quizFeedbackType = "err";
        transientHighlights.set(midi, { kind: "err" });
        syncKeyboardVisuals();
        updateModuleFeedback();
      }
    } else if (state.moduleId === "melodies" && !state.melodyCompleted) {
      const mel = getActiveMelody();
      const expected = mel.steps[state.melodyStepIdx];
      if (expected && midi === expected.midi) {
        state.melodyStepIdx += 1;
        if (state.melodyStepIdx >= mel.steps.length) {
          state.melodyCompleted = true;
          state.melodyStatus = `Отлично! Вы сыграли фрагмент «${mel.title}» целиком. Попробуйте сыграть быстрее или откройте полную пьесу на 3D-рояле!`;
        } else {
          const nextStep = mel.steps[state.melodyStepIdx];
          const nextInfo = formatMidiNote(nextStep.midi);
          state.melodyStatus = `Верно! Следующая нота: ${nextInfo.ru} (${nextInfo.en}), палец ${nextStep.finger}.`;
        }
        renderCurrent();
      } else if (expected) {
        const expInfo = formatMidiNote(expected.midi);
        state.melodyStatus = `Подсказка: сейчас нужна золотая клавиша ${expInfo.ru} (${expInfo.en}), палец ${expected.finger}.`;
        transientHighlights.set(midi, { kind: "err" });
        syncKeyboardVisuals();
        updateModuleFeedback();
      }
    }
  }

  function handleInteractiveKeyRelease(midi) {
    onPlayNoteOff?.(midi);
    const cur = transientHighlights.get(midi);
    if (cur && (cur.kind === "pressed" || cur.kind === "err")) {
      transientHighlights.delete(midi);
      syncKeyboardVisuals();
    }
  }

  function updateModuleFeedback() {
    if (!containerEl) return;
    const statusEl = containerEl.querySelector("#ac-lesson-feedback");
    if (statusEl) {
      statusEl.textContent =
        state.moduleId === "notes"
          ? state.quizStatus
          : state.moduleId === "melodies"
          ? state.melodyStatus
          : state.earStatus;
      statusEl.dataset.state = state.moduleId === "notes" ? state.quizFeedbackType : "neutral";
    }
    const statsEl = containerEl.querySelector("#ac-quiz-stats");
    if (statsEl && state.moduleId === "notes") {
      statsEl.innerHTML = `Верно: <strong class="ac-tabular">${state.quizCorrect}</strong> · Серия: <strong class="ac-tabular">${state.quizStreak}</strong>`;
    }
  }

  function renderKeyboardHtml() {
    const whites = [];
    const blacks = [];
    let whiteIdx = 0;

    for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
      const info = formatMidiNote(midi);
      const pcLbl = MIDI_TO_PC_LABEL[midi] || "";
      if (!info.isBlack) {
        whites.push({ midi, info, whiteIdx, pcLbl });
        whiteIdx++;
      } else {
        // Position black key cleanly between previous white key and current white key
        blacks.push({ midi, info, anchorWhiteIdx: whiteIdx - 1, pcLbl });
      }
    }

    const totalWhites = whites.length; // 14 white keys
    const whiteHtml = whites
      .map(
        ({ midi, info, pcLbl }) => `
        <button
          type="button"
          class="ac-kb-key is-white"
          data-midi="${midi}"
          aria-label="${info.ru} (${info.en})"
        >
          <span class="ac-kb-badge" hidden></span>
          ${
            state.showLabels
              ? `<span class="ac-kb-note">${info.shortRu}</span><span class="ac-kb-en">${info.en}${pcLbl ? ` · ${pcLbl}` : ""}</span>`
              : pcLbl
              ? `<span class="ac-kb-en">${pcLbl}</span>`
              : ""
          }
        </button>
      `
      )
      .join("");

    const blackHtml = blacks
      .map(({ midi, info, anchorWhiteIdx }) => {
        const leftPct = (((anchorWhiteIdx + 1) / totalWhites) * 100).toFixed(3);
        return `
          <button
            type="button"
            class="ac-kb-key is-black"
            data-midi="${midi}"
            style="left: ${leftPct}%;"
            aria-label="${info.ru} (${info.en})"
          >
            <span class="ac-kb-badge" hidden></span>
            ${state.showLabels ? `<span class="ac-kb-note-black">${info.shortEn}</span>` : ""}
          </button>
        `;
      })
      .join("");

    const infoLast = formatMidiNote(state.lastNoteMidi);
    return `
      <section class="ac-kb-stage" aria-label="Интерактивная учебная клавиатура 2 октавы">
        <div class="ac-kb-bar">
          <div class="ac-kb-title-group">
            <span class="ac-kb-title">Живая клавиатура (звучит выбранный 3D-рояль)</span>
            <span id="ac-kb-readout" class="ac-kb-readout ac-tabular">${infoLast.ru} · ${infoLast.en} · ${infoLast.freq} Гц</span>
          </div>
          <label class="ac-kb-toggle">
            <input type="checkbox" id="ac-kb-labels-toggle" ${state.showLabels ? "checked" : ""} />
            <span>Подписи нот</span>
          </label>
        </div>
        <div class="ac-kb-wrap">
          <div class="ac-kb-whites">${whiteHtml}</div>
          <div class="ac-kb-blacks">${blackHtml}</div>
        </div>
        <div class="ac-kb-hint">Нажимайте мышью, касанием или клавишами компьютера (A–K — белые, W E T Y U O P — чёрные)</div>
      </section>
    `;
  }

  function renderNotesModuleHtml() {
    const targetInfo = formatMidiNote(state.quizTargetMidi);
    return `
      <div class="ac-lesson-grid">
        <article class="ac-lesson-card">
          <h3 class="ac-lesson-heading">Как мгновенно ориентироваться на клавиатуре</h3>
          <p class="ac-lesson-text">
            Вся 88-клавишная клавиатура рояля состоит из повторяющихся групп по <strong>2 и 3 чёрные клавиши</strong>.
            Запомните два главных маяка — и вы найдёте любую ноту за секунду:
          </p>
          <ul class="ac-lesson-list">
            <li><strong>До (C)</strong> — всегда белая клавиша сразу <em>слева от группы из 2 чёрных</em>.</li>
            <li><strong>Фа (F)</strong> — всегда белая клавиша сразу <em>слева от группы из 3 чёрных</em>.</li>
            <li><strong>Диез (♯)</strong> повышает ноту на полтона вправо (ближайшая клавиша), <strong>Бемоль (♭)</strong> — понижает влево.</li>
            <li><strong>Аппликатура пианиста:</strong> 1 — большой палец, 2 — указательный, 3 — средний, 4 — безымянный, 5 — мизинец.</li>
          </ul>
        </article>

        <article class="ac-lesson-card ac-lesson-card-active">
          <div class="ac-lesson-card-top">
            <h3 class="ac-lesson-heading">Тренажёр: найди ноту</h3>
            <span id="ac-quiz-stats" class="ac-quiz-stats">Верно: <strong class="ac-tabular">${state.quizCorrect}</strong> · Серия: <strong class="ac-tabular">${state.quizStreak}</strong></span>
          </div>
          <div class="ac-target-banner">
            <span class="ac-target-kicker">Нажмите клавишу:</span>
            <span class="ac-target-note">${targetInfo.ru} <span class="ac-target-en">(${targetInfo.en})</span></span>
          </div>
          <p id="ac-lesson-feedback" class="ac-lesson-feedback" data-state="${state.quizFeedbackType}">${escapeHtml(state.quizStatus)}</p>
          <div class="ac-lesson-actions">
            <button type="button" class="ac-secondary-btn" id="ac-quiz-hear">Послушать звук</button>
            <button type="button" class="ac-secondary-btn" id="ac-quiz-hint">Подсказка на клавиатуре</button>
            <button type="button" class="ac-secondary-btn" id="ac-quiz-sharps">
              Чёрные клавиши: ${state.includeSharps ? "Вкл" : "Выкл"}
            </button>
          </div>
        </article>
      </div>
    `;
  }

  function renderIntervalsModuleHtml() {
    const rowsHtml = INTERVALS.map(
      (iv) => `
      <div class="ac-interval-row">
        <div class="ac-interval-info">
          <div class="ac-interval-title">
            <strong class="ac-interval-short ac-tabular">${iv.short}</strong>
            <span>${escapeHtml(iv.name)}</span>
            <span class="ac-interval-semi ac-tabular">${iv.semitones} полут.</span>
          </div>
          <div class="ac-interval-desc">${escapeHtml(iv.mood)} · ${escapeHtml(iv.ref)}</div>
        </div>
        <button type="button" class="ac-secondary-btn" data-demo-interval="${iv.semitones}">&#9654; Послушать</button>
      </div>
    `
    ).join("");

    const earQuizHtml = state.earQuizActive
      ? `
        <div class="ac-ear-options">
          ${state.earOptions
            .map(
              (opt) => `
            <button
              type="button"
              class="ac-ear-btn"
              data-ear-answer="${opt.semitones}"
              ${state.earAnswered ? "disabled" : ""}
            >
              <strong>${opt.short}</strong> · ${escapeHtml(opt.name)}
            </button>
          `
            )
            .join("")}
        </div>
        <div class="ac-lesson-actions">
          <button type="button" class="ac-secondary-btn" id="ac-ear-replay">&#9654; Повторить звук</button>
          <button type="button" class="ac-primary-btn" id="ac-ear-next">Следующий интервал</button>
        </div>
      `
      : `
        <div class="ac-lesson-actions">
          <button type="button" class="ac-primary-btn" id="ac-ear-start">&#9654; Начать проверку слуха</button>
        </div>
      `;

    return `
      <div class="ac-lesson-grid">
        <article class="ac-lesson-card">
          <h3 class="ac-lesson-heading">Справочник музыкальных интервалов</h3>
          <p class="ac-lesson-text">
            Интервал — это расстояние между двумя нотами в полутонах. Нажмите «Послушать», чтобы услышать мелодический шаг и созвучие одновременно.
          </p>
          <div class="ac-intervals-list">${rowsHtml}</div>
        </article>

        <article class="ac-lesson-card ac-lesson-card-active">
          <div class="ac-lesson-card-top">
            <h3 class="ac-lesson-heading">Угадай интервал на слух</h3>
            <span class="ac-quiz-stats">Счёт: <strong class="ac-tabular">${state.earScore}</strong> · Серия: <strong class="ac-tabular">${state.earStreak}</strong></span>
          </div>
          <p id="ac-lesson-feedback" class="ac-lesson-feedback" data-state="neutral">${escapeHtml(state.earStatus)}</p>
          ${earQuizHtml}
        </article>
      </div>
    `;
  }

  function renderChordsModuleHtml() {
    const roots = [
      { pc: 0, label: "До (C)" },
      { pc: 2, label: "Ре (D)" },
      { pc: 4, label: "Ми (E)" },
      { pc: 5, label: "Фа (F)" },
      { pc: 7, label: "Соль (G)" },
      { pc: 9, label: "Ля (A)" },
      { pc: 11, label: "Си (B)" },
    ];
    const { preset, notes } = getActiveChordNotes();
    const noteNames = notes.map((n) => formatMidiNote(n.midi).shortRu).join(" – ");

    const rootBtns = roots
      .map(
        (r) =>
          `<button type="button" class="ac-filter-btn ${state.chordRootPc === r.pc ? "active" : ""}" data-chord-root="${r.pc}">${r.label}</button>`
      )
      .join("");

    const presetBtns = CHORD_AND_SCALE_PRESETS.map(
      (p) =>
        `<button type="button" class="ac-filter-btn ${state.chordPresetId === p.id ? "active" : ""}" data-chord-preset="${p.id}">${escapeHtml(p.name)}</button>`
    ).join("");

    const progHtml = CHORD_PROGRESSIONS.map(
      (pr) => `
      <div class="ac-prog-row">
        <div>
          <div class="ac-prog-title">${escapeHtml(pr.name)} · <span class="ac-prog-roman">${escapeHtml(pr.roman)}</span></div>
          <div class="ac-prog-desc">${escapeHtml(pr.desc)}</div>
        </div>
        <button type="button" class="ac-secondary-btn" data-demo-prog="${pr.id}">&#9654; Прослушать</button>
      </div>
    `
    ).join("");

    return `
      <div class="ac-lesson-grid">
        <article class="ac-lesson-card ac-lesson-card-active">
          <h3 class="ac-lesson-heading">Конструктор аккордов и гамм</h3>
          <div class="ac-selector-group">
            <span class="ac-selector-label">Тоника (основная нота):</span>
            <div class="ac-chip-row">${rootBtns}</div>
          </div>
          <div class="ac-selector-group">
            <span class="ac-selector-label">Аккорд или лад:</span>
            <div class="ac-chip-row">${presetBtns}</div>
          </div>
          <div class="ac-chord-summary">
            <div class="ac-chord-notes">Ноты: <strong>${escapeHtml(noteNames)}</strong> · Формула: <span class="ac-tabular">${escapeHtml(preset.formula)}</span></div>
            <p class="ac-lesson-text">${escapeHtml(preset.desc)}</p>
          </div>
          <div class="ac-lesson-actions">
            <button type="button" class="ac-primary-btn" id="ac-chord-play">&#9654; Сыграть аккордом</button>
            <button type="button" class="ac-secondary-btn" id="ac-chord-arp">&#9654; Проиграть арпеджио</button>
          </div>
        </article>

        <article class="ac-lesson-card">
          <h3 class="ac-lesson-heading">4 классические гармонические прогрессии</h3>
          <p class="ac-lesson-text">
            Большинство великих мелодий строятся на проверенных связках аккордов. Нажмите «Прослушать», чтобы увидеть их живой переход на клавиатуре.
          </p>
          <div class="ac-prog-list">${progHtml}</div>
        </article>
      </div>
    `;
  }

  function renderMelodiesModuleHtml() {
    const mel = getActiveMelody();
    const totalSteps = mel.steps.length;
    const step = mel.steps[state.melodyStepIdx];
    const nextInfo = step ? formatMidiNote(step.midi) : null;

    const listHtml = PRACTICE_MELODIES.map(
      (m) => `
      <button type="button" class="ac-melody-item ${m.id === mel.id ? "active" : ""}" data-select-melody="${m.id}">
        <div class="ac-melody-item-title">${escapeHtml(m.title)}</div>
        <div class="ac-melody-item-meta">${escapeHtml(m.composer)} · ${m.steps.length} шагов</div>
      </button>
    `
    ).join("");

    const stepsStripHtml = mel.steps
      .map((s, idx) => {
        const info = formatMidiNote(s.midi);
        const cls =
          idx < state.melodyStepIdx
            ? "is-done"
            : idx === state.melodyStepIdx && !state.melodyCompleted
            ? "is-now"
            : "";
        return `<span class="ac-step-chip ${cls} ac-tabular" title="Палец ${s.finger}">${info.shortRu}<sub>${s.finger}</sub></span>`;
      })
      .join("");

    return `
      <div class="ac-melody-layout">
        <aside class="ac-melody-list" aria-label="Учебные мелодии">
          ${listHtml}
        </aside>
        <article class="ac-lesson-card ac-lesson-card-active">
          <div class="ac-lesson-card-top">
            <div>
              <h3 class="ac-lesson-heading">${escapeHtml(mel.title)}</h3>
              <div class="ac-meta-line">
                <span>${escapeHtml(mel.composer)}</span>
                <span aria-hidden="true">·</span>
                <span>Уровень: ${escapeHtml(mel.level)}</span>
                <span aria-hidden="true">·</span>
                <span class="ac-tabular">Шаг ${Math.min(state.melodyStepIdx, totalSteps)} из ${totalSteps}</span>
              </div>
            </div>
            ${
              nextInfo
                ? `<div class="ac-next-cue">Сейчас: <strong>${nextInfo.ru}</strong> · палец <strong>${step.finger}</strong></div>`
                : `<div class="ac-next-cue is-done">Фрагмент пройден!</div>`
            }
          </div>
          <p class="ac-lesson-text">${escapeHtml(mel.tip)}</p>
          <div class="ac-steps-strip">${stepsStripHtml}</div>
          <p id="ac-lesson-feedback" class="ac-lesson-feedback" data-state="${state.melodyCompleted ? "ok" : "neutral"}">${escapeHtml(state.melodyStatus)}</p>
          <div class="ac-lesson-actions">
            <button type="button" class="ac-primary-btn" id="ac-melody-demo">&#9654; Послушать образец</button>
            <button type="button" class="ac-secondary-btn" id="ac-melody-reset">Начать заново</button>
            <button type="button" class="ac-secondary-btn" id="ac-melody-open-3d">
              Открыть всю пьесу на 3D-рояле (0.5x + Подсветка)
            </button>
          </div>
        </article>
      </div>
    `;
  }

  function renderCurrent() {
    if (!containerEl) return;
    const modules = [
      { id: "notes", label: "1. Ноты и клавиатура" },
      { id: "intervals", label: "2. Слух и интервалы" },
      { id: "chords", label: "3. Аккорды и гаммы" },
      { id: "melodies", label: "4. Практика мелодий" },
    ];

    const navHtml = modules
      .map(
        (m) =>
          `<button type="button" class="ac-lesson-tab ${state.moduleId === m.id ? "active" : ""}" data-lesson-module="${m.id}">${m.label}</button>`
      )
      .join("");

    let bodyHtml = "";
    if (state.moduleId === "notes") bodyHtml = renderNotesModuleHtml();
    else if (state.moduleId === "intervals") bodyHtml = renderIntervalsModuleHtml();
    else if (state.moduleId === "chords") bodyHtml = renderChordsModuleHtml();
    else bodyHtml = renderMelodiesModuleHtml();

    containerEl.innerHTML = `
      <div class="ac-lessons-shell">
        <div class="ac-glossary-intro ac-lessons-intro">
          <h2 class="ac-section-display">Интерактивная школа фортепиано и теории музыки</h2>
          <p class="ac-glossary-lead">
            Изучайте расположение нот, развивайте музыкальный слух, стройте аккорды и разучивайте легендарные мелодии шаг за шагом прямо здесь — на живом звуке выбранного концертного рояля.
          </p>
        </div>

        <div class="ac-lesson-nav" role="tablist" aria-label="Модули обучения">
          ${navHtml}
        </div>

        <div class="ac-lesson-stage">${bodyHtml}</div>

        ${renderKeyboardHtml()}
      </div>
    `;

    bindEvents();
    syncKeyboardVisuals();
  }

  function bindEvents() {
    if (!containerEl) return;

    containerEl.querySelectorAll("[data-lesson-module]").forEach((btn) => {
      btn.addEventListener("click", () => {
        clearDemoTimers();
        state.moduleId = btn.dataset.lessonModule;
        renderCurrent();
      });
    });

    // Interactive keyboard pointer handlers
    containerEl.querySelectorAll(".ac-kb-key").forEach((keyEl) => {
      const midi = Number(keyEl.dataset.midi);
      keyEl.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        handleInteractiveKeyPress(midi);
      });
      keyEl.addEventListener("pointerup", () => handleInteractiveKeyRelease(midi));
      keyEl.addEventListener("pointerleave", () => handleInteractiveKeyRelease(midi));
      keyEl.addEventListener("pointercancel", () => handleInteractiveKeyRelease(midi));
    });

    const lblToggle = containerEl.querySelector("#ac-kb-labels-toggle");
    if (lblToggle) {
      lblToggle.addEventListener("change", () => {
        state.showLabels = lblToggle.checked;
        renderCurrent();
      });
    }

    // Module 1 handlers
    const hearBtn = containerEl.querySelector("#ac-quiz-hear");
    if (hearBtn) {
      hearBtn.addEventListener("click", () => {
        onPlayNoteOn?.(state.quizTargetMidi, 0.72);
        schedule(() => onPlayNoteOff?.(state.quizTargetMidi), 620);
      });
    }
    const hintBtn = containerEl.querySelector("#ac-quiz-hint");
    if (hintBtn) {
      hintBtn.addEventListener("click", () => {
        state.quizHintShown = true;
        syncKeyboardVisuals();
      });
    }
    const sharpsBtn = containerEl.querySelector("#ac-quiz-sharps");
    if (sharpsBtn) {
      sharpsBtn.addEventListener("click", () => {
        state.includeSharps = !state.includeSharps;
        pickNextNoteQuiz();
        renderCurrent();
      });
    }

    // Module 2 handlers
    containerEl.querySelectorAll("[data-demo-interval]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const semi = Number(btn.dataset.demoInterval);
        const iv = INTERVALS.find((x) => x.semitones === semi);
        if (iv) playIntervalDemo(iv);
      });
    });
    const earStart = containerEl.querySelector("#ac-ear-start");
    if (earStart) earStart.addEventListener("click", startEarQuestion);
    const earNext = containerEl.querySelector("#ac-ear-next");
    if (earNext) earNext.addEventListener("click", startEarQuestion);
    const earReplay = containerEl.querySelector("#ac-ear-replay");
    if (earReplay) earReplay.addEventListener("click", () => playEarInterval(state.earAnswered));

    containerEl.querySelectorAll("[data-ear-answer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.earAnswered) return;
        const chosen = Number(btn.dataset.earAnswer);
        state.earAnswered = true;
        const target = state.earTargetInterval;
        if (chosen === target.semitones) {
          state.earScore += 1;
          state.earStreak += 1;
          state.earStatus = `Точно! Это ${target.name} (${target.short}, ${target.semitones} полут.) — ${target.ref}.`;
        } else {
          state.earStreak = 0;
          state.earStatus = `Правильный ответ: ${target.name} (${target.short}, ${target.semitones} полут.). Посмотрите на подсвеченные клавиши!`;
        }
        renderCurrent();
        playEarInterval(true);
      });
    });

    // Module 3 handlers
    containerEl.querySelectorAll("[data-chord-root]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.chordRootPc = Number(btn.dataset.chordRoot);
        renderCurrent();
        playActiveChord(false);
      });
    });
    containerEl.querySelectorAll("[data-chord-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.chordPresetId = btn.dataset.chordPreset;
        renderCurrent();
        const isScale = state.chordPresetId.startsWith("scale") || state.chordPresetId === "pentatonic";
        playActiveChord(isScale);
      });
    });
    const chordPlay = containerEl.querySelector("#ac-chord-play");
    if (chordPlay) chordPlay.addEventListener("click", () => playActiveChord(false));
    const chordArp = containerEl.querySelector("#ac-chord-arp");
    if (chordArp) chordArp.addEventListener("click", () => playActiveChord(true));

    containerEl.querySelectorAll("[data-demo-prog]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pr = CHORD_PROGRESSIONS.find((x) => x.id === btn.dataset.demoProg);
        if (pr) playProgressionDemo(pr);
      });
    });

    // Module 4 handlers
    containerEl.querySelectorAll("[data-select-melody]").forEach((btn) => {
      btn.addEventListener("click", () => {
        clearDemoTimers();
        state.melodyId = btn.dataset.selectMelody;
        state.melodyStepIdx = 0;
        state.melodyCompleted = false;
        const mel = getActiveMelody();
        const firstInfo = formatMidiNote(mel.steps[0].midi);
        state.melodyStatus = `Нажмите золотую клавишу ${firstInfo.ru} (${firstInfo.en}), палец ${mel.steps[0].finger}.`;
        renderCurrent();
      });
    });
    const melDemo = containerEl.querySelector("#ac-melody-demo");
    if (melDemo) melDemo.addEventListener("click", playMelodyDemo);
    const melReset = containerEl.querySelector("#ac-melody-reset");
    if (melReset) {
      melReset.addEventListener("click", () => {
        clearDemoTimers();
        state.melodyStepIdx = 0;
        state.melodyCompleted = false;
        const mel = getActiveMelody();
        const firstInfo = formatMidiNote(mel.steps[0].midi);
        state.melodyStatus = `Нажмите золотую клавишу ${firstInfo.ru} (${firstInfo.en}), палец ${mel.steps[0].finger}.`;
        renderCurrent();
      });
    }
    const mel3d = containerEl.querySelector("#ac-melody-open-3d");
    if (mel3d) {
      mel3d.addEventListener("click", () => {
        const mel = getActiveMelody();
        onPracticePieceSlow?.(mel.pieceId);
      });
    }
  }

  function attachKeyboardListeners() {
    detachKeyboardListeners();
    keydownHandler = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const midi = PC_KEY_TO_MIDI[e.code];
      if (midi !== undefined && !heldPcKeys.has(e.code)) {
        e.preventDefault();
        e.stopPropagation();
        heldPcKeys.add(e.code);
        handleInteractiveKeyPress(midi);
      }
    };
    keyupHandler = (e) => {
      const midi = PC_KEY_TO_MIDI[e.code];
      if (midi !== undefined && heldPcKeys.has(e.code)) {
        heldPcKeys.delete(e.code);
        handleInteractiveKeyRelease(midi);
      }
    };
    window.addEventListener("keydown", keydownHandler, true);
    window.addEventListener("keyup", keyupHandler, true);
  }

  function detachKeyboardListeners() {
    if (keydownHandler) {
      window.removeEventListener("keydown", keydownHandler, true);
      keydownHandler = null;
    }
    if (keyupHandler) {
      window.removeEventListener("keyup", keyupHandler, true);
      keyupHandler = null;
    }
    for (const code of heldPcKeys) {
      const m = PC_KEY_TO_MIDI[code];
      if (m !== undefined) onPlayNoteOff?.(m);
    }
    heldPcKeys.clear();
  }

  return {
    mount(el) {
      containerEl = el;
      attachKeyboardListeners();
      renderCurrent();
    },
    unmount() {
      clearDemoTimers();
      detachKeyboardListeners();
      containerEl = null;
    },
  };
}
