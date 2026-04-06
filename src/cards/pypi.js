// @ts-check

import { Card } from "../common/Card.js";
import { getCardColors } from "../common/color.js";
import { kFormatter } from "../common/fmt.js";

const CARD_WIDTH = 495;
const CARD_HEIGHT = 175;
const PYPI_BLUE = "#3775a9";
const ROW_HEIGHT = 30;
const ICON_SIZE = 16;
const LABEL_X = 30;
const VALUE_X = CARD_WIDTH - 50; // right-aligned anchor

/**
 * CSS styles for the PyPI stats card.
 *
 * @param {object} colors Color values.
 * @param {string} colors.titleColor Title color.
 * @param {string} colors.textColor Text color.
 * @param {string} colors.iconColor Icon/muted color.
 * @returns {string} CSS string.
 */
const getStyles = ({ titleColor, textColor, iconColor }) => `
  .stat-label {
    font: 400 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${textColor};
    animation: fadeInAnimation 0.3s ease-in-out forwards;
  }
  .stat-value {
    font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif;
    fill: ${titleColor};
    text-anchor: end;
    animation: fadeInAnimation 0.3s ease-in-out forwards;
  }
  .stat-muted {
    font: 400 11px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${iconColor};
    animation: fadeInAnimation 0.3s ease-in-out 0.2s forwards;
    opacity: 0;
  }
  .pypi-icon-text {
    fill: ${PYPI_BLUE};
    font: 700 11px monospace;
  }
`;

/**
 * Render a single icon SVG row (icon + label + right-aligned value).
 *
 * @param {object} props Row properties.
 * @param {number} props.y Y offset of the row group.
 * @param {string} props.iconSvg SVG content for the icon.
 * @param {string} props.label Row label text.
 * @param {string} props.value Row value text.
 * @returns {string} SVG group string.
 */
const renderStatRow = ({ y, iconSvg, label, value }) => `
  <g transform="translate(0, ${y})">
    <svg x="0" y="-${ICON_SIZE - 2}" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 16 16">
      ${iconSvg}
    </svg>
    <text class="stat-label" x="${LABEL_X}" y="0">${label}</text>
    <text class="stat-value" x="${VALUE_X}" y="0">${value}</text>
  </g>
`;

// Pre-defined icon paths matching the 16x16 viewBox used across the codebase.

/** PyPI icon — Python-blue "py" monogram. */
const PYPI_ICON = `<text x="0" y="12" font-family="monospace" font-size="11" font-weight="bold" fill="${PYPI_BLUE}">py</text>`;

/** Download arrow icon. */
const DOWNLOAD_ICON = `
  <path fill="#8b949e" d="M7.47 10.78a.75.75 0 0 0 1.06 0l3.75-3.75a.75.75 0 0 0-1.06-1.06L8.75 8.44V1.75a.75.75 0 0 0-1.5 0v6.69L4.78 5.97a.75.75 0 0 0-1.06 1.06l3.75 3.75ZM3.75 13a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"/>
`;

/** Star/trophy icon for the top package. */
const STAR_ICON = `
  <path fill="#8b949e" d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"/>
`;

/**
 * @typedef {import('../fetchers/types').PypiData} PypiData
 */

/**
 * Renders the PyPI Package Stats card.
 *
 * @param {PypiData} pypiData PyPI package statistics.
 * @param {Partial<{
 *   title_color: string, text_color: string, icon_color: string,
 *   bg_color: string, border_color: string, theme: string,
 *   custom_title: string, hide_border: boolean, hide_title: boolean,
 *   border_radius: number, disable_animations: boolean
 * }>} options Card display options.
 * @returns {string} SVG string.
 */
const renderPypiCard = (pypiData, options = {}) => {
  const {
    packages,
    totalMonthlyDownloads,
    topPackage,
  } = pypiData;

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

  const topPackageName = topPackage
    ? topPackage.name.length > 20
      ? topPackage.name.slice(0, 17) + "..."
      : topPackage.name
    : "N/A";

  const packageNames = packages.map((p) => p.name);
  const previewPackages = packageNames.slice(0, 5).join(", ");
  const previewSuffix = packageNames.length > 5 ? ` +${packageNames.length - 5} more` : "";

  const card = new Card({
    customTitle: custom_title,
    defaultTitle: "PyPI Package Stats",
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
    desc: `Total packages: ${packages.length}, Monthly downloads: ${kFormatter(totalMonthlyDownloads)}, Top package: ${topPackageName}`,
  });

  const rowY0 = 15;

  return card.render(`
    ${renderStatRow({
      y: rowY0,
      iconSvg: PYPI_ICON,
      label: "Total Packages",
      value: String(packages.length),
    })}

    ${renderStatRow({
      y: rowY0 + ROW_HEIGHT,
      iconSvg: DOWNLOAD_ICON,
      label: "Monthly Downloads",
      value: String(kFormatter(totalMonthlyDownloads)),
    })}

    ${renderStatRow({
      y: rowY0 + ROW_HEIGHT * 2,
      iconSvg: STAR_ICON,
      label: "Top Package",
      value: topPackageName,
    })}

    ${previewPackages
      ? `<text class="stat-muted" x="0" y="${rowY0 + ROW_HEIGHT * 3 + 10}">${previewPackages}${previewSuffix}</text>`
      : ""}
  `);
};

export { renderPypiCard };
export default renderPypiCard;
