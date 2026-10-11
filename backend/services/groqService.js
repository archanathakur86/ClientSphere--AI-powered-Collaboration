import Groq from "groq-sdk";
import dotenv from "dotenv";
import { pipeline } from "@xenova/transformers";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const MODEL_FAST = process.env.GROQ_MODEL_FAST || "llama-3.1-8b-instant";

let embeddingPipeline = null;
let embeddingLoadPromise = null;

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const normalizeVector = (vector = []) => {
  const values = vector.map((value) => Number(value) || 0);
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => Number((value / magnitude).toFixed(6)));
};

const cosineSimilarity = (left = [], right = []) => {
  const length = Math.min(left.length, right.length);
  if (!length) return 0;
  let dot = 0;
  let leftSq = 0;
  let rightSq = 0;
  for (let index = 0; index < length; index += 1) {
    const l = Number(left[index]) || 0;
    const r = Number(right[index]) || 0;
    dot += l * r;
    leftSq += l * l;
    rightSq += r * r;
  }
  const denom = Math.sqrt(leftSq) * Math.sqrt(rightSq);
  return denom ? dot / denom : 0;
};

const getEmbeddingPipeline = async () => {
  if (embeddingPipeline) return embeddingPipeline;
  if (!embeddingLoadPromise) {
    embeddingLoadPromise = pipeline("feature-extraction", process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2").then((loaded) => {
      embeddingPipeline = loaded;
      return loaded;
    });
  }
  return embeddingLoadPromise;
};

const fallbackEmbedding = (text = "") => {
  const vector = new Array(384).fill(0);
  const tokens = String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  tokens.forEach((token, index) => {
    let hash = 0;
    for (let i = 0; i < token.length; i += 1) hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    vector[hash % vector.length] += 1 + (index % 3) * 0.1;
  });
  return normalizeVector(vector);
};

export const generateEmbedding = async (text = "") => {
  const cleanText = String(text || "").trim();
  if (!cleanText) return [];
  try {
    const model = await getEmbeddingPipeline();
    const output = await model(cleanText, { pooling: "mean", normalize: true });
    const data = output?.data || output?.tolist?.()?.[0] || [];
    const vector = Array.isArray(data) ? data : Array.from(data || []);
    return normalizeVector(vector);
  } catch (error) {
    console.warn("Embedding generation failed; falling back to local hash embedding:", error.message);
    return fallbackEmbedding(cleanText);
  }
};

/**
 * Generic chat completion wrapper with error handling + timeout safety.
 * @param {Array} messages - [{role, content}]
 * @param {Object} opts - { model, temperature, maxTokens, jsonMode }
 */
export const chatCompletion = async (messages, opts = {}) => {
  const { model = MODEL, temperature = 0.4, maxTokens = 1024, jsonMode = false } = opts;

  try {
    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: jsonMode ? { type: "json_object" } : undefined,
    });
    return response.choices[0]?.message?.content?.trim() || "";
  } catch (err) {
    console.error("Groq API error:", err.message);
    throw new Error("AI service is currently unavailable. Please try again shortly.");
  }
};

/** Fast, low-latency completion - used for voice assistant to keep STS snappy */
export const fastCompletion = async (messages, opts = {}) => {
  return chatCompletion(messages, { ...opts, model: MODEL_FAST });
};

// ---------- Feature-specific prompt builders ----------

export const explainText = async (content, kind = "note") => {
  const messages = [
    {
      role: "system",
      content:
        "You help a freelancer understand their own note quickly. Do NOT restate or summarize the note's structure (do not say things like 'the note has a title, a checklist, a quote'). Instead, give: (1) one sentence with the core point, (2) what it means in practice, including what each checklist item or quote implies, (3) how any code or markup behaves in plain words, (4) anything unclear or missing that the author should clarify, and (5) a suggested next step only if the note implies one. Keep it under 120 words. Use plain language, no headings, and at most 3 short bullets. If the note is very short, answer in 1-2 sentences.",
    },
    {
      role: "user",
      content: `Here is a ${kind}. Tell me what it means and what to do with it:\n\n${content}`,
    },
  ];
  return chatCompletion(messages, { maxTokens: 300 });
};

