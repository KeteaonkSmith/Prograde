const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { siteUrl } = require("../site-config.cjs");

global.window = {};
require("../assets/resources-data.js");
const resources = window.PROGRADE_RESOURCES || [];

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "assets", "scout-report.json");
const offline = process.env.PROGRADE_SCOUT_OFFLINE === "1";
const timeoutMs = 15000;

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return normalizeText(match ? match[1] : "");
}

function extractSignals(html) {
  const text = normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );
  const matches = text.match(/\b(?:deadline|apply|application|register|registration|opens?|closes?)\b[^.]{0,140}/gi) || [];
  return Array.from(new Set(matches.map(normalizeText))).slice(0, 3);
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "ProgradeOpportunityScout/1.0 (+https://keteaonksmith.github.io/Prograde)"
      }
    });
    const html = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      title: extractTitle(html),
      signals: extractSignals(html)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function buildReport() {
  const entries = [];
  for (const resource of resources) {
    const baseEntry = {
      id: resource.id || resource.title,
      title: resource.title,
      category: resource.category,
      source: resource.source
    };
    if (offline || typeof fetch !== "function") {
      entries.push(baseEntry);
      continue;
    }
    try {
      const result = await fetchWithTimeout(resource.source);
      entries.push({
        ...baseEntry,
        status: result.status,
        reachable: result.ok,
        finalUrl: result.finalUrl,
        pageTitle: result.title,
        sourceChanged: result.finalUrl && result.finalUrl !== resource.source,
        signals: result.signals
      });
    } catch (error) {
      entries.push({
        ...baseEntry,
        reachable: false,
        error: error && error.name ? error.name : "FetchError"
      });
    }
  }
  return {
    siteUrl,
    summary: {
      totalResources: resources.length,
      reachable: entries.filter(entry => entry.reachable === true).length,
      unreachable: entries.filter(entry => entry.reachable === false).length,
      redirected: entries.filter(entry => entry.sourceChanged).length
    },
    entries
  };
}

function writeIfChanged(filePath, nextValue) {
  const nextText = `${JSON.stringify(nextValue, null, 2)}\n`;
  const prevText = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  if (prevText !== nextText) {
    fs.writeFileSync(filePath, nextText);
    return true;
  }
  return false;
}

function runNodeScript(file) {
  execFileSync("node", [file], {
    cwd: root,
    stdio: "inherit"
  });
}

(async () => {
  const report = await buildReport();
  writeIfChanged(reportPath, report);
  runNodeScript("generate-guides.cjs");
  runNodeScript("generate-static-seo.cjs");
  console.log(`opportunity scout completed for ${resources.length} resources`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
