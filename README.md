# ✦ ResearchAI — Personal Research Assistant

An autonomous, multi-agent AI research web application built with **Python**, **LangChain**, **Tavily Web Search API**, **FastAPI**, and **ReportLab**.

The application accepts any research topic (e.g., *"Future of EV in India"* or *"Cybersecurity Trends 2026"*), autonomously discovers authoritative sources across the web, extracts verified factual claims, synthesizes insights across multiple categories, and drafts an adaptive, publication-quality research dossier complete with inline citations (`[1]`, `[2]`), source references, and instant PDF / Markdown downloads.

---

## Architecture Overview

```text
User Enters Topic
       ↓
[Agent 1: Researcher Agent] ─── Formulates targeted search query
       ↓
[Tavily Web Search API]     ─── Retrieves ~5 diverse, authoritative sources
       ↓
[Agent 2: Summarizer Agent] ─── Synthesizes facts, stats, trends & flags opinions
       ↓
[Agent 3: Report Writer]    ─── Drafts adaptive markdown report with [1], [2] citations
       ↓
FastAPI Backend (SSE & JSON)─── Real-time multi-stage stepper & structured payloads
       ↓
Modern AI SaaS Frontend     ─── Marked.js report rendering + Interactive source cards
       ↓
Export Engine               ─── Formatted ReportLab PDF & Markdown file download
```

---

## Key Features

1. **Three-Agent LangChain Pipeline**:
   - **Researcher Agent**: Analyzes topic, queries Tavily, filters out duplicates, and extracts structured metadata (title, URL, domain, content).
   - **Summarizer Agent**: Organizes findings into Executive Summary, Key Findings, Statistics, Trends, Opportunities, Risks/Challenges, and Future Outlook while enforcing strict anti-hallucination rules.
   - **Report Writer Agent**: Crafts an adaptive, domain-tailored report structure with numbered inline citations (`[1]`) traceable to verified sources.

2. **Tavily Search Integration**:
   - High-depth search targeting authoritative news, government portals, industry analyses, and reputable research papers.
   - Source diversity filtering to avoid redundant domains.

3. **Modern AI SaaS Interface**:
   - **Theme Engine**: Seamless toggle between Dark Mode (obsidian & neon violet/indigo accents) and Light Mode.
   - **Suggestion Chips**: Quick one-click research topics for instant exploration.
   - **Live Progress Stepper**: Real-time multi-stage visual feedback (*Understanding topic* → *Searching web* → *Analyzing sources* → *Summarizing* → *Writing report*).
   - **Interactive Citations**: Clicking `[1]`, `[2]` automatically scrolls to and highlights the corresponding source card.

4. **Multi-Format Export**:
   - **PDF Export**: Built with ReportLab, featuring headers, footers with dynamic "Page X of Y", styled typography, and clickable reference links.
   - **Markdown Export**: Clean GFM-compliant markdown download for Obsidian, Notion, or GitHub.

5. **Anti-Hallucination & Grounding**:
   - Zero invented URLs, fabricated statistics, or ghost quotations. Every claim references retrieved sources.

6. **No Database Requirement**:
   - Runs cleanly and self-contained in-memory without MySQL, PostgreSQL, MongoDB, or Redis.

---

## Three Logical Agents in Detail

| Agent | Module | Role & Responsibilities |
| :--- | :--- | :--- |
| **Researcher Agent** | `app/agents/researcher.py` | Formulates search queries via LLM, queries Tavily API, curates ~5 high-quality sources, filters duplicate URLs/domains, extracts snippets. |
| **Summarizer Agent** | `app/agents/summarizer.py` | Distills raw source content into categorized facts, metrics, and trends. Strictly separates verified facts from future projections. |
| **Report Writer Agent** | `app/agents/report_writer.py` | Adapts report section structure to the topic domain, embeds inline citations `[1]`, `[2]`, and appends formatted References. |

---

## Project Structure