export const suggestImprovements = async (content) => {
  const messages = [
    {
      role: "system",
      content:
        "You are an expert technical editor. Suggest concrete, actionable improvements to the given markdown note. Return a short bullet list only, no preamble.",
    },
    { role: "user", content },
  ];
  return chatCompletion(messages, { maxTokens: 500 });
};

export const explainCode = async (code, filename = "") => {
  const messages = [
    {
      role: "system",
      content:
        "You are a senior software engineer. Explain what the given code does, its structure, and flag any obvious issues. Be concise and use bullet points where helpful.",
    },
    { role: "user", content: `File: ${filename}\n\n${code}` },
  ];
  return chatCompletion(messages, { maxTokens: 700 });
};

const SEVERITIES = ["low", "medium", "high"];

const normalizeReview = (parsed) => {
  const risks = (Array.isArray(parsed.risks) ? parsed.risks : [])
    .slice(0, 6)
    .map((r) =>
      typeof r === "string"
        ? { severity: "medium", description: r.trim() }
        : {
            severity: SEVERITIES.includes(r?.severity) ? r.severity : "medium",
            description: String(r?.description || "").trim(),
          }
    )
    .filter((r) => r.description);

  const suggestions = (Array.isArray(parsed.suggestions) ? parsed.suggestions : [])
    .slice(0, 6)
    .map((x) => String(x).trim())
    .filter(Boolean);

  // Trust the model's overall level only if it's valid; otherwise derive it from the worst risk.
  const worst = SEVERITIES.slice().reverse().find((sev) => risks.some((r) => r.severity === sev)) || "low";
  const riskLevel = SEVERITIES.includes(parsed.riskLevel) ? parsed.riskLevel : worst;

  return { summary: String(parsed.summary || "").trim(), riskLevel, risks, suggestions };
};

/**
 * PR-style review for teams that have no human reviewer.
 * - With a previous version: pass `diffText` (unified diff of old -> new).
 * - First version: pass `code` (the whole file).
 * Returns { summary, riskLevel, risks: [{severity, description}], suggestions: [string] }
 */
export const reviewCodeDiff = async ({ filename = "", diffText = "", code = "", isFirstVersion = false }) => {
  const system =
    "You are a senior engineer doing a pull-request review for a small team or student project that has no human reviewer, " +
    "so bugs would otherwise ship unnoticed. Be specific, practical and honest. " +
    'Respond ONLY as JSON: {"summary": "2-4 plain-English sentences on what changed and why it matters", ' +
    '"riskLevel": "low|medium|high", ' +
    '"risks": [{"severity": "low|medium|high", "description": "a concrete bug, regression, security or edge-case problem, naming the function/variable involved"}], ' +
    '"suggestions": ["a concrete, actionable improvement"]}. ' +
    "Rules: only report problems you can point to in the code shown; do not invent code or files. " +
    "If you find no real risks return an empty risks array and riskLevel \"low\". Max 5 risks and 5 suggestions, most important first.";

  const user = isFirstVersion
    ? `File: ${filename}\nThis is the FIRST version of the file. Review the whole file.\n\n${code}`
    : `File: ${filename}\nBelow is a unified diff from the previous version to the new version. Lines starting with "-" were removed, lines starting with "+" were added, other lines are unchanged context.\n\n${diffText}`;

  const raw = await chatCompletion(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { maxTokens: 900, jsonMode: true, temperature: 0.2 }
  );

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The AI returned an unreadable review. Please try again.");
  }
  const review = normalizeReview(parsed);
  if (!review.summary) throw new Error("The AI returned an empty review. Please try again.");
  return review;
};

