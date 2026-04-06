// @ts-check

import { Card } from "../common/Card.js";
import { getCardColors } from "../common/color.js";
import { kFormatter } from "../common/fmt.js";

const CARD_WIDTH = 495;
const CARD_HEIGHT = 185;

/** Last.fm brand red. */
const LASTFM_RED = "#d51007";

/** Maximum characters for track / artist names before truncation. */
const MAX_TRACK_CHARS = 25;

/**
 * Truncate a string to `maxLen` characters, appending "…" when trimmed.
 *
 * @param {string} str Input string.
 * @param {number} maxLen Maximum allowed length.
 * @returns {string} Possibly-truncated string.
 */
const truncate = (str, maxLen) => {
  if (!str) return "";
  return str.length > maxLen ? `${str.slice(0, maxLen - 1)}\u2026` : str;
};

/**
 * CSS rules for the Last.fm card.
 *
 * @param {{ titleColor: string, textColor: string, iconColor: string }} colors
 * @returns {string} CSS string.
 */
const getStyles = ({ titleColor, textColor, iconColor }) => `
  .lfm-count {
    font: 700 26px 'Segoe UI', Ubuntu, Sans-Serif;
    fill: ${titleColor};
    animation: fadeInAnimation 0.3s ease-in-out forwards;
  }
  @supports(-moz-appearance: auto) {
    .lfm-count { font-size: 22px; }
  }
  .lfm-label {
    font: 400 11px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${iconColor};
  }
  .lfm-section-label {
    font: 600 11px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${titleColor};
  }
  .lfm-track {
    font: 600 13px 'Segoe UI', Ubuntu, Sans-Serif;
    fill: ${textColor};
  }
  .lfm-artist {
    font: 400 11px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
    fill: ${iconColor};
  }
  .lfm-divider {
    stroke: ${iconColor};
    stroke-opacity: 0.3;
    stroke-width: 1;
  }
  .lfm-live-dot {
    fill: ${LASTFM_RED};
    animation: pulseAnimation 1s ease-in-out infinite;
  }
  @keyframes pulseAnimation {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
`;

/**
 * @typedef {import('../fetchers/lastfm').LastFmData} LastFmData
 */

/**
 * Renders the Last.fm Stats card as an SVG string.
 *
 * Layout:
 *  - Left column  (x=0,  width≈210): scrobble count, "Scrobbles" label, country
 *  - Vertical divider at x=215
 *  - Right column (x=225, width≈245): now-playing / recent track info + top artist
 *
 * All coordinates are relative to the card body, which is translated by the
 * Card class to (0, paddingY+20) = (0, 55) inside the outer SVG.
 *
 * @param {LastFmData} lastFmData Last.fm statistics.
 * @param {Partial<{
 *   title_color: string, text_color: string, icon_color: string,
 *   bg_color: string, border_color: string,
 *   theme: string, custom_title: string,
 *   hide_border: boolean, hide_title: boolean,
 *   border_radius: number, disable_animations: boolean,
 * }>} options Card display options.
 * @returns {string} SVG markup.
 */
const renderLastFmCard = (lastFmData, options = {}) => {
  const {
    username,
    totalScrobbles,
    topArtist,
    recentTrack,
    recentArtist,
    isNowPlaying,
    country,
  } = lastFmData;

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
    defaultTitle: "Last.fm Stats",
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

  const nowPlayingLabel = isNowPlaying ? "Now Playing" : "Recent Track";
  const trackDisplay = truncate(recentTrack, MAX_TRACK_CHARS);
  const artistDisplay = truncate(recentArtist, MAX_TRACK_CHARS);
  const topArtistDisplay = truncate(topArtist, MAX_TRACK_CHARS);

  card.setAccessibilityLabel({
    title: card.title,
    desc: `${kFormatter(totalScrobbles)} scrobbles. ${nowPlayingLabel}: ${recentTrack} by ${recentArtist}. Top artist (7d): ${topArtist}.`,
  });

  // Animated "live" dot rendered only when a track is currently playing.
  const liveDot = isNowPlaying
    ? `<circle class="lfm-live-dot" cx="222" cy="-3" r="4" />`
    : "";

  return card.render(`
    <!-- Left column: scrobble count + meta -->
    <g data-testid="lfm-left-col">
      <text class="lfm-count" x="0" y="30" data-testid="lfm-scrobbles">
        ${kFormatter(totalScrobbles)}
      </text>
      <text class="lfm-label" x="0" y="47">Scrobbles</text>
      ${country ? `<text class="lfm-label" x="0" y="62">${country}</text>` : ""}
    </g>

    <!-- Vertical divider -->
    <line class="lfm-divider" x1="213" y1="0" x2="213" y2="110" />

    <!-- Right column: track info + top artist -->
    <g data-testid="lfm-right-col" transform="translate(225, 0)">

      <!-- Now Playing / Recent Track section -->
      <text class="lfm-section-label" x="0" y="12">${nowPlayingLabel}:</text>
      ${liveDot}
      <text class="lfm-track" x="0" y="28" data-testid="lfm-track">${trackDisplay}</text>
      <text class="lfm-artist" x="0" y="42">by ${artistDisplay}</text>

      <!-- Separator -->
      <line class="lfm-divider" x1="0" y1="52" x2="240" y2="52" />

      <!-- Top artist section -->
      <text class="lfm-label" x="0" y="66">Top Artist (7d):</text>
      <text class="lfm-track" x="0" y="82" data-testid="lfm-top-artist">${topArtistDisplay}</text>
    </g>
  `);
};

export { renderLastFmCard };
export default renderLastFmCard;
