// @ts-check

import { renderStackOverflowCard } from "../src/cards/stackoverflow.js";
import {
  CACHE_TTL,
  resolveCacheSeconds,
  setCacheHeaders,
  setErrorCacheHeaders,
} from "../src/common/cache.js";
import {
  MissingParamError,
  retrieveSecondaryMessage,
} from "../src/common/error.js";
import { parseBoolean } from "../src/common/ops.js";
import { renderError } from "../src/common/render.js";
import { fetchStackOverflow } from "../src/fetchers/stackoverflow.js";

/**
 * Vercel / Express-compatible serverless handler for the Stack Overflow stats card.
 *
 * Query parameters:
 * - `user_id`           {string}  Numeric Stack Overflow user ID (required).
 * - `title_color`       {string}  Hex color for the card title and reputation value.
 * - `text_color`        {string}  Hex color for labels and stat values.
 * - `icon_color`        {string}  Hex color passed through to the Card class.
 * - `bg_color`          {string}  Background hex color or gradient descriptor.
 * - `border_color`      {string}  Card border hex color.
 * - `theme`             {string}  Named theme (see themes/index.js).
 * - `cache_seconds`     {string}  Override cache TTL (clamped to STATS_CARD bounds).
 * - `custom_title`      {string}  Replace the default card title.
 * - `hide_border`       {string}  "true" to hide the card border.
 * - `hide_title`        {string}  "true" to hide the card title row.
 * - `border_radius`     {string}  Card corner radius in px.
 * - `disable_animations`{string}  "true" to disable CSS animations.
 *
 * @param {any} req Incoming request object with a `query` property.
 * @param {any} res Outgoing response object.
 * @returns {Promise<any>} SVG response (or SVG error card on failure).
 */
export default async (req, res) => {
  const {
    user_id,
    title_color,
    icon_color,
    text_color,
    bg_color,
    border_color,
    theme,
    cache_seconds,
    custom_title,
    hide_border,
    hide_title,
    border_radius,
    disable_animations,
  } = req.query;

  res.setHeader("Content-Type", "image/svg+xml");

  try {
    const soData = await fetchStackOverflow(user_id);

    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.STATS_CARD.DEFAULT,
      min: CACHE_TTL.STATS_CARD.MIN,
      max: CACHE_TTL.STATS_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderStackOverflowCard(soData, {
        title_color,
        icon_color,
        text_color,
        bg_color,
        border_color,
        theme,
        custom_title,
        hide_border: parseBoolean(hide_border),
        hide_title: parseBoolean(hide_title),
        border_radius,
        disable_animations: parseBoolean(disable_animations),
      }),
    );
  } catch (err) {
    setErrorCacheHeaders(res);
    if (err instanceof Error) {
      return res.send(
        renderError({
          message: err.message,
          secondaryMessage: retrieveSecondaryMessage(err),
          renderOptions: {
            title_color,
            text_color,
            bg_color,
            border_color,
            theme,
            show_repo_link: !(err instanceof MissingParamError),
          },
        }),
      );
    }
    return res.send(
      renderError({
        message: "An unknown error occurred",
        renderOptions: { title_color, text_color, bg_color, border_color, theme },
      }),
    );
  }
};
