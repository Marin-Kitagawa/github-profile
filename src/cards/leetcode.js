// @ts-check

import { Card } from "../common/Card.js";
import { getCardColors } from "../common/color.js";
import { kFormatter } from "../common/fmt.js";
import { createProgressNode } from "../common/render.js";

const CARD_WIDTH = 495;
const CARD_HEIGHT = 215;

/** Progress bar width = card width minus horizontal padding on both sides. */
const PROGRESS_BAR_WIDTH = CARD_WIDTH - 50;

/** LeetCode difficulty brand colors. */
const DIFFICULTY_COLORS = {
  easy: "#00b8a3",
  medium: "#ffc01e",
  hard: "#ef4743",
};

/**
 * Generate the CSS rules for the LeetCode card.
 *
 * @param {object} colors
 * @param {string} colors.textColor Primary text color (labels and counts).
 * @param {string} colors.titleColor Title / accent color.
 * @param {string} colors.iconColor Muted / secondary text color.
 * @param {string} colors.bgColor Card background color (used indirectly via Card).
 * @returns {string} CSS string.
 */
const getStyles = ({ textColor, titleColor, iconColor }) => `
  .lc-label {
    font: 600 13px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${textColor};
    dominant-baseline: middle;
  }
  .lc-count {
    font: 400 12px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${iconColor};
    text-anchor: end;
    dominant-baseline: middle;
  }
  .lc-total {
    font: 600 13px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${textColor};
    dominant-baseline: middle;
  }
  .lc-rank {
    font: 400 12px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${titleColor};
    text-anchor: end;
    dominant-baseline: middle;
  }
`;

/**
 * Render a single difficulty row: coloured label, "X / Y" count, and animated
 * progress bar.
 *
 * @param {object} props
 * @param {string}  props.label      Difficulty label text ("Easy", "Medium", "Hard").
 * @param {string}  props.color      Hex color for the label and filled portion of bar.
 * @param {number}  props.solved     Number of problems solved at this difficulty.
 * @param {number}  props.total      Total problems available at this difficulty.
 * @param {number}  props.y          Y-offset of this row within the card body group.
 * @param {number}  props.delay      Animation delay in ms for the progress bar.
 * @param {string}  props.progressBarBackgroundColor Background tint for the bar track.
 * @returns {string} SVG group markup for this row.
 */
const renderDifficultyRow = ({
  label,
  color,
  solved,
  total,
  y,
  delay,
  progressBarBackgroundColor,
}) => {
  // Percentage solved, clamped by createProgressNode internally.
  const progress = total > 0 ? (solved / total) * 100 : 0;

  return `
    <g transform="translate(25, ${y})">
      <!-- Difficulty label (left-aligned, coloured) -->
      <text class="lc-label" x="0" y="8" fill="${color}">${label}</text>

      <!-- "solved / total" count (right-aligned) -->
      <text class="lc-count" x="${PROGRESS_BAR_WIDTH}" y="8">
        ${kFormatter(solved)} / ${kFormatter(total)}
      </text>

      <!-- Animated progress bar (below the label row) -->
      ${createProgressNode({
        x: 0,
        y: 18,
        width: PROGRESS_BAR_WIDTH,
        color,
        progress,
        progressBarBackgroundColor,
        delay,
      })}
    </g>
  `;
};

/**
 * @typedef {import('../fetchers/leetcode.js').LeetCodeData} LeetCodeData
 */

/**
 * Renders the LeetCode Stats card as an SVG string.
 *
 * @param {LeetCodeData} data LeetCode stats returned by fetchLeetCode.
 * @param {Partial<{
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
 *   disable_animations: boolean,
 * }>} options Display options.
 * @returns {string} SVG markup.
 */
const renderLeetCodeCard = (data, options = {}) => {
  const {
    totalSolved,
    totalQuestions,
    easySolved,
    easyTotal,
    mediumSolved,
    mediumTotal,
    hardSolved,
    hardTotal,
    ranking,
    acceptanceRate,
  } = data;

  const {
    title_color,
    text_color,
    icon_color,
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

  // Use a slightly transparent version of the border color as the progress
  // bar track background — matches the convention used in top-languages card.
  const progressBarBackgroundColor = `${borderColor}55`;

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: "LeetCode Stats",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    border_radius,
    colors: { titleColor, textColor, iconColor, bgColor, borderColor },
  });

  card.setHideBorder(hide_border);
  card.setHideTitle(hide_title);
  card.setCSS(getStyles({ textColor, titleColor, iconColor }));

  if (disable_animations) {
    card.disableAnimations();
  }

  card.setAccessibilityLabel({
    title: card.title,
    desc: [
      `Total solved: ${totalSolved} / ${totalQuestions}`,
      `Easy: ${easySolved} / ${easyTotal}`,
      `Medium: ${mediumSolved} / ${mediumTotal}`,
      `Hard: ${hardSolved} / ${hardTotal}`,
      ranking > 0 ? `Ranking: #${kFormatter(ranking)}` : "",
    ]
      .filter(Boolean)
      .join(", "),
  });

  // Row y-positions within the card body group.
  // Card body starts at paddingY (35) + 20 = y=55 inside the SVG.
  // Each row occupies 40px: ~8px for label/count text + 8px bar + padding.
  const ROW_EASY = 15;
  const ROW_MEDIUM = 55;
  const ROW_HARD = 95;
  // Bottom info row sits below the three difficulty rows.
  const ROW_INFO = 148;

  return card.render(`
    ${renderDifficultyRow({
      label: "Easy",
      color: DIFFICULTY_COLORS.easy,
      solved: easySolved,
      total: easyTotal,
      y: ROW_EASY,
      delay: 0,
      progressBarBackgroundColor,
    })}

    ${renderDifficultyRow({
      label: "Medium",
      color: DIFFICULTY_COLORS.medium,
      solved: mediumSolved,
      total: mediumTotal,
      y: ROW_MEDIUM,
      delay: 150,
      progressBarBackgroundColor,
    })}

    ${renderDifficultyRow({
      label: "Hard",
      color: DIFFICULTY_COLORS.hard,
      solved: hardSolved,
      total: hardTotal,
      y: ROW_HARD,
      delay: 300,
      progressBarBackgroundColor,
    })}

    <!-- Bottom info row: total count on the left, ranking on the right -->
    <g transform="translate(25, ${ROW_INFO})">
      <text class="lc-total" x="0" y="0">
        Total: ${kFormatter(totalSolved)} / ${kFormatter(totalQuestions)}
        (${acceptanceRate}%)
      </text>
      ${
        ranking > 0
          ? `<text class="lc-rank" x="${PROGRESS_BAR_WIDTH}" y="0">
               Ranking: #${kFormatter(ranking)}
             </text>`
          : ""
      }
    </g>
  `);
};

export { renderLeetCodeCard };
export default renderLeetCodeCard;