export const generateReadme = async (projectName, description, fileSummaries = [], noteSummaries = []) => {
  const messages = [
    {
      role: "system",
      content:
        "You are an expert technical writer. Generate a clean, professional README.md in Markdown for the given project, based on its description, files, and notes. Include sections: Overview, Features, Tech Stack (infer from file types if possible), and Getting Started (generic placeholders if unknown). Return ONLY markdown, no commentary.",
    },
    {
      role: "user",
      content: `Project name: ${projectName}\nDescription: ${description}\n\nFiles in project:\n${fileSummaries.join(
        "\n"
      )}\n\nKey notes:\n${noteSummaries.join("\n")}`,
    },
  ];
  return chatCompletion(messages, { maxTokens: 1200 });
};

export const generateTags = async (content) => {
  const messages = [
    {
      role: "system",
      content:
        'Return 3-6 short lowercase tags (single words or short phrases) that best categorize this note. Respond ONLY as JSON: {"tags": ["tag1", "tag2"]}',
    },
    { role: "user", content },
  ];
  const raw = await chatCompletion(messages, { maxTokens: 150, jsonMode: true, temperature: 0.2 });
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6) : [];
  } catch {
    return [];
  }
};

export const extractActionItems = async (noteContent) => {
  const messages = [
    {
      role: "system",
      content:
        'Extract concrete action items / tasks from this note. Respond ONLY as JSON: {"tasks": [{"title": "...", "assigneeGuess": "name or empty string", "priority": "low|medium|high"}]}. If no clear tasks exist, return {"tasks": []}.',
    },
    { role: "user", content: noteContent },
  ];
  const raw = await chatCompletion(messages, { maxTokens: 500, jsonMode: true, temperature: 0.2 });
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.tasks) ? parsed.tasks : [];
  } catch {
    return [];
  }
};

export const generateWeeklyReport = async (projectName, activityLogText, { from = "", to = "", taskSummary = "" } = {}) => {
  const messages = [
    {
      role: "system",
      content:
        "You are a project manager writing a short weekly progress report for stakeholders. " +
        "Write in Markdown using ONLY: '##' section headings, '###' sub-headings, bullet lists ('- ') and **bold**. " +
        "Never use tables, HTML tags (like <br>), code fences or horizontal rules. Do not add a title, a date line or a signature - the app already shows those. " +
        "Use exactly these sections, in this order:\n" +
        "## Summary - 2 or 3 sentences on overall momentum.\n" +
        "## Progress by contributor - one '###' per person, then bullets of what they did (mention dates like 2026-09-18 when useful).\n" +
        "## Tasks - only if task data is provided: how many are done / in progress / to do, what was completed, and any open high-priority items.\n" +
        "## Next steps - 1 to 3 bullets, only if they follow from the data.\n" +
        "Stick strictly to the data provided; never invent people, dates, files or numbers. Keep it under 250 words.",
    },
    {
      role: "user",
      content:
        `Project: ${projectName}\nReporting period: ${from} to ${to}\n\nActivity log:\n${activityLogText}` +
        (taskSummary ? `\n\nTask board:\n${taskSummary}` : ""),
    },
  ];
  const report = await chatCompletion(messages, { maxTokens: 700 });
  // Safety net: models sometimes emit <br> despite instructions, and react-markdown would print it literally.
  return report.replace(/<br\s*\/?>/gi, "\n");
};

export const generatePlainLanguageWeeklyUpdate = async ({ projectName, milestoneSummary = "", taskSummary = "", activitySummary = "" } = {}) => {
  const messages = [
    {
      role: "system",
      content:
        "You write short client-friendly weekly updates in plain language. No jargon, no buzzwords, no markdown headings. Base the update only on the provided milestones, tasks, and activity. Return 3 to 5 short sentences, then 1 to 3 bullet points for next steps.",
    },
    {
      role: "user",
      content: `Project: ${projectName}\n\nMilestones:\n${milestoneSummary || 'None'}\n\nTasks:\n${taskSummary || 'None'}\n\nActivity:\n${activitySummary || 'None'}`,
    },
  ];
  return chatCompletion(messages, { maxTokens: 300 });
};

