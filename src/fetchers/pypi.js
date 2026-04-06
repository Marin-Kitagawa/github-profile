// @ts-check

import axios from "axios";
import { MissingParamError } from "../common/error.js";

const PYPI_JSON_API = "https://pypi.org/pypi";
const PYPISTATS_API = "https://pypistats.org/api/packages";

/**
 * Fetch stats for a list of PyPI packages.
 *
 * @param {string} packages Comma-separated list of PyPI package names.
 * @returns {Promise<import("./types").PypiData>} PyPI stats data.
 */
const fetchPypiStats = async (packages) => {
  if (!packages) {
    throw new MissingParamError(["packages"]);
  }

  const packageList = packages
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (packageList.length === 0) {
    throw new MissingParamError(["packages"]);
  }

  // Fetch package info and download stats concurrently per package.
  const results = await Promise.allSettled(
    packageList.map(async (pkg) => {
      const [infoRes, statsRes] = await Promise.all([
        axios.get(`${PYPI_JSON_API}/${encodeURIComponent(pkg)}/json`),
        axios.get(
          `${PYPISTATS_API}/${encodeURIComponent(pkg.toLowerCase())}/recent`,
        ),
      ]);

      const info = infoRes.data.info;
      const monthlyDownloads = statsRes.data?.data?.last_month ?? 0;

      return {
        name: info.name,
        version: info.version,
        monthlyDownloads,
        description: info.summary || "",
      };
    }),
  );

  /** @type {Array<{name: string, version: string, monthlyDownloads: number, description: string}>} */
  const resolvedPackages = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      resolvedPackages.push(result.value);
    }
    // Silently skip packages that fail (e.g. not found / network error).
  }

  let totalMonthlyDownloads = 0;
  let topPackage = null;

  for (const pkg of resolvedPackages) {
    totalMonthlyDownloads += pkg.monthlyDownloads;
    if (!topPackage || pkg.monthlyDownloads > topPackage.downloads) {
      topPackage = { name: pkg.name, downloads: pkg.monthlyDownloads };
    }
  }

  return {
    packages: resolvedPackages,
    totalMonthlyDownloads,
    topPackage,
  };
};

export { fetchPypiStats };
export default fetchPypiStats;
