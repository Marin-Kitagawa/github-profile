// @ts-check

import { Card } from "../common/Card.js";
import { getCardColors } from "../common/color.js";
import { kFormatter } from "../common/fmt.js";
import { flexLayout } from "../common/render.js";

const CARD_WIDTH = 495;
const CARD_HEIGHT = 185;

// Badge palette — matches official Stack Overflow badge colours.
const BADGE_GOLD_COLOR = "#f0ad4e";
const BADGE_SILVER_COLOR = "#c0c0c0";
const BADGE_BRONZE_COLOR = "#ad5c2c";

/**
 * Build the component CSS for the Stack Overflow stats card.
 *
 * @param {object} colors Color values resolved from theme / user overrides.
 * @param {string} colors.titleColor Color used for the large reputation number.
 * @param {string} colors.textColor  Color used for labels and secondary values.
 * @returns {string} CSS string to inject into the card's `<style>` block.
 */
const getStyles = ({ titleColor, textColor }) => `
  .so-reputation {
    font: 700 28px 'Segoe UI', Ubuntu, Sans-Serif;
    fill: ${titleColor};
    animation: fadeInAnimation 0.3s ease-in-out forwards;
  }
  @supports(-moz-appearance: auto) {
    /* Firefox renders slightly larger; nudge down to match Chromium. */
    .so-reputation { font-size: 24px; }
  }
  .so-stat-label {
    font: 400 12px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${textColor};
    animation: fadeInAnimation 0.3s ease-in-out 0.1s forwards;
    opacity: 0;
  }
  .so-stat-value {
    font: 600 13px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${textColor};
    animation: fadeInAnimation 0.3s ease-in-out 0.1s forwards;
    opacity: 0;
  }
  .so-badge-count {
    font: 600 12px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${textColor};
    dominant-baseline: middle;
    animation: fadeInAnimation 0.3s ease-in-out 0.2s forwards;
    opacity: 0;
  }
`;

/**
 * Render a labelled stat item (value on top, label below).
 *
 * @param {object} props
 * @param {number}        props.x      X position of the group.
 * @param {number}        props.y      Y position of the group.
 * @param {string}        props.label  Human-readable label shown below the value.
 * @param {string|number} props.value  Formatted value string or number.
 * @returns {string} SVG group fragment.
 */
const renderStat = ({ x, y, label, value }) => `
  <g transform="translate(${x}, ${y})">
    <text class="so-stat-value" x="0" y="0">${value}</text>
    <text class="so-stat-label" x="0" y="16">${label}</text>
  </g>
`;

/**
 * Render a single badge indicator: a filled circle followed by a count label.
 *
 * @param {object} props
 * @param {string} props.color Badge fill color (hex string).
 * @param {number} props.count Badge count.
 * @param {number} props.r     Circle radius in px.
 * @returns {string} SVG fragment (unsized — caller wraps in a flexLayout group).
 */
const renderBadge = ({ color, count, r = 8 }) => `
  <circle cx="${r}" cy="0" r="${r}" fill="${color}" />
  <text class="so-badge-count" x="${r * 2 + 6}" y="1">${kFormatter(count)}</text>
`;

/**
 * @typedef {import('../fetchers/stackoverflow.js').StackOverflowData} StackOverflowData
 */

/**
 * Renders the Stack Overflow Stats card as an SVG string.
 *
 * Layout (495 × 185 px, body origin at y = paddingY + 20 = 55 inside the SVG):
 *
 * ```
 * ┌─────────────────────────────────────────┐
 * │  Stack Overflow Stats                   │  ← card title (y=35)
 * ├─────────────────────────────────────────┤
 * │  <reputation large>   Answers  Questions│  ← body y=10/10
 * │  Reputation           Accept Rate       │  ← body y=42/40
 * │                                         │
 * │     ● gold  ● silver  ● bronze          │  ← body y=80
 * └─────────────────────────────────────────┘
 * ```
 *
 * @param {StackOverflowData} soData  Fetched Stack Overflow stats.
 * @param {Partial<{
 *   user_id: string|number,
 *   userId: string|number,
 *   title_color: string,
 *   text_color: string,
 *   icon_color: string,
 *   bg_color: string,
 *   border_color: string,
 *   theme: string,
 *   custom_title: string,
 *   hide_border: boolean,
 *   hide_title: boolean,
 *   border_radius: number,
 *   disable_animations: boolean
 * }>} options Card display options.
 * @returns {string} SVG markup string.
 */
const renderStackOverflowCard = (soData, options = {}) => {
  const {
    displayName,
    reputation,
    goldBadges,
    silverBadges,
    bronzeBadges,
    answerCount,
    questionCount,
    acceptRate,
  } = soData;

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
    defaultTitle: "Stack Overflow Stats",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    border_radius,
    colors: { titleColor, textColor, iconColor, bgColor, borderColor },
  });

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS(getStyles({ titleColor, textColor }));

  if (disable_animations) {
    card.disableAnimations();
  }

  card.setAccessibilityLabel({
    title: card.title,
    desc:
      `${displayName}: reputation ${kFormatter(reputation)}, ` +
      `${answerCount} answers, ${questionCount} questions, ` +
      `${goldBadges} gold / ${silverBadges} silver / ${bronzeBadges} bronze badges`,
  });

  // ── Badge row ───────────────────────────────────────────────────────────────
  // Each badge item is a fixed-width slot (60 px) so the three badges space
  // evenly.  The row is centered horizontally within the card body.
  const badgeItemWidth = 60; // px per badge slot (circle + count text)
  const badgeGap = 20;       // gap between badge slots
  const totalBadgeRowWidth =
    badgeItemWidth * 3 + badgeGap * 2; // 220 px
  const badgeRowX = Math.round((CARD_WIDTH - totalBadgeRowWidth) / 2); // ≈ 137

  const badgeItems = [
    renderBadge({ color: BADGE_GOLD_COLOR,   count: goldBadges }),
    renderBadge({ color: BADGE_SILVER_COLOR, count: silverBadges }),
    renderBadge({ color: BADGE_BRONZE_COLOR, count: bronzeBadges }),
  ];

  const badgeRow = flexLayout({
    items: badgeItems,
    gap: badgeGap,
    sizes: [badgeItemWidth, badgeItemWidth, badgeItemWidth],
  }).join("");

  // ── Right-column stats ─────────────────────────────────────────────────────
  // Two rows of stats sit to the right of the reputation block.
  const rightColX = 200; // x offset within card body

  const acceptRateStat =
    acceptRate !== undefined
      ? renderStat({
          x: rightColX,
          y: 40,
          label: "Accept Rate",
          value: `${acceptRate}%`,
        })
      : "";

  return card.render(`
    <!-- Left column: large reputation value -->
    <text class="so-reputation" x="25" y="38">${kFormatter(reputation)}</text>
    <text class="so-stat-label"  x="25" y="58">Reputation</text>

    <!-- Right column: row 1 — Answers | Questions -->
    ${renderStat({ x: rightColX,       y: 10, label: "Answers",   value: kFormatter(answerCount) })}
    ${renderStat({ x: rightColX + 120, y: 10, label: "Questions", value: kFormatter(questionCount) })}

    <!-- Right column: row 2 — Accept Rate (optional) -->
    ${acceptRateStat}

    <!-- Badge row: gold / silver / bronze, centred -->
    <g transform="translate(${badgeRowX}, 93)">
      ${badgeRow}
    </g>
  `);
};

export { renderStackOverflowCard };
export default renderStackOverflowCard;