export const detectScopeCreep = async ({ comment, milestoneDescriptions = [], taskTitles = [] } = {}) => {
  const messages = [
    {
      role: "system",
      content:
        'Decide whether a client request is in scope or out of scope relative to the milestone descriptions. Respond ONLY as JSON: {"verdict":"in scope|out of scope","reason":"one short plain-English reason","suggestedReply":"a polite reply the freelancer can send"}. Keep it concrete and specific. If uncertain, choose "in scope".',
    },
    {
      role: "user",
      content: `Client request:\n${comment}\n\nMilestones:\n${milestoneDescriptions.join("\n") || "None"}\n\nOpen tasks:\n${taskTitles.join("\n") || "None"}`,
    },
  ];
  const raw = await chatCompletion(messages, { maxTokens: 220, jsonMode: true, temperature: 0.1 });
  const parsed = safeJsonParse(raw, {});
  return {
    verdict: parsed.verdict === "out of scope" ? "out of scope" : "in scope",
    reason: String(parsed.reason || (parsed.verdict === "out of scope" ? "The request adds work beyond the current scope." : "The request fits the current scope.")).trim(),
    suggestedReply: String(
      parsed.suggestedReply ||
        (parsed.verdict === "out of scope"
          ? "Thanks — I can turn this into a change request and quote the extra work."
          : "Thanks — I can include this in the current milestone.")
    ).trim(),
  };
};

export const answerWithSources = async ({ question, sources = [], projectName = "" } = {}) => {
  const messages = [
    {
      role: "system",
      content:
        "Answer the user's question using only the provided sources. Keep it concise and practical. Respond ONLY as JSON: {\"answer\":\"...\",\"sources\":[{\"id\":\"...\",\"title\":\"...\",\"type\":\"note|file|comment\",\"reason\":\"why it matters\"}]}. If the sources do not support the answer, say that clearly and still cite the most relevant sources.",
    },
    {
      role: "user",
      content: `Project: ${projectName}\nQuestion: ${question}\n\nSources:\n${sources
        .map((source) => `[${source.id}] (${source.type}) ${source.title}: ${source.snippet}`)
        .join("\n")}`,
    },
  ];
  const raw = await chatCompletion(messages, { maxTokens: 400, jsonMode: true, temperature: 0.2 });
  const parsed = safeJsonParse(raw, {});
  return {
    answer: String(parsed.answer || "I couldn't find enough evidence to answer that confidently.").trim(),
    sources: Array.isArray(parsed.sources)
      ? parsed.sources.slice(0, 5).map((source) => ({
          id: String(source.id || ""),
          title: String(source.title || "").trim(),
          type: String(source.type || "note").trim(),
          reason: String(source.reason || "").trim(),
        }))
      : [],
  };
};

export const generateProjectVoiceReply = async ({ userName, question, projectSummary = "", pendingSummary = "" } = {}) => {
  const messages = [
    {
      role: "system",
      content:
        "You are Sphere, a concise project-aware voice assistant for freelancers. Answer in a natural spoken style with short sentences. Use the project context only. If the user asks what's pending, summarize milestones, tasks, and any risks in plain language. Avoid markdown and avoid jargon.",
    },
    {
      role: "user",
      content: `User: ${userName}\nQuestion: ${question}\n\nProject context:\n${projectSummary}\n\nPending work:\n${pendingSummary}`,
    },
  ];
  return fastCompletion(messages, { maxTokens: 240, temperature: 0.5 });
};

