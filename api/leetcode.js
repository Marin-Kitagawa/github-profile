// @ts-check

import { renderLeetCodeCard } from "../src/cards/leetcode.js";
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
import { fetchLeetCode } from "../src/fetchers/leetcode.js";

// @ts-ignore
export default async (req, res) => {
  const {
    username,
    title_color,
    text_color,
    icon_color,
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
    const leetCodeData = await fetchLeetCode(username);

    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.STATS_CARD.DEFAULT,
      min: CACHE_TTL.STATS_CARD.MIN,
      max: CACHE_TTL.STATS_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderLeetCodeCard(leetCodeData, {
        title_color,
        text_color,
        icon_color,
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
