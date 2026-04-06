// @ts-check

import axios from "axios";
import { CustomError, MissingParamError } from "../common/error.js";

const LASTFM_BASE_URL = "http://ws.audioscrobbler.com/2.0/";

/**
 * @typedef {{
 *   username: string,
 *   totalScrobbles: number,
 *   topArtist: string,
 *   recentTrack: string,
 *   recentArtist: string,
 *   isNowPlaying: boolean,
 *   country: string,
 * }} LastFmData
 */

/**
 * Fetch Last.fm stats for a given username.
 *
 * Three API calls are made in parallel:
 *  - user.getinfo  — profile data (playcount, country)
 *  - user.gettopartists (7day, limit=1) — top artist for the past week
 *  - user.getrecenttracks (limit=1) — most recent/currently-playing track
 *
 * @param {string} username Last.fm username.
 * @param {string} api_key Last.fm API key.
 * @returns {Promise<LastFmData>} Last.fm statistics.
 */
const fetchLastFm = async (username, api_key) => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }
  if (!api_key) {
    throw new MissingParamError(["api_key"]);
  }

  const base = `${LASTFM_BASE_URL}?api_key=${encodeURIComponent(api_key)}&user=${encodeURIComponent(username)}&format=json`;

  let userInfo, topArtists, recentTracks;

  try {
    [userInfo, topArtists, recentTracks] = await Promise.all([
      axios.get(`${base}&method=user.getinfo`),
      axios.get(`${base}&method=user.gettopartists&limit=1&period=7day`),
      axios.get(`${base}&method=user.getrecenttracks&limit=1`),
    ]);
  } catch (err) {
    throw new CustomError(
      "Failed to reach the Last.fm API. Please try again later.",
      CustomError.GITHUB_REST_API_ERROR,
    );
  }

  // Last.fm surfaces API errors inside a 200 response body.
  for (const resp of [userInfo, topArtists, recentTracks]) {
    if (resp.data.error) {
      if (resp.data.error === 6) {
        throw new CustomError(
          `Last.fm user '${username}' not found.`,
          CustomError.USER_NOT_FOUND,
        );
      }
      throw new CustomError(
        resp.data.message || "Last.fm API error.",
        CustomError.GITHUB_REST_API_ERROR,
      );
    }
  }

  const user = userInfo.data.user;
  const totalScrobbles = parseInt(user.playcount, 10) || 0;
  const country = user.country || "";

  const artistList = topArtists.data?.topartists?.artist;
  const topArtist = Array.isArray(artistList) && artistList.length > 0
    ? artistList[0].name
    : "N/A";

  const trackList = recentTracks.data?.recenttracks?.track;
  const latestTrack = Array.isArray(trackList) && trackList.length > 0
    ? trackList[0]
    : null;

  const recentTrack = latestTrack ? latestTrack.name : "N/A";
  const recentArtist = latestTrack
    ? (latestTrack.artist?.["#text"] || "N/A")
    : "N/A";
  const isNowPlaying = !!(latestTrack?.["@attr"]?.nowplaying === "true");

  return {
    username: user.name || username,
    totalScrobbles,
    topArtist,
    recentTrack,
    recentArtist,
    isNowPlaying,
    country,
  };
};

export { fetchLastFm };
export default fetchLastFm;
