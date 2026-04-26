const resources = window.PROGRADE_RESOURCES || [];

function initStarfield() {
  if (document.querySelector(".starfield-canvas")) return;
  const canvas = document.createElement("canvas");
  canvas.className = "starfield-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext("2d");
  const layers = [
    { count: 105, speed: 0.04, size: [0.4, 0.6], alpha: [0.2, 0.58] },
    { count: 68, speed: 0.09, size: [0.8, 1.1], alpha: [0.25, 0.72] },
    { count: 34, speed: 0.18, size: [1.3, 1.8], alpha: [0.28, 0.9] }
  ];
  const stars = [];
  let width = 0;
  let height = 0;
  let dpr = 1;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pickColor(alpha) {
    const roll = Math.random();
    if (roll > 0.92) return `rgba(100,255,200,${alpha})`;
    if (roll > 0.82) return `rgba(255,240,210,${alpha})`;
    return `rgba(255,255,255,${alpha})`;
  }

  function makeStar(layer, resetTop = false) {
    const baseAlpha = rand(layer.alpha[0], layer.alpha[1]);
    return {
      x: rand(0, width),
      y: resetTop ? rand(-24, 0) : rand(0, height),
      r: rand(layer.size[0], layer.size[1]),
      speed: layer.speed,
      driftX: -layer.speed * rand(0.08, 0.22),
      baseAlpha,
      twinkle: rand(0.2, 0.9),
      phase: rand(0, Math.PI * 2),
      colorBase: Math.random()
    };
  }

  function resetStars() {
    stars.length = 0;
    layers.forEach((layer) => {
      for (let i = 0; i < layer.count; i += 1) {
        stars.push(makeStar(layer));
      }
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resetStars();
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);
    const t = time * 0.001;
    stars.forEach((star) => {
      star.y += star.speed;
      star.x += star.driftX;
      if (star.y - star.r > height) {
        star.y = rand(-18, 0);
        star.x = rand(0, width);
      }
      if (star.x < -4) star.x = width + rand(0, 8);

      const oscillation = (Math.sin(t * star.twinkle + star.phase) + 1) / 2;
      const alpha = Math.max(0.2, Math.min(0.9, star.baseAlpha * (0.58 + oscillation * 0.42)));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = pickColor(alpha);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(draw);
}

initStarfield();

function initCursorRipples() {
  if (document.querySelector(".cursor-ripple-layer")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const layer = document.createElement("div");
  layer.className = "cursor-ripple-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.insertBefore(layer, document.body.firstChild);

  let lastX = -1000;
  let lastY = -1000;
  let lastAt = 0;

  function spawnRipple(x, y, strength = 1) {
    const ripple = document.createElement("span");
    ripple.className = "cursor-ripple";
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.setProperty("--ripple-size", `${150 + Math.round(strength * 90)}px`);
    layer.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }

  function handleMove(event) {
    const x = event.clientX;
    const y = event.clientY;
    const now = performance.now();
    const distance = Math.hypot(x - lastX, y - lastY);
    if (distance < 18 || now - lastAt < 90) return;
    lastX = x;
    lastY = y;
    lastAt = now;
    spawnRipple(x, y, Math.min(1.4, 0.8 + distance / 90));
  }

  document.addEventListener("pointermove", handleMove, { passive: true });
  document.addEventListener("mousemove", handleMove, { passive: true });
}

initCursorRipples();

const categoryLabels = {
  program: "Program",
  scholarship: "Scholarship",
  competition: "Competition",
  hackathon: "Hackathon",
  visit: "Visit / Open House",
  course: "Course",
  tool: "Free Tool",
  study: "Study Material"
};

const catalogReviewedLabel = "Reviewed Apr 25, 2026";

const defaultProfile = {
  grade: "11",
  interests: ["stem", "cs", "research"],
  goals: ["portfolio", "skills"],
  experience: "some",
  budget: "free",
  format: "any",
  effort: "3",
  availability: "semester",
  support: "solo",
  location: "",
  citizenship: "unknown",
  weeklyTime: "3-5",
  applicationConfidence: "medium"
};

function loadProfile() {
  try {
    return { ...defaultProfile, ...JSON.parse(localStorage.getItem("progradeProfile") || "{}") };
  } catch {
    return { ...defaultProfile };
  }
}

let profile = loadProfile();
let savedResources = loadSavedResources();

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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
  if (resource.category === "scholarship" && !resource.scholarshipType) {
    const text = [resource.title, resource.summary, resource.tags, resource.why, resource.audience].join(" ").toLowerCase();
    const types = [];
    if (/need|income|pell|financial/.test(text)) types.push("need-based");
    if (/merit|academic|gpa|score|excellence|achievement/.test(text)) types.push("merit");
    if (/first.gen|first gen|first-generation/.test(text)) types.push("first-gen");
    if (/women|girl|black|hispanic|latinx|native|minority|identity|underrepresented/.test(text)) types.push("identity-based");
    if (/essay|writing|application/.test(text)) types.push("essay");
    if (/stem|science|engineering|math|technology|computer|cyber/.test(text)) types.push("STEM");
    if (/art|arts|design|music|film|creative/.test(text)) types.push("arts");
    if (/service|volunteer|community|leadership/.test(text)) types.push("service");
    if (/local|regional|state|county|city/.test(text)) types.push("local/national");
    if (!types.length) types.push("local/national");
    resource.scholarshipType = [...new Set(types)];
  }
});

function loadSavedResources() {
  try {
    return new Set(JSON.parse(localStorage.getItem("progradeSavedResources") || "[]"));
  } catch {
    return new Set();
  }
}

function saveSavedResources() {
  localStorage.setItem("progradeSavedResources", JSON.stringify([...savedResources]));
}

function costScore(item, budget) {
  if (budget === "any") return 15;
  if (budget === "free") return item.costType === "free" ? 15 : item.costType === "aid" || item.costType === "award" ? 9 : 1;
  if (budget === "aid") return item.costType === "free" || item.costType === "aid" || item.costType === "award" ? 15 : 4;
  return 15;
}

function formatScore(item, format) {
  if (format === "any") return 10;
  if (item.format === format) return 10;
  if (item.format === "hybrid") return 7;
  return 2;
}

function fitFor(item) {
  const grade = Number(profile.grade);
  const gradeMatch = item.grades.includes(grade);
  const interests = profile.interests || [];
  const goals = profile.goals || [];
  const itemGoals = item.goals || [];
  const interestMatches = item.interests.filter((interest) => interests.includes(interest));
  const goalMatches = itemGoals.filter((goal) => goals.includes(goal));
  const interestScore = Math.min(24, interestMatches.length * 12);
  const goalScore = Math.min(16, goalMatches.length * 8);
  const experienceScore = !item.experience || profile.experience === "advanced" || item.experience === profile.experience || item.experience === "beginner" ? 10 : profile.experience === "beginner" && item.experience === "advanced" ? 1 : 5;
  const supportScore = profile.support === "team" && ["hackathon", "competition"].includes(item.category) ? 6 : profile.support === "solo" && item.format !== "application" ? 4 : 5;
  const effortDelta = Math.abs(Number(profile.effort) - item.effortLevel);
  const effortScore = Math.max(0, 9 - effortDelta * 3);
  const timeScore = profile.weeklyTime === "10+" || item.effortLevel <= 3 ? 4 : profile.weeklyTime === "0-2" && item.effortLevel >= 4 ? 0 : 2;
  const confidenceScore = profile.applicationConfidence === "high" || item.category !== "program" ? 3 : profile.applicationConfidence === "low" && item.effortLevel >= 4 ? 0 : 2;
  const score = Math.round((gradeMatch ? 22 : 4) + interestScore + goalScore + costScore(item, profile.budget) + formatScore(item, profile.format) + effortScore + experienceScore + supportScore + timeScore + confidenceScore);
  const reasons = [
    gradeMatch ? `matches ${profile.gradeLabel || "your grade"}` : "grade eligibility may not line up",
    interestMatches.length ? `matches ${interestMatches.join(", ")}` : "interest match is weak",
    goalMatches.length ? `supports ${goalMatches.join(", ")}` : "goal fit is limited",
    item.costType === "free" ? "free to use/apply" : item.costType === "aid" ? "aid or waiver path exists" : item.costType === "award" ? "pays or awards funding" : "cost needs review",
    item.format === "hybrid" ? "format has multiple paths" : `${item.format} format`,
    profile.weeklyTime === "0-2" && item.effortLevel >= 4 ? "may need more weekly time" : "time load looks workable"
  ];
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

function matchBand(score, item) {
  const grade = Number(profile.grade);
  if (!item.grades.includes(grade)) return "Check eligibility";
  if (score >= 86) return "Strong match";
  if (score >= 70) return "Good match";
  if (score >= 52) return "Possible match";
  return "Reach";
}

function primaryMatchReason(fit) {
  return fit.reasons.find((reason) => !reason.includes("weak") && !reason.includes("may not")) || fit.reasons[0] || "based on your profile";
}

const synonymGroups = [
  ["cs", "coding", "code", "programming", "software", "developer"],
  ["cyber", "cybersecurity", "security", "ctf", "cyberpatriot"],
  ["college credit", "dual enrollment", "dual credit", "credit", "ap", "transfer credit"],
  ["fee waiver", "waiver", "test waiver", "application waiver", "act waiver", "sat waiver"],
  ["scholarship", "aid", "financial aid", "grant", "award", "funding"],
  ["visit", "tour", "open house", "campus"],
  ["writing", "essay", "humanities", "history", "literature"],
  ["certificate", "certification", "credential", "cisco", "netacad"]
];

function tokenize(value) {
  return normalize(value).split(/[^a-z0-9]+/).filter(Boolean);
}

function expandedQueryTerms(query) {
  const normalized = normalize(query);
  const terms = new Set(tokenize(query));
  synonymGroups.forEach((group) => {
    if (group.some((term) => normalized.includes(term) || terms.has(term))) {
      group.forEach((term) => tokenize(term).forEach((token) => terms.add(token)));
    }
  });
  return [...terms];
}

function resourceText(item, fields) {
  return fields.map((field) => item[field] || "").join(" ").toLowerCase();
}

function searchScore(item, query) {
  const terms = expandedQueryTerms(query);
  if (!terms.length) return 0;
  const weightedFields = [
    ["title", 8],
    ["category", 5],
    ["tags", 5],
    ["summary", 3],
    ["audience", 2],
    ["why", 2],
    ["cost", 1],
    ["source", 1],
    ["scholarshipType", 3]
  ];
  return terms.reduce((score, term) => {
    return score + weightedFields.reduce((fieldScore, [field, weight]) => {
      return fieldScore + (resourceText(item, [field]).includes(term) ? weight : 0);
    }, 0);
  }, 0);
}

function matchesFilter(item) {
  if (activeFilter === "all") return true;
  if (activeFilter === "saved") return savedResources.has(item.id);
  if (activeFilter.startsWith("scholarship:")) {
    const type = activeFilter.split(":")[1];
    return item.category === "scholarship" && (item.scholarshipType || []).includes(type);
  }
  return item.category === activeFilter;
}

function deadlineStatus(item) {
  if (item.rolling) return { label: "Active now", tone: "active" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const opens = item.opensAt ? new Date(`${item.opensAt}T00:00:00`) : null;
  const closes = item.closesAt ? new Date(`${item.closesAt}T23:59:59`) : null;
  if (opens && today < opens) return { label: `Opens ${opens.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, tone: "upcoming" };
  if (closes && today <= closes) return { label: `Open until ${closes.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, tone: "active" };
  if (closes && today > closes) return { label: "Deadline passed", tone: "closed" };
  return { label: "Check official date", tone: "unknown" };
}

function cardTemplate(item) {
  const fit = fitFor(item);
  const status = deadlineStatus(item);
  const detailsId = `details-${item.id}`;
  const isSaved = savedResources.has(item.id);
  return `
    <article class="resource-card" data-category="${item.category}" data-search="${[item.title, item.summary, item.tags, item.audience, item.cost, item.why].join(" ").toLowerCase()}">
      <div class="card-top">
        <span class="tag ${item.category}">${categoryLabels[item.category]}</span>
        <button class="save ${isSaved ? "is-saved" : ""}" type="button" aria-label="${isSaved ? "Remove saved resource" : "Save"} ${item.title}" data-save="${item.id}">${isSaved ? "Saved" : "+"}</button>
      </div>
      <h3>${item.title}</h3>
      <p>${item.summary}</p>
      <div class="match-summary" aria-label="${matchBand(fit.score, item)}">
        <span>${matchBand(fit.score, item)}</span>
        <strong>${primaryMatchReason(fit)}</strong>
      </div>
      <div class="fit" aria-label="${fit.score} fit score">
        <span>Fit score</span><span class="fit-bar"><i style="width:${fit.score}%"></i></span><strong>${fit.score}</strong>
      </div>
      <div class="status-line">
        <span class="status-pill ${status.tone}">${status.label}</span>
        <span>${item.deadline}</span>
      </div>
      <div class="card-meta">
        <div><span>Who</span><strong>${item.audience}</strong></div>
        <div><span>Cost</span><strong>${item.cost}</strong></div>
        <div><span>Effort</span><strong>${item.effort}</strong></div>
      </div>
      <div class="resource-details" id="${detailsId}">
        <button class="details-toggle" type="button" aria-expanded="false" aria-controls="${detailsId}-body" data-details-toggle>Why and when</button>
        <div class="details-panel" id="${detailsId}-body" data-details-panel>
          <p>${item.why}</p>
          <p><strong>Best time:</strong> ${item.bestTime || "Use the official page to confirm timing."}</p>
          <p><strong>Trust note:</strong> ${catalogReviewedLabel}. Always confirm dates and eligibility on the official page before you apply.</p>
          <ul>
            ${fit.reasons.slice(0, 2).map((reason) => `<li>${reason}</li>`).join("")}
          </ul>
        </div>
      </div>
      <div class="card-actions">
        <a class="ghost-button" href="resource-pages/${item.id}.html" aria-label="Read Prograde detail page for ${item.title}">Details</a>
        <a class="source-button" href="${item.source}" target="_blank" rel="noreferrer" aria-label="Open official source for ${item.title}">Open official source</a>
      </div>
    </article>`;
}

function bindSaves(root = document) {
  root.querySelectorAll("[data-save]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.save;
      if (!id) return;
      if (savedResources.has(id)) savedResources.delete(id);
      else savedResources.add(id);
      saveSavedResources();
      button.classList.toggle("is-saved", savedResources.has(id));
      button.textContent = savedResources.has(id) ? "Saved" : "+";
      button.setAttribute("aria-label", `${savedResources.has(id) ? "Remove saved resource" : "Save"} ${button.closest(".resource-card")?.querySelector("h3")?.textContent || "resource"}`);
      updateSavedCount();
      updateCatalog();
      renderDashboard();
    });
  });
}

let detailsBound = false;

function closeOpenDetails(except = null) {
  document.querySelectorAll(".resource-details.is-open").forEach((openDetails) => {
    if (openDetails !== except) {
      openDetails.classList.remove("is-open");
      openDetails.closest(".resource-card")?.classList.remove("has-open-details");
      openDetails.querySelector("[data-details-toggle]")?.setAttribute("aria-expanded", "false");
    }
  });
}

function bindDetails() {
  if (detailsBound) return;
  detailsBound = true;
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-details-toggle]");
    if (button) {
      const details = button.closest(".resource-details");
      const wasOpen = details.classList.contains("is-open");
      closeOpenDetails(details);
      details.classList.toggle("is-open", !wasOpen);
      details.closest(".resource-card")?.classList.toggle("has-open-details", !wasOpen);
      button.setAttribute("aria-expanded", String(!wasOpen));
      return;
    }

    if (!event.target.closest(".resource-details")) {
      closeOpenDetails();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeOpenDetails();
      closeOnboarding();
    }
  });
}

