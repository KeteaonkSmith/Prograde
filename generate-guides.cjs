const fs = require("fs");
const guideDefs = require("./guide-defs.cjs");

global.window = {};
require("./assets/resources-data.js");

const resources = window.PROGRADE_RESOURCES || [];

function esc(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;"
  }[char]));
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function formatGrades(grades) {
  if (!Array.isArray(grades) || !grades.length) return "Check official eligibility";
  const min = Math.min(...grades);
  const max = Math.max(...grades);
  if (min === max) return min >= 13 ? `College year ${min - 12}` : `Grade ${min}`;
  const start = min >= 13 ? `College year ${min - 12}` : `Grade ${min}`;
  const end = max >= 13 ? `College year ${max - 12}` : `Grade ${max}`;
  return `${start}-${end}`;
}

function locationLabel(resource) {
  if (resource.format === "remote") return "Remote";
  if (resource.format === "hybrid") return "Hybrid";
  if (resource.format === "residential") return "Residential";
  if (resource.format === "in-person") return "In person";
  if (resource.citizenship) return resource.citizenship;
  return "Check official page";
}

function rankTone(value) {
  if (!value) return "unknown";
  const normalized = value.toLowerCase();
  if (normalized === "reach") return "closed";
  if (normalized === "match") return "active";
  if (normalized === "safety") return "upcoming";
  return "unknown";
}

const categoryLabels = {
  program: "Program",
  scholarship: "Scholarship",
  competition: "Competition",
  hackathon: "Hackathon",
  visit: "Visit",
  course: "Course",
  tool: "Free tool",
  study: "Study resource"
};

