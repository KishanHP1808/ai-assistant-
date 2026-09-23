/**
 * ResearchAI — Client Application Script
 * Handles Theme Management, Input Validation, SSE Real-time Stepper,
 * Markdown Rendering with Citations, Source Cards, and Exports.
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const topicInput = document.getElementById("topicInput");
  const clearInputBtn = document.getElementById("clearInputBtn");
  const researchForm = document.getElementById("researchForm");
  const startBtn = document.getElementById("startBtn");
  const inputErrorMsg = document.getElementById("inputErrorMsg");
  const suggestionChips = document.querySelectorAll(".suggestion-chip");

  const searchHero = document.getElementById("searchHero");
  const progressSection = document.getElementById("progressSection");
  const currentStageMessage = document.getElementById("currentStageMessage");
  const errorBanner = document.getElementById("errorBanner");
  const errorTitle = document.getElementById("errorTitle");
  const errorMessage = document.getElementById("errorMessage");
  const retryBtn = document.getElementById("retryBtn");

  const resultsSection = document.getElementById("resultsSection");
  const reportHeadingTopic = document.getElementById("reportHeadingTopic");
  const reportDate = document.getElementById("reportDate");
  const reportMarkdownContainer = document.getElementById("reportMarkdownContainer");
  const reportReadingTimeText = document.getElementById("reportReadingTimeText");
  const reportWordCount = document.getElementById("reportWordCount");
  const sourceCountNumber = document.getElementById("sourceCountNumber");
  const sourceCardsList = document.getElementById("sourceCardsList");

  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const downloadMarkdownBtn = document.getElementById("downloadMarkdownBtn");
  const newSearchBtn = document.getElementById("newSearchBtn");
  const copyReportBtn = document.getElementById("copyReportBtn");
  const copyReportIcon = document.getElementById("copyReportIcon");
  const copyReportLabel = document.getElementById("copyReportLabel");

  const dbHistoryList = document.getElementById("dbHistoryList");
  const refreshHistoryBtn = document.getElementById("refreshHistoryBtn");
  const exploreDemoBannerBtn = document.getElementById("exploreDemoBannerBtn");

  // State
  let currentResearchData = null;
  let activeEventSource = null;
  let departmentsCache = [];
  let currentProgressState = {
    topic: "",
    stage: 1,
    stage_message: "",
    report: "",
    sources: [],
    department_code: "",
    department_name: "",
    trained_epoch: 1,
    status: "idle",
  };

  // Voice Input (Web Speech API) DOM Elements
  const micBtn = document.getElementById("micBtn");
  const voiceListeningHud = document.getElementById("voiceListeningHud");
  const voiceHudTitle = document.getElementById("voiceHudTitle");
  const voiceHudSub = document.getElementById("voiceHudSub");
  const stopVoiceBtn = document.getElementById("stopVoiceBtn");

  // Auto-Save & Resume Session DOM Elements
  const resumeSessionBanner = document.getElementById("resumeSessionBanner");
  const resumeBannerTopic = document.getElementById("resumeBannerTopic");
  const resumeBannerTime = document.getElementById("resumeBannerTime");
  const resumeSessionBtn = document.getElementById("resumeSessionBtn");
  const dismissResumeBtn = document.getElementById("dismissResumeBtn");
  const reportAutoSavePill = document.getElementById("reportAutoSavePill");
  const reportAutoSaveText = document.getElementById("reportAutoSaveText");

  // Department Selectors & Invariants UI
  const deptSelect = document.getElementById("deptSelect");
  const deptTrainingStatusText = document.getElementById("deptTrainingStatusText");
  const headerDeptEpochBadge = document.getElementById("headerDeptEpochBadge");
  const deptTrainingBtn = document.getElementById("deptTrainingBtn");
  const openTrainingStudioInlineBtn = document.getElementById("openTrainingStudioInlineBtn");
  const toggleReportInvariantsBtn = document.getElementById("toggleReportInvariantsBtn");
  const reportDeptInvariantsDrawer = document.getElementById("reportDeptInvariantsDrawer");

  // Initialize History, Departments & Check for Saved SQLite Session
  loadDatabaseHistory();
  loadDepartments();
  checkSavedProgressToResume();

  if (refreshHistoryBtn) {
    refreshHistoryBtn.addEventListener("click", loadDatabaseHistory);
  }

  if (exploreDemoBannerBtn) {
    exploreDemoBannerBtn.addEventListener("click", loadDemoDossier);
  }

  // -------------------------------------------------------------------------
  // 1. Theme Initialization & Toggle
  // -------------------------------------------------------------------------
  const savedTheme = localStorage.getItem("research_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);

  themeToggleBtn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("research_theme", next);
  });

  // -------------------------------------------------------------------------
  // 2. Input Handling & Suggestions
  // -------------------------------------------------------------------------
  topicInput.addEventListener("input", () => {
    hideError();
    clearInputBtn.style.display = topicInput.value.length > 0 ? "block" : "none";
  });

  clearInputBtn.addEventListener("click", () => {
    topicInput.value = "";
    clearInputBtn.style.display = "none";
    topicInput.focus();
    hideError();
  });

  suggestionChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const topic = chip.getAttribute("data-topic");
      topicInput.value = topic;
      clearInputBtn.style.display = "block";
      hideError();
      startResearch(topic);
    });
  });

  researchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const topic = topicInput.value.trim();
    if (validateInput(topic)) {
      startResearch(topic);
    }
  });

  retryBtn.addEventListener("click", () => {
    errorBanner.style.display = "none";
    searchHero.style.display = "block";
    topicInput.focus();
  });

  newSearchBtn.addEventListener("click", () => {
    resultsSection.style.display = "none";
    searchHero.style.display = "block";
    topicInput.value = "";
    clearInputBtn.style.display = "none";
    hideError();
    window.scrollTo({ top: 0, behavior: "smooth" });
    topicInput.focus();
  });

  function validateInput(topic) {
    if (!topic) {
      showInputError("Please enter a research topic.");
      return false;
    }
    if (topic.length < 3) {
      showInputError("Research topic must be at least 3 characters long.");
      return false;
    }
    if (topic.length > 300) {
      showInputError("Research topic is too long (maximum 300 characters).");
      return false;
    }
    hideError();
    return true;
  }

  function showInputError(msg) {
    inputErrorMsg.textContent = msg;
    inputErrorMsg.style.display = "block";
    topicInput.focus();
  }

  function hideError() {
    inputErrorMsg.style.display = "none";
    inputErrorMsg.textContent = "";
  }

  // -------------------------------------------------------------------------
  // 3. Multi-Stage Stepper Controller
  // -------------------------------------------------------------------------
  function resetStepper() {
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`step-${i}`);
      el.className = "step-item pending";
      const icon = el.querySelector(".step-icon");
      if (icon) icon.textContent = i;
    }
  }

  const RELAXING_TIPS = [
    "Scanning real-time verified articles & reports across global web indexes...",
    "Filtering duplicate domains and extracting clean factual snippets...",
    "Synthesizing empirical statistics, key metrics, and emerging trends...",
    "Cross-checking inline source citations against authoritative publications...",
    "Compiling formatted executive dossier and preparing PDF download..."
  ];
  let tipIntervalId = null;

  function rotateRelaxingTips() {
    const tipEl = document.getElementById("relaxingTipText");
    if (!tipEl) return;
    let index = 0;
    clearInterval(tipIntervalId);
    tipIntervalId = setInterval(() => {
      index = (index + 1) % RELAXING_TIPS.length;
      tipEl.style.opacity = "0";
      setTimeout(() => {
        tipEl.textContent = RELAXING_TIPS[index];
        tipEl.style.opacity = "1";
      }, 250);
    }, 2800);
  }

  function setStepperStage(stageNumber, customMsg) {
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`step-${i}`);
      const slot = document.getElementById(`slot-${i}`);
      const icon = el ? el.querySelector(".step-icon") : null;

      if (i < stageNumber) {
        if (el) el.className = "step-item completed";
        if (slot) slot.className = "slot-pill completed";
        if (icon) icon.textContent = "";
      } else if (i === stageNumber) {
        if (el) el.className = "step-item active";
        if (slot) slot.className = "slot-pill active";
        if (icon) icon.textContent = i;
      } else {
        if (el) el.className = "step-item pending";
        if (slot) slot.className = "slot-pill";
        if (icon) icon.textContent = i;
      }
    }
    if (customMsg && currentStageMessage) {
      currentStageMessage.textContent = customMsg;
    }
  }

  // -------------------------------------------------------------------------
  // 4. Autonomous Research Pipeline (SSE with Fetch Fallback)
  // -------------------------------------------------------------------------
  function startResearch(topic) {
    // UI state transitions
    hideError();
    errorBanner.style.display = "none";
    resultsSection.style.display = "none";
    progressSection.style.display = "block";
    rotateRelaxingTips();
    startBtn.disabled = true;
    startBtn.querySelector(".btn-text").textContent = "Researching...";

    resetStepper();
    setStepperStage(1, "Understanding topic & formulating search query...");
    progressSection.scrollIntoView({ behavior: "smooth", block: "center" });

    // Close any prior event source
    if (activeEventSource) {
      activeEventSource.close();
    }

    const activeDeptCode = deptSelect ? deptSelect.value : "";
    const activeDeptObj = departmentsCache.find((d) => d.code === activeDeptCode);

    // Initialize in-progress state for auto-save
    currentProgressState = {
      topic,
      stage: 1,
      stage_message: "Understanding topic & formulating search query...",
      report: "",
      sources: [],
      department_code: activeDeptCode,
      department_name: activeDeptObj ? activeDeptObj.name : "",
      trained_epoch: activeDeptObj ? activeDeptObj.epoch_count : 1,
      status: "in_progress",
    };
    autoSaveCurrentProgress();

    const sseUrl = `/research/stream?topic=${encodeURIComponent(topic)}${activeDeptCode ? `&department=${encodeURIComponent(activeDeptCode)}` : ""}`;

    try {
      activeEventSource = new EventSource(sseUrl);

      activeEventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "stage") {
            setStepperStage(payload.stage, payload.message);
            currentProgressState.stage = payload.stage;
            currentProgressState.stage_message = payload.message;
          } else if (payload.type === "complete") {
            // Success! Complete step 5 as well
            setStepperStage(6, "Research dossier completed!");
            setTimeout(() => {
              activeEventSource.close();
              displayResults(payload.data);
            }, 600);
          } else if (payload.type === "error") {
            activeEventSource.close();
            displayError("Research could not be completed", payload.message);
          }
        } catch (parseErr) {
          console.error("Failed to parse SSE event data:", parseErr);
        }
      };

      activeEventSource.onerror = (err) => {
        console.warn("SSE connection encountered error, attempting JSON fallback:", err);
        activeEventSource.close();
        // Fallback to standard POST /research endpoint
        runFetchFallback(topic);
      };

    } catch (e) {
      console.warn("SSE unsupported, using fetch fallback:", e);
      runFetchFallback(topic);
    }
  }

  async function runFetchFallback(topic) {
    setStepperStage(2, "Searching authoritative web sources via Tavily...");
    const activeDeptCode = deptSelect ? deptSelect.value : "";
    try {
      const response = await fetch("/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, department: activeDeptCode }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Unable to complete research pipeline.");
      }

      setStepperStage(4, "Synthesizing research & generating final report...");
      const data = await response.json();
      setStepperStage(6, "Research dossier completed!");
      setTimeout(() => displayResults(data), 500);

    } catch (err) {
      displayError("Research could not be completed", err.message);
    }
  }

  function displayError(title, message) {
    clearInterval(tipIntervalId);
    progressSection.style.display = "none";
    startBtn.disabled = false;
    startBtn.querySelector(".btn-text").textContent = "Start Research";

    errorTitle.textContent = title;
    errorMessage.textContent = message;
    errorBanner.style.display = "flex";
    errorBanner.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // -------------------------------------------------------------------------
  // 5. Render Results & Citations
  // -------------------------------------------------------------------------
  function displayResults(data) {
    clearInterval(tipIntervalId);
    currentResearchData = data;
    progressSection.style.display = "none";
    startBtn.disabled = false;
    startBtn.querySelector(".btn-text").textContent = "Start Research";

    // Set Meta
    reportHeadingTopic.textContent = data.topic;
    reportDate.textContent = `Generated on ${data.created_at || "Recent"}`;
    sourceCountNumber.textContent = (data.sources || []).length;

    // Display Department Model Badge & Invariants Banner if trained
    const reportDeptBanner = document.getElementById("reportDeptBanner");
    const reportDeptTitle = document.getElementById("reportDeptTitle");
    const reportDeptSub = document.getElementById("reportDeptSub");
    const reportDeptInvariantsDrawer = document.getElementById("reportDeptInvariantsDrawer");
    const reportInvariantsList = document.getElementById("reportInvariantsList");

    if (data.department_code) {
      if (reportDeptBanner) reportDeptBanner.style.display = "flex";
      if (reportDeptTitle) {
        reportDeptTitle.textContent = `Specialized Department Model: ${data.department_code} (${data.department_name || ""})`;
      }
      if (reportDeptSub) {
        reportDeptSub.textContent = `Synthesized with continuous code training memory (Epoch #${data.trained_epoch || 1})`;
      }

      const dept = departmentsCache.find((d) => d.code === data.department_code);
      if (dept && reportInvariantsList) {
        const allRules = [];
        dept.training_entries.forEach((e) => {
          e.extracted_rules.forEach((r) => {
            allRules.push({ title: e.title, rule: r, lang: e.language });
          });
        });

        if (allRules.length > 0) {
          reportInvariantsList.innerHTML = allRules
            .map((r) => `<li class="invariant-item"><strong>[${escapeHtml(r.lang.toUpperCase())}]</strong> ${escapeHtml(r.rule)} <span style="opacity:0.65;font-size:0.75rem;">(${escapeHtml(r.title)})</span></li>`)
            .join("");
        } else {
          reportInvariantsList.innerHTML = `<li class="invariant-item">No specialized code checkpoints saved yet for this department.</li>`;
        }
      }
    } else {
      if (reportDeptBanner) reportDeptBanner.style.display = "none";
      if (reportDeptInvariantsDrawer) reportDeptInvariantsDrawer.style.display = "none";
    }

    // Calculate and display estimated reading time (e.g., '5 min read')
    updateReadingTime(data.report);

    // Render Markdown
    renderMarkdownReport(data.report);

    // Render Source Cards
    renderSourceCards(data.sources || []);

    // Render Conceptual Infographic Hero (Above Markdown Report)
    renderInfographicHero(data);

    // Render Recharts Dynamic Line Chart (Bottom of report-viewer-card)
    renderRechartsSynthesisWidget(data);

    // Reveal results view
    resultsSection.style.display = "block";
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

    // Refresh database history list
    loadDatabaseHistory();

    // Auto-save completed report state to SQLite database
    currentProgressState = {
      topic: data.topic,
      stage: 5,
      stage_message: "Research completed.",
      report: data.report || "",
      sources: data.sources || [],
      department_code: data.department_code || "",
      department_name: data.department_name || "",
      trained_epoch: data.trained_epoch || 1,
      status: "completed",
    };
    autoSaveCurrentProgress();
  }

  // -------------------------------------------------------------------------
  // Database History & Demo Loading
  // -------------------------------------------------------------------------
  async function loadDatabaseHistory() {
    if (!dbHistoryList) return;
    try {
      const res = await fetch("/api/history");
      if (!res.ok) return;
      const data = await res.json();
      const records = data.records || [];

      if (records.length === 0) {
        dbHistoryList.innerHTML = '<p class="sources-sidebar-sub">No previous research saved in database yet.</p>';
        return;
      }

      dbHistoryList.innerHTML = "";
      records.forEach((rec) => {
        const item = document.createElement("div");
        item.className = "db-history-item";
        item.innerHTML = `
          <div class="db-history-info">
            <span class="db-history-topic">${escapeHtml(rec.topic)}</span>
            <span class="db-history-date">${escapeHtml(rec.created_at || "Recent")}</span>
          </div>
          <span class="db-history-action">View Dossier ↗</span>
        `;
        item.addEventListener("click", () => loadHistoryItem(rec.id));
        dbHistoryList.appendChild(item);
      });
    } catch (e) {
      console.warn("Could not fetch database history:", e);
    }
  }

  async function loadHistoryItem(id) {
    try {
      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) throw new Error("Could not retrieve research dossier from database.");
      const data = await res.json();
      displayResults(data);
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  }

  async function loadDemoDossier() {
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      if (!res.ok) throw new Error("Could not load sample research from database.");
      const data = await res.json();
      displayResults(data);
    } catch (err) {
      alert(`Database Error: ${err.message}`);
    }
  }

  function updateReadingTime(reportText) {
    if (!reportReadingTimeText) return;
    const text = reportText || "";
    // Clean markdown syntax for realistic word count calculation
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // markdown links
      .replace(/[#*`_~>\-]/g, " ")             // markdown symbols
      .trim();

    const words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0;
    const wordsPerMinute = 200;
    const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
    const readingTimeStr = `${minutes} min read`;

    reportReadingTimeText.textContent = readingTimeStr;

    if (reportWordCount) {
      reportWordCount.textContent = `${words.toLocaleString()} words`;
    }
  }

  function renderMarkdownReport(rawMarkdown) {
    if (!window.marked) {
      reportMarkdownContainer.innerHTML = `<pre>${escapeHtml(rawMarkdown)}</pre>`;
      return;
    }

    // Configure marked options
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    let html = marked.parse(rawMarkdown);

    // Transform citation tags [1], [2] into interactive badges
    html = html.replace(/\[(\d+)\]/g, (match, p1) => {
      return `<button class="citation-tag" onclick="highlightSource(${p1})" title="Jump to Source [${p1}]">[${p1}]</button>`;
    });

    reportMarkdownContainer.innerHTML = html;
  }

  function renderSourceCards(sources) {
    sourceCardsList.innerHTML = "";

    if (!sources || sources.length === 0) {
      sourceCardsList.innerHTML = '<p class="sources-sidebar-sub">No sources retrieved.</p>';
      return;
    }

    sources.forEach((src) => {
      const card = document.createElement("div");
      card.className = "source-card";
      card.id = `source-card-${src.index}`;

      const indexPadded = String(src.index).padStart(2, "0");
      const titleEsc = escapeHtml(src.title);
      const domainEsc = escapeHtml(src.domain || "external");
      const snippetEsc = escapeHtml(src.snippet || "No description excerpt provided.");
      const urlEsc = encodeURI(src.url);

      card.innerHTML = `
        <div class="source-card-top">
          <span class="source-card-index">${indexPadded}</span>
          <span class="source-card-domain">${domainEsc}</span>
        </div>
        <h4 class="source-card-title">${titleEsc}</h4>
        <p class="source-card-snippet">${snippetEsc}</p>
        <a href="${urlEsc}" target="_blank" rel="noopener noreferrer" class="source-card-link">
          <span>Read Source</span>
          <span>↗</span>
        </a>
      `;

      sourceCardsList.appendChild(card);
    });
  }

  // Global citation highlight helper
  window.highlightSource = function (index) {
    const card = document.getElementById(`source-card-${index}`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      card.style.borderColor = "var(--accent-primary)";
      card.style.boxShadow = "0 0 15px var(--accent-glow)";
      card.style.transform = "scale(1.02)";
      setTimeout(() => {
        card.style.borderColor = "";
        card.style.boxShadow = "";
        card.style.transform = "";
      }, 2000);
    }
  };

  function escapeHtml(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // -------------------------------------------------------------------------
  // 6. Export Features (PDF & Markdown)
  // -------------------------------------------------------------------------
  downloadPdfBtn.addEventListener("click", async () => {
    if (!currentResearchData) return;

    downloadPdfBtn.disabled = true;
    const origHtml = downloadPdfBtn.innerHTML;
    downloadPdfBtn.innerHTML = '<span class="action-icon">⏳</span><span>Generating PDF...</span>';

    try {
      const response = await fetch("/download/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentResearchData),
      });

      if (!response.ok) {
        throw new Error("Failed to compile PDF document.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanName = currentResearchData.topic.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `Research_Report_${cleanName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`PDF Download Error: ${err.message}`);
    } finally {
      downloadPdfBtn.disabled = false;
      downloadPdfBtn.innerHTML = origHtml;
    }
  });

  downloadMarkdownBtn.addEventListener("click", async () => {
    if (!currentResearchData) return;

    downloadMarkdownBtn.disabled = true;
    const origHtml = downloadMarkdownBtn.innerHTML;
    downloadMarkdownBtn.innerHTML = '<span class="action-icon">⏳</span><span>Preparing Markdown...</span>';

    try {
      const response = await fetch("/download/markdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentResearchData),
      });

      if (!response.ok) {
        throw new Error("Failed to prepare Markdown export.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanName = currentResearchData.topic.slice(0, 30).replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `Research_Report_${cleanName}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Markdown Download Error: ${err.message}`);
    } finally {
      downloadMarkdownBtn.disabled = false;
      downloadMarkdownBtn.innerHTML = origHtml;
    }
  });

  // Copy Full Report to Clipboard
  if (copyReportBtn) {
    copyReportBtn.addEventListener("click", async () => {
      if (!currentResearchData || !currentResearchData.report) return;

      const reportText = currentResearchData.report;
      let copied = false;

      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(reportText);
          copied = true;
        } else {
          throw new Error("Clipboard API unavailable");
        }
      } catch (e) {
        try {
          const textarea = document.createElement("textarea");
          textarea.value = reportText;
          textarea.style.position = "fixed";
          textarea.style.left = "-999999px";
          textarea.style.top = "-999999px";
          textarea.setAttribute("readonly", "");
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();
          copied = document.execCommand("copy");
          document.body.removeChild(textarea);
        } catch (err) {
          console.error("Clipboard copy error:", err);
        }
      }

      if (copied) {
        copyReportBtn.classList.add("copied");
        if (copyReportIcon) copyReportIcon.textContent = "✓";
        if (copyReportLabel) copyReportLabel.textContent = "Copied!";
        setTimeout(() => {
          copyReportBtn.classList.remove("copied");
          if (copyReportIcon) copyReportIcon.textContent = "📋";
          if (copyReportLabel) copyReportLabel.textContent = "Copy";
        }, 2200);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Share via Email
  // -------------------------------------------------------------------------
  const shareEmailBtn = document.getElementById("shareEmailBtn");
  const shareEmailIcon = document.getElementById("shareEmailIcon");
  const shareEmailLabel = document.getElementById("shareEmailLabel");

  if (shareEmailBtn) {
    shareEmailBtn.addEventListener("click", () => {
      if (!currentResearchData || !currentResearchData.topic) return;

      const topic = currentResearchData.topic;
      const createdAt = currentResearchData.created_at || "Recent";
      const sources = currentResearchData.sources || [];

      // Extract executive summary or first findings
      let summaryText = "";
      if (currentResearchData.report) {
        const lines = currentResearchData.report.split("\n");
        let capturing = false;
        const summaryLines = [];
        for (const line of lines) {
          if (line.toLowerCase().includes("## executive summary")) {
            capturing = true;
            continue;
          }
          if (capturing) {
            if (line.startsWith("## ") || line.startsWith("---")) {
              break;
            }
            if (line.trim()) {
              summaryLines.push(line.trim());
            }
          }
        }
        summaryText = summaryLines.slice(0, 3).join("\n\n");
      }

      if (!summaryText) {
        summaryText = currentResearchData.report
          ? currentResearchData.report.slice(0, 350) + "..."
          : "Full synthesis dossier prepared by ResearchAI.";
      }

      // Format source citations
      const sourcesSummary = sources
        .slice(0, 4)
        .map((s) => `• [${s.index}] ${s.title} (${s.domain})\n  Link: ${s.url}`)
        .join("\n\n");

      const subject = `Research Dossier: ${topic}`;
      const body = `Hi,\n\nHere is the synthesized research dossier on "${topic}" (${createdAt}):\n\nEXECUTIVE SUMMARY:\n${summaryText}\n\nKEY VERIFIED SOURCES:\n${sourcesSummary}\n\n---\nSynthesized autonomously by ResearchAI (Personal Research Assistant)\nAnti-hallucination grounding • Multi-agent verification`;

      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      const a = document.createElement("a");
      a.href = mailtoUrl;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Audit log to Google Cloud Logging
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity: "NOTICE",
          component: "client.share",
          message: `User shared research report via email client: "${topic}"`,
          payload: {
            topic,
            sources_count: sources.length,
            recipient_client: "default_mailer",
          },
        }),
      }).catch(() => {});

      // Visual feedback
      if (shareEmailBtn) {
        shareEmailBtn.classList.add("copied");
        if (shareEmailIcon) shareEmailIcon.textContent = "✓";
        if (shareEmailLabel) shareEmailLabel.textContent = "Email Opened!";
        setTimeout(() => {
          shareEmailBtn.classList.remove("copied");
          if (shareEmailIcon) shareEmailIcon.textContent = "✉️";
          if (shareEmailLabel) shareEmailLabel.textContent = "Share via Email";
        }, 2200);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Google Cloud Logging Console Manager
  // -------------------------------------------------------------------------
  const googleLogsBtn = document.getElementById("googleLogsBtn");
  const googleLogsModal = document.getElementById("googleLogsModal");
  const closeGoogleLogsBtn = document.getElementById("closeGoogleLogsBtn");
  const gcpLogsList = document.getElementById("gcpLogsList");
  const gcpLogsLoading = document.getElementById("gcpLogsLoading");
  const logSeverityFilter = document.getElementById("logSeverityFilter");
  const logSearchInput = document.getElementById("logSearchInput");
  const logCountDisplay = document.getElementById("logCountDisplay");
  const refreshLogsBtn = document.getElementById("refreshLogsBtn");
  const toggleAutoStreamBtn = document.getElementById("toggleAutoStreamBtn");
  const streamDot = document.getElementById("streamDot");
  const clearLogsBtn = document.getElementById("clearLogsBtn");
  const downloadLogsJsonBtn = document.getElementById("downloadLogsJsonBtn");

  let isLogsOpen = false;
  let autoStreamActive = true;
  let streamIntervalId = null;
  let cachedLogs = [];

  function openGoogleLogs() {
    if (!googleLogsModal) return;
    googleLogsModal.style.display = "flex";
    isLogsOpen = true;
    fetchGoogleCloudLogs();
    startLogStreaming();
  }

  function closeGoogleLogs() {
    if (!googleLogsModal) return;
    googleLogsModal.style.display = "none";
    isLogsOpen = false;
    stopLogStreaming();
  }

  async function fetchGoogleCloudLogs() {
    if (!gcpLogsList) return;
    const severity = logSeverityFilter ? logSeverityFilter.value : "ALL";
    const search = logSearchInput ? logSearchInput.value.trim() : "";

    try {
      const query = new URLSearchParams();
      if (severity && severity !== "ALL") query.set("severity", severity);
      if (search) query.set("search", search);

      const res = await fetch(`/api/logs?${query.toString()}`);
      if (!res.ok) throw new Error("Failed to load logs");
      const data = await res.json();
      cachedLogs = data.logs || [];

      if (logCountDisplay) {
        logCountDisplay.textContent = `${data.filtered_count} of ${data.total} entries`;
      }

      renderGoogleCloudLogs(cachedLogs);
    } catch (err) {
      if (gcpLogsLoading) {
        gcpLogsLoading.textContent = `Error fetching logs: ${err.message}`;
        gcpLogsLoading.style.display = "block";
      }
    }
  }

  function renderGoogleCloudLogs(logs) {
    if (!gcpLogsList) return;
    if (!logs || logs.length === 0) {
      if (gcpLogsLoading) {
        gcpLogsLoading.textContent = "No log entries found matching current filter.";
        gcpLogsLoading.style.display = "block";
      }
      gcpLogsList.innerHTML = "";
      return;
    }

    if (gcpLogsLoading) {
      gcpLogsLoading.style.display = "none";
    }

    gcpLogsList.innerHTML = logs
      .map((log) => {
        const dateObj = new Date(log.timestamp);
        const timeStr = dateObj.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const sevClass = (log.severity || "INFO").toLowerCase();
        const component = log.resource?.labels?.component || log.logName || "system";
        const message = log.jsonPayload?.message || log.textPayload || "Event recorded";
        const jsonStr = escapeHtml(JSON.stringify(log, null, 2));

        return `
          <div class="gcp-log-row gcp-log-${sevClass}">
            <div class="gcp-log-summary" onclick="this.parentElement.classList.toggle('expanded')">
              <span class="gcp-log-expand-icon">▶</span>
              <span class="gcp-log-time">${timeStr}</span>
              <span class="gcp-severity-badge sev-${sevClass}">${log.severity}</span>
              <span class="gcp-log-component">${escapeHtml(component)}</span>
              <span class="gcp-log-msg">${escapeHtml(message)}</span>
            </div>
            <div class="gcp-log-details">
              <pre class="gcp-log-json"><code>${jsonStr}</code></pre>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function startLogStreaming() {
    stopLogStreaming();
    if (!autoStreamActive) return;
    streamIntervalId = setInterval(() => {
      if (isLogsOpen) {
        fetchGoogleCloudLogs();
      }
    }, 2500);
  }

  function stopLogStreaming() {
    if (streamIntervalId) {
      clearInterval(streamIntervalId);
      streamIntervalId = null;
    }
  }

  if (googleLogsBtn) {
    googleLogsBtn.addEventListener("click", openGoogleLogs);
  }
  if (closeGoogleLogsBtn) {
    closeGoogleLogsBtn.addEventListener("click", closeGoogleLogs);
  }
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener("click", fetchGoogleCloudLogs);
  }
  if (toggleAutoStreamBtn) {
    toggleAutoStreamBtn.addEventListener("click", () => {
      autoStreamActive = !autoStreamActive;
      if (streamDot) {
        streamDot.classList.toggle("active", autoStreamActive);
      }
      if (autoStreamActive) {
        startLogStreaming();
      } else {
        stopLogStreaming();
      }
    });
  }
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to clear the Google Cloud Logging buffer?")) {
        await fetch("/api/logs", { method: "DELETE" });
        fetchGoogleCloudLogs();
      }
    });
  }
  if (logSeverityFilter) {
    logSeverityFilter.addEventListener("change", fetchGoogleCloudLogs);
  }
  if (logSearchInput) {
    let searchDebounce;
    logSearchInput.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(fetchGoogleCloudLogs, 300);
    });
  }
  if (downloadLogsJsonBtn) {
    downloadLogsJsonBtn.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(cachedLogs, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `google_cloud_logs_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // -------------------------------------------------------------------------
  // Google Account / Sign-In Authentication Manager
  // -------------------------------------------------------------------------
  const googleAuthBtn = document.getElementById("googleAuthBtn");
  const googleAuthBtnLabel = document.getElementById("googleAuthBtnLabel");
  const googleAuthModal = document.getElementById("googleAuthModal");
  const closeGoogleAuthBtn = document.getElementById("closeGoogleAuthBtn");
  const confirmGoogleSignInBtn = document.getElementById("confirmGoogleSignInBtn");
  const toggleGoogleSignOutBtn = document.getElementById("toggleGoogleSignOutBtn");

  function updateGoogleAuthState(signedIn) {
    if (signedIn) {
      if (googleAuthBtn) {
        googleAuthBtn.classList.add("signed-in");
        googleAuthBtn.title = "Google Account: kishanhp18@gmail.com";
      }
      if (googleAuthBtnLabel) {
        googleAuthBtnLabel.textContent = "kishanhp18";
      }
      if (confirmGoogleSignInBtn) {
        confirmGoogleSignInBtn.textContent = "Signed In as Kishan";
        confirmGoogleSignInBtn.disabled = true;
      }
      if (toggleGoogleSignOutBtn) {
        toggleGoogleSignOutBtn.style.display = "block";
      }
    } else {
      if (googleAuthBtn) {
        googleAuthBtn.classList.remove("signed-in");
        googleAuthBtn.title = "Google Account Authentication";
      }
      if (googleAuthBtnLabel) {
        googleAuthBtnLabel.textContent = "Google Sign-in";
      }
      if (confirmGoogleSignInBtn) {
        confirmGoogleSignInBtn.textContent = "Continue as Kishan";
        confirmGoogleSignInBtn.disabled = false;
      }
      if (toggleGoogleSignOutBtn) {
        toggleGoogleSignOutBtn.style.display = "none";
      }
    }
  }

  if (googleAuthBtn) {
    googleAuthBtn.addEventListener("click", () => {
      if (googleAuthModal) googleAuthModal.style.display = "flex";
    });
  }
  if (closeGoogleAuthBtn) {
    closeGoogleAuthBtn.addEventListener("click", () => {
      if (googleAuthModal) googleAuthModal.style.display = "none";
    });
  }
  if (confirmGoogleSignInBtn) {
    confirmGoogleSignInBtn.addEventListener("click", () => {
      updateGoogleAuthState(true);
      if (googleAuthModal) googleAuthModal.style.display = "none";

      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity: "NOTICE",
          component: "auth.google",
          message: "Google Account authenticated: kishanhp18@gmail.com",
          payload: {
            user_id: "usr-google-88912",
            email: "kishanhp18@gmail.com",
            scopes: ["openid", "email", "profile"],
          },
        }),
      }).catch(() => {});
    });
  }
  if (toggleGoogleSignOutBtn) {
    toggleGoogleSignOutBtn.addEventListener("click", () => {
      updateGoogleAuthState(false);
      if (googleAuthModal) googleAuthModal.style.display = "none";

      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          severity: "INFO",
          component: "auth.google",
          message: "User signed out of Google Account",
        }),
      }).catch(() => {});
    });
  }

  // -------------------------------------------------------------------------
  // 12. Cinematic Intro Video Experience Manager
  // -------------------------------------------------------------------------
  const introOverlay = document.getElementById("introVideoOverlay");
  const entryVideo = document.getElementById("entryVideo");
  const introProgressBar = document.getElementById("introProgressBar");
  const introLiveTimer = document.getElementById("introLiveTimer");
  const introAudioToggleBtn = document.getElementById("introAudioToggleBtn");
  const introAudioIcon = document.getElementById("introAudioIcon");
  const introAudioText = document.getElementById("introAudioText");
  const skipIntroBtn = document.getElementById("skipIntroBtn");
  const replayIntroBtn = document.getElementById("replayIntroBtn");
  const introQuoteText = document.getElementById("introQuoteText");

  // Dynamic encouraging messages during video intro
  const encouragingQuotes = [
    "🚀 Initializing multi-agent research reasoning...",
    "🌐 Connecting to real-time live web intelligence via Tavily...",
    "⚡ Synthesizing citations, deep insights & actionable dossiers...",
    "✦ Ready to supercharge your exploration with autonomous AI!"
  ];
  let quoteIndex = 0;
  let quoteInterval = null;

  function startQuoteRotation() {
    if (quoteInterval) clearInterval(quoteInterval);
    quoteInterval = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % encouragingQuotes.length;
      if (introQuoteText) {
        introQuoteText.style.opacity = "0";
        setTimeout(() => {
          introQuoteText.textContent = encouragingQuotes[quoteIndex];
          introQuoteText.style.opacity = "1";
        }, 300);
      }
    }, 2800);
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  function dismissIntroVideo() {
    if (!introOverlay) return;
    if (quoteInterval) clearInterval(quoteInterval);

    // Apply exit animation
    introOverlay.classList.add("intro-exit");

    if (entryVideo) {
      entryVideo.pause();
    }

    // Smooth transition into dashboard & focus query input
    setTimeout(() => {
      introOverlay.style.display = "none";
      if (topicInput) {
        topicInput.focus();
      }
    }, 650);
  }

  function launchIntroVideo() {
    if (!introOverlay || !entryVideo) return;
    introOverlay.style.display = "flex";
    // Force reflow
    void introOverlay.offsetWidth;
    introOverlay.classList.remove("intro-exit");

    entryVideo.currentTime = 0;
    if (introProgressBar) introProgressBar.style.width = "0%";
    
    startQuoteRotation();

    // Autoplay with muted fallback (safe for all modern browsers)
    entryVideo.play().catch((err) => {
      console.warn("Autoplay was prevented by browser policy:", err);
    });
  }

  if (entryVideo) {
    // Progress and Timer Updates
    entryVideo.addEventListener("timeupdate", () => {
      if (entryVideo.duration) {
        const percent = (entryVideo.currentTime / entryVideo.duration) * 100;
        if (introProgressBar) {
          introProgressBar.style.width = `${percent}%`;
        }
        if (introLiveTimer) {
          introLiveTimer.textContent = `${formatTime(entryVideo.currentTime)} / ${formatTime(entryVideo.duration)}`;
        }
      }
    });

    // When the video finishes, reveal original interface
    entryVideo.addEventListener("ended", () => {
      dismissIntroVideo();
    });

    // In case of video error, gracefully transition to dashboard
    entryVideo.addEventListener("error", (e) => {
      console.warn("Video failed to load or play:", e);
      setTimeout(dismissIntroVideo, 1200);
    });

    // Start playback immediately on load
    launchIntroVideo();
  }

  // Audio Mute/Unmute Toggle Button
  if (introAudioToggleBtn && entryVideo) {
    introAudioToggleBtn.addEventListener("click", () => {
      entryVideo.muted = !entryVideo.muted;
      if (entryVideo.muted) {
        introAudioIcon.textContent = "🔇";
        introAudioText.textContent = "Unmute";
      } else {
        introAudioIcon.textContent = "🔊";
        introAudioText.textContent = "Sound On";
      }
    });
  }

  // Skip / Enter Dashboard Button
  if (skipIntroBtn) {
    skipIntroBtn.addEventListener("click", () => {
      dismissIntroVideo();
    });
  }

  // Replay Intro Video Button in Header
  if (replayIntroBtn) {
    replayIntroBtn.addEventListener("click", () => {
      launchIntroVideo();
    });
  }

  // Allow ESC key to exit intro video
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && introOverlay && !introOverlay.classList.contains("intro-exit")) {
      dismissIntroVideo();
    }
  });

  // -------------------------------------------------------------------------
  // 13. Department Code Training Studio Controller
  // -------------------------------------------------------------------------
  const deptTrainingModal = document.getElementById("deptTrainingModal");
  const closeDeptTrainingModalBtn = document.getElementById("closeDeptTrainingModalBtn");
  const closeDeptStudioBottomBtn = document.getElementById("closeDeptStudioBottomBtn");
  const modalDeptSelect = document.getElementById("modalDeptSelect");

  const toggleNewDeptFormBtn = document.getElementById("toggleNewDeptFormBtn");
  const newDeptBox = document.getElementById("newDeptBox");
  const newDeptCodeInput = document.getElementById("newDeptCodeInput");
  const newDeptNameInput = document.getElementById("newDeptNameInput");
  const newDeptDescInput = document.getElementById("newDeptDescInput");
  const confirmCreateDeptBtn = document.getElementById("confirmCreateDeptBtn");
  const cancelCreateDeptBtn = document.getElementById("cancelCreateDeptBtn");

  const trainCodeForm = document.getElementById("trainCodeForm");
  const codeTitleInput = document.getElementById("codeTitleInput");
  const codeLanguageSelect = document.getElementById("codeLanguageSelect");
  const codeNotesInput = document.getElementById("codeNotesInput");
  const codeSnippetTextarea = document.getElementById("codeSnippetTextarea");
  const codeLengthCharCount = document.getElementById("codeLengthCharCount");
  const submitTrainCodeBtn = document.getElementById("submitTrainCodeBtn");
  const submitTrainBtnText = document.getElementById("submitTrainBtnText");

  const trainingLiveHud = document.getElementById("trainingLiveHud");
  const trainingHudPhase = document.getElementById("trainingHudPhase");
  const trainingHudBarFill = document.getElementById("trainingHudBarFill");
  const trainingHudMeta = document.getElementById("trainingHudMeta");

  const trainingSuccessCard = document.getElementById("trainingSuccessCard");
  const trainingSuccessTitle = document.getElementById("trainingSuccessTitle");
  const trainingSuccessDesc = document.getElementById("trainingSuccessDesc");
  const dismissTrainingSuccessBtn = document.getElementById("dismissTrainingSuccessBtn");

  const deptCheckpointsTitle = document.getElementById("deptCheckpointsTitle");
  const deptEpochCountBadge = document.getElementById("deptEpochCountBadge");
  const refreshCheckpointsBtn = document.getElementById("refreshCheckpointsBtn");
  const deptSummaryName = document.getElementById("deptSummaryName");
  const deptSummaryDesc = document.getElementById("deptSummaryDesc");
  const deptMetricCheckpoints = document.getElementById("deptMetricCheckpoints");
  const deptMetricRules = document.getElementById("deptMetricRules");
  const deptMetricTokens = document.getElementById("deptMetricTokens");
  const checkpointsListContainer = document.getElementById("checkpointsListContainer");

  // Sample Code Definitions
  const CODE_SAMPLES = {
    circuit_breaker: {
      title: "Resilient Circuit Breaker with Exponential Backoff & Jitter",
      language: "python",
      notes: "Enforces 3-strike isolation, sub-50ms fail-fast, full jitter backoff, and idempotent retries",
      code: `import time
import random
from enum import Enum
from typing import Callable, Any

class CircuitState(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitBreakerOpenException(Exception):
    pass

class CircuitBreaker:
    """
    Departmental Invariant: Resilient zero-downtime microservice circuit breaker.
    Guarantees graceful degradation during partial outages.
    """
    def __init__(self, failure_threshold: int = 3, recovery_time: float = 10.0):
        self.failure_threshold = failure_threshold
        self.recovery_time = recovery_time
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self.last_state_change = time.time()

    def call(self, func: Callable, *args, **kwargs) -> Any:
        now = time.time()
        if self.state == CircuitState.OPEN:
            if now - self.last_state_change > self.recovery_time:
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenException("Circuit OPEN: fast-failing traffic")

        try:
            result = func(*args, **kwargs)
            self._handle_success()
            return result
        except Exception as e:
            self._handle_failure()
            raise e

    def _handle_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED

    def _handle_failure(self):
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.last_state_change = time.time()`
    },
    vector_rag: {
      title: "Vector Similarity Index & Chunk Retrieval",
      language: "typescript",
      notes: "Cosine similarity calculation with sub-5ms chunk retrieval and memory caching",
      code: `export interface VectorChunk {
  id: string;
  embedding: number[];
  text: string;
  metadata: Record<string, any>;
}

export class InMemoryVectorIndex {
  private chunks: VectorChunk[] = [];

  public insert(chunk: VectorChunk): void {
    this.chunks.push(chunk);
  }

  public query(queryEmbedding: number[], topK: number = 5): { chunk: VectorChunk; score: number }[] {
    return this.chunks
      .map(chunk => ({
        chunk,
        score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1e-9);
  }
}`
    },
    risk_model: {
      title: "Monte Carlo Value-at-Risk (VaR) Engine",
      language: "python",
      notes: "Enforces Basel III regulatory capital limits, 99% confidence VaR, and tail risk buffers",
      code: `import numpy as np

def calculate_portfolio_var(
    portfolio_value: float,
    mean_return: float,
    std_dev: float,
    confidence_level: float = 0.99,
    simulations: int = 10000
) -> dict:
    """
    Departmental Invariant: Quant Risk Basel-III Regulatory VaR Simulator.
    Calculates 1-day Value at Risk (VaR) and Conditional VaR (Expected Shortfall).
    """
    simulated_returns = np.random.normal(mean_return, std_dev, simulations)
    cutoff_percentile = (1 - confidence_level) * 100
    var_percentile = np.percentile(simulated_returns, cutoff_percentile)
    
    var_dollar = portfolio_value * abs(var_percentile)
    expected_shortfall = portfolio_value * abs(simulated_returns[simulated_returns <= var_percentile].mean())
    
    return {
        "confidence_level": confidence_level,
        "var_dollar": round(float(var_dollar), 2),
        "expected_shortfall": round(float(expected_shortfall), 2),
        "regulatory_buffer_required": round(float(var_dollar * 1.15), 2)
    }`
    }
  };

  // Open & Close Modal
  function openDeptModal() {
    if (!deptTrainingModal) return;
    deptTrainingModal.style.display = "flex";
    if (deptSelect && modalDeptSelect) {
      modalDeptSelect.value = deptSelect.value;
      const activeDept = departmentsCache.find((d) => d.code === deptSelect.value);
      if (activeDept) renderDepartmentDetails(activeDept);
    }
  }

  function closeDeptModal() {
    if (!deptTrainingModal) return;
    deptTrainingModal.style.display = "none";
  }

  if (deptTrainingBtn) deptTrainingBtn.addEventListener("click", openDeptModal);
  if (openTrainingStudioInlineBtn) openTrainingStudioInlineBtn.addEventListener("click", openDeptModal);
  if (closeDeptTrainingModalBtn) closeDeptTrainingModalBtn.addEventListener("click", closeDeptModal);
  if (closeDeptStudioBottomBtn) closeDeptStudioBottomBtn.addEventListener("click", closeDeptModal);

  // Load Departments from Backend
  async function loadDepartments(preferredCode) {
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) return;
      const data = await res.json();
      departmentsCache = data.departments || [];

      if (departmentsCache.length === 0) return;

      const currentSelected = preferredCode || (deptSelect ? deptSelect.value : "") || departmentsCache[0].code;

      // Populate Search Bar dropdown
      if (deptSelect) {
        deptSelect.innerHTML = departmentsCache
          .map((d) => `<option value="${escapeHtml(d.code)}">${escapeHtml(d.code)} — ${escapeHtml(d.name)}</option>`)
          .join("");
        deptSelect.value = currentSelected;
      }

      // Populate Modal dropdown
      if (modalDeptSelect) {
        modalDeptSelect.innerHTML = departmentsCache
          .map((d) => `<option value="${escapeHtml(d.code)}">${escapeHtml(d.code)} — ${escapeHtml(d.name)} (Epoch #${d.epoch_count})</option>`)
          .join("");
        modalDeptSelect.value = currentSelected;
      }

      updateSelectedDepartmentUI(currentSelected);
    } catch (e) {
      console.warn("Failed to load departments:", e);
    }
  }

  function updateSelectedDepartmentUI(code) {
    const dept = departmentsCache.find((d) => d.code === code) || departmentsCache[0];
    if (!dept) return;

    if (deptTrainingStatusText) {
      const checkpointsCount = dept.training_entries.length;
      deptTrainingStatusText.textContent = `Trained on ${checkpointsCount} code checkpoint${checkpointsCount === 1 ? "" : "s"} (Epoch #${dept.epoch_count})`;
    }

    if (headerDeptEpochBadge) {
      headerDeptEpochBadge.textContent = `${dept.code} (${dept.epoch_count})`;
    }

    renderDepartmentDetails(dept);
  }

  if (deptSelect) {
    deptSelect.addEventListener("change", () => {
      const code = deptSelect.value;
      if (modalDeptSelect) modalDeptSelect.value = code;
      updateSelectedDepartmentUI(code);
    });
  }

  if (modalDeptSelect) {
    modalDeptSelect.addEventListener("change", () => {
      const code = modalDeptSelect.value;
      if (deptSelect) deptSelect.value = code;
      updateSelectedDepartmentUI(code);
    });
  }

  // Render Department Details & Checkpoints
  function renderDepartmentDetails(dept) {
    if (!dept) return;

    if (deptCheckpointsTitle) {
      deptCheckpointsTitle.textContent = `${dept.code} Memory`;
    }
    if (deptEpochCountBadge) {
      deptEpochCountBadge.textContent = `Epoch #${dept.epoch_count}`;
    }
    if (deptSummaryName) {
      deptSummaryName.textContent = dept.name;
    }
    if (deptSummaryDesc) {
      deptSummaryDesc.textContent = dept.description || "Continuous domain code training and architectural constraints.";
    }

    const totalRules = dept.training_entries.reduce((acc, e) => acc + (e.extracted_rules?.length || 0), 0);
    const totalTokens = dept.training_entries.reduce((acc, e) => acc + (e.token_count || 0), 0);

    if (deptMetricCheckpoints) deptMetricCheckpoints.textContent = dept.training_entries.length;
    if (deptMetricRules) deptMetricRules.textContent = totalRules;
    if (deptMetricTokens) deptMetricTokens.textContent = totalTokens;

    // Render Checkpoint Cards
    if (!checkpointsListContainer) return;

    if (dept.training_entries.length === 0) {
      checkpointsListContainer.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--text-muted);font-size:0.82rem;">
          No code checkpoints ingested yet for <strong>${escapeHtml(dept.code)}</strong>.<br>
          Enter code in the editor on the left to start training!
        </div>
      `;
      return;
    }

    checkpointsListContainer.innerHTML = dept.training_entries
      .map((entry, idx) => {
        const rulesHtml = (entry.extracted_rules || [])
          .map((r) => `<div class="checkpoint-rule-chip">${escapeHtml(r)}</div>`)
          .join("");

        return `
          <div class="checkpoint-card" id="checkpointCard-${entry.id}">
            <div class="checkpoint-header">
              <span class="checkpoint-title">${escapeHtml(entry.title || `Checkpoint #${idx + 1}`)}</span>
              <div class="checkpoint-badges">
                <span class="checkpoint-lang-badge">${escapeHtml(entry.language.toUpperCase())}</span>
                <span class="checkpoint-epoch-badge">Epoch #${entry.epoch}</span>
              </div>
            </div>

            <div class="checkpoint-rules-box">
              ${rulesHtml}
            </div>

            <div class="checkpoint-footer">
              <span>~${entry.token_count} tokens • ${new Date(entry.timestamp).toLocaleDateString()}</span>
              <div>
                <button type="button" class="btn-sample-code" onclick="document.getElementById('codePreview-${entry.id}').style.display = document.getElementById('codePreview-${entry.id}').style.display === 'none' ? 'block' : 'none'">View Code</button>
                <button type="button" class="btn-del-checkpoint" onclick="window.deleteDepartmentCheckpoint('${escapeHtml(dept.code)}', '${escapeHtml(entry.id)}')">✕</button>
              </div>
            </div>

            <div class="checkpoint-code-preview" id="codePreview-${entry.id}" style="display:none;">${escapeHtml(entry.code_snippet)}</div>
          </div>
        `;
      })
      .join("");
  }

  // Delete Checkpoint Handler
  window.deleteDepartmentCheckpoint = async (deptCode, entryId) => {
    if (!confirm(`Are you sure you want to remove this trained checkpoint from ${deptCode}?`)) return;

    try {
      const res = await fetch(`/api/departments/${encodeURIComponent(deptCode)}/training/${encodeURIComponent(entryId)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete checkpoint");
      const data = await res.json();
      
      // Update cache
      const idx = departmentsCache.findIndex((d) => d.code === deptCode);
      if (idx !== -1) departmentsCache[idx] = data.department;

      updateSelectedDepartmentUI(deptCode);
    } catch (err) {
      alert(`Error deleting checkpoint: ${err.message}`);
    }
  };

  // Toggle New Department Inline Box
  if (toggleNewDeptFormBtn && newDeptBox) {
    toggleNewDeptFormBtn.addEventListener("click", () => {
      newDeptBox.style.display = newDeptBox.style.display === "none" ? "flex" : "none";
      if (newDeptBox.style.display === "flex" && newDeptCodeInput) {
        newDeptCodeInput.focus();
      }
    });
  }

  if (cancelCreateDeptBtn && newDeptBox) {
    cancelCreateDeptBtn.addEventListener("click", () => {
      newDeptBox.style.display = "none";
    });
  }

  if (confirmCreateDeptBtn) {
    confirmCreateDeptBtn.addEventListener("click", async () => {
      const code = (newDeptCodeInput ? newDeptCodeInput.value : "").trim().toUpperCase();
      const name = (newDeptNameInput ? newDeptNameInput.value : "").trim();
      const description = (newDeptDescInput ? newDeptDescInput.value : "").trim();

      if (!code || !name) {
        alert("Please specify both a department code (e.g. CYBER-01) and a department name.");
        return;
      }

      try {
        confirmCreateDeptBtn.disabled = true;
        const res = await fetch("/api/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, name, description }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to create department");
        }

        const newDept = await res.json();
        if (newDeptBox) newDeptBox.style.display = "none";
        if (newDeptCodeInput) newDeptCodeInput.value = "";
        if (newDeptNameInput) newDeptNameInput.value = "";
        if (newDeptDescInput) newDeptDescInput.value = "";

        await loadDepartments(newDept.code);
      } catch (err) {
        alert(`Error: ${err.message}`);
      } finally {
        confirmCreateDeptBtn.disabled = false;
      }
    });
  }

  // Code Snippet Character & Token Counter
  if (codeSnippetTextarea && codeLengthCharCount) {
    codeSnippetTextarea.addEventListener("input", () => {
      const chars = codeSnippetTextarea.value.length;
      const tokens = Math.ceil(chars / 4);
      codeLengthCharCount.textContent = `${chars.toLocaleString()} characters (~${tokens.toLocaleString()} tokens)`;
    });
  }

  // Load Sample Code Buttons
  document.querySelectorAll(".btn-sample-code[data-sample]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sampleKey = btn.getAttribute("data-sample");
      const sample = CODE_SAMPLES[sampleKey];
      if (!sample) return;

      if (codeTitleInput) codeTitleInput.value = sample.title;
      if (codeLanguageSelect) codeLanguageSelect.value = sample.language;
      if (codeNotesInput) codeNotesInput.value = sample.notes;
      if (codeSnippetTextarea) {
        codeSnippetTextarea.value = sample.code;
        codeSnippetTextarea.dispatchEvent(new Event("input"));
      }
    });
  });

  // Handle Code Submission to Train Department Model
  if (trainCodeForm) {
    trainCodeForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const activeDeptCode = modalDeptSelect ? modalDeptSelect.value : (deptSelect ? deptSelect.value : "");
      if (!activeDeptCode) {
        alert("Please select a target department first.");
        return;
      }

      const snippet = (codeSnippetTextarea ? codeSnippetTextarea.value : "").trim();
      if (!snippet) {
        alert("Please enter code into the editor to train the department model.");
        return;
      }

      const title = (codeTitleInput ? codeTitleInput.value : "").trim() || "Code Invariant Checkpoint";
      const language = codeLanguageSelect ? codeLanguageSelect.value : "python";
      const notes = (codeNotesInput ? codeNotesInput.value : "").trim();

      // UI state: activate live HUD
      if (trainingSuccessCard) trainingSuccessCard.style.display = "none";
      if (trainingLiveHud) trainingLiveHud.style.display = "flex";
      if (submitTrainCodeBtn) {
        submitTrainCodeBtn.disabled = true;
        if (submitTrainBtnText) submitTrainBtnText.textContent = "Training Model...";
      }

      // Step 1: Tokenizing AST
      if (trainingHudPhase) trainingHudPhase.textContent = "Step 1/3: Tokenizing Code AST & Syntax Trees...";
      if (trainingHudBarFill) trainingHudBarFill.style.width = "30%";
      if (trainingHudMeta) trainingHudMeta.textContent = `Analyzing ${snippet.length} chars in ${language.toUpperCase()}...`;

      // Step 2 timer
      setTimeout(() => {
        if (trainingHudPhase) trainingHudPhase.textContent = "Step 2/3: Extracting Departmental Invariants & Rules...";
        if (trainingHudBarFill) trainingHudBarFill.style.width = "65%";
        if (trainingHudMeta) trainingHudMeta.textContent = "Detecting error boundaries, protocols, and constraints...";
      }, 400);

      try {
        const response = await fetch(`/api/departments/${encodeURIComponent(activeDeptCode)}/train`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            code_snippet: snippet,
            language,
            notes,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to train department model.");
        }

        const result = await response.json();

        // Step 3: Neural calibration completed
        if (trainingHudPhase) trainingHudPhase.textContent = "Step 3/3: Calibrating Neural Memory & Updating Epoch...";
        if (trainingHudBarFill) trainingHudBarFill.style.width = "100%";

        setTimeout(() => {
          if (trainingLiveHud) trainingLiveHud.style.display = "none";
          if (submitTrainCodeBtn) {
            submitTrainCodeBtn.disabled = false;
            if (submitTrainBtnText) submitTrainBtnText.textContent = "Train Model on Code";
          }

          // Clear inputs
          if (codeSnippetTextarea) {
            codeSnippetTextarea.value = "";
            codeSnippetTextarea.dispatchEvent(new Event("input"));
          }
          if (codeTitleInput) codeTitleInput.value = "";
          if (codeNotesInput) codeNotesInput.value = "";

          // Show success banner
          if (trainingSuccessCard) {
            trainingSuccessCard.style.display = "flex";
            if (trainingSuccessTitle) {
              trainingSuccessTitle.textContent = `Department ${result.department.code} Model Trained (Epoch #${result.entry.epoch})!`;
            }
            if (trainingSuccessDesc) {
              trainingSuccessDesc.textContent = `Extracted ${result.entry.extracted_rules.length} architectural invariants: ${result.entry.extracted_rules.slice(0, 2).join("; ")}...`;
            }
          }

          // Update departments cache and view
          const idx = departmentsCache.findIndex((d) => d.code === activeDeptCode);
          if (idx !== -1) departmentsCache[idx] = result.department;

          updateSelectedDepartmentUI(activeDeptCode);
        }, 600);

      } catch (err) {
        if (trainingLiveHud) trainingLiveHud.style.display = "none";
        if (submitTrainCodeBtn) {
          submitTrainCodeBtn.disabled = false;
          if (submitTrainBtnText) submitTrainBtnText.textContent = "Train Model on Code";
        }
        alert(`Training Error: ${err.message}`);
      }
    });
  }

  if (dismissTrainingSuccessBtn && trainingSuccessCard) {
    dismissTrainingSuccessBtn.addEventListener("click", () => {
      trainingSuccessCard.style.display = "none";
    });
  }

  // Toggle report invariants drawer
  if (toggleReportInvariantsBtn && reportDeptInvariantsDrawer) {
    toggleReportInvariantsBtn.addEventListener("click", () => {
      const isHidden = reportDeptInvariantsDrawer.style.display === "none";
      reportDeptInvariantsDrawer.style.display = isHidden ? "block" : "none";
      toggleReportInvariantsBtn.textContent = isHidden ? "Hide Invariants ▲" : "Trained Invariants ▼";
    });
  }

  // -------------------------------------------------------------------------
  // 16. Web Speech API: Voice Transcription for Research Search Bar
  // -------------------------------------------------------------------------
  let speechRecognition = null;
  let isListeningVoice = false;

  function initSpeechRecognitionEngine() {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      console.warn("Web Speech API is not supported in this browser environment.");
      return null;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningVoice = true;
        if (micBtn) micBtn.classList.add("listening");
        if (voiceListeningHud) voiceListeningHud.style.display = "flex";
        if (voiceHudTitle) voiceHudTitle.textContent = "Listening... Speak your research topic";
        if (voiceHudSub) voiceHudSub.textContent = "Web Speech API active • Transcribing directly to search bar";
      };

      recognition.onresult = (event) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans;
          } else {
            interimTranscript += trans;
          }
        }

        const currentSpeech = (finalTranscript || interimTranscript).trim();
        if (currentSpeech && topicInput) {
          topicInput.value = currentSpeech;
          topicInput.dispatchEvent(new Event("input"));
          if (voiceHudTitle) {
            voiceHudTitle.textContent = `"${currentSpeech}"`;
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn("Web Speech API recognition notice:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          alert("Microphone permission was denied. Please allow microphone permissions in your browser address bar to use voice search.");
        } else if (event.error === "no-speech") {
          if (voiceHudTitle) voiceHudTitle.textContent = "No voice heard. Please try speaking again.";
        }
        stopVoiceSearch();
      };

      recognition.onend = () => {
        isListeningVoice = false;
        if (micBtn) micBtn.classList.remove("listening");
        if (voiceListeningHud) voiceListeningHud.style.display = "none";
      };

      return recognition;
    } catch (e) {
      console.error("Failed to initialize Web Speech API:", e);
      return null;
    }
  }

  function startVoiceSearch() {
    if (!speechRecognition) {
      speechRecognition = initSpeechRecognitionEngine();
    }

    if (!speechRecognition) {
      alert("Voice recognition (Web Speech API) is not available in this browser. Please use Chrome, Edge, or Safari, or enter your topic manually.");
      return;
    }

    try {
      speechRecognition.start();
    } catch (err) {
      console.warn("Speech recognition already active or starting:", err);
    }
  }

  function stopVoiceSearch() {
    if (speechRecognition && isListeningVoice) {
      try {
        speechRecognition.stop();
      } catch (e) {}
    }
    isListeningVoice = false;
    if (micBtn) micBtn.classList.remove("listening");
    if (voiceListeningHud) voiceListeningHud.style.display = "none";
  }

  if (micBtn) {
    micBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (isListeningVoice) {
        stopVoiceSearch();
      } else {
        startVoiceSearch();
      }
    });
  }

  if (stopVoiceBtn) {
    stopVoiceBtn.addEventListener("click", (e) => {
      e.preventDefault();
      stopVoiceSearch();
    });
  }

  // -------------------------------------------------------------------------
  // 17. SQLite Auto-Save Engine (Every 30 Seconds) & Session Resumption
  // -------------------------------------------------------------------------
  let cachedSavedSession = null;

  async function autoSaveCurrentProgress() {
    const activeTopic = currentProgressState.topic || (topicInput ? topicInput.value.trim() : "");
    if (!activeTopic) return;

    const activeDeptCode = deptSelect ? deptSelect.value : "";
    const activeDeptObj = departmentsCache.find((d) => d.code === activeDeptCode);

    const reportContent = currentResearchData?.report || currentProgressState.report || "";
    const sourcesList = currentResearchData?.sources || currentProgressState.sources || [];
    const currentStatus = currentResearchData?.report ? "completed" : (currentProgressState.status || "in_progress");

    const payload = {
      topic: activeTopic,
      stage: currentProgressState.stage || 1,
      stage_message: currentProgressState.stage_message || "",
      report: reportContent,
      sources: sourcesList,
      department_code: activeDeptCode,
      department_name: activeDeptObj ? activeDeptObj.name : (currentProgressState.department_name || ""),
      trained_epoch: activeDeptObj ? activeDeptObj.epoch_count : (currentProgressState.trained_epoch || 1),
      status: currentStatus,
    };

    updateAutoSaveBadge("Saving to SQLite...", true);

    try {
      const res = await fetch("/api/progress/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        updateAutoSaveBadge(`Auto-saved at ${timeNow} (SQLite)`);
      }
    } catch (err) {
      console.warn("Auto-save to SQLite failed:", err);
      updateAutoSaveBadge("Auto-save: Retrying...");
    }
  }

  function updateAutoSaveBadge(text, isSaving = false) {
    if (reportAutoSavePill) {
      if (isSaving) {
        reportAutoSavePill.classList.add("saving");
      } else {
        reportAutoSavePill.classList.remove("saving");
      }
    }
    if (reportAutoSaveText) {
      reportAutoSaveText.textContent = text;
    }
  }

  // 30-Second Periodic Auto-Save Timer
  const AUTO_SAVE_INTERVAL_MS = 30000;
  setInterval(autoSaveCurrentProgress, AUTO_SAVE_INTERVAL_MS);

  // Check and display banner if an unsaved session exists in SQLite
  async function checkSavedProgressToResume() {
    try {
      const res = await fetch("/api/progress/latest");
      if (!res.ok) return;

      const data = await res.json();
      if (data.has_saved_progress && data.progress && data.progress.topic) {
        cachedSavedSession = data.progress;

        if (resumeSessionBanner && resumeBannerTopic) {
          resumeBannerTopic.innerHTML = `Topic: "<strong>${escapeHtml(cachedSavedSession.topic)}</strong>" • Auto-saved in SQLite`;
          if (resumeBannerTime && cachedSavedSession.updated_at) {
            const timeFormatted = new Date(cachedSavedSession.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            resumeBannerTime.textContent = timeFormatted;
          }
          resumeSessionBanner.style.display = "flex";
        }
      }
    } catch (e) {
      console.warn("Could not retrieve saved session from SQLite:", e);
    }
  }

  // Handle Resume Session Button Click
  if (resumeSessionBtn) {
    resumeSessionBtn.addEventListener("click", () => {
      if (!cachedSavedSession) return;

      // Populate Search Form
      if (topicInput) {
        topicInput.value = cachedSavedSession.topic;
        topicInput.dispatchEvent(new Event("input"));
      }

      // Restore Department Selection if present
      if (cachedSavedSession.department_code && deptSelect) {
        deptSelect.value = cachedSavedSession.department_code;
        deptSelect.dispatchEvent(new Event("change"));
      }

      // If progress has a completed report, display it immediately
      if (cachedSavedSession.report) {
        displayResults({
          topic: cachedSavedSession.topic,
          report: cachedSavedSession.report,
          sources: cachedSavedSession.sources || [],
          department_code: cachedSavedSession.department_code,
          department_name: cachedSavedSession.department_name,
          trained_epoch: cachedSavedSession.trained_epoch,
          created_at: new Date(cachedSavedSession.updated_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
        });
        updateAutoSaveBadge("Auto-saved (Restored from SQLite)");
      } else {
        // Resume in-progress research
        startResearch(cachedSavedSession.topic);
      }

      if (resumeSessionBanner) {
        resumeSessionBanner.style.display = "none";
      }
    });
  }

  // Dismiss Saved Session Banner
  if (dismissResumeBtn) {
    dismissResumeBtn.addEventListener("click", async () => {
      if (resumeSessionBanner) {
        resumeSessionBanner.style.display = "none";
      }
      try {
        await fetch("/api/progress", { method: "DELETE" });
      } catch (e) {}
      cachedSavedSession = null;
    });
  }

  // -------------------------------------------------------------------------
  // 7. Conceptual Infographic Hero Feature
  // -------------------------------------------------------------------------
  let currentInfographicUrl = "/static/images/infographic_hero_1790170807210.jpg";
  let activeInfographicStyle = "Cyber-Tech Blueprint";
  const infographicPresets = [
    {
      id: "cyber-blueprint",
      style: "Cyber-Tech Blueprint",
      url: "/static/images/infographic_hero_1790170807210.jpg",
      title: "Cybernetic Synthesis Blueprint",
    },
    {
      id: "isometric-analytics",
      style: "Isometric Matrix",
      url: "/static/images/research_takeaways_1790170823741.jpg",
      title: "Isometric Strategic Analytics",
    },
  ];

  function renderInfographicHero(data) {
    const heroSection = document.getElementById("infographicHeroSection");
    const heroImg = document.getElementById("infographicHeroImg");
    const heroTitle = document.getElementById("infographicHeroTitle");
    const heroTopicBadge = document.getElementById("infographicHeroTopicBadge");
    const styleTag = document.getElementById("infographicStyleTag");
    const takeawaysGrid = document.getElementById("infographicTakeawaysGrid");

    if (!heroSection || !heroImg) return;

    heroSection.style.display = "block";
    if (heroTitle) heroTitle.textContent = data.topic || "Research Synthesis";
    if (heroTopicBadge) {
      heroTopicBadge.textContent = data.department_name
        ? `${data.department_name} • Key Takeaways`
        : "Executive Synthesis";
    }

    const initialUrl = data.infographic_url || "/static/images/infographic_hero_1790170807210.jpg";
    currentInfographicUrl = initialUrl;
    heroImg.src = initialUrl;
    if (styleTag) styleTag.textContent = activeInfographicStyle;

    const takeaways = data.infographic_takeaways && data.infographic_takeaways.length > 0
      ? data.infographic_takeaways
      : [
          `Core Synthesis: Accelerated market expansion and technological transformation in ${data.topic}.`,
          `Quantitative Indicator: Multi-billion capital allocation and projected high CAGR growth through 2030.`,
          `Strategic Architecture: Robust infrastructure convergence, scaling efficiency and ecosystem synergy.`,
          `Risk & Governance: Regulatory incentives, standardization, and mitigation of operational bottlenecks.`,
        ];

    const categoryMeta = [
      { cat: "Core Synthesis", icon: "🎯" },
      { cat: "Quantitative Impact", icon: "📊" },
      { cat: "Strategic Trend", icon: "⚡" },
      { cat: "Risk & Governance", icon: "🛡️" },
    ];

    if (takeawaysGrid) {
      takeawaysGrid.innerHTML = takeaways
        .slice(0, 4)
        .map((text, i) => {
          const meta = categoryMeta[i % categoryMeta.length];
          return `
            <div class="takeaway-card">
              <div class="takeaway-card-top">
                <span class="takeaway-card-icon">${meta.icon}</span>
                <span class="takeaway-card-category">${meta.cat}</span>
              </div>
              <div class="takeaway-card-text">${escapeHtml(text)}</div>
            </div>
          `;
        })
        .join("");
    }
  }

  function setupInfographicControls() {
    const openGenBtn = document.getElementById("openInfographicGenBtn");
    const closeGenBtn = document.getElementById("closeInfographicGenDrawerBtn");
    const genDrawer = document.getElementById("infographicGenDrawer");
    const switchPresetBtn = document.getElementById("switchInfographicPresetBtn");
    const downloadBtn = document.getElementById("downloadInfographicBtn");
    const fullscreenBtn = document.getElementById("fullscreenInfographicBtn");
    const toggleBtn = document.getElementById("toggleInfographicBtn");
    const toggleIcon = document.getElementById("toggleInfographicIcon");
    const canvasWrap = document.getElementById("infographicCanvasWrap");
    const runGenBtn = document.getElementById("runInfographicGenerateBtn");
    const customPromptInput = document.getElementById("infographicPromptInput");
    const genStatusText = document.getElementById("infographicGenStatusText");
    const styleChips = document.querySelectorAll(".style-chip");
    const heroImg = document.getElementById("infographicHeroImg");
    const styleTag = document.getElementById("infographicStyleTag");

    if (openGenBtn && genDrawer) {
      openGenBtn.addEventListener("click", () => {
        const isHidden = genDrawer.style.display === "none";
        genDrawer.style.display = isHidden ? "block" : "none";
        openGenBtn.classList.toggle("active", isHidden);
      });
    }

    if (closeGenBtn && genDrawer) {
      closeGenBtn.addEventListener("click", () => {
        genDrawer.style.display = "none";
        if (openGenBtn) openGenBtn.classList.remove("active");
      });
    }

    styleChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        styleChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        activeInfographicStyle = chip.getAttribute("data-style") || "Cyber-Tech Blueprint";
        if (styleTag) styleTag.textContent = activeInfographicStyle;
      });
    });

    if (runGenBtn) {
      runGenBtn.addEventListener("click", async () => {
        if (!currentResearchData) return;

        runGenBtn.disabled = true;
        const origText = document.getElementById("runInfographicGenerateText")?.textContent || "Generate Infographic";
        if (document.getElementById("runInfographicGenerateText")) {
          document.getElementById("runInfographicGenerateText").textContent = "Generating Conceptual Infographic...";
        }
        if (genStatusText) {
          genStatusText.textContent = "Synthesizing visual nodes and rendering conceptual infographic...";
        }

        try {
          const res = await fetch("/api/infographic/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: currentResearchData.topic,
              report: currentResearchData.report,
              takeaways: currentResearchData.infographic_takeaways || [],
              style: activeInfographicStyle,
              customPrompt: customPromptInput?.value?.trim() || "",
            }),
          });

          if (!res.ok) throw new Error("Could not generate conceptual infographic.");

          const payload = await res.json();
          if (payload.imageUrl && heroImg) {
            heroImg.style.opacity = "0.2";
            setTimeout(() => {
              heroImg.src = payload.imageUrl;
              currentInfographicUrl = payload.imageUrl;
              heroImg.style.opacity = "1";
            }, 250);
          }

          if (styleTag) styleTag.textContent = payload.style || activeInfographicStyle;
          if (genStatusText) {
            genStatusText.textContent = `✓ Generated conceptual infographic for ${payload.topic}`;
          }

          setTimeout(() => {
            if (genDrawer) genDrawer.style.display = "none";
            if (openGenBtn) openGenBtn.classList.remove("active");
          }, 1800);
        } catch (err) {
          if (genStatusText) genStatusText.textContent = `Error: ${err.message}`;
        } finally {
          runGenBtn.disabled = false;
          if (document.getElementById("runInfographicGenerateText")) {
            document.getElementById("runInfographicGenerateText").textContent = origText;
          }
        }
      });
    }

    let currentPresetIdx = 0;
    if (switchPresetBtn && heroImg) {
      switchPresetBtn.addEventListener("click", () => {
        currentPresetIdx = (currentPresetIdx + 1) % infographicPresets.length;
        const chosen = infographicPresets[currentPresetIdx];
        heroImg.style.opacity = "0.2";
        setTimeout(() => {
          heroImg.src = chosen.url;
          currentInfographicUrl = chosen.url;
          activeInfographicStyle = chosen.style;
          if (styleTag) styleTag.textContent = chosen.style;
          heroImg.style.opacity = "1";
        }, 200);
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = currentInfographicUrl;
        a.download = `Conceptual_Infographic_${(currentResearchData?.topic || "Research").slice(0, 25).replace(/[^a-zA-Z0-9]/g, "_")}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }

    const lightboxModal = document.getElementById("infographicLightboxModal");
    const lightboxImg = document.getElementById("lightboxImg");
    const lightboxTitle = document.getElementById("lightboxTopicTitle");
    const lightboxStyle = document.getElementById("lightboxStyleTag");
    const closeLightboxBtn = document.getElementById("closeLightboxBtn");
    const closeLightboxBackdrop = document.getElementById("closeLightboxBackdrop");
    const downloadLightboxBtn = document.getElementById("downloadLightboxImgBtn");

    if (fullscreenBtn && lightboxModal && lightboxImg) {
      fullscreenBtn.addEventListener("click", () => {
        lightboxImg.src = currentInfographicUrl;
        if (lightboxTitle) lightboxTitle.textContent = currentResearchData?.topic || "Conceptual Research Infographic";
        if (lightboxStyle) lightboxStyle.textContent = activeInfographicStyle;
        lightboxModal.style.display = "flex";
      });
    }

    const closeLightbox = () => {
      if (lightboxModal) lightboxModal.style.display = "none";
    };

    if (closeLightboxBtn) closeLightboxBtn.addEventListener("click", closeLightbox);
    if (closeLightboxBackdrop) closeLightboxBackdrop.addEventListener("click", closeLightbox);

    if (downloadLightboxBtn) {
      downloadLightboxBtn.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = currentInfographicUrl;
        a.download = `Conceptual_Infographic_${(currentResearchData?.topic || "Research").slice(0, 25).replace(/[^a-zA-Z0-9]/g, "_")}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    }

    if (toggleBtn && canvasWrap) {
      let isCollapsed = false;
      toggleBtn.addEventListener("click", () => {
        isCollapsed = !isCollapsed;
        canvasWrap.style.display = isCollapsed ? "none" : "block";
        if (toggleIcon) toggleIcon.textContent = isCollapsed ? "▼" : "▲";
      });
    }
  }

  // -------------------------------------------------------------------------
  // 8. Recharts Dynamic Line Chart Integration
  // -------------------------------------------------------------------------
  async function renderRechartsSynthesisWidget(data) {
    const container = document.getElementById("rechartsSynthesisContainer");
    if (!container) return;

    try {
      const res = await fetch("/api/synthesis/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: data.topic,
          report: data.report,
        }),
      });

      if (!res.ok) throw new Error("Could not parse synthesis dynamics.");

      const analysisPayload = await res.json();

      if (typeof window.renderResearchSynthesisChart === "function") {
        window.renderResearchSynthesisChart("rechartsSynthesisContainer", analysisPayload);
      } else {
        console.warn("window.renderResearchSynthesisChart not yet initialized, retrying...");
        setTimeout(() => {
          if (typeof window.renderResearchSynthesisChart === "function") {
            window.renderResearchSynthesisChart("rechartsSynthesisContainer", analysisPayload);
          }
        }, 500);
      }
    } catch (err) {
      console.warn("Recharts synthesis analysis fallback:", err);
      const fallbackPayload = {
        topic: data.topic || "Research Topic",
        data: [
          { section: "Executive Summary", shortSection: "Summary", sentiment: 78, confidence: 88, Technology: 4, Market: 6, Infrastructure: 3 },
          { section: "Key Findings", shortSection: "Findings", sentiment: 82, confidence: 92, Technology: 8, Market: 7, Infrastructure: 5 },
          { section: "Quantitative Metrics", shortSection: "Metrics", sentiment: 85, confidence: 95, Technology: 5, Market: 9, Infrastructure: 6 },
          { section: "Strategic Trends", shortSection: "Trends", sentiment: 80, confidence: 90, Technology: 7, Market: 8, Infrastructure: 4 },
          { section: "Opportunities", shortSection: "Opportunities", sentiment: 90, confidence: 94, Technology: 9, Market: 11, Infrastructure: 8 },
          { section: "Challenges & Risks", shortSection: "Risks", sentiment: 38, confidence: 89, Technology: 3, Market: 4, Infrastructure: 5 },
          { section: "Strategic Outlook", shortSection: "Outlook", sentiment: 86, confidence: 96, Technology: 8, Market: 10, Infrastructure: 7 },
        ],
        keywords: [
          { word: "Technology", color: "#38bdf8", totalCount: 44 },
          { word: "Market", color: "#34d399", totalCount: 55 },
          { word: "Infrastructure", color: "#fbbf24", totalCount: 38 },
        ],
        summary: {
          avgSentiment: 77,
          sentimentTone: "Strongly Bullish",
          topKeyword: "Market",
          totalKeywordHits: 55,
          peakSection: "Opportunities",
        },
      };

      if (typeof window.renderResearchSynthesisChart === "function") {
        window.renderResearchSynthesisChart("rechartsSynthesisContainer", fallbackPayload);
      }
    }
  }

  // Initialize Infographic and Chart listeners
  setupInfographicControls();

  // Handle New Search button to reset results and clean current SQLite progress
  if (newSearchBtn) {
    newSearchBtn.addEventListener("click", () => {
      resultsSection.style.display = "none";
      topicInput.value = "";
      topicInput.focus();
      hideError();
      currentResearchData = null;
      currentProgressState = {
        topic: "",
        stage: 1,
        stage_message: "",
        report: "",
        sources: [],
        department_code: "",
        department_name: "",
        trained_epoch: 1,
        status: "idle",
      };
      fetch("/api/progress", { method: "DELETE" }).catch(() => {});
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
});