function prepareAnimatedCards(root = document) {
  root.querySelectorAll(".resource-card, .benefit-grid article, .pathways a, .timeline-grid article, .status-guide article").forEach((el, index) => {
    el.style.setProperty("--enter-delay", `${Math.min(index * 45, 360)}ms`);
  });
}

function sortByFit(list) {
  return [...list].sort((a, b) => fitFor(b).score - fitFor(a).score);
}

function renderGrid(grid, list) {
  const limit = Number(grid.dataset.limit || list.length);
  const sorted = sortByFit(list);
  grid.innerHTML = sorted.slice(0, limit).map(cardTemplate).join("");
  prepareAnimatedCards(grid);
  bindSaves(grid);
  bindDetails(grid);
}

function renderAllStaticGrids() {
  document.querySelectorAll("[data-resource-grid]").forEach((grid) => {
    if (grid.closest(".catalog-results")) return;
    const category = grid.dataset.category;
    const list = category ? resources.filter((item) => item.category === category) : resources;
    renderGrid(grid, list);
  });
}

const catalogSearch = document.querySelector("[data-catalog-search]");
const filterButtons = document.querySelectorAll("[data-filter]");
const resultCount = document.querySelector("[data-result-count]");
const catalogGrid = document.querySelector(".catalog-results [data-resource-grid]");
const catalogPagination = document.querySelector("[data-catalog-pagination]");
let activeFilter = "all";
let catalogPage = 1;
const catalogPageSize = 12;