const usedResourceIds = new Set();
resources.forEach((resource) => {
  const baseId = resource.id || slugify(resource.title);
  let candidateId = baseId;
  let suffix = 2;
  while (usedResourceIds.has(candidateId)) {
    candidateId = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedResourceIds.add(candidateId);
  resource.id = candidateId;
});

const byTitle = new Map(resources.map((resource) => [resource.title, resource]));

function sharedNav(currentLabel) {
  return `<header class="topbar"><a class="brand" href="../index.html"><svg class="mark" viewBox="0 0 100 100"><circle cx="50" cy="50" r="29"/><path d="M50 8v20M50 72v20M8 50h20M72 50h20"/><circle cx="50" cy="50" r="5"/></svg><span>Prograde</span></a><nav class="nav"><a ${currentLabel === "Guides" ? 'aria-current="page"' : ""} href="../index.html">Guides</a><a href="../resources.html">Catalog</a><a href="../dashboard.html">Dashboard</a><a href="../about.html">About</a></nav><a class="nav-cta" href="../onboarding.html">Update fit</a></header>`;
}

function pageShell(guide, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(guide.title)} | Prograde</title>
  <meta name="description" content="${esc(guide.description)}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Geist:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <div class="site-grid"></div>
  ${sharedNav("Guides")}
  <main>${body}</main>
  <footer class="footer"><div><strong>Prograde</strong><span>Student-built guidance with real notes, real costs, and real deadlines.</span></div><nav><a href="../index.html">Guides</a><a href="../resources.html">Catalog</a><a href="../dashboard.html">Dashboard</a></nav></footer>
  <script src="../assets/resources-data.js"></script>
  <script src="../assets/app.js"></script>
</body>
</html>`;
}

function renderGuidePage(guide) {
  const entries = guide.entries.map((entry, index) => {
    const resource = byTitle.get(entry.title);
    if (!resource) return null;
    return { ...entry, rank: index + 1, resource };
  }).filter(Boolean);

  const bestBets = guide.bestBets.map((title) => entries.find((entry) => entry.title === title)).filter(Boolean);
  const bestBetSet = new Set(bestBets.map((entry) => entry.title));
  const remainingEntries = entries.filter((entry) => !bestBetSet.has(entry.title));
  const sectionMap = new Map((guide.sections || []).map((section) => [
    section.title,
    section.entries.map((title) => remainingEntries.find((entry) => entry.title === title)).filter(Boolean)
  ]));
  const unsectionedEntries = remainingEntries.filter((entry) => !(guide.sections || []).some((section) => section.entries.includes(entry.title)));

  const body = `
    <section class="page-hero compact">
      <p class="eyebrow">Flagship guide</p>
      <h1>${esc(guide.title)}</h1>
      <p>${esc(guide.description)}</p>
    </section>

    <section class="split-section">
      <div>
        <p class="eyebrow">Who this is for</p>
        <h2>${esc(guide.audience)}</h2>
        <p>${esc(guide.whyThisPage)}</p>
      </div>
      <div class="benefit-grid">
        <article><span>How to use this page</span><h3>Start with the top three.</h3><p>${esc(guide.bestBetsIntro)}</p></article>
        <article><span>What to compare</span><h3>Cost, timing, fit, and whether the effort is actually worth it.</h3><p>Every entry is here because it gives a student something real: a project, a skill jump, a research path, a scholarship shot, or a clearer next step.</p></article>
        <article><span>What not to do</span><h3>Do not chase prestige without fit.</h3><p>The point of this page is to save you from throwing essays at opportunities that sound good but make no sense for your stage, budget, or interests.</p></article>
      </div>
    </section>

    <section class="guide-best-bets">
      <div class="board-head">
        <div>
          <p class="eyebrow">Best bets if you only apply to three</p>
          <h2>Start with the strongest mix of upside, realism, and payoff.</h2>
        </div>
        <a class="text-link" href="../dashboard.html">Open dashboard</a>
      </div>
      <div class="guide-best-bet-grid">
        ${bestBets.map((entry, index) => `
          <article class="guide-best-bet">
            <span class="guide-rank">Pick ${index + 1}</span>
            <h3>${esc(entry.title)}</h3>
            <p>${esc(entry.note)}</p>
            <div class="card-meta">
              <div><span>Who</span><strong>${esc(entry.resource.audience)}</strong></div>
              <div><span>Cost</span><strong>${esc(entry.resource.cost)}</strong></div>
              <div><span>Timing</span><strong>${esc(entry.resource.deadline)}</strong></div>
            </div>
            <div class="student-note"><strong>Good for</strong><p>${esc(entry.goodFor)}</p></div>
            <div class="student-note"><strong>Skip if</strong><p>${esc(entry.skipIf)}</p></div>
            <div class="card-actions"><a class="ghost-button" href="../resource-pages/${entry.resource.id}.html">Read detail page</a><a class="source-button" href="${esc(entry.resource.source)}" target="_blank" rel="noreferrer">Official source</a></div>
          </article>
        `).join("")}
      </div>
    </section>

    <section class="editorial-listing">
      <div class="board-head">
        <div>
          <p class="eyebrow">Ranked list</p>
          <h2>${entries.length} real options, with notes on what is actually worth your time.</h2>
        </div>
        <a class="text-link" href="../resources.html?q=${encodeURIComponent(guide.query)}">Open matching catalog search</a>
      </div>
      ${(guide.sections || []).map((section) => `
        <div class="editorial-section">
          <div class="board-head">
            <div>
              <p class="eyebrow">${esc(section.title)}</p>
              <h2>${esc(section.intro)}</h2>
            </div>
          </div>
          <div class="editorial-list">
            ${(sectionMap.get(section.title) || []).map((entry) => `
          <article class="editorial-entry">
            <div class="editorial-entry__head">
              <div>
                <span class="guide-rank">#${entry.rank}</span>
                <h3>${esc(entry.title)}</h3>
                <p>${esc(entry.note)}</p>
              </div>
              ${entry.reachMatchSafety ? `<span class="status-pill ${rankTone(entry.reachMatchSafety)}">${esc(entry.reachMatchSafety)}</span>` : ""}
            </div>
            <div class="card-meta">
              <div><span>Category</span><strong>${esc(categoryLabels[entry.resource.category] || entry.resource.category)}</strong></div>
              <div><span>Stage</span><strong>${esc(formatGrades(entry.resource.grades))}</strong></div>
              <div><span>Cost</span><strong>${esc(entry.resource.cost)}</strong></div>
              <div><span>Timing</span><strong>${esc(entry.resource.deadline)}</strong></div>
              <div><span>Selectivity</span><strong>${esc(entry.resource.selectivity || "Check source")}</strong></div>
              <div><span>Format</span><strong>${esc(locationLabel(entry.resource))}</strong></div>
            </div>
            <div class="editorial-entry__notes">
              <div class="student-note"><strong>Good for</strong><p>${esc(entry.goodFor)}</p></div>
              <div class="student-note"><strong>Skip if</strong><p>${esc(entry.skipIf)}</p></div>
            </div>
            <div class="card-actions"><a class="ghost-button" href="../resource-pages/${entry.resource.id}.html">Read Prograde detail</a><a class="source-button" href="${esc(entry.resource.source)}" target="_blank" rel="noreferrer">Official source</a></div>
          </article>
        `).join("")}
          </div>
        </div>
      `).join("")}
      ${unsectionedEntries.length ? `<div class="editorial-list">
        ${unsectionedEntries.map((entry) => `
          <article class="editorial-entry">
            <div class="editorial-entry__head">
              <div>
                <span class="guide-rank">#${entry.rank}</span>
                <h3>${esc(entry.title)}</h3>
                <p>${esc(entry.note)}</p>
              </div>
              ${entry.reachMatchSafety ? `<span class="status-pill ${rankTone(entry.reachMatchSafety)}">${esc(entry.reachMatchSafety)}</span>` : ""}
            </div>
            <div class="card-meta">
              <div><span>Category</span><strong>${esc(categoryLabels[entry.resource.category] || entry.resource.category)}</strong></div>
              <div><span>Stage</span><strong>${esc(formatGrades(entry.resource.grades))}</strong></div>
              <div><span>Cost</span><strong>${esc(entry.resource.cost)}</strong></div>
              <div><span>Timing</span><strong>${esc(entry.resource.deadline)}</strong></div>
              <div><span>Selectivity</span><strong>${esc(entry.resource.selectivity || "Check source")}</strong></div>
              <div><span>Format</span><strong>${esc(locationLabel(entry.resource))}</strong></div>
            </div>
            <div class="editorial-entry__notes">
              <div class="student-note"><strong>Good for</strong><p>${esc(entry.goodFor)}</p></div>
              <div class="student-note"><strong>Skip if</strong><p>${esc(entry.skipIf)}</p></div>
            </div>
            <div class="card-actions"><a class="ghost-button" href="../resource-pages/${entry.resource.id}.html">Read Prograde detail</a><a class="source-button" href="${esc(entry.resource.source)}" target="_blank" rel="noreferrer">Official source</a></div>
          </article>
        `).join("")}
      </div>` : ""}
    </section>

    <section class="status-guide">
      <article><span class="status-pill active">How to think about this list</span><p>The point is not to apply everywhere. It is to build a shortlist you can actually execute well.</p></article>
      <article><span class="status-pill upcoming">What to save</span><p>Save a few realistic options to your dashboard, then turn them into next steps, notes, and study tasks.</p></article>
      <article><span class="status-pill active">What to verify</span><p>Dates, eligibility, cost, and logistics can move. Always confirm details on the official source before you act.</p></article>
    </section>
  `;

  fs.writeFileSync(`guides/${guide.file}`, pageShell(guide, body));
}

fs.mkdirSync("guides", { recursive: true });
guideDefs.forEach(renderGuidePage);
console.log(`generated ${guideDefs.length} editorial guide pages`);
