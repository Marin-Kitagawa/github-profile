// @ts-check

import * as dotenv from "dotenv";
import githubUsernameRegex from "github-username-regex";
import { retryer } from "../common/retryer.js";
import { request } from "../common/http.js";
import { CustomError, MissingParamError } from "../common/error.js";
import { logger } from "../common/log.js";

dotenv.config();

const STREAK_QUERY = `
  query userContributions($login: String!) {
    user(login: $login) {
      name
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

/**
 * @param {object} variables Fetcher variables.
 * @param {string} token GitHub token.
 * @returns {Promise<import('axios').AxiosResponse>} Axios response.
 */
const fetcher = (variables, token) => {
  return request(
    { query: STREAK_QUERY, variables },
    { Authorization: `bearer ${token}` },
  );
};

/**
 * Calculate current streak and longest streak from a sorted array of contribution days.
 *
 * @param {Array<{date: string, contributionCount: number}>} days Sorted oldest → newest.
 * @returns {{ currentStreak: number, longestStreak: number, currentStart: string, currentEnd: string, longestStart: string, longestEnd: string }}
 */
const calculateStreaks = (days) => {
  const today = new Date().toISOString().split("T")[0];

  // Filter out any future-dated entries GitHub may include
  const pastDays = days.filter((d) => d.date <= today);

  // --- Current streak (scan backwards from most recent day) ---
  let currentStreak = 0;
  let currentStart = "";
  let currentEnd = "";

  // If the last entry is today with 0 contributions the day is still in progress,
  // so we look backward from yesterday's position instead.
  let endIdx = pastDays.length - 1;
  if (
    endIdx >= 0 &&
    pastDays[endIdx].date === today &&
    pastDays[endIdx].contributionCount === 0
  ) {
    endIdx--;
  }

  for (let i = endIdx; i >= 0; i--) {
    if (pastDays[i].contributionCount > 0) {
      currentStreak++;
      currentStart = pastDays[i].date;
      if (!currentEnd) currentEnd = pastDays[i].date;
    } else {
      break;
    }
  }

  // --- Longest streak (single forward pass) ---
  let longestStreak = 0;
  let longestStart = "";
  let longestEnd = "";
  let runLength = 0;
  let runStart = "";

  for (const day of pastDays) {
    if (day.contributionCount > 0) {
      if (runLength === 0) runStart = day.date;
      runLength++;
      if (runLength > longestStreak) {
        longestStreak = runLength;
        longestStart = runStart;
        longestEnd = day.date;
      }
    } else {
      runLength = 0;
      runStart = "";
    }
  }

  return {
    currentStreak,
    longestStreak,
    currentStart,
    currentEnd,
    longestStart,
    longestEnd,
  };
};

/**
 * Fetch streak stats for a given GitHub username.
 *
 * @param {string} username GitHub username.
 * @returns {Promise<import("./types").StreakData>} Streak data.
 */
const fetchStreak = async (username) => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  if (!githubUsernameRegex.test(username)) {
    throw new CustomError(
      "Invalid username provided.",
      CustomError.USER_NOT_FOUND,
    );
  }

  const res = await retryer(fetcher, { login: username });

  if (res.data.errors) {
    logger.error(res.data.errors);
    if (res.data.errors[0].type === "NOT_FOUND") {
      throw new CustomError(
        res.data.errors[0].message || "Could not fetch user.",
        CustomError.USER_NOT_FOUND,
      );
    }
    throw new CustomError(
      "Something went wrong while retrieving streak data.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  const user = res.data.data.user;
  const calendar = user.contributionsCollection.contributionCalendar;

  // Flatten weeks → days array, sorted oldest → newest
  const days = calendar.weeks.flatMap((week) => week.contributionDays);

  const {
    currentStreak,
    longestStreak,
    currentStart,
    currentEnd,
    longestStart,
    longestEnd,
  } = calculateStreaks(days);

  return {
    name: user.name || username,
    totalContributions: calendar.totalContributions,
    currentStreak,
    longestStreak,
    currentStart,
    currentEnd,
    longestStart,
    longestEnd,
  };
};

export { fetchStreak };
export default fetchStreak;