const hashFilters = {
  "#programs": "program",
  "#scholarships": "scholarship",
  "#competitions": "competition",
  "#hackathons": "hackathon",
  "#visits": "visit",
  "#courses": "course",
  "#tools": "tool",
  "#study": "study"
};

function updateCatalog() {
  if (!catalogGrid) return;
  const query = normalize(catalogSearch?.value || "");
  const scored = resources
    .filter(matchesFilter)
    .map((item) => ({ item, search: searchScore(item, query), fit: fitFor(item).score }))
    .filter((entry) => !query || entry.search > 0)
    .sort((a, b) => (query ? b.search - a.search || b.fit - a.fit : b.fit - a.fit));
  const sorted = scored.map((entry) => entry.item);
  const totalPages = Math.max(1, Math.ceil(sorted.length / catalogPageSize));
  if (catalogPage > totalPages) catalogPage = totalPages;
  const pageStart = (catalogPage - 1) * catalogPageSize;
  const pageItems = sorted.slice(pageStart, pageStart + catalogPageSize);
  const emptyCopy = activeFilter === "saved"
    ? "No saved resources yet. Save useful options from the catalog, then come back here to compare them."
    : query
      ? `No strong local match for "${query}". Try a broader phrase like coding, cyber, writing, fee waiver, college credit, or scholarship.`
      : "No resources match this filter yet. Try All or broaden your fit profile.";
  catalogGrid.innerHTML = sorted.length ? pageItems.map(cardTemplate).join("") : `<div class="empty-state">${emptyCopy}</div>`;
  if (resultCount) resultCount.textContent = `${sorted.length} ${sorted.length === 1 ? "resource" : "resources"} ranked for your profile`;
  if (catalogPagination) {
    catalogPagination.innerHTML = sorted.length > catalogPageSize
      ? `<button type="button" data-page-dir="-1" ${catalogPage === 1 ? "disabled" : ""}>Previous</button><span>Page ${catalogPage} of ${totalPages}</span><button type="button" data-page-dir="1" ${catalogPage === totalPages ? "disabled" : ""}>Next</button>`
      : "";
    catalogPagination.querySelectorAll("[data-page-dir]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextPage = catalogPage + Number(button.dataset.pageDir || 0);
        if (nextPage < 1 || nextPage > totalPages) return;
        catalogPage = nextPage;
        updateCatalog();
        document.querySelector(".catalog-results")?.scrollIntoView({ block: "start", behavior: "smooth" });
      });
    });
  }
  prepareAnimatedCards(catalogGrid);
  bindSaves(catalogGrid);
  bindDetails(catalogGrid);
  updateSavedCount();
}

