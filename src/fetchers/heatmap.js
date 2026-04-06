// @ts-check

import * as dotenv from "dotenv";
import githubUsernameRegex from "github-username-regex";
import { retryer } from "../common/retryer.js";
import { request } from "../common/http.js";
import { CustomError, MissingParamError } from "../common/error.js";
import { logger } from "../common/log.js";

dotenv.config();

const HEATMAP_QUERY = `
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
              weekday
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
    { query: HEATMAP_QUERY, variables },
    { Authorization: `bearer ${token}` },
  );
};

/**
 * @typedef {{
 *   name: string,
 *   totalContributions: number,
 *   weeks: Array<{
 *     contributionDays: Array<{
 *       date: string,
 *       contributionCount: number,
 *       weekday: number,
 *     }>
 *   }>
 * }} HeatmapData
 */

/**
 * Fetch contribution heatmap data for a given GitHub username.
 *
 * @param {string} username GitHub username.
 * @returns {Promise<HeatmapData>} Heatmap data containing weeks and contribution counts.
 */
const fetchHeatmap = async (username) => {
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
      "Something went wrong while retrieving heatmap data.",
      CustomError.GRAPHQL_ERROR,
    );
  }

  const user = res.data.data.user;
  const calendar = user.contributionsCollection.contributionCalendar;

  return {
    name: user.name || username,
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks,
  };
};

export { fetchHeatmap };
export default fetchHeatmap;
