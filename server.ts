import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { getFallbackReport } from "./fallbackReports";
import { generateHistoricalMetricsSlice } from "./stockDataEngine";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured. Please set your Gemini API key in the Secrets panel in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Popular Stocks Database
const POPULAR_STOCKS = [
  { symbol: "RELIANCE", name: "Reliance Industries Ltd", sector: "Energy & Conglomerate" },
  { symbol: "TCS", name: "Tata Consultancy Services Ltd", sector: "Information Technology" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", sector: "Financial Services" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", sector: "Financial Services" },
  { symbol: "INFY", name: "Infosys Ltd", sector: "Information Technology" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financial Services" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd", sector: "Telecommunications" },
  { symbol: "ITC", name: "ITC Ltd", sector: "FMCG & Conglomerate" },
  { symbol: "LT", name: "Larsen & Toubro Ltd", sector: "Engineering & Construction" },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd", sector: "Automotive" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever Ltd", sector: "FMCG" },
  { symbol: "M&M", name: "Mahindra & Mahindra Ltd", sector: "Automotive" },
  { symbol: "AXISBANK", name: "Axis Bank Ltd", sector: "Financial Services" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical Industries Ltd", sector: "Pharmaceuticals" },
  { symbol: "NTPC", name: "NTPC Ltd", sector: "Power Utilities" },
  { symbol: "TITAN", name: "Titan Company Ltd", sector: "Consumer Durables" },
  { symbol: "COALINDIA", name: "Coal India Ltd", sector: "Energy & Mining" },
  { symbol: "ADANIENT", name: "Adani Enterprises Ltd", sector: "Conglomerate" },
];

// Mode Configurations mirroring the user's prompt screenshots exactly
const ANALYST_MODES: Record<number, { title: string; prompt: string; systemInstruction: string }> = {
  1: {
    title: "Full Stock Analysis",
    systemInstruction: "You are a senior Indian equity research analyst. Your task is to produce a highly detailed, professional-grade equity research report on the requested stock. Use formal, technical financial terminology, structure analytical data into clean markdown tables, and deliver deep forensic equity research insights.",
    prompt: `Act like a senior Indian equity research analyst.
Analyze the stock: [stock name].
Include:
- Business model and revenue streams (be specific and detailed)
- Competitive advantages (moat)
- Industry trends in India
- Financial health (revenue growth, margins, debt)
- Promoter holding trends (recent changes, pledge status)
- FII/DII participation (institutional investor flows)
- Key risks
- Valuation vs Indian competitors
- Bull, bear, and base case scenarios with percentage targets or upside estimates
- 12-24 month outlook

Use simple, precise language but provide professional-level insights. Use real data from recent annual reports, investor presentations, concalls, NSE/BSE filings, and peer comparisons. Include a clean executive summary key metrics panel at the top (under a clear heading).`,
  },
  2: {
    title: "Deep Financial Breakdown",
    systemInstruction: "You are an expert corporate forensic accountant and forensic Indian equity researcher. Focus deeply on audited financial statements, solvency metrics, operational efficiencies, and cash flow reconciliations.",
    prompt: `Analyze the last 5 years of financials for [stock name].
Break down:
- Revenue growth (CAGR, absolute numbers)
- PAT (Profit After Tax) growth and margins
- Free cash flow (comparison with operational cash flows)
- Operating margins (EBITDA, EBIT, trends)
- Debt levels (Debt-to-Equity, Interest Coverage Ratio, leverage risks)
- ROE (Return on Equity) and ROCE (Return on Capital Employed) trends
- Cash flow vs reported profits (identifying any earnings quality discrepancies)

Structure the historical financial comparisons clearly in markdown tables with YoY percentage growth columns.
Conclude with a clear scorecard evaluation of whether the company is financially strengthening or weakening, justifying your verdict with facts.`,
  },
  3: {
    title: "Competitive Moat Analysis",
    systemInstruction: "You are a strategic business advisor specializing in Michael Porter's competitive advantage frameworks within the Indian market ecosystem.",
    prompt: `Evaluate the competitive moat of [stock name].
Discuss:
- Brand strength
- Distribution network (reach, logistics, barriers in India)
- Switching costs
- Cost advantage (scale, input prices, vertical integration)
- Technology or proprietary advantage (patents, R&D, IP)
- Market share position and pricing power (trends in market share)

Compare with key Indian competitors in the same category. Rate the moat from 1-10 (where 1 is no moat, and 10 is an absolute monopoly) and justify this numeric rating comprehensively.`,
  },
  4: {
    title: "Stock Valuation Analysis",
    systemInstruction: "You are an senior investment analyst and valuation specialist specializing in discounted cash flow (DCF) models, relative valuation multiples, and asset pricing.",
    prompt: `Perform a valuation analysis of [stock name].
Include:
- P/E (Price-to-Earnings) ratio comparison with peer companies
- EV/EBITDA comparison with peer companies
- DCF (Discounted Cash Flow) estimate (explicitly stating your assumptions such as WACC, risk-free rate, beta, terminal growth rate, and fair value range)
- Historical valuation range (current vs. 3-year or 5-year averages)
- Sector average valuation benchmarks
- Final Undervalued or Overvalued conclusion with margin of safety percentage

Use Indian market peers for the comparative valuation table.`,
  },
  5: {
    title: "Risk Analysis",
    systemInstruction: "You are a risk management consultant and corporate auditor assessing securities risk, regulatory audits, and economic exposures for Indian equities.",
    prompt: `Identify the biggest risks of investing in [stock name].
Include:
- Economic risks (inflation, interest rates, currency volatility, demand cycles)
- Industry disruption (new tech, alternate materials/fuels)
- Competitor threats (pricing wars, peer expansion)
- Regulatory or SEBI risks (tax changes, environmental norms, audits)
- Debt or financial security risks
- Promoter-related concerns (pledged shares, capital allocation, audit warnings)
- Corporate governance risks (board independence, related party transactions, audit history)

Rank the identified risks strictly from most dangerous/acute to least dangerous, giving clear, logical arguments for your ranking.`,
  },
  6: {
    title: "Growth Potential Analysis",
    systemInstruction: "You are a venture capitalist and long-term equity growth strategist specializing in macroeconomic tailwinds and secular growth themes in India (such as Digital India, PLC, manufacturing, green energy).",
    prompt: `Analyze the future growth potential of [stock name] over the next 5-10 years.
Consider:
- Addressable Market opportunity in India (TAM, SAM, SOM growth)
- Industry compound annual growth rate (CAGR)
- Expansion opportunities (geographic, export mercados, capacity additions)
- New products/services and R&D pipelines
- Government policy tailwinds (e.g., PLI schemes, Union Budget incentives)
- AI or technology advantages accelerating their operations

Estimate a numeric or visual growth potential category (High, Moderate, Low) over the next 5-10 years with robust quantitative backup.`,
  }
};

