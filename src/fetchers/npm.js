// @ts-check

import axios from "axios";
import { MissingParamError } from "../common/error.js";

const NPM_REGISTRY_SEARCH = "https://registry.npmjs.org/-/v1/search";
const NPM_DOWNLOADS_API = "https://api.npmjs.org/downloads/point/last-month";
const DOWNLOAD_CHUNK_SIZE = 128;

/**
 * Split an array into chunks of a given size.
 *
 * @template T
 * @param {T[]} arr Array to chunk.
 * @param {number} size Chunk size.
 * @returns {T[][]} Array of chunks.
 */
const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Fetch all NPM packages maintained by a given username.
 *
 * @param {string} username NPM username.
 * @returns {Promise<import("./types").NpmData>} NPM stats data.
 */
const fetchNpmStats = async (username) => {
  if (!username) {
    throw new MissingParamError(["username"]);
  }

  // 1. Search for all packages by maintainer (max 250 per request).
  const searchRes = await axios.get(NPM_REGISTRY_SEARCH, {
    params: { text: `maintainer:${username}`, size: 250 },
  });

  const objects = searchRes.data.objects || [];

  if (objects.length === 0) {
    return {
      username,
      totalPackages: 0,
      totalMonthlyDownloads: 0,
      topPackage: null,
      packageNames: [],
    };
  }

  const packageNames = objects.map((o) => o.package.name);

  // 2. Fetch downloads in chunks of DOWNLOAD_CHUNK_SIZE.
  const chunks = chunkArray(packageNames, DOWNLOAD_CHUNK_SIZE);

  /** @type {Record<string, number>} */
  const downloadMap = {};

  for (const chunk of chunks) {
    if (chunk.length === 1) {
      // Single-package endpoint returns a flat object, not a map.
      const { data } = await axios.get(
        `${NPM_DOWNLOADS_API}/${encodeURIComponent(chunk[0])}`,
      );
      downloadMap[chunk[0]] = data.downloads || 0;
    } else {
      const { data } = await axios.get(
        `${NPM_DOWNLOADS_API}/${chunk.map(encodeURIComponent).join(",")}`,
      );
      for (const [pkg, info] of Object.entries(data)) {
        // @ts-ignore
        downloadMap[pkg] = info?.downloads || 0;
      }
    }
  }

  // 3. Sum totals and find the most downloaded package.
  let totalMonthlyDownloads = 0;
  let topPackage = null;

  for (const [pkg, downloads] of Object.entries(downloadMap)) {
    totalMonthlyDownloads += downloads;
    if (!topPackage || downloads > topPackage.downloads) {
      topPackage = { name: pkg, downloads };
    }
  }

  return {
    username,
    totalPackages: packageNames.length,
    totalMonthlyDownloads,
    topPackage,
    packageNames,
  };
};

export { fetchNpmStats };
export default fetchNpmStats;
