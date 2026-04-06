// @ts-check

import axios from "axios";
import { CustomError, MissingParamError } from "../common/error.js";

const SO_API_BASE = "https://api.stackexchange.com/2.3";

/**
 * @typedef {object} StackOverflowData
 * @property {string}        displayName    User's display name.
 * @property {number}        userId         Numeric Stack Overflow user ID.
 * @property {number}        reputation     Total reputation score.
 * @property {number}        goldBadges     Gold badge count.
 * @property {number}        silverBadges   Silver badge count.
 * @property {number}        bronzeBadges   Bronze badge count.
 * @property {number}        answerCount    Total answers posted.
 * @property {number}        questionCount  Total questions asked.
 * @property {number|undefined} acceptRate  Percentage of questions with an accepted answer (may be absent).
 */

/**
 * Fetch public profile stats for a Stack Overflow user.
 *
 * Uses the Stack Exchange REST API v2.3 (no authentication required for basic
 * public fields).  The response is gzip-compressed; axios decompresses it
 * automatically via the `decompress: true` default.
 *
 * @param {string|number} userId Numeric Stack Overflow user ID (e.g. 1732273).
 * @returns {Promise<StackOverflowData>} Resolved Stack Overflow stats.
 * @throws {MissingParamError} When `userId` is falsy.
 * @throws {CustomError}       When the user is not found (empty items array).
 */
const fetchStackOverflow = async (userId) => {
  if (!userId) {
    throw new MissingParamError(["user_id"]);
  }

  const url =
    `${SO_API_BASE}/users/${userId}` +
    `?site=stackoverflow&filter=!9Z(-wzu0T`;

  const response = await axios.get(url, {
    // Stack Exchange returns gzip by default; axios handles decompression.
    headers: { "Accept-Encoding": "gzip" },
  });

  const items = response.data?.items;

  if (!Array.isArray(items) || items.length === 0) {
    throw new CustomError(
      `Could not find Stack Overflow user with id "${userId}".`,
      CustomError.USER_NOT_FOUND,
    );
  }

  const user = items[0];

  return {
    displayName: user.display_name,
    userId: user.user_id,
    reputation: user.reputation ?? 0,
    goldBadges: user.badge_counts?.gold ?? 0,
    silverBadges: user.badge_counts?.silver ?? 0,
    bronzeBadges: user.badge_counts?.bronze ?? 0,
    answerCount: user.answer_count ?? 0,
    questionCount: user.question_count ?? 0,
    acceptRate: user.accept_rate, // intentionally left undefined when absent
  };
};

export { fetchStackOverflow };
export default fetchStackOverflow;