```text
team-project/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI application & SSE endpoints
│   ├── config.py                # Pydantic Settings & environment variables
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── researcher.py        # Agent 1: Search & source extraction
│   │   ├── summarizer.py        # Agent 2: Fact synthesis & categorization
│   │   └── report_writer.py     # Agent 3: Adaptive report & citation authoring
│   ├── services/
│   │   ├── __init__.py
│   │   ├── tavily_service.py    # Tavily Web Search API client
│   │   ├── llm_service.py       # LangChain ChatModel factory
│   │   └── pdf_service.py       # ReportLab PDF styling & layout engine
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py           # Pydantic models (Requests, Responses, Sources)
│   └── utils/
│       ├── __init__.py
│       └── helpers.py           # Domain extractors, text formatters, link builders
├── templates/
│   └── index.html               # Jinja2 SaaS dashboard template
├── static/
│   ├── css/
│   │   └── style.css            # Responsive styles, dark/light themes, animations
│   └── js/
│       └── app.js               # Client controller (SSE progress, marked.js, exports)
├── reports/                     # Storage for generated outputs
├── tests/
│   ├── __init__.py
│   ├── test_agents.py           # Unit tests for agents with mocks
│   ├── test_api.py              # API endpoint & validation tests
│   └── test_pdf.py              # ReportLab PDF validation tests
├── .env.example                 # Environment configuration template
├── .gitignore                   # Ignores .env, cache, and virtualenv
├── requirements.txt             # Python dependencies
├── README.md                    # Comprehensive documentation
└── run.py                       # Single-command application launcher
```

---

## Installation & Setup

### 1. Clone or Open Workspace
Ensure you are in the project folder:
```bash
cd team-project
```

### 2. Create and Activate Virtual Environment
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create your local `.env` file from `.env.example`:
```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

Edit `.env` and fill in your API keys:
```ini
# Tavily Search API Key (Free registration at https://tavily.com)
TAVILY_API_KEY=tvly-xxxxxxxxxxxxxxxxxxxx

# OpenAI API Key (https://platform.openai.com)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxx

# LLM Provider & Model Configuration
LLM_PROVIDER=openai
MODEL_NAME=gpt-4o-mini
TEMPERATURE=0.2

# Server Configuration
HOST=127.0.0.1
PORT=8000
DEBUG=False
```

> **Note**: If you want to use a different OpenAI model, simply change `MODEL_NAME` (e.g., `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`).

---

## Running the Application

### Option A: Using the Launcher Script (Recommended)
```bash
python run.py
```

### Option B: Using Uvicorn Directly
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### Open in Browser
Visit: **`http://127.0.0.1:8000`**

---

## Running Automated Tests

The test suite includes complete unit and integration tests with external API mocking:

```bash
pytest tests -v
```

This verifies:
- Empty, short (< 3 chars), and excessively long (> 300 chars) topic validation
- Researcher Agent query formulation and source deduplication
- Summarizer Agent structured output synthesis
- Report Writer citation and reference linking
- Full `/research` API request/response flow
- ReportLab PDF document compilation and valid `%PDF-` header
- Markdown file export

---

## Tavily and LangChain Integration Details

1. **Tavily Web Search**:
   - Wrapped inside `app/services/tavily_service.py` via `TavilyClient`.
   - Executes search with `search_depth="advanced"`, extracts structured domains, titles, and snippets, and applies diversity filtering so no single domain dominates the research pool.

2. **LangChain Prompts & Chains**:
   - `ResearcherAgent` uses `ChatPromptTemplate` to produce concise keyword-rich search queries for Tavily.
   - `SummarizerAgent` uses structured schema prompts and fallback JSON extraction to enforce factual, category-by-category output.
   - `ReportWriterAgent` generates adaptive long-form Markdown where every claim references source citations `[1]`, `[2]`.

---

## Troubleshooting & FAQ

- **Missing API Keys Notice**: If either `TAVILY_API_KEY` or `OPENAI_API_KEY` is not present in `.env`, the dashboard displays a clear configuration banner explaining how to configure them.
- **Port Conflict**: If port 8000 is occupied, adjust `PORT=8080` in `.env` or run `uvicorn app.main:app --port 8080`.
