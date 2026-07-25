# Deepseek-like AI Demo (Next.js)

Pwojè sa a se yon demo ki:
- Fè rechèch sou entènèt via SerpAPI
- Rale ti ekstrè tèks soti nan rezilta rechèch
- Korije òtograf / gramè ak LanguageTool (pou tès)
- Konstwi yon prompt ki enkòpore sous rechèch epi rele OpenAI (oswa endpoint modèl ou vle)
- UI (Next.js app router) ki montre repons + sous

1) Enstalasyon lokal
- npm install
- Kreye `.env.local` nan rasin pwojè a (egzanp anba)
- npm run dev
- Ale: http://localhost:3000

2) Vars anviwònman (mete nan Vercel env vars lè deploy)
- OPENAI_API_KEY=sk-...
- OPENAI_MODEL_FAST=gpt-3.5-turbo
- OPENAI_MODEL_KIRAH=gpt-3.5-turbo
- OPENAI_MODEL_THALIA=gpt-4
- SERPAPI_API_KEY=your_serpapi_key
- LANGUAGETOOL_ENDPOINT=https://api.languagetool.org/v2/check  (opsyonèl)

3) Deploy sou Vercel
- Push repo sou GitHub
- Import project sou Vercel (dashboard)
- Ajoute Environment Variables nan Vercel > Settings (eg. OPENAI_API_KEY, SERPAPI_API_KEY, OPENAI_MODEL_*)
- Deploy

Remak sou legal/etik:
- Respekte règleman itilizasyon pages web yo lè ou rale kontni; cite sous yo.
- SerpAPI ak LanguageTool gen limit/pricing.