function updateSavedCount() {
  document.querySelectorAll("[data-saved-count]").forEach((el) => {
    el.textContent = savedResources.size;
  });
}

function checkbox(name, value, label, checkedValues = []) {
  return `<label><input type="checkbox" name="${name}" value="${value}" ${checkedValues.includes(value) ? "checked" : ""}><span>${label}</span></label>`;
}

function injectOnboarding() {
  const existing = document.querySelector(".onboarding-launch");
  if (existing) return;
  const host = document.querySelector("[data-onboarding-host]");
  if (host && host.querySelector("[data-onboarding-form]")) {
    bindOnboarding();
    syncOnboardingForm(host.querySelector("[data-onboarding-form]"));
    return;
  }
  const isDedicatedPage = Boolean(document.querySelector("[data-onboarding-host]"));
  const interests = [
    ["stem", "STEM"],
    ["cs", "Computer science"],
    ["ai", "AI"],
    ["cybersecurity", "Cybersecurity"],
    ["math", "Math"],
    ["research", "Research"],
    ["design", "Design"],
    ["entrepreneurship", "Entrepreneurship"],
    ["humanities", "Humanities"],
    ["arts", "Arts"],
    ["leadership", "Leadership"],
    ["writing", "Writing"]
  ];
  const goals = [
    ["skills", "Build skills"],
    ["portfolio", "Create a project"],
    ["research", "Do research"],
    ["awards", "Win recognition"],
    ["network", "Meet mentors"],
    ["team", "Work with a team"]
  ];
  const markup = `
    ${isDedicatedPage ? "" : `<button class="onboarding-launch" type="button" data-open-onboarding>Update fit</button>`}
    <div class="onboarding ${isDedicatedPage ? "onboarding-inline is-open" : ""}" aria-labelledby="onboarding-title" data-onboarding ${isDedicatedPage ? "" : "hidden"}>
      <form class="onboarding-card" data-onboarding-form>
        <div class="onboarding-head">
          <div>
            <p class="eyebrow">Fit onboarding</p>
            <h2 id="onboarding-title">Make Prograde rank resources around you.</h2>
          </div>
          <button type="button" class="onboarding-close" data-close-onboarding aria-label="Close onboarding">&times;</button>
        </div>
        <div class="onboarding-grid">
          <section>
            <h3>1. Student stage</h3>
            <label>Grade / year
              <select name="grade">
                <option value="9">9th</option><option value="10">10th</option><option value="11">11th</option><option value="12">12th</option>
                <option value="13">College year 1</option><option value="14">College year 2</option><option value="15">College year 3</option><option value="16">College year 4</option>
              </select>
            </label>
            <label>Experience level
              <select name="experience">
                <option value="beginner">Beginner</option>
                <option value="some">Some experience</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>
          </section>
          <section>
            <h3>2. Interests</h3>
            <div class="choice-grid">${interests.map(([value, label]) => checkbox("interest", value, label, profile.interests || [])).join("")}</div>
          </section>
          <section>
            <h3>3. Goals</h3>
            <div class="choice-grid">${goals.map(([value, label]) => checkbox("goal", value, label, profile.goals || [])).join("")}</div>
          </section>
          <section>
            <h3>4. Constraints</h3>
            <label>Budget
              <select name="budget"><option value="free">Free only</option><option value="aid">Free / aid / awards</option><option value="any">Any cost</option></select>
            </label>
            <label>Preferred format
              <select name="format"><option value="any">Any</option><option value="remote">Remote</option><option value="in-person">In person</option><option value="residential">Residential</option><option value="application">Application only</option></select>
            </label>
            <label>Effort tolerance
              <select name="effort"><option value="1">Low</option><option value="2">Flexible</option><option value="3">Medium</option><option value="4">High</option><option value="5">Very high</option></select>
            </label>
            <label>How do you prefer to work?
              <select name="support"><option value="solo">Solo-friendly</option><option value="team">Team-based</option><option value="either">Either</option></select>
            </label>
            <label>State / region
              <input name="location" type="text" placeholder="Illinois, Texas, remote only">
            </label>
            <label>Citizenship / eligibility context
              <select name="citizenship"><option value="unknown">Prefer not to say / unsure</option><option value="us">U.S. citizen or permanent resident</option><option value="non-us">International / non-U.S.</option><option value="mixed">Varies by opportunity</option></select>
            </label>
            <label>Weekly time available
              <select name="weeklyTime"><option value="0-2">0-2 hours</option><option value="3-5">3-5 hours</option><option value="6-10">6-10 hours</option><option value="10+">10+ hours</option></select>
            </label>
            <label>Application confidence
              <select name="applicationConfidence"><option value="low">I need beginner-friendly applications</option><option value="medium">I can handle normal applications</option><option value="high">I can handle selective applications</option></select>
            </label>
          </section>
        </div>
        <div class="onboarding-actions">
          <button type="button" data-close-onboarding>Not now</button>
          <button type="submit">Save and rank matches</button>
        </div>
        <p class="privacy-note">Your fit profile stays on this device. Prograde does not store this form data on a server.</p>
      </form>
    </div>
  `;
  if (host) host.innerHTML = markup;
  else document.body.insertAdjacentHTML("beforeend", markup);
  bindOnboarding();
}

