import { NextResponse } from "next/server";

/**
 * POST body: { prompt: string, model?: "fast"|"kirah"|"thalia", lang?: "auto"|"en"... }
 *
 * Steps:
 * 1) LanguageTool correction (optional)
 * 2) SerpAPI search (organic results)
 * 3) Fetch each result's HTML and extract small snippet (first paragraphs or meta description)
 * 4) Build context and call OpenAI ChatCompletion with chosen model mapping
 */

async function correctWithLanguageTool(text) {
  const endpoint = process.env.LANGUAGETOOL_ENDPOINT || "https://api.languagetool.org/v2/check";
  try {
    const params = new URLSearchParams();
    params.append("text", text);
    params.append("language", "auto");
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    if (!res.ok) return text;
    const data = await res.json();
    if (!data.matches || data.matches.length === 0) return text;
    let corrected = text;
    const matches = data.matches.sort((a, b) => b.offset - a.offset);
    for (const m of matches) {
      if (m.replacements && m.replacements.length > 0) {
        const rep = m.replacements[0].value;
        corrected = corrected.slice(0, m.offset) + rep + corrected.slice(m.offset + m.length);
      }
    }
    return corrected;
  } catch {
    return text;
  }
}

async function searchWithSerpApi(query, apiKey, num = 4) {
  if (!apiKey) return [];
  const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=${num}&api_key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.organic_results ? data.organic_results.slice(0, num) : [];
}

async function fetchSnippetFromUrl(url) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Deepseek-like-bot/1.0" } });
    if (!res.ok) return "";
    const html = await res.text();
    // Try meta description
    const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
    if (metaMatch && metaMatch[1]) return metaMatch[1].slice(0, 800);

    // Fallback: first paragraphs
    const pMatches = [...html.matchAll(/<p[^>]*>(.*?)<\/p>/gi)].map(m => m[1].replace(/<[^>]+>/g, ""));
    if (pMatches.length) return pMatches.slice(0, 3).join("\n\n").slice(0, 1200);
    // Last fallback: text from title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1] : "";
  } catch {
    return "";
  }
}

async function callOpenAIChat(modelId, messages, openaiKey) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      max_tokens: 800,
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req) {
  try {
    const body = await req.json();
    const prompt = String(body.prompt || "").trim();
    const modelChoice = String(body.model || "fast");
    if (!prompt) return NextResponse.json({ error: "Missing prompt" }, { status: 400 });

    // 1) correction
    const corrected = await correctWithLanguageTool(prompt);

    // 2) search
    const serpKey = process.env.SERPAPI_API_KEY;
    let searchResults = [];
    if (serpKey) {
      searchResults = await searchWithSerpApi(corrected, serpKey, 4);
    }

    // 3) fetch snippets for each result (parallel)
    const sources = await Promise.all(
      searchResults.map(async (r) => {
        const link = r.link || r.source || r.url || "";
        const snippet = r.snippet || (await fetchSnippetFromUrl(link));
        return {
          title: r.title || link,
          link,
          snippet: snippet || r.snippet || ""
        };
      })
    );

    // 4) build context
    const searchContext = sources
      .map((s, i) => `Source ${i + 1}: ${s.title}\n${s.link}\n${s.snippet}`)
      .join("\n\n");

    const systemPrompt = `You are an assistant that answers using the provided search results. Be concise, accurate, and cite sources using the "Source N" labels provided.`;

    const userPrompt = `Original: ${prompt}\n\nCorrected: ${corrected}\n\nSearch Results:\n${searchContext}\n\nAnswer the question and cite sources inline (e.g., [Source 1]). If something is uncertain, say so.`;

    // 5) choose model id
    const modelMap = {
      fast: process.env.OPENAI_MODEL_FAST || "gpt-3.5-turbo",
      kirah: process.env.OPENAI_MODEL_KIRAH || "gpt-3.5-turbo",
      thalia: process.env.OPENAI_MODEL_THALIA || "gpt-4"
    };
    const modelId = modelMap[modelChoice] || modelMap.fast;
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    const answer = await callOpenAIChat(modelId, messages, openaiKey);

    return NextResponse.json({
      response: answer,
      correctedPrompt: corrected,
      sources
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
