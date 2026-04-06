// @ts-check

import { Card } from "../common/Card.js";
import { getCardColors } from "../common/color.js";
import { kFormatter } from "../common/fmt.js";

const CARD_WIDTH = 722;
const CARD_HEIGHT = 170;

/** Cell size (px) */
const CELL_SIZE = 11;
/** Gap between cells (px) */
const CELL_GAP = 2;
/** Combined step per cell */
const CELL_STEP = CELL_SIZE + CELL_GAP; // 13

/** X offset reserved for day-of-week labels */
const GRID_OFFSET_X = 22;
/** Y offset for the grid within the card body */
const GRID_OFFSET_Y = 7;

/** Abbreviated month names */
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Map a contribution count to one of five heat levels (0–4).
 *
 * @param {number} count Contribution count for a single day.
 * @returns {0|1|2|3|4} Heat level.
 */
const toLevel = (count) => {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
};

/**
 * Resolve the SVG fill color for a heat level.
 *
 * Levels 1-4 reuse the card's `titleColor` at varying opacities rendered via
 * the SVG `fill-opacity` attribute so that the base hex colour needs no
 * modification (no 8-char hex trickery required).
 *
 * @param {0|1|2|3|4} level Heat level.
 * @param {string} titleColor Full hex colour string (e.g. `"#2188ff"`).
 * @param {string} borderColor Muted border colour used for level-0 cells.
 * @returns {{ fill: string, opacity: number }} SVG fill + fill-opacity values.
 */
const levelToColor = (level, titleColor, borderColor) => {
  switch (level) {
    case 0: return { fill: borderColor, opacity: 0.4 };
    case 1: return { fill: titleColor, opacity: 0.25 };
    case 2: return { fill: titleColor, opacity: 0.5 };
    case 3: return { fill: titleColor, opacity: 0.75 };
    case 4: return { fill: titleColor, opacity: 1.0 };
    default: return { fill: borderColor, opacity: 0.4 };
  }
};

/**
 * Build the SVG `<rect>` elements for every contribution day.
 *
 * @param {Array<{ contributionDays: Array<{ date: string, contributionCount: number, weekday: number }> }>} weeks
 * @param {string} titleColor Resolved title colour.
 * @param {string} borderColor Resolved border colour.
 * @returns {string} SVG fragment containing all cell rects.
 */
const renderCells = (weeks, titleColor, borderColor) => {
  const cells = [];

  weeks.forEach((week, colIdx) => {
    week.contributionDays.forEach((day) => {
      const row = day.weekday; // 0 = Sunday … 6 = Saturday
      const x = colIdx * CELL_STEP + GRID_OFFSET_X;
      const y = row * CELL_STEP + GRID_OFFSET_Y;
      const level = toLevel(day.contributionCount);
      const { fill, opacity } = levelToColor(level, titleColor, borderColor);

      cells.push(
        `<rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="2" ` +
        `fill="${fill}" fill-opacity="${opacity}" data-date="${day.date}" data-count="${day.contributionCount}" />`,
      );
    });
  });

  return cells.join("\n    ");
};

/**
 * Build month-label `<text>` elements positioned above the column where each
 * new month begins.
 *
 * @param {Array<{ contributionDays: Array<{ date: string, contributionCount: number, weekday: number }> }>} weeks
 * @returns {string} SVG fragment with month labels.
 */
const renderMonthLabels = (weeks) => {
  const labels = [];
  let lastMonth = -1;

  weeks.forEach((week, colIdx) => {
    if (week.contributionDays.length === 0) return;
    const firstDay = week.contributionDays[0];
    const month = parseInt(firstDay.date.slice(5, 7), 10) - 1; // 0-based

    if (month !== lastMonth) {
      lastMonth = month;
      const x = colIdx * CELL_STEP + GRID_OFFSET_X;
      labels.push(
        `<text class="hm-month" x="${x}" y="0">${MONTH_NAMES[month]}</text>`,
      );
    }
  });

  return labels.join("\n    ");
};

