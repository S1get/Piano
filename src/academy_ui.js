/**
 * Music Academy & Repertoire Library UI Controller
 *
 * Renders and manages the museum-editorial "Академия и Репертуар" modal:
 *  - Tab 1: Произведения (filtering by genre & composer, sorting by popularity/duration/difficulty/year,
 *           expandable historical stories & learning tips, 1-click play)
 *  - Tab 2: Композиторы (archival portraits with zero-broken-image fallbacks, biographies, style notes, works)
 *  - Tab 3: Словарь жанров (Sonata, Nocturne, Etude, Fantasia, Bagatelle, Neoclassical, Overture + live examples)
 *  - Tab 4: Залы и акустика (5 world concert halls + 4 listening zones with acoustic characteristics)
 */

import {
  COMPOSERS,
  COMPOSER_BY_ID,
  MUSICAL_GENRES,
  getPieceAcademyMeta,
} from "./academy_catalog.js";
import { CONCERT_HALLS, LISTENING_ZONES } from "./concert_halls.js";
import { formatClock } from "./hall_acoustics.js";
import {
  PIECE_VERSIONS,
  DEFAULT_PIECE_VERSION_ID,
  getAlternateScoreIdForVersion,
} from "./piece_versions.js";
import { createLessonsController } from "./academy_lessons.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPortraitSlot(composer, sizeClass = "card") {
  const safeName = escapeHtml(composer.name);
  const safeMono = escapeHtml(composer.monogram || "♪");
  const tint = composer.accentTint || "#c89652";
  const fallbackSvg = `
    <div class="academy-portrait-fallback" style="--portrait-tint: ${tint};">
      <svg class="academy-portrait-motif" viewBox="0 0 120 160" aria-hidden="true">
        <defs>
          <radialGradient id="grad_${composer.id}_${sizeClass}" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stop-color="${tint}" stop-opacity="0.34" />
            <stop offset="100%" stop-color="#141312" stop-opacity="0.0" />
          </radialGradient>
        </defs>
        <rect width="120" height="160" fill="url(#grad_${composer.id}_${sizeClass})" />
        <path d="M22 118 C40 82, 80 82, 98 118" stroke="${tint}" stroke-opacity="0.45" stroke-width="1.2" fill="none" />
        <path d="M32 128 C46 100, 74 100, 88 128" stroke="#FAF9F6" stroke-opacity="0.22" stroke-width="0.9" fill="none" />
        <line x1="20" y1="138" x2="100" y2="138" stroke="${tint}" stroke-opacity="0.32" stroke-width="0.8" />
      </svg>
      <span class="academy-portrait-monogram">${safeMono}</span>
      <span class="academy-portrait-era">${escapeHtml(composer.era)}</span>
    </div>
  `;

  if (!composer.portrait) {
    return `<div class="academy-portrait-frame ${sizeClass}">${fallbackSvg}</div>`;
  }

  return `
    <div class="academy-portrait-frame ${sizeClass}">
      <img
        src="${escapeHtml(composer.portrait)}"
        alt="Портрет: ${safeName}"
        referrerpolicy="no-referrer"
        loading="lazy"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      />
      <div class="academy-portrait-fallback is-hidden" style="--portrait-tint: ${tint};">
        <span class="academy-portrait-monogram">${safeMono}</span>
        <span class="academy-portrait-era">${escapeHtml(composer.era)}</span>
      </div>
    </div>
  `;
}

