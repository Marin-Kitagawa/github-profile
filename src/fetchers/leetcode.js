// @ts-check

import axios from "axios";
import { CustomError, MissingParamError } from "../common/error.js";
import { logger } from "../common/log.js";

const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

/**
 * GraphQL query to fetch a LeetCode user's public profile stats.
 * Uses `submitStatsGlobal` which is publicly accessible without authentication.
 */
const LEETCODE_QUERY = `
  query getUserProfile($username: String!) {
    allQuestionsCount {
      difficulty
      count
    }
    matchedUser(username: $username) {
      username
      profile {
        ranking
      }
      submitStats: submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
          submissions
        }
      }
    }
  }
`;

/**
 * @typedef {Object} LeetCodeData
 * @property {string} username LeetCode username.
 * @property {number} ranking Global ranking (0 if unranked).
 * @property {number} totalSolved Total problems solved across all difficulties.
 * @property {number} totalQuestions Total problems available on LeetCode.
 * @property {number} easySolved Number of Easy problems solved.
 * @property {number} easyTotal Total Easy problems available.
 * @property {number} mediumSolved Number of Medium problems solved.
 * @property {number} mediumTotal Total Medium problems available.
 * @property {number} hardSolved Number of Hard problems solved.
 * @property {number} hardTotal Total Hard problems available.
 * @property {number} acceptanceRate Acceptance rate as a percentage (0–100).
 */

/**
 * Look up a difficulty count from an array of `{ difficulty, count }` objects.
 *
 * @param {Array<{difficulty: string, count: number}>} arr Array to search.
 * @param {string} difficulty Difficulty label (e.g. "Easy", "Medium", "Hard", "All").
 * @returns {number} The matching count, or 0 if not found.
 */
const findCount = (arr, difficulty) => {
  const entry = arr.find((d) => d.difficulty === difficulty);
  return entry ? entry.count : 0;
};

/**
 * Look up total submissions from an `acSubmissionNum` array.
 *
 * @param {Array<{difficulty: string, count: number, submissions: number}>} arr Array to search.
 * @param {string} difficulty Difficulty label.
 * @returns {number} The matching submissions count, or 0 if not found.
 */
const findSubmissions = (arr, difficulty) => {
  const entry = arr.find((d) => d.difficulty === difficulty);
  return entry ? entry.submissions : 0;
};

/**
 * Fetch LeetCode stats for a given username from the public LeetCode GraphQL API.
 * No authentication token is required for public profiles.
 *
 * @param {string} username LeetCode username.
 * @returns {Promise<LeetCodeData>} Resolved LeetCode stats data.
 * @throws {MissingParamError} If username is falsy.
 * @throws {CustomError} If the user is not found or the API returns an error.
 */
const fetchLeetCode = async (username) => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  let res;
  try {
    res = await axios.post(
      LEETCODE_GRAPHQL_URL,
      { query: LEETCODE_QUERY, variables: { username } },
      {
        headers: {
          "Content-Type": "application/json",
          // Mimic a browser referer so LeetCode's CORS policy doesn't block the request.
          Referer: "https://leetcode.com",
        },
        timeout: 10000,
      },
    );
  } catch (err) {
    logger.error("LeetCode API request failed:", err?.message);
    throw new CustomError(
      "Failed to reach LeetCode API. Please try again later.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  const { data: body } = res;

  if (body.errors) {
    logger.error("LeetCode GraphQL errors:", body.errors);
    throw new CustomError(
      body.errors[0]?.message || "LeetCode GraphQL error.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  const matchedUser = body.data?.matchedUser;
  if (!matchedUser) {
    throw new CustomError(
      `Could not find LeetCode user with username "${username}".`,
      CustomError.USER_NOT_FOUND,
    );
  }

  // --- Total questions available per difficulty ---
  /** @type {Array<{difficulty: string, count: number}>} */
  const allQuestionsCount = body.data.allQuestionsCount ?? [];
  const easyTotal = findCount(allQuestionsCount, "Easy");
  const mediumTotal = findCount(allQuestionsCount, "Medium");
  const hardTotal = findCount(allQuestionsCount, "Hard");
  const totalQuestions = findCount(allQuestionsCount, "All");

  // --- Problems solved per difficulty ---
  /** @type {Array<{difficulty: string, count: number, submissions: number}>} */
  const acSubmissionNum =
    matchedUser.submitStats?.acSubmissionNum ?? [];
  const easySolved = findCount(acSubmissionNum, "Easy");
  const mediumSolved = findCount(acSubmissionNum, "Medium");
  const hardSolved = findCount(acSubmissionNum, "Hard");
  const totalSolved = findCount(acSubmissionNum, "All");

  // --- Acceptance rate: solved / total submissions across all difficulties ---
  const totalSubmissions = findSubmissions(acSubmissionNum, "All");
  const acceptanceRate =
    totalSubmissions > 0
      ? parseFloat(((totalSolved / totalSubmissions) * 100).toFixed(1))
      : 0;

  return {
    username: matchedUser.username,
    ranking: matchedUser.profile?.ranking ?? 0,
    totalSolved,
    totalQuestions,
    easySolved,
    easyTotal,
    mediumSolved,
    mediumTotal,
    hardSolved,
    hardTotal,
    acceptanceRate,
  };
};

export { fetchLeetCode };
export default fetchLeetCode;