/**
 * CSS rules for the heatmap card.
 *
 * @param {{ titleColor: string, textColor: string, iconColor: string }} colors
 * @returns {string} CSS string.
 */
const getStyles = ({ titleColor, textColor, iconColor }) => `
  .hm-month {
    font: 400 9px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${iconColor};
  }
  .hm-day-label {
    font: 400 9px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${iconColor};
    dominant-baseline: middle;
  }
  .hm-total {
    font: 400 11px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${textColor};
    animation: fadeInAnimation 0.5s ease-in-out forwards;
  }
  .hm-total-count {
    font: 700 11px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${titleColor};
  }
`;

/**
 * @typedef {import('../fetchers/heatmap').HeatmapData} HeatmapData
 */

/**
 * Renders the GitHub Contribution Heatmap card as an SVG string.
 *
 * @param {HeatmapData} heatmapData Contribution data returned by fetchHeatmap.
 * @param {Partial<{
 *   title_color: string, text_color: string, icon_color: string,
 *   bg_color: string, border_color: string,
 *   theme: string, custom_title: string,
 *   hide_border: boolean, hide_title: boolean,
 *   border_radius: number, disable_animations: boolean,
 * }>} options Card display options.
 * @returns {string} SVG markup.
 */
const renderHeatmapCard = (heatmapData, options = {}) => {
  const { name, totalContributions, weeks } = heatmapData;

  const {
    title_color,
    icon_color,
    text_color,
    bg_color,
    border_color,
    theme = "default",
    custom_title,
    hide_border = false,
    hide_title = false,
    border_radius,
    disable_animations = false,
  } = options;

  const { titleColor, iconColor, textColor, bgColor, borderColor } =
    getCardColors({
      title_color,
      text_color,
      icon_color,
      bg_color,
      border_color,
      ring_color: title_color,
      theme,
    });

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: `${name}'s Contribution Heatmap`,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    border_radius,
    colors: { titleColor, textColor, iconColor, bgColor, borderColor },
  });

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS(getStyles({ titleColor, textColor, iconColor }));

  if (disable_animations) {
    card.disableAnimations();
  }

  card.setAccessibilityLabel({
    title: card.title,
    desc: `${kFormatter(totalContributions)} contributions in the last year`,
  });

  // Day-of-week labels: Mon (row 1), Wed (row 3), Fri (row 5)
  const DOW_LABELS = [
    { label: "Mon", row: 1 },
    { label: "Wed", row: 3 },
    { label: "Fri", row: 5 },
  ];
  const dowLabelsSvg = DOW_LABELS.map(({ label, row }) => {
    const y = row * CELL_STEP + GRID_OFFSET_Y + CELL_SIZE / 2;
    return `<text class="hm-day-label" x="0" y="${y}">${label}</text>`;
  }).join("\n    ");

  const cellsSvg = renderCells(weeks, titleColor, borderColor);
  const monthLabelsSvg = renderMonthLabels(weeks);

  // Total label sits below the grid (row 7 bottom + small gap)
  const totalY = 7 * CELL_STEP + GRID_OFFSET_Y + 14;

  return card.render(`
    <!-- Month labels -->
    <g data-testid="hm-months">
      ${monthLabelsSvg}
    </g>

    <!-- Day-of-week labels -->
    <g data-testid="hm-dow-labels">
      ${dowLabelsSvg}
    </g>

    <!-- Contribution cells -->
    <g data-testid="hm-cells">
      ${cellsSvg}
    </g>

    <!-- Total contributions label -->
    <text class="hm-total" x="${GRID_OFFSET_X}" y="${totalY}">
      <tspan class="hm-total-count">${kFormatter(totalContributions)}</tspan>
      <tspan> contributions in the last year</tspan>
    </text>
  `);
};

export { renderHeatmapCard };
export default renderHeatmapCard;