export function createAcademyController({
  modalEl,
  repertoire,
  getCurrentPieceId,
  getCurrentVersionId,
  getActiveHallId,
  getActiveZoneId,
  onSelectPiece,
  onSelectHall,
  onSelectZone,
  onPlayNoteOn,
  onPlayNoteOff,
  onPracticePieceSlow,
  onClose,
}) {
  const bodyEl = modalEl.querySelector("#academy-body");
  const tabBtns = Array.from(modalEl.querySelectorAll(".academy-tab"));
  const closeBtn = modalEl.querySelector("#academy-close-btn");

  const lessonsCtrl = createLessonsController({
    onPlayNoteOn,
    onPlayNoteOff,
    onPracticePieceSlow,
  });
  let lessonsMounted = false;

  const state = {
    open: false,
    activeTab: "works", // "works" | "composers" | "genres" | "halls" | "learn"
    genreFilter: "all",
    composerFilter: "all",
    sortBy: "popularity", // "popularity" | "duration_asc" | "duration_desc" | "difficulty" | "year"
    searchQuery: "",
    expandedPieceId: null,
    selectedComposerId: COMPOSERS[0].id,
  };

  // Enrich repertoire once with academy metadata
  const enrichedWorks = repertoire.map((piece) => ({
    piece,
    meta: getPieceAcademyMeta(piece),
  }));

  function unmountLessonsIfNeeded() {
    if (lessonsMounted) {
      lessonsCtrl.unmount();
      lessonsMounted = false;
    }
  }

  function setActiveTab(tabId) {
    if (state.activeTab === "learn" && tabId !== "learn") {
      unmountLessonsIfNeeded();
    }
    state.activeTab = tabId;
    for (const btn of tabBtns) {
      const isAct = btn.dataset.academyTab === tabId;
      btn.classList.toggle("active", isAct);
      btn.setAttribute("aria-selected", isAct ? "true" : "false");
    }
    render();
  }

  function open(initialTab = null) {
    if (initialTab) state.activeTab = initialTab;
    state.open = true;
    modalEl.hidden = false;
    setActiveTab(state.activeTab);
    modalEl.focus?.();
  }

  function close() {
    if (!state.open) return;
    unmountLessonsIfNeeded();
    state.open = false;
    modalEl.hidden = true;
    onClose?.();
  }

  function toggle(tabId = null) {
    if (state.open && (!tabId || tabId === state.activeTab)) {
      close();
    } else {
      open(tabId || state.activeTab);
    }
  }

  // ---- TAB 1: REPERTOIRE CATALOG (FILTER + SORT + STORY) ----
  function renderWorksTab() {
    const q = state.searchQuery.trim().toLowerCase();
    const curPieceId = getCurrentPieceId();

    const filtered = enrichedWorks
      .filter(({ piece, meta }) => {
        if (state.genreFilter !== "all" && meta.genreId !== state.genreFilter) return false;
        if (state.composerFilter !== "all" && meta.composerId !== state.composerFilter) return false;
        if (q) {
          const hay = `${meta.displayTitle} ${piece.title} ${meta.composerObj.name} ${meta.genreObj.name} ${meta.era}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (state.sortBy) {
          case "duration_asc":
            return (a.piece.durationSec || 0) - (b.piece.durationSec || 0);
          case "duration_desc":
            return (b.piece.durationSec || 0) - (a.piece.durationSec || 0);
          case "difficulty":
            return a.meta.difficultyLevel - b.meta.difficultyLevel || b.meta.popularity - a.meta.popularity;
          case "year":
            return (a.meta.year || 1800) - (b.meta.year || 1800);
          case "popularity":
          default:
            return b.meta.popularity - a.meta.popularity;
        }
      });

    const genreButtonsHtml = [
      `<button type="button" class="ac-filter-btn ${state.genreFilter === "all" ? "active" : ""}" data-genre="all">Все жанры</button>`,
      ...MUSICAL_GENRES.map(
        (g) =>
          `<button type="button" class="ac-filter-btn ${state.genreFilter === g.id ? "active" : ""}" data-genre="${g.id}">${escapeHtml(g.name)}</button>`
      ),
    ].join("");

    const composerOptsHtml = [
      `<option value="all"${state.composerFilter === "all" ? " selected" : ""}>Все композиторы</option>`,
      ...COMPOSERS.map(
        (c) =>
          `<option value="${c.id}"${state.composerFilter === c.id ? " selected" : ""}>${escapeHtml(c.name)}</option>`
      ),
    ].join("");

    const rowsHtml =
      filtered.length === 0
        ? `<div class="ac-empty">По выбранным фильтрам произведений не найдено. Сбросьте фильтр жанра или поиска.</div>`
        : filtered
            .map(({ piece, meta }) => {
              const isCurrent = piece.id === curPieceId;
              const activeVerId = getCurrentVersionId?.() || DEFAULT_PIECE_VERSION_ID;
              const isExpanded = state.expandedPieceId === piece.id;
              const durClock = formatClock(piece.durationSec);
              const supportsVersions = piece.playbackMode === "sampled";
              const altVirtuoso = supportsVersions
                ? getAlternateScoreIdForVersion(piece.id, "virtuoso")
                : null;
              const versionBarHtml = supportsVersions
                ? `
                  <div class="ac-version-bar" role="group" aria-label="Версия исполнения">
                    <span class="ac-version-label">Версия:</span>
                    ${PIECE_VERSIONS.map((v) => {
                      const activeChip = isCurrent && activeVerId === v.id;
                      const hint =
                        v.id === "virtuoso" && altVirtuoso
                          ? "Переключает на подлинную III часть Presto agitato (6 538 нот)"
                          : v.description;
                      return `<button type="button" class="ac-version-btn ${activeChip ? "is-active" : ""}" data-play-piece="${piece.id}" data-play-version="${v.id}" title="${escapeHtml(hint)}">${escapeHtml(v.label)}</button>`;
                    }).join("")}
                    ${
                      altVirtuoso
                        ? `<span class="ac-version-note">«Виртуозная» включает III ч. Presto agitato</span>`
                        : ""
                    }
                  </div>
                `
                : "";
              return `
                <article class="ac-work-row ${isCurrent ? "is-current" : ""}">
                  <div class="ac-work-main">
                    <div class="ac-work-info">
                      <div class="ac-work-title-line">
                        <h3 class="ac-work-title">${escapeHtml(meta.displayTitle)}</h3>
                        ${isCurrent ? `<span class="ac-current-label">Выбрано сейчас</span>` : ""}
                      </div>
                      <div class="ac-meta-line">
                        <span class="ac-meta-genre">${escapeHtml(meta.genreObj.name)}</span>
                        <span aria-hidden="true">·</span>
                        <button type="button" class="ac-inline-link" data-open-composer="${meta.composerId}">${escapeHtml(meta.composerObj.name)}</button>
                        <span aria-hidden="true">·</span>
                        <span class="ac-tabular">${durClock}</span>
                        <span aria-hidden="true">·</span>
                        <span class="ac-tabular">${meta.year}</span>
                        <span aria-hidden="true">·</span>
                        <span>${escapeHtml(meta.difficultyLabel)}</span>
                      </div>
                      ${versionBarHtml}
                    </div>
                    <div class="ac-work-actions">
                      <button type="button" class="ac-secondary-btn" data-toggle-story="${piece.id}">
                        ${isExpanded ? "Скрыть историю" : "История пьесы"}
                      </button>
                      <button type="button" class="ac-primary-btn" data-play-piece="${piece.id}">
                        &#9654; Слушать
                      </button>
                    </div>
                  </div>
                  ${
                    isExpanded
                      ? `
                    <div class="ac-work-story">
                      <p class="ac-story-text">${escapeHtml(meta.story)}</p>
                      <div class="ac-story-meta">
                        <span><strong>Тональность:</strong> ${escapeHtml(meta.keySignature)}</span>
                        <span aria-hidden="true">·</span>
                        <span><strong>Эпоха:</strong> ${escapeHtml(meta.era)}</span>
                      </div>
                      <p class="ac-learning-tip"><strong>Совет для разбора:</strong> ${escapeHtml(meta.learningTip)}</p>
                    </div>
                  `
                      : ""
                  }
                </article>
              `;
            })
            .join("");

    bodyEl.innerHTML = `
      <div class="ac-toolbar">
        <div class="ac-genre-bar" role="group" aria-label="Фильтр по музыкальному жанру">
          ${genreButtonsHtml}
        </div>
        <div class="ac-controls-row">
          <input
            type="search"
            id="ac-search-input"
            class="ac-input"
            placeholder="Поиск по названию, композитору или жанру…"
            value="${escapeHtml(state.searchQuery)}"
          />
          <select id="ac-composer-filter" class="ac-select" aria-label="Фильтр по композитору">
            ${composerOptsHtml}
          </select>
          <select id="ac-sort-select" class="ac-select" aria-label="Сортировка произведений">
            <option value="popularity"${state.sortBy === "popularity" ? " selected" : ""}>Сортировка: Популярность</option>
            <option value="duration_asc"${state.sortBy === "duration_asc" ? " selected" : ""}>Сортировка: Сначала короткие</option>
            <option value="duration_desc"${state.sortBy === "duration_desc" ? " selected" : ""}>Сортировка: Сначала длинные</option>
            <option value="difficulty"${state.sortBy === "difficulty" ? " selected" : ""}>Сортировка: По сложности</option>
            <option value="year"${state.sortBy === "year" ? " selected" : ""}>Сортировка: По эпохе</option>
          </select>
        </div>
      </div>
      <div class="ac-count-bar">
        <span>Показано произведений: <strong class="ac-tabular">${filtered.length}</strong> из <strong class="ac-tabular">${enrichedWorks.length}</strong></span>
        <span class="ac-count-hint">Нажмите «История пьесы», чтобы узнать смысл, жанр и совет для обучения</span>
      </div>
      <div class="ac-works-list">
        ${rowsHtml}
      </div>
    `;

    const searchInput = bodyEl.querySelector("#ac-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        state.searchQuery = searchInput.value;
        const pos = searchInput.selectionStart;
        renderWorksTab();
        const nextInp = bodyEl.querySelector("#ac-search-input");
        if (nextInp) {
          nextInp.focus();
          nextInp.setSelectionRange(pos, pos);
        }
      });
    }
    const compSel = bodyEl.querySelector("#ac-composer-filter");
    if (compSel) {
      compSel.addEventListener("change", () => {
        state.composerFilter = compSel.value;
        renderWorksTab();
      });
    }
    const sortSel = bodyEl.querySelector("#ac-sort-select");
    if (sortSel) {
      sortSel.addEventListener("change", () => {
        state.sortBy = sortSel.value;
        renderWorksTab();
      });
    }
    bodyEl.querySelectorAll("[data-genre]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.genreFilter = btn.dataset.genre;
        renderWorksTab();
      });
    });
    bodyEl.querySelectorAll("[data-toggle-story]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.toggleStory;
        state.expandedPieceId = state.expandedPieceId === pid ? null : pid;
        renderWorksTab();
      });
    });
    bodyEl.querySelectorAll("[data-open-composer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedComposerId = btn.dataset.openComposer;
        setActiveTab("composers");
      });
    });
    bodyEl.querySelectorAll("[data-play-piece]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ver = btn.dataset.playVersion || null;
        onSelectPiece(btn.dataset.playPiece, true, ver);
        close();
      });
    });
  }

  // ---- TAB 2: COMPOSERS GALLERY & BIOGRAPHY DOSSIER ----
  function renderComposersTab() {
    const selected = COMPOSER_BY_ID.get(state.selectedComposerId) || COMPOSERS[0];
    const composerWorks = enrichedWorks.filter((w) => w.meta.composerId === selected.id);
    const curPieceId = getCurrentPieceId();

    const rosterHtml = COMPOSERS.map((c) => {
      const count = enrichedWorks.filter((w) => w.meta.composerId === c.id).length;
      const isSelected = c.id === selected.id;
      return `
        <button type="button" class="ac-composer-card ${isSelected ? "active" : ""}" data-select-composer="${c.id}">
          ${renderPortraitSlot(c, "thumb")}
          <div class="ac-composer-card-text">
            <div class="ac-composer-card-name">${escapeHtml(c.shortName)}</div>
            <div class="ac-composer-card-meta">${escapeHtml(c.years)} · ${count} произв.</div>
          </div>
        </button>
      `;
    }).join("");

    const worksHtml = composerWorks
      .map(({ piece, meta }) => {
        const isCurrent = piece.id === curPieceId;
        return `
          <div class="ac-dossier-work ${isCurrent ? "is-current" : ""}">
            <div>
              <div class="ac-dossier-work-title">${escapeHtml(meta.displayTitle)}</div>
              <div class="ac-meta-line">
                <span class="ac-meta-genre">${escapeHtml(meta.genreObj.name)}</span>
                <span aria-hidden="true">·</span>
                <span class="ac-tabular">${formatClock(piece.durationSec)}</span>
                <span aria-hidden="true">·</span>
                <span>${escapeHtml(meta.keySignature)}</span>
              </div>
            </div>
            <button type="button" class="ac-primary-btn" data-play-piece="${piece.id}">
              &#9654; Играть
            </button>
          </div>
        `;
      })
      .join("");

    bodyEl.innerHTML = `
      <div class="ac-composers-layout">
        <aside class="ac-composer-roster" aria-label="Список композиторов">
          ${rosterHtml}
        </aside>
        <section class="ac-composer-dossier">
          <div class="ac-dossier-hero">
            ${renderPortraitSlot(selected, "hero")}
            <div class="ac-dossier-intro">
              <div class="ac-meta-line">
                <span>${escapeHtml(selected.era)}</span>
                <span aria-hidden="true">·</span>
                <span>${escapeHtml(selected.country)}</span>
                <span aria-hidden="true">·</span>
                <span class="ac-tabular">${escapeHtml(selected.years)}</span>
              </div>
              <h2 class="ac-dossier-name">${escapeHtml(selected.name)}</h2>
              <p class="ac-dossier-tagline">${escapeHtml(selected.tagline)}</p>
              <p class="ac-dossier-bio">${escapeHtml(selected.bio)}</p>
              <blockquote class="ac-dossier-quote">${escapeHtml(selected.quote)}</blockquote>
            </div>
          </div>

          <div class="ac-dossier-section">
            <h3 class="ac-section-heading">Узнаваемый стиль и приёмы</h3>
            <ul class="ac-style-list">
              ${selected.stylePoints.map((pt) => `<li>${escapeHtml(pt)}</li>`).join("")}
            </ul>
          </div>

          <div class="ac-dossier-section">
            <h3 class="ac-section-heading">Произведения в студии</h3>
            <div class="ac-dossier-works-list">${worksHtml}</div>
          </div>
        </section>
      </div>
    `;

    bodyEl.querySelectorAll("[data-select-composer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedComposerId = btn.dataset.selectComposer;
        renderComposersTab();
      });
    });
    bodyEl.querySelectorAll("[data-play-piece]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ver = btn.dataset.playVersion || null;
        onSelectPiece(btn.dataset.playPiece, true, ver);
        close();
      });
    });
  }

  // ---- TAB 3: MUSICAL GENRES GLOSSARY ----
  function renderGenresTab() {
    const cardsHtml = MUSICAL_GENRES.map((g, idx) => {
      const example = enrichedWorks.find((w) => w.piece.id === g.examplePieceId);
      const exTitle = example ? example.meta.displayTitle : "Открыть пример";
      const numStr = String(idx + 1).padStart(2, "0");
      return `
        <article class="ac-genre-card">
          <div class="ac-genre-head">
            <div>
              <div class="ac-meta-line">
                <span class="ac-tabular">${numStr}</span>
                <span aria-hidden="true">·</span>
                <span>${escapeHtml(g.original)}</span>
              </div>
              <h3 class="ac-genre-title">${escapeHtml(g.name)}</h3>
            </div>
            <button type="button" class="ac-secondary-btn" data-filter-genre="${g.id}">
              Все пьесы жанра
            </button>
          </div>
          <p class="ac-genre-lead">${escapeHtml(g.shortDesc)}</p>
          <p class="ac-genre-body">${escapeHtml(g.anatomy)}</p>
          <div class="ac-genre-facts">
            <div><strong>Как узнать на слух:</strong> ${escapeHtml(g.howToRecognize)}</div>
            <div><strong>Настроение:</strong> ${escapeHtml(g.mood)}</div>
          </div>
          <div class="ac-genre-footer">
            <span class="ac-genre-example-label">Эталонный пример: ${escapeHtml(exTitle)}</span>
            <button type="button" class="ac-primary-btn" data-play-piece="${g.examplePieceId}">
              &#9654; Послушать пример
            </button>
          </div>
        </article>
      `;
    }).join("");

    bodyEl.innerHTML = `
      <div class="ac-glossary-intro">
        <h2 class="ac-section-display">Путеводитель по музыкальным жанрам</h2>
        <p class="ac-glossary-lead">
          Соната, ноктюрн, этюд, фантазия или багатель — это не просто красивые слова на афише, а подсказка о том,
          как устроено произведение и какую историю оно рассказывает. Нажмите «Послушать пример», чтобы сразу услышать жанр на 3D-рояле.
        </p>
      </div>
      <div class="ac-genres-grid">
        ${cardsHtml}
      </div>
    `;

    bodyEl.querySelectorAll("[data-play-piece]").forEach((btn) => {
      btn.addEventListener("click", () => {
        onSelectPiece(btn.dataset.playPiece, true);
        close();
      });
    });
    bodyEl.querySelectorAll("[data-filter-genre]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.genreFilter = btn.dataset.filterGenre;
        state.composerFilter = "all";
        setActiveTab("works");
      });
    });
  }

  // ---- TAB 4: 5 WORLD CONCERT HALLS & 4 LISTENING ZONES ----
  function renderHallsTab() {
    const activeHallId = getActiveHallId();
    const activeZoneId = getActiveZoneId();

    const hallsHtml = CONCERT_HALLS.map((h) => {
      const isAct = h.id === activeHallId;
      return `
        <button type="button" class="ac-hall-card ${isAct ? "active" : ""}" data-select-hall="${h.id}">
          <div class="ac-hall-top">
            <div>
              <h3 class="ac-hall-name">${escapeHtml(h.name)}</h3>
              <div class="ac-meta-line">
                <span>${escapeHtml(h.city)}</span>
                <span aria-hidden="true">·</span>
                <span class="ac-tabular">Открыт в ${escapeHtml(h.opened)}</span>
                <span aria-hidden="true">·</span>
                <span>${escapeHtml(h.capacity)}</span>
              </div>
            </div>
            <div class="ac-hall-rt">
              <span class="ac-rt-val ac-tabular">${escapeHtml(h.rt60Label)}</span>
              <span class="ac-rt-lbl">Реверберация</span>
            </div>
          </div>
          <p class="ac-hall-tagline">${escapeHtml(h.tagline)}</p>
          <p class="ac-hall-desc">${escapeHtml(h.description)}</p>
        </button>
      `;
    }).join("");

    const zonesHtml = LISTENING_ZONES.map((z, idx) => {
      const isAct = z.id === activeZoneId;
      return `
        <button type="button" class="ac-zone-card ${isAct ? "active" : ""}" data-select-zone="${z.id}">
          <div class="ac-meta-line">
            <span class="ac-tabular">0${idx + 1}</span>
            <span aria-hidden="true">·</span>
            <span class="ac-tabular">${escapeHtml(z.distanceLabel)} от рояля</span>
          </div>
          <div class="ac-zone-name">${escapeHtml(z.name)}</div>
          <p class="ac-zone-desc">${escapeHtml(z.description)}</p>
        </button>
      `;
    }).join("");

    bodyEl.innerHTML = `
      <section class="ac-halls-section">
        <div class="ac-glossary-intro">
          <h2 class="ac-section-display">Мировые концертные залы</h2>
          <p class="ac-glossary-lead">
            Переключение зала меняет одновременно физический импульсный отклик (длину эха RT60 и теплоту отражений)
            и световую атмосферу сцены вокруг рояля.
          </p>
        </div>
        <div class="ac-halls-grid">${hallsHtml}</div>
      </section>

      <section class="ac-zones-section">
        <h3 class="ac-section-heading">Точка слышимости в зале (7 зон · 1 кресло на зону)</h3>
        <p class="ac-zones-lead">
          Нажмите на зону ниже или кликните по любому из 6 бархатных кресел в 3D-зале: в наушниках отчётливо слышна
          бинауральная разница между левым и правым партером, левым и правым балконом, центром зала и куполом.
        </p>
        <div class="ac-zones-grid">${zonesHtml}</div>
      </section>
    `;

    bodyEl.querySelectorAll("[data-select-hall]").forEach((btn) => {
      btn.addEventListener("click", () => {
        onSelectHall(btn.dataset.selectHall);
        renderHallsTab();
      });
    });
    bodyEl.querySelectorAll("[data-select-zone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        onSelectZone(btn.dataset.selectZone);
        renderHallsTab();
      });
    });
  }

  function render() {
    if (!state.open) return;
    if (state.activeTab !== "learn") {
      unmountLessonsIfNeeded();
    }
    if (state.activeTab === "works") renderWorksTab();
    else if (state.activeTab === "composers") renderComposersTab();
    else if (state.activeTab === "genres") renderGenresTab();
    else if (state.activeTab === "halls") renderHallsTab();
    else if (state.activeTab === "learn") {
      lessonsCtrl.mount(bodyEl);
      lessonsMounted = true;
    }
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.academyTab));
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", close);
  }

  // Click backdrop outside dialog card to close
  modalEl.addEventListener("pointerdown", (e) => {
    if (e.target === modalEl) close();
  });

  return {
    open,
    close,
    toggle,
    isOpen: () => state.open,
    refresh: () => {
      if (state.open && state.activeTab !== "learn") render();
    },
  };
}