export const generateHealthReason = async ({ stats = {}, status = "healthy" } = {}) => {
  const messages = [
    {
      role: "system",
      content:
        'Given project health stats, write one short plain-English sentence explaining the status. No bullets. No jargon. Under 12 words.',
    },
    { role: "user", content: JSON.stringify({ status, stats }) },
  ];
  const reason = await chatCompletion(messages, { maxTokens: 60 });
  return reason.replace(/[\n\r]+/g, " ").trim() || "Activity has slowed recently.";
};

export const vectorSimilarity = cosineSimilarity;

export const computeHealthInsight = async (stats) => {
  const messages = [
    {
      role: "system",
      content:
        'Given project activity stats (JSON), classify project health as one of "healthy", "slowing", "inactive". Give a very short reason, under 12 words, plain and specific (e.g. "3 updates this week, last one yesterday"). Respond ONLY as JSON: {"status": "healthy|slowing|inactive", "reason": "..."}',
    },
    { role: "user", content: JSON.stringify(stats) },
  ];
  const raw = await chatCompletion(messages, { maxTokens: 150, jsonMode: true, temperature: 0.2 });
  try {
    return JSON.parse(raw);
  } catch {
    return { status: "healthy", reason: "Unable to compute insight." };
  }
};

export const checkDuplicateNote = async (newContent, existingNotesSummaries) => {
  if (!existingNotesSummaries.length) return { isDuplicate: false };
  const messages = [
    {
      role: "system",
      content:
        'Given a new note and a list of existing notes (id + short summary), determine if the new note is a likely duplicate/highly similar to any existing one. Respond ONLY as JSON: {"isDuplicate": true|false, "similarNoteId": "id or empty", "reason": "short reason"}',
    },
    {
      role: "user",
      content: `NEW NOTE:\n${newContent}\n\nEXISTING NOTES:\n${existingNotesSummaries
        .map((n) => `[${n.id}] ${n.summary}`)
        .join("\n")}`,
    },
  ];
  const raw = await chatCompletion(messages, { maxTokens: 200, jsonMode: true, temperature: 0.1 });
  try {
    return JSON.parse(raw);
  } catch {
    return { isDuplicate: false };
  }
};

export const semanticSearchAnswer = async (query, candidates) => {
  // candidates: [{id, type, title, snippet}]
  const messages = [
    {
      role: "system",
      content:
        'You are a search relevance engine for a developer collaboration tool. Given a user query and candidate notes/files, return the most relevant items ranked by relevance. Respond ONLY as JSON: {"results": [{"id": "...", "reason": "short reason it matches"}]}. Only include genuinely relevant items, max 8.',
    },
    {
      role: "user",
      content: `Query: "${query}"\n\nCandidates:\n${candidates
        .map((c) => `[${c.id}] (${c.type}) ${c.title}: ${c.snippet}`)
        .join("\n")}`,
    },
  ];
  const raw = await chatCompletion(messages, { maxTokens: 500, jsonMode: true, temperature: 0.2 });
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.results) ? parsed.results : [];
  } catch {
    return [];
  }
};

// Turns a client's brief (email, call notes, a scope paragraph) into a draft of milestones.
// Returns raw JSON text; the controller validates it before anything is shown or saved.
export const draftProposalFromBrief = async ({ brief = "", projectName = "" } = {}) => {
  const messages = [
    {
      role: "system",
      content:
        'You help a freelancer turn a client brief into a delivery plan. Return ONLY a JSON object with this shape: {"scopeSummary": string (at most 2 sentences), "milestones": [{"title": string, "description": string (one sentence on what the client receives), "amount": number (USD), "dueInDays": integer}], "assumptions": [string]}. Create 3 to 6 milestones in delivery order. If the brief states a budget, make the amounts add up to it. If something important is missing, write it as an assumption instead of inventing details.',
    },
    { role: "user", content: `Project: ${projectName}\n\nClient brief:\n${brief}` },
  ];
  return chatCompletion(messages, { maxTokens: 900, temperature: 0.3, jsonMode: true });
};

export default groq;