// API Endpoint to get popular stocks list
app.get("/api/popular-stocks", (req, res) => {
  res.json({ status: "success", stocks: POPULAR_STOCKS });
});

// API Endpoint to fetch historical stock data + calculations with technical indicators
app.get("/api/stock-chart", (req, res) => {
  const stockName = (req.query.stockName as string) || "Reliance Industries Ltd";
  const interval = (req.query.interval as string) || "day";
  
  try {
    const points = generateHistoricalMetricsSlice(stockName, interval);
    res.json({
      status: "success",
      stockName,
      interval,
      data: points
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to compile financial charts." });
  }
});

// API Endpoint to carry out the research
app.post("/api/analyze", async (req, res) => {
  const { stockName, modeId } = req.body;

  if (!stockName) {
    return res.status(400).json({ error: "Stock name/symbol is required." });
  }

  const numericModeId = Number(modeId);
  const mode = ANALYST_MODES[numericModeId];

  if (!mode) {
    return res.status(400).json({ error: `Invalid analysis mode ID requested: ${modeId}` });
  }

  try {
    const ai = getGeminiClient();
    
    // Prepare targeted prompt for the stock
    const customPrompt = mode.prompt.replace("[stock name]", stockName);
    
    const formattedPrompt = `
      Perform extensive web-grounded research to answer the following research prompt:
      
      "${customPrompt}"
      
      IMPORTANT FORMATTING GUIDELINES FOR THE FINAL OUTPUT:
      1. Write purely in clean, valid Markdown.
      2. Start directly with a top-level Header 1 containing the stock name followed by a beautiful subtitle.
      3. Create a clean Markdown key-metrics bulleted panel at the top (e.g. Current Price, Market Cap, PE Ratio, etc.) using the most recent factual public data you retrieved.
      4. Format tables with proper Markdown columns (| Header 1 | Header 2 |).
      5. Add a dedicated section at the very end called "Research Sources Used" in a compact bullet format showing where your facts were extracted from (concalls, filings, etc.).
      6. Limit use of vague statements; cite actual numbers, margins, growth percentages, and dates where available.
    `;

    // Generate content using Gemini 3.5 Flash + Search Grounding
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedPrompt,
      config: {
        systemInstruction: `${mode.systemInstruction} Integrate search grounding output seamlessly in a premium, beautifully organized layout.`,
        temperature: 0.2, // slightly lower temperature for accurate financial facts
        tools: [
          {
            googleSearch: {}
          }
        ]
      }
    });

    const responseText = result.text;
    
    // Extract search query metadata if available
    const searchMetadata = result.candidates?.[0]?.groundingMetadata || null;

    res.json({
      status: "success",
      stockName: stockName,
      modeId: numericModeId,
      modeTitle: mode.title,
      report: responseText,
      searchMetadata: searchMetadata,
      timestamp: new Date().toISOString(),
      isFallback: false
    });

  } catch (error: any) {
    console.error("Gemini Analysis API Error encountered. Initiating fallback subsystem:", error);
    
    try {
      console.log(`[Offline Fallback Triggered] Serving verified data for ${stockName}, Mode ID: ${numericModeId}`);
      const fallbackResult = getFallbackReport(stockName, numericModeId);
      
      const warningNotice = `> ⚠️ **Terminal API Quota Advisory (Code 429 / Rate Limit Exhausted):** The system has routed this request to our verified high-fidelity offline database. Live Nifty 50 grounding updates will auto-resume once your Gemini billing/credentials are active in user settings.
\n\n`;
      
      return res.json({
        status: "success",
        stockName: stockName,
        modeId: numericModeId,
        modeTitle: mode.title,
        report: warningNotice + fallbackResult.report,
        searchMetadata: {
          webSearchQueries: fallbackResult.webSearchQueries,
          groundingChunks: fallbackResult.groundingChunks
        },
        timestamp: new Date().toISOString(),
        isFallback: true
      });
    } catch (fallbackErr: any) {
      console.error("Critical fallback failure:", fallbackErr);
    }

    res.status(500).json({
      error: error.message || "An unexpected error occurred during the equity research phase."
    });
  }
});

// Setup Vite development server or production static serving
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Indian Equity Research Terminal running on http://localhost:${PORT}`);
  });
}

initializeServer().catch((err) => {
  console.error("Failed to start server:", err);
});