function syncOnboardingForm(form) {
  form.grade.value = profile.grade;
  form.experience.value = profile.experience || defaultProfile.experience;
  form.budget.value = profile.budget;
  form.format.value = profile.format;
  form.effort.value = profile.effort;
  form.support.value = profile.support || defaultProfile.support;
  if (form.location) form.location.value = profile.location || "";
  if (form.citizenship) form.citizenship.value = profile.citizenship || defaultProfile.citizenship;
  if (form.weeklyTime) form.weeklyTime.value = profile.weeklyTime || defaultProfile.weeklyTime;
  if (form.applicationConfidence) form.applicationConfidence.value = profile.applicationConfidence || defaultProfile.applicationConfidence;
  form.querySelectorAll("[name='interest']").forEach((box) => {
    box.checked = (profile.interests || []).includes(box.value);
  });
  form.querySelectorAll("[name='goal']").forEach((box) => {
    box.checked = (profile.goals || []).includes(box.value);
  });
}

function openOnboarding() {
  const modal = document.querySelector("[data-onboarding]");
  const form = document.querySelector("[data-onboarding-form]");
  if (!modal || !form) return;
  syncOnboardingForm(form);
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("is-open"));
  document.body.classList.add("onboarding-active");
}

function closeOnboarding() {
  const modal = document.querySelector("[data-onboarding]");
  if (!modal) return;
  if (modal.classList.contains("onboarding-inline")) return;
  modal.classList.remove("is-open");
  document.body.classList.remove("onboarding-active");
  window.setTimeout(() => {
    modal.hidden = true;
  }, 180);
}

