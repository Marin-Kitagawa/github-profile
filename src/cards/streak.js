// @ts-check

import { Card } from "../common/Card.js";
import { getCardColors } from "../common/color.js";
import { kFormatter } from "../common/fmt.js";

const CARD_WIDTH = 495;
const CARD_HEIGHT = 195;

/**
 * Format an ISO date string "YYYY-MM-DD" into a short locale string, e.g. "Jan 15".
 *
 * @param {string} dateStr ISO date string.
 * @returns {string} Formatted date or empty string if input is empty.
 */
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  // Use noon UTC to avoid off-by-one timezone shifts.
  const date = new Date(`${dateStr}T12:00:00Z`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Build a human-readable date-range label from two ISO date strings.
 *
 * @param {string} start Start date (ISO).
 * @param {string} end End date (ISO).
 * @returns {string} Date range label.
 */
const dateRangeLabel = (start, end) => {
  if (!start || !end) return "N/A";
  const s = formatDate(start);
  const e = formatDate(end);
  return s === e ? s : `${s} \u2013 ${e}`; // en-dash
};

/**
 * CSS for the streak card.
 *
 * @param {object} colors Color values.
 * @param {string} colors.titleColor Title/value color.
 * @param {string} colors.textColor Label text color.
 * @param {string} colors.iconColor Muted/secondary color for dates and dividers.
 * @returns {string} CSS string.
 */
const getStyles = ({ titleColor, textColor, iconColor }) => `
  .streak-value {
    font: 700 28px 'Segoe UI', Ubuntu, Sans-Serif;
    fill: ${titleColor};
    text-anchor: middle;
    animation: fadeInAnimation 0.3s ease-in-out forwards;
  }
  @supports(-moz-appearance: auto) {
    .streak-value { font-size: 24px; }
  }
  .streak-label {
    font: 400 13px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${textColor};
    text-anchor: middle;
    animation: fadeInAnimation 0.3s ease-in-out 0.15s forwards;
    opacity: 0;
  }
  .streak-date {
    font: 400 11px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${iconColor};
    text-anchor: middle;
    animation: fadeInAnimation 0.3s ease-in-out 0.3s forwards;
    opacity: 0;
  }
  .streak-divider {
    stroke: ${iconColor};
    stroke-opacity: 0.35;
    stroke-width: 1;
  }
`;

/**
 * Render a single stat panel (value + labels + date range) centred within its column.
 *
 * @param {object} props Panel properties.
 * @param {number} props.panelLeft X coordinate of the panel's left edge.
 * @param {number} props.panelWidth Width of the panel in px.
 * @param {string} props.value Formatted stat value string.
 * @param {string} props.label1 First label line.
 * @param {string} props.label2 Second label line (pass "" to omit).
 * @param {string} props.dateRange Date range / subtitle string.
 * @returns {string} SVG group string.
 */
const renderPanel = ({ panelLeft, panelWidth, value, label1, label2, dateRange }) => {
  const cx = panelLeft + panelWidth / 2;
  const hasLabel2 = label2.length > 0;
  // Vertical positions (y) are relative to the card body, which starts at y=55 inside the SVG.
  const valueY = 42;
  const label1Y = hasLabel2 ? 65 : 72;
  const label2Y = 81;
  const dateY = hasLabel2 ? 105 : 92;

  return `
    <g>
      <text class="streak-value" x="${cx}" y="${valueY}">${value}</text>
      <text class="streak-label" x="${cx}" y="${label1Y}">${label1}</text>
      ${hasLabel2 ? `<text class="streak-label" x="${cx}" y="${label2Y}">${label2}</text>` : ""}
      <text class="streak-date" x="${cx}" y="${dateY}">${dateRange}</text>
    </g>
  `;
};

/**
 * @typedef {import('../fetchers/types').StreakData} StreakData
 */

/**
 * Renders the GitHub Streak Stats card.
 *
 * @param {StreakData} streakData Streak statistics.
 * @param {Partial<{
 *   title_color: string, text_color: string, icon_color: string,
 *   bg_color: string, border_color: string, ring_color: string,
 *   theme: string, custom_title: string,
 *   hide_border: boolean, hide_title: boolean,
 *   border_radius: number, disable_animations: boolean
 * }>} options Card display options.
 * @returns {string} SVG string.
 */
const renderStreakCard = (streakData, options = {}) => {
  const {
    totalContributions,
    currentStreak,
    longestStreak,
    currentStart,
    currentEnd,
    longestStart,
    longestEnd,
  } = streakData;

  const {
    title_color,
    icon_color,
    text_color,
    bg_color,
    border_color,
    ring_color,
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
      ring_color: ring_color || title_color,
      theme,
    });

  const currentYear = new Date().getUTCFullYear();
  const panelWidth = CARD_WIDTH / 3; // 165 px each

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: "GitHub Streak Stats",
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
    desc: `Current streak: ${currentStreak} days, Total contributions: ${totalContributions}, Longest streak: ${longestStreak} days`,
  });

  return card.render(`
    <!-- Vertical dividers between panels -->
    <line class="streak-divider" x1="${panelWidth}" y1="5" x2="${panelWidth}" y2="125"/>
    <line class="streak-divider" x1="${panelWidth * 2}" y1="5" x2="${panelWidth * 2}" y2="125"/>

    ${renderPanel({
      panelLeft: 0,
      panelWidth,
      value: kFormatter(currentStreak),
      label1: "Current",
      label2: "Streak",
      dateRange:
        currentStreak > 0
          ? dateRangeLabel(currentStart, currentEnd)
          : "No current streak",
    })}

    ${renderPanel({
      panelLeft: panelWidth,
      panelWidth,
      value: kFormatter(totalContributions),
      label1: "Total",
      label2: "Contributions",
      dateRange: String(currentYear),
    })}

    ${renderPanel({
      panelLeft: panelWidth * 2,
      panelWidth,
      value: kFormatter(longestStreak),
      label1: "Longest",
      label2: "Streak",
      dateRange:
        longestStreak > 0
          ? dateRangeLabel(longestStart, longestEnd)
          : "No streak yet",
    })}
  `);
};

export { renderStreakCard };
export default renderStreakCard;
