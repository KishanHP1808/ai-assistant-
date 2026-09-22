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

  // Initialize History from Database
  loadDatabaseHistory();

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

    const sseUrl = `/research/stream?topic=${encodeURIComponent(topic)}`;

    try {
      activeEventSource = new EventSource(sseUrl);

      activeEventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          if (payload.type === "stage") {
            setStepperStage(payload.stage, payload.message);
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
    try {
      const response = await fetch("/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
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

    // Calculate and display estimated reading time (e.g., '5 min read')
    updateReadingTime(data.report);

    // Render Markdown
    renderMarkdownReport(data.report);

    // Render Source Cards
    renderSourceCards(data.sources || []);

    // Reveal results view
    resultsSection.style.display = "block";
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });

    // Refresh database history list
    loadDatabaseHistory();
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
});