function bindOnboarding() {
  document.querySelectorAll("[data-open-onboarding]").forEach((button) => button.addEventListener("click", openOnboarding));
  document.querySelectorAll("[data-close-onboarding]").forEach((button) => button.addEventListener("click", closeOnboarding));
  document.querySelector("[data-onboarding]")?.addEventListener("click", (event) => {
    if (event.target.matches("[data-onboarding]") && localStorage.getItem("progradeOnboarded")) closeOnboarding();
  });
  document.querySelector("[data-onboarding-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    profile = {
      ...profile,
      grade: data.get("grade") || defaultProfile.grade,
      interests: data.getAll("interest"),
      goals: data.getAll("goal"),
      experience: data.get("experience") || defaultProfile.experience,
      budget: data.get("budget") || defaultProfile.budget,
      format: data.get("format") || defaultProfile.format,
      effort: data.get("effort") || defaultProfile.effort,
      support: data.get("support") || defaultProfile.support,
      location: data.get("location") || "",
      citizenship: data.get("citizenship") || defaultProfile.citizenship,
      weeklyTime: data.get("weeklyTime") || defaultProfile.weeklyTime,
      applicationConfidence: data.get("applicationConfidence") || defaultProfile.applicationConfidence
    };
    localStorage.setItem("progradeProfile", JSON.stringify(profile));
    localStorage.setItem("progradeOnboarded", "true");
    renderAllStaticGrids();
    updateCatalog();
    renderDashboard();
    closeOnboarding();
    const form = event.currentTarget;
    let success = form.querySelector("[data-onboarding-success]");
    if (!success) {
      form.insertAdjacentHTML("beforeend", `<div class="onboarding-success" data-onboarding-success role="status" aria-live="polite"><strong>Fit profile saved.</strong><span>Your catalog rankings are updated on this device.</span><a class="source-button" href="resources.html">View matches</a></div>`);
      success = form.querySelector("[data-onboarding-success]");
    }
    success.hidden = false;
  });
}

function animateCounts(root = document) {
  root.querySelectorAll("[data-count]").forEach((el) => {
    if (el.dataset.counted) return;
    el.dataset.counted = "true";
    const target = Number(el.dataset.count || 0);
    const suffix = el.dataset.suffix || "";
    const duration = 850;
    const started = performance.now();
    const formatter = new Intl.NumberFormat();
    function tick(now) {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = `${formatter.format(Math.round(target * eased))}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function updateDynamicStats() {
  const categories = new Set(resources.map((item) => item.category)).size;
  const stats = {
    resources: resources.length,
    categories,
    signals: ["grade", "interest", "cost", "format", "effort", "goals"].length
  };
  document.querySelectorAll("[data-stat]").forEach((el) => {
    const value = stats[el.dataset.stat];
    if (typeof value !== "number") return;
    el.dataset.count = String(value);
    el.textContent = "0";
    delete el.dataset.counted;
  });
}

function bindProfileControls() {
  const form = document.querySelector("[data-profile-form]");
  if (!form) return;
  form.grade.value = profile.grade;
  form.budget.value = profile.budget;
  form.format.value = profile.format;
  form.effort.value = profile.effort;
  form.querySelectorAll("[name='interest']").forEach((box) => {
    box.checked = profile.interests.includes(box.value);
  });
  form.addEventListener("change", () => {
    const data = new FormData(form);
    profile = {
      ...profile,
      grade: data.get("grade") || defaultProfile.grade,
      interests: data.getAll("interest"),
      budget: data.get("budget") || defaultProfile.budget,
      format: data.get("format") || defaultProfile.format,
      effort: data.get("effort") || defaultProfile.effort
    };
    localStorage.setItem("progradeProfile", JSON.stringify(profile));
    renderAllStaticGrids();
    updateCatalog();
    renderDashboard();
  });
}

function renderDashboard() {
  const grid = document.querySelector("[data-dashboard-grid]");
  if (!grid) return;
  const saved = resources.filter((item) => savedResources.has(item.id)).sort((a, b) => fitFor(b).score - fitFor(a).score);
  updateSavedCount();
  if (!saved.length) {
    grid.innerHTML = `<div class="empty-state"><h2>No saved resources yet.</h2><p>Use the catalog to save programs, scholarships, courses, and tools. Your dashboard turns those saves into a clearer short list with next steps.</p><a class="source-button" href="resources.html">Browse catalog</a></div>`;
    return;
  }
  grid.innerHTML = saved.map((item) => {
    const status = deadlineStatus(item);
    const fit = fitFor(item);
    const nextAction = item.category === "scholarship" ? "Check eligibility and draft the shortest required essay." : item.category === "program" ? "Confirm the application window and list required materials." : item.category === "course" ? "Start the first module and save one output as proof." : "Open the official page and decide whether it belongs in your active plan.";
    return `<article class="dashboard-item">
      <div>
        <span class="tag ${item.category}">${categoryLabels[item.category]}</span>
        <h2>${item.title}</h2>
        <p>${item.summary}</p>
      </div>
      <div class="dashboard-meta">
        <span><strong>${fit.score}</strong> fit</span>
        <span class="status-pill ${status.tone}">${status.label}</span>
        <span>${item.deadline}</span>
      </div>
      <div class="next-action"><strong>Next action</strong><p>${nextAction}</p></div>
      <div class="card-actions"><a class="ghost-button" href="resource-pages/${item.id}.html">Details</a><a class="source-button" href="${item.source}" target="_blank" rel="noreferrer">Official source</a></div>
    </article>`;
  }).join("");
  prepareAnimatedCards(grid);
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    catalogPage = 1;
    filterButtons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
    updateCatalog();
  });
});

catalogSearch?.addEventListener("input", () => {
  catalogPage = 1;
  updateCatalog();
});

if (hashFilters[window.location.hash]) {
  activeFilter = hashFilters[window.location.hash];
  filterButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.filter === activeFilter));
}

document.querySelectorAll("[data-fill]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = document.querySelector("[data-search-form] input");
    if (input) input.value = button.dataset.fill;
  });
});

document.querySelector("[data-search-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const q = new URLSearchParams(new FormData(event.currentTarget)).toString();
  window.location.href = `resources.html?${q}`;
});

const params = new URLSearchParams(window.location.search);
if (catalogSearch && params.get("q")) {
  catalogSearch.value = params.get("q");
}

bindProfileControls();
injectOnboarding();
renderAllStaticGrids();
updateCatalog();
renderDashboard();
prepareAnimatedCards();
bindDetails();
updateSavedCount();
updateDynamicStats();
animateCounts();

if (!localStorage.getItem("progradeOnboarded") && !document.querySelector("[data-onboarding-host]")) {
  window.setTimeout(openOnboarding, 350);
}

document.querySelectorAll("a[href$='.html'], a[href*='.html#'], a[href*='.html?']").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target) return;
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    document.body.classList.add("page-leaving");
    window.setTimeout(() => {
      window.location.href = link.href;
    }, 180);
  });
});

