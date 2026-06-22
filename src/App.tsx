/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { 
  Search, 
  Sparkles, 
  Clock, 
  Briefcase, 
  ShieldAlert, 
  DollarSign, 
  LineChart, 
  BookOpen, 
  TrendingUp, 
  AlertCircle, 
  Check, 
  Copy, 
  Printer, 
  ChevronRight,
  Building2,
  Lock,
  ArrowUpRight,
  TrendingDown,
  ChevronDown,
  Link,
  Unplug,
  LogIn,
  LogOut,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StockInteractiveChart from "./components/StockInteractiveChart";

interface Stock {
  symbol: string;
  name: string;
  sector: string;
}

interface AnalysisResponse {
  status: string;
  stockName: string;
  modeId: number;
  modeTitle: string;
  report: string;
  searchMetadata?: {
    groundingChunks?: Array<{
      web?: {
        uri: string;
        title: string;
      };
    }>;
    webSearchQueries?: string[];
  };
  timestamp: string;
}

const PROMPT_TEMPLATES: Record<number, { title: string; subtitle: string; bullets: string[]; footer: string; icon: any; color: string }> = {
  1: {
    title: "Prompt 1: Full Stock Analysis",
    subtitle: "Act like a senior Indian equity research analyst. Analyze the stock in depth.",
    bullets: [
      "Business model and revenue streams",
      "Competitive advantages (moat)",
      "Industry trends in India",
      "Financial health (revenue growth, margins, debt)",
      "Promoter holding trends",
      "FII/DII participation",
      "Key risks",
      "Valuation vs Indian competitors",
      "Bull, bear, and base case scenarios",
      "12-24 month outlook"
    ],
    footer: "Use simple language but provide professional-level insights. Use data from annual reports, investor presentations, filings, and peer comparison.",
    icon: BookOpen,
    color: "#EFF6FF" // light blue
  },
  2: {
    title: "Prompt 2: Deep Financial Breakdown",
    subtitle: "Analyze the last 5 years of financials. Breakdown the historical changes:",
    bullets: [
      "Revenue growth",
      "PAT growth",
      "Free cash flow",
      "Operating margins",
      "Debt levels",
      "ROE and ROCE",
      "Cash flow vs reported profits"
    ],
    footer: "Explain whether the company is financially strengthening or weakening.",
    icon: DollarSign,
    color: "#ECFDF5" // light emerald
  },
  3: {
    title: "Prompt 3: Competitive Moat Analysis",
    subtitle: "Evaluate the competitive moat within the Indian ecosystem. Discuss:",
    bullets: [
      "Brand strength",
      "Distribution network",
      "Switching costs",
      "Cost advantage",
      "Technology or proprietary advantage",
      "Market share position"
    ],
    footer: "Compare with Indian competitors and rate the moat from 1-10.",
    icon: Briefcase,
    color: "#F0F9FF" // light sky
  },
  4: {
    title: "Prompt 4: Stock Valuation Analysis",
    subtitle: "Perform a comprehensive valuation analysis compared to peers. Include:",
    bullets: [
      "P/E ratio comparison",
      "EV/EBITDA comparison",
      "DCF estimate",
      "Historical valuation range",
      "Sector average valuation",
      "Undervalued or overvalued conclusion"
    ],
    footer: "Use Indian market peers for comparison.",
    icon: LineChart,
    color: "#FDF2F8" // light pink
  },
  5: {
    title: "Prompt 5: Risk Analysis",
    subtitle: "Identify the biggest risks of investing. Categorize and evaluate:",
    bullets: [
      "Economic risks",
      "Industry disruption",
      "Competition",
      "Regulatory or SEBI risks",
      "Debt or financial risks",
      "Promoter-related concerns",
      "Corporate governance risks"
    ],
    footer: "Rank risks from most dangerous to least dangerous.",
    icon: ShieldAlert,
    color: "#FEF2F2" // light red
  },
  6: {
    title: "Prompt 6: Growth Potential Analysis",
    subtitle: "Analyze the long-term secular growth potential over the next decade. Consider:",
    bullets: [
      "Market opportunity in India",
      "Industry growth rate",
      "Expansion opportunities",
      "New products/services",
      "Government policy headwinds",
      "AI or technology advantages"
    ],
    footer: "Estimate growth potential over the next 5-10 years.",
    icon: TrendingUp,
    color: "#F5F3FF" // light purple
  }
};

function getFactualTableMetrics(stockName: string) {
  const norm = stockName.toLowerCase();
  
  // Deterministic values based on key Indian stocks
  let code = "RELIANCE";
  let sector = "Energy & Petrochemicals";
  let marketCap = "₹20,11,450 Cr";
  let curPrice = "₹2,940.50";
  let wHighLow = "₹3,024.90 / ₹2,220.00";
  let pe = "26.4x";
  let pb = "2.9x";
  let divYield = "0.34%";
  let roe = "13.25%";
  let promoter = "50.39% (No pledges)";
  let fiiDii = "22.42% FII / 16.55% DII";
  let debtToEquity = "0.38x";

  if (norm.includes("tcs") || norm.includes("consultancy")) {
    code = "TCS";
    sector = "Information Technology";
    marketCap = "₹14,20,150 Cr";
    curPrice = "₹3,850.20";
    wHighLow = "₹4,250.00 / ₹3,150.00";
    pe = "29.8x";
    pb = "13.2x";
    divYield = "1.25%";
    roe = "39.10%";
    promoter = "72.41% (No pledges)";
    fiiDii = "12.50% FII / 16.80% DII";
    debtToEquity = "0.02x";
  } else if (norm.includes("hdfc")) {
    code = "HDFCBANK";
    sector = "Banking & Financial Services";
    marketCap = "₹12,45,210 Cr";
    curPrice = "₹1,640.80";
    wHighLow = "₹1,795.00 / ₹1,360.00";
    pe = "19.5x";
    pb = "2.8x";
    divYield = "1.18%";
    roe = "16.40%";
    promoter = "0.00% (Institution owned)";
    fiiDii = "52.40% FII / 30.20% DII";
    debtToEquity = "N/A (Banking)";
  } else if (norm.includes("infosys") || norm.includes("infy")) {
    code = "INFY";
    sector = "Information Technology";
    marketCap = "₹6,12,450 Cr";
    curPrice = "₹1,478.40";
    wHighLow = "₹1,732.00 / ₹1,310.00";
    pe = "24.2x";
    pb = "6.5x";
    divYield = "2.30%";
    roe = "31.80%";
    promoter = "14.94% (No pledges)";
    fiiDii = "33.80% FII / 36.20% DII";
    debtToEquity = "0.05x";
  } else if (norm.includes("sbi") || norm.includes("state")) {
    code = "SBIN";
    sector = "Banking & Financial Services";
    marketCap = "₹7,41,200 Cr";
    curPrice = "₹830.15";
    wHighLow = "₹912.00 / ₹540.00";
    pe = "10.4x";
    pb = "1.7x";
    divYield = "1.65%";
    roe = "18.20%";
    promoter = "57.49% (Govt of India)";
    fiiDii = "11.20% FII / 24.80% DII";
    debtToEquity = "N/A (Banking)";
  } else if (norm.includes("itc")) {
    code = "ITC";
    sector = "FMCG, Cigarettes & Hotels";
    marketCap = "₹5,36,400 Cr";
    curPrice = "₹430.20";
    wHighLow = "₹499.70 / ₹399.00";
    pe = "25.8x";
    pb = "7.8x";
    divYield = "3.20%";
    roe = "29.20%";
    promoter = "0.00% (Diversified)";
    fiiDii = "43.20% FII / 42.10% DII";
    debtToEquity = "0.00x (Debt Free)";
  } else {
    // Dynamic values based on letters as random seeds
    const hash = Array.from(stockName).reduce((a, b) => a + b.charCodeAt(0), 0);
    const mCapBase = 25000 + (hash % 1800000);
    const priceBase = 100 + (hash % 4500);
    code = (stockName.substring(0, 4) + (hash % 9)).replace(/\s/g, "").toUpperCase();
    sector = hash % 2 === 0 ? "FMCG & Retail Logistics" : "Infrastructure & Engineering";
    marketCap = `₹${mCapBase.toLocaleString("en-IN")} Cr`;
    curPrice = `₹${priceBase.toFixed(2)}`;
    wHighLow = `₹${(priceBase * 1.25).toFixed(2)} / ₹${(priceBase * 0.82).toFixed(2)}`;
    pe = `${(12 + (hash % 38)).toFixed(1)}x`;
    pb = `${(1.2 + (hash % 12) * 0.9).toFixed(1)}x`;
    divYield = `${(0.1 + (hash % 20) * 0.15).toFixed(2)}%`;
    roe = `${(8 + (hash % 32)).toFixed(1)}%`;
    promoter = `${(40 + (hash % 36)).toFixed(2)}% (No pledges)`;
    fiiDii = `${(10 + (hash % 20)).toFixed(1)}% FII / ${(15 + (hash % 15)).toFixed(1)}% DII`;
    debtToEquity = `${((hash % 100) / 100).toFixed(2)}x`;
  }

  return {
    code,
    sector,
    marketCap,
    curPrice,
    wHighLow,
    pe,
    pb,
    divYield,
    roe,
    promoter,
    fiiDii,
    debtToEquity
  };
}

const LOADING_STATUSES = [
  "Initializing Senior Indian Equity Analyst process...",
  "Querying Google Search Grounding for recent BSE/NSE transactions...",
  "Scanning quarterly filings and regulatory disclosures...",
  "Analyzing latest transcripts of investor earnings conference calls (concalls)...",
  "Extracting balance sheet numbers, operating margins, & debt ratings...",
  "Benchmarking valuation multiples against sector peers...",
  "Drafting professional-grade equity research findings..."
];

export default function App() {
  const [popularStocks, setPopularStocks] = useState<Stock[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customStock, setCustomStock] = useState("");
  const [selectedStock, setSelectedStock] = useState<string>("Reliance Industries Ltd");
  
  // Nifty 50 States
  const [nifty50Stocks, setNifty50Stocks] = useState<any[]>([]);
  const [tickerLoading, setTickerLoading] = useState<boolean>(true);
  const [tickerSource, setTickerSource] = useState<string>("local");
  const [tickerLastUpdated, setTickerLastUpdated] = useState<string>("");
  const [niftySearchQuery, setNiftySearchQuery] = useState<string>("");
  
  // 5 Custom Watchlists with max 20 stocks capacity
  const [activeWatchlistIndex, setActiveWatchlistIndex] = useState<number>(1);
  const [watchlists, setWatchlists] = useState<Record<number, string[]>>(() => {
    const saved = localStorage.getItem("rsimomentum_watchlists");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved watchlists:", e);
      }
    }
    return {
      1: ["RELIANCE", "TCS", "INFY", "TATASTEEL", "HDFCBANK"],
      2: [],
      3: [],
      4: [],
      5: []
    };
  });

  const handleAddStockToWatchlist = (symbol: string) => {
    setWatchlists((prev) => {
      const currentList = prev[activeWatchlistIndex] || [];
      if (currentList.includes(symbol)) return prev;
      if (currentList.length >= 20) {
        alert("Watchlists have a maximum index size capacity limit of 20 stocks.");
        return prev;
      }
      const updated = {
        ...prev,
        [activeWatchlistIndex]: [...currentList, symbol]
      };
      localStorage.setItem("rsimomentum_watchlists", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveStockFromWatchlist = (symbol: string) => {
    setWatchlists((prev) => {
      const currentList = prev[activeWatchlistIndex] || [];
      const updated = {
        ...prev,
        [activeWatchlistIndex]: currentList.filter((s) => s !== symbol)
      };
      localStorage.setItem("rsimomentum_watchlists", JSON.stringify(updated));
      return updated;
    });
  };
  const [leftTab, setLeftTab] = useState<"analyst" | "nifty50" | "portfolio">("analyst");

  // Chart and indicator state hooks
  const [chartInterval, setChartInterval] = useState<string>("day");
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(false);

  const [selectedModeId, setSelectedModeId] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Gmail Authentication State Manager
  const [gmailUser, setGmailUser] = useState<{ email: string; name: string; role: "admin" | "user" } | null>(null);
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const isSystemFullyEnabled = !!gmailUser;

  useEffect(() => {
    const savedUser = localStorage.getItem("rsimomentum_gmail_user");
    if (savedUser) {
      try {
        setGmailUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved Gmail user:", e);
      }
    }
  }, []);

  const handleGmailLogin = (email: string) => {
    const isAdmin = email.toLowerCase() === "tripathi1307shubh@gmail.com";
    const newUser = {
      email: email.trim(),
      name: isAdmin ? "System Admin" : email.split("@")[0],
      role: (isAdmin ? "admin" : "user") as "admin" | "user"
    };
    setGmailUser(newUser);
    localStorage.setItem("rsimomentum_gmail_user", JSON.stringify(newUser));
  };

  const handleGmailLogout = () => {
    setGmailUser(null);
    localStorage.removeItem("rsimomentum_gmail_user");
  };

  // Zerodha Active Portfolios & Account margins
  const [portfolioData, setPortfolioData] = useState<{
    margins: { free: number; utilized: number; collateral: number };
    holdings: Array<{ symbol: string; name: string; qty: number; averagePrice: number; curPrice: number }>;
    positions: Array<{ symbol: string; name: string; qty: number; buyPrice: number; curPrice: number; type: string }>;
    source: string;
  } | null>(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);

  // Active Order Pad panel states
  const [orderAction, setOrderAction] = useState<"BUY" | "SELL">("BUY");
  const [orderQty, setOrderQty] = useState<number>(10);
  const [orderPrice, setOrderPrice] = useState<string>("");
  const [orderProduct, setOrderProduct] = useState<"CNC" | "MIS">("MIS");
  const [orderStyle, setOrderStyle] = useState<"MARKET" | "LIMIT">("MARKET");
  const [orderToast, setOrderToast] = useState<{ text: string; error?: boolean } | null>(null);

  const handlePlaceOrder = async (symbol: string) => {
    setOrderToast(null);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          action: orderAction,
          qty: orderQty,
          price: orderStyle === "LIMIT" ? Number(orderPrice) : 0,
          orderType: orderStyle,
          product: orderProduct
        })
      });

      const data = await res.json();
      if (res.ok) {
        setOrderToast({ text: data.message });
        fetchPortfolio();
      } else {
        setOrderToast({ text: data.error || "Order instruction was refused.", error: true });
      }
    } catch (e: any) {
      setOrderToast({ text: e.message || "Network transaction failure.", error: true });
    }
  };

  const fetchPortfolio = async () => {
    setPortfolioLoading(true);
    try {
      const res = await fetch("/api/portfolio");
      if (res.ok) {
        const data = await res.json();
        setPortfolioData(data);
      }
    } catch (err) {
      console.error("Failed to fetch simulated portfolio:", err);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const reportRef = useRef<HTMLDivElement>(null);

  // Fetch Nifty 50 Quotes safely
  const fetchNifty50Data = async () => {
    try {
      const res = await fetch("/api/nifty50");
      if (!res.ok) throw new Error("Indices load error");
      const data = await res.json();
      if (data.status === "success" && data.stocks) {
        setNifty50Stocks(data.stocks);
        setTickerSource(data.source);
        setTickerLastUpdated(data.lastUpdated);
      }
    } catch (err) {
      console.error("Failed to load Nifty 50 stock quotes:", err);
    } finally {
      setTickerLoading(false);
    }
  };

  const activeStockDisplay = customStock.trim() || selectedStock || "Reliance Industries Ltd";

  // Auto-sync price inputs based on focus stock selection
  useEffect(() => {
    const matched = nifty50Stocks.find(
      s => s.name === activeStockDisplay || s.symbol === activeStockDisplay
    );
    if (matched) {
      setOrderPrice(matched.price.toString());
    }
  }, [activeStockDisplay, nifty50Stocks]);

  // Fetch chart indicators and details dynamically
  useEffect(() => {
    let active = true;
    const fetchChartData = async () => {
      setChartLoading(true);
      try {
        const encodedStock = encodeURIComponent(activeStockDisplay);
        const res = await fetch(`/api/stock-chart?stockName=${encodedStock}&interval=${chartInterval}`);
        if (!res.ok) throw new Error("Chart compile error");
        const json = await res.json();
        if (active && json.status === "success" && json.data) {
          setChartData(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch custom chart ticks:", err);
      } finally {
        if (active) setChartLoading(false);
      }
    };
    fetchChartData();
    return () => {
      active = false;
    };
  }, [activeStockDisplay, chartInterval]);

  useEffect(() => {
    // Current UTC time simulation
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) + " IST");
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour12: false }) + " IST");

    // Fetch popular stocks lists
    fetch("/api/popular-stocks")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.stocks) {
          setPopularStocks(data.stocks);
        }
      })
      .catch((err) => console.log("Failed to fetch popular stocks", err));

    // Initial Nifty 50 load and low-frequency poll
    fetchNifty50Data();
    fetchPortfolio();
    const niftyTimer = setInterval(() => {
      fetchNifty50Data();
    }, 30000);

    return () => {
      clearInterval(timer);
      clearInterval(niftyTimer);
    };
  }, []);

  // Loading indicator cycle simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % LOADING_STATUSES.length);
      }, 3500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleRunAnalysis = async () => {
    const finalStock = customStock.trim() || selectedStock;
    if (!finalStock) {
      setError("Please search or type a valid stock name first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockName: finalStock,
          modeId: selectedModeId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An error occurred during the equity research compilation.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to establish Connect with research databases.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.report) return;
    navigator.clipboard.writeText(result.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredPopularStocks = popularStocks.filter((stock) =>
    stock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stock.sector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedTemplate = PROMPT_TEMPLATES[selectedModeId];

  // Dynamic weights to construct realistic overall NIFTY 50 index statistics
  const totalBasePrice = 143588;
  const totalCurPrice = nifty50Stocks.reduce((sum, s) => sum + s.price, 0);
  const niftyIndexValue = nifty50Stocks.length > 0
    ? (totalCurPrice / totalBasePrice) * 23530
    : 23530;
  const totalChangeSum = nifty50Stocks.reduce((sum, s) => sum + s.change, 0);
  const niftyIndexChange = nifty50Stocks.length > 0
    ? totalChangeSum / 10
    : 0;
  const niftyIndexPChange = (niftyIndexChange / niftyIndexValue) * 100;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-blue-100 antialiased">
      
      {/* Top Header - Clean Minimalism Alignment */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-40 px-6 md:px-8 py-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-sans font-bold text-sm tracking-tight">
            IER
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-tight text-slate-900">
              Indian Equity Research Terminal
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase font-semibold">
              PROMPT-BASED RECONNAISSANCE GATEWAY • GLOBAL STOCK METRICS
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-slate-500">
          {/* Gmail Authentication Component - Top Right */}
          <div className="flex items-center">
            {gmailUser ? (
              <div className="flex items-center gap-2 border border-slate-200 bg-white rounded-md p-1 pl-2.5 shadow-xs">
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px]">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase" title={gmailUser.email}>
                    {gmailUser.email[0]}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-slate-800 leading-tight truncate max-w-[140px]" title={gmailUser.email}>{gmailUser.email}</span>
                    <span className={`text-[8px] font-extrabold uppercase px-1 py-[1px] rounded self-start mt-0.5 ${
                      gmailUser.role === "admin" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-slate-100 text-slate-600"
                    }`}>
                      {gmailUser.role === "admin" ? "Admin" : "User"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleGmailLogout}
                  className="text-[9px] font-bold px-2 py-1 uppercase bg-slate-100 text-slate-600 rounded hover:bg-rose-50 hover:text-rose-600 transition-colors border border-slate-200 cursor-pointer flex items-center gap-1"
                >
                  <LogOut size={10} />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowGoogleModal(true)}
                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-450 text-slate-700 px-2.5 py-1.5 rounded-md font-sans text-[11px] font-bold transition-all shadow-xs cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66-.23-1.23-.63-1.67-1.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Gmail Login</span>
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Grounding: Active</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 border border-slate-200 rounded-md">
            <Clock size={12} className="text-blue-500" />
            <span>{currentTime}</span>
          </div>
        </div>
      </header>

      {/* Nifty 50 Live Marquee Stock Ticker Bar */}
      <div className="bg-slate-900 border-b border-slate-950 text-white text-xs h-10 flex items-center overflow-hidden font-mono select-none relative z-30">
        {/* Pinned Label */}
        <div className="bg-blue-600 text-white px-3 md:px-4 h-full flex items-center font-bold tracking-wider shrink-0 uppercase text-[9px] sm:text-[10px] border-r border-slate-950 gap-1.5 shadow-md">
          <TrendingUp size={12} className="text-blue-100 shrink-0" />
          <span>NSE NIFTY 50</span>
          {nifty50Stocks.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold shrink-0 ${
              niftyIndexChange >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
            }`}>
              {niftyIndexValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              ({niftyIndexChange >= 0 ? "+" : ""}{niftyIndexPChange.toFixed(2)}%)
            </span>
          )}
        </div>

        {/* Dynamic Source Emblem / Sync State indicator */}
        <div className="hidden sm:flex bg-slate-800 text-[9px] text-slate-300 font-bold px-2.5 h-full items-center uppercase tracking-tight border-r border-slate-950 shrink-0 gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${tickerSource === "nse-live" ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
          <span>{tickerSource === "nse-live" ? "Live-Delayed" : tickerSource === "cache" ? "Cached" : "Simulation"}</span>
        </div>

        {/* Marquee Wrapper */}
        <div className="flex-1 overflow-hidden relative flex items-center h-full">
          {tickerLoading ? (
            <div className="flex items-center gap-2 pl-4 text-slate-400 text-[10px] uppercase font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-ping"></span>
              <span>Acquiring stock tickers from National Stock Exchange...</span>
            </div>
          ) : (
            <div className="flex whitespace-nowrap min-w-full">
              {/* Marquee Stream duplicated for perfect seamless infinity loop */}
              <div className="animate-marquee flex gap-8 items-center pr-8">
                {nifty50Stocks.map((stock, i) => {
                  const isUp = stock.pChange >= 0;
                  return (
                    <button
                      key={`${stock.symbol}-m1-${i}`}
                      onClick={() => {
                        setSelectedStock(stock.name);
                        setCustomStock("");
                      }}
                      className="inline-flex items-center gap-1.5 text-left transition-all hover:bg-slate-800/85 px-2 py-1 rounded cursor-pointer group shrink-0"
                      title={`Click to analyze ${stock.name}`}
                    >
                      <span className="font-bold text-[10px] text-slate-200 group-hover:text-blue-400 transition-colors uppercase">{stock.symbol}</span>
                      <span className="text-slate-400 text-[10px]">₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</span>
                      <span className={`inline-flex items-center text-[9px] font-extrabold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                        {isUp ? "▲" : "▼"} {Math.abs(stock.pChange).toFixed(2)}%
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="animate-marquee flex gap-8 items-center pr-8" aria-hidden="true">
                {nifty50Stocks.map((stock, i) => {
                  const isUp = stock.pChange >= 0;
                  return (
                    <button
                      key={`${stock.symbol}-m2-${i}`}
                      onClick={() => {
                        setSelectedStock(stock.name);
                        setCustomStock("");
                      }}
                      className="inline-flex items-center gap-1.5 text-left transition-all hover:bg-slate-800/85 px-2 py-1 rounded cursor-pointer group shrink-0"
                      title={`Click to analyze ${stock.name}`}
                    >
                      <span className="font-bold text-[10px] text-slate-200 group-hover:text-blue-400 transition-colors uppercase">{stock.symbol}</span>
                      <span className="text-slate-400 text-[10px]">₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 1 })}</span>
                      <span className={`inline-flex items-center text-[9px] font-extrabold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                        {isUp ? "▲" : "▼"} {Math.abs(stock.pChange).toFixed(2)}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Ticker Action / Last Updated Stamp */}
        <div className="hidden md:flex items-center text-[10px] text-slate-400 bg-slate-950 font-sans tracking-tight px-4 border-l border-slate-950 h-full shrink-0 gap-2">
          <span>Updated:</span>
          <span className="text-slate-200 font-mono font-bold">{tickerLastUpdated || "--:--:--"}</span>
          <button 
            onClick={() => {
              setTickerLoading(true);
              fetchNifty50Data();
            }}
            disabled={tickerLoading}
            className="ml-1 text-[9px] hover:text-white border border-slate-800 hover:border-slate-600 bg-slate-900 px-1.5 py-0.5 rounded cursor-pointer transition-all active:scale-95 text-slate-300"
          >
            Sync
          </button>
        </div>
      </div>

      {/* Grid Layout Main Area */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* Left Column: Input Panel, Width 4 cols */}
        <div className="lg:col-span-4 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-65px)]">
          
          {/* Section Mode Navigation Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setLeftTab("analyst")}
              className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 ${
                leftTab === "analyst"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="tab-analyst-panel"
            >
              <Sparkles size={11} className={leftTab === "analyst" ? "text-blue-600" : "text-slate-400"} />
              <span>Analyst</span>
            </button>
            <button
              onClick={() => setLeftTab("nifty50")}
              className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 ${
                leftTab === "nifty50"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="tab-nifty50-list"
            >
              <LineChart size={11} className={leftTab === "nifty50" ? "text-blue-600" : "text-slate-400"} />
              <span>Nifty Index</span>
            </button>
            <button
              onClick={() => {
                setLeftTab("portfolio");
                fetchPortfolio();
              }}
              className={`flex-1 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-md transition-all flex items-center justify-center gap-1.5 ${
                leftTab === "portfolio"
                  ? "bg-white text-emerald-700 shadow-sm border border-slate-200/50 font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              id="tab-portfolio-list"
            >
              <TrendingUp size={11} className={leftTab === "portfolio" ? "text-emerald-500" : "text-slate-400"} />
              <span>Kite Desk</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {leftTab === "analyst" ? (
              <motion.div
                key="analyst-view"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-6"
              >
                {/* Target Stock Select Block */}
                <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-3 bg-blue-50 text-blue-700 px-2.5 py-1 w-fit rounded text-xs font-semibold uppercase tracking-wider">
                    <Building2 size={13} />
                    Step 1: Focus Asset
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-4 leading-normal">
                    Specify active BSE/NSE stock or trigger peer-comparisons from the registered indices below. Handled in real time with Search Grounding tools.
                  </p>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 text-slate-400" size={15} />
                    <input
                      type="text"
                      placeholder="Type Indian stock name (e.g., Tata Steel, TCS, ITC...)"
                      value={customStock}
                      onChange={(e) => {
                        setCustomStock(e.target.value);
                        setSelectedStock("");
                      }}
                      className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 rounded-md placeholder-slate-400"
                      id="stock-selector-input"
                    />
                    {customStock && (
                      <button 
                        onClick={() => setCustomStock("")}
                        className="absolute right-3 top-3 text-[10px] uppercase font-mono text-slate-400 hover:text-slate-900"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Popular stocks index search */}
                  <div className="mb-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 text-slate-400" size={11} />
                      <input
                        type="text"
                        placeholder="Filter key registered equities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50/50 border border-slate-200/60 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-slate-300 rounded-md font-medium"
                        id="filter-index-search"
                      />
                    </div>
                  </div>

                  {/* Popular Stocks Grid list */}
                  <div className="max-h-[140px] overflow-y-auto border border-slate-100 bg-slate-50/40 p-2 text-xs flex flex-wrap gap-1 md:gap-1.5 custom-scrollbar rounded-md">
                    {filteredPopularStocks.length > 0 ? (
                      filteredPopularStocks.map((stock) => {
                        const isSelected = selectedStock === stock.name;
                        return (
                          <button
                            key={stock.symbol}
                            onClick={() => {
                              setSelectedStock(stock.name);
                              setCustomStock("");
                              setError(null);
                            }}
                            className={`px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-tight text-left transition-all border rounded ${
                              isSelected
                                ? "bg-slate-900 border-slate-900 text-white font-medium"
                                : "bg-white text-slate-600 border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                            }`}
                            id={`stock-chip-${stock.symbol}`}
                          >
                            <div className="font-bold flex items-center gap-1">
                              <span>{stock.symbol}</span>
                              <ChevronRight size={8} />
                            </div>
                            <div className="text-[9px] opacity-70 truncate max-w-[95px]">{stock.name}</div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center w-full py-4 text-slate-400">
                        No matches found.
                      </div>
                    )}
                  </div>

                  {/* Active Selection summary banner */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Selected Asset:</span>
                    <span className="font-bold text-blue-600 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-100">
                      {customStock.trim() || selectedStock || "None"}
                    </span>
                  </div>
                </div>

                {/* Prompt Mode Selection Box */}
                <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                  <div className="flex items-center gap-2 mb-3 bg-blue-50 text-blue-700 px-2.5 py-1 w-fit rounded text-xs font-semibold uppercase tracking-wider">
                    <Clock size={13} />
                    Step 2: Analyst Presets
                  </div>

                  <p className="text-xs text-slate-500 mb-4 leading-normal">
                    Each preset targets specific financial intelligence angles derived from audited declarations.
                  </p>

                  <div className="grid grid-cols-1 gap-2 max-h-[190px] overflow-y-auto pr-1 custom-scrollbar">
                    {Object.entries(PROMPT_TEMPLATES).map(([idStr, temp]) => {
                      const id = Number(idStr);
                      const isSelected = selectedModeId === id;
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            setSelectedModeId(id);
                            setError(null);
                          }}
                          className={`p-3 text-left border transition-all flex items-start gap-3 rounded-md ${
                            isSelected
                              ? "bg-slate-50 border-slate-300 ring-1 ring-blue-500/20"
                              : "bg-white border-slate-100 hover:border-slate-200"
                          }`}
                          id={`prompt-mode-btn-${id}`}
                        >
                          <div 
                            className="w-7 h-7 flex items-center justify-center shrink-0 font-sans font-bold text-xs border border-slate-200 rounded"
                            style={{ backgroundColor: isSelected ? temp.color : "#F8FAFC" }}
                          >
                            P{id}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-slate-800">
                                {temp.title}
                              </span>
                              {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                              {temp.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Initiate Action box */}
                <div className="pt-2">
                  {error && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 text-xs mb-4 flex items-start gap-2 rounded-md">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                      <div className="flex-1 font-medium leading-relaxed">
                        <span className="font-semibold">Terminal Refusal:</span> {error}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleRunAnalysis}
                    disabled={loading || !(customStock.trim() || selectedStock)}
                    className={`w-full py-3.5 text-xs font-semibold tracking-wider font-sans uppercase transition-all rounded-md flex items-center justify-center gap-2 ${
                      loading
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer border border-blue-600 hover:shadow"
                    }`}
                    id="initiate-research-button"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 py-1 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Running Search Grounding...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-white" />
                        <span>Execute Research Prompt</span>
                      </>
                    )}
                  </button>
                  
                  <p className="text-[10px] text-center text-slate-400 mt-2.5 font-semibold uppercase tracking-wider">
                    Powered by Live Grounded Index Data
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="nifty50-view"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-4"
              >
                {/* Search Header for index list */}
                <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <LineChart size={14} className="text-blue-600" />
                      <span className="text-xs font-bold uppercase tracking-wider">Nifty 50 Tracker list</span>
                    </div>
                    {tickerLastUpdated && (
                      <span className="text-[9px] text-slate-400 font-mono">Synced: {tickerLastUpdated}</span>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Displaying constituents dynamically from NSE. Click any constituent row below to load its interactive charts and perform deep forensic analyst prompts instantly.
                  </p>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Filter by symbol, name, or sector..."
                      value={niftySearchQuery}
                      onChange={(e) => setNiftySearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs pl-9 pr-8 py-2 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-md"
                    />
                    {niftySearchQuery && (
                      <button 
                        onClick={() => setNiftySearchQuery("")} 
                        className="absolute right-3 top-2.5 text-[10px] text-slate-400 hover:text-slate-900 font-mono"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Dense Constiuents List */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                  <div className="max-h-[500px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                    {(() => {
                      const filtered = nifty50Stocks.filter(stock => {
                        const q = niftySearchQuery.toLowerCase();
                        return (
                          stock.symbol?.toLowerCase().includes(q) ||
                          stock.name?.toLowerCase().includes(q) ||
                          stock.sector?.toLowerCase().includes(q)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-8 text-center text-slate-400 text-xs font-medium">
                            No matching Nifty index stocks found.
                          </div>
                        );
                      }

                      return filtered.map((stock) => {
                        const isUp = stock.pChange >= 0;
                        const isFocused = activeStockDisplay.toLowerCase() === stock.name.toLowerCase() || 
                                          activeStockDisplay.toLowerCase() === stock.symbol.toLowerCase();
                        return (
                          <div
                            key={stock.symbol}
                            onClick={() => {
                              setSelectedStock(stock.name);
                              setCustomStock("");
                            }}
                            className={`p-3 text-left transition-all flex items-center justify-between cursor-pointer group hover:bg-slate-50 border-l-2 ${
                              isFocused 
                                ? "bg-blue-50/70 border-blue-600" 
                                : "border-transparent bg-white hover:border-slate-300"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 font-mono uppercase group-hover:text-blue-600 transition-colors">
                                  {stock.symbol}
                                </span>
                                {isFocused && (
                                  <span className="bg-blue-600 text-white rounded text-[8px] font-extrabold px-1.5 py-0.5 tracking-wider uppercase shrink-0">
                                    Focused
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate mt-0.5">{stock.name}</div>
                              <div className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-tight">{stock.sector}</div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-bold font-mono text-xs text-slate-900">
                                ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                              </div>
                              <div className={`inline-flex items-center gap-0.5 px-2 py-0.5 mt-1 rounded font-mono font-bold text-[9px] ${
                                isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                              }`}>
                                <span>{isUp ? "▲" : "▼"}</span>
                                <span>{Math.abs(stock.pChange).toFixed(2)}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                  
                  {/* Footer status summary of index loader */}
                  <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span className="uppercase">Index feed: {tickerSource}</span>
                    <button 
                      onClick={() => {
                        setTickerLoading(true);
                        fetchNifty50Data();
                      }}
                      className="text-blue-600 hover:text-blue-800 font-bold uppercase cursor-pointer"
                    >
                      Force refresh
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {leftTab === "portfolio" && (
              <motion.div
                key="portfolio-view"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-5"
              >
                {/* Custom Watchlist with NSE and BSE Indices */}
                {(() => {
                  const sensexVal = niftyIndexValue * 3.32;
                  const sensexChange = niftyIndexChange * 3.32;
                  
                  return (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
                        <div className="w-1.5 h-3 bg-blue-600 rounded-sm" />
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">Kite Watchlists</span>
                      </div>

                      {/* Permanent Index Block (NSE and BSE Indices) */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-150 font-mono">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">NSE NIFTY 50</span>
                          <span className="text-[11px] font-bold text-slate-800">
                            ₹{niftyIndexValue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[9px] font-bold ${niftyIndexChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {niftyIndexChange >= 0 ? "+" : ""}{niftyIndexChange.toFixed(2)} ({niftyIndexChange >= 0 ? "+" : ""}{niftyIndexPChange.toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex flex-col border-l border-slate-200 pl-2.5">
                          <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">BSE SENSEX</span>
                          <span className="text-[11px] font-bold text-slate-800">
                            ₹{sensexVal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[9px] font-bold ${sensexChange >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {sensexChange >= 0 ? "+" : ""}{sensexChange.toFixed(2)} ({sensexChange >= 0 ? "+" : ""}{niftyIndexPChange.toFixed(2)}%)
                          </span>
                        </div>
                      </div>

                      {/* Watchlist Sub-Tabs WL1 - WL5 */}
                      <div className="flex border-b border-slate-100">
                        {[1, 2, 3, 4, 5].map((num) => {
                          const count = (watchlists[num] || []).length;
                          return (
                            <button
                              key={num}
                              onClick={() => setActiveWatchlistIndex(num)}
                              className={`flex-grow text-center pb-2 pt-1 text-[10px] font-extrabold transition-all border-b-2 ${
                                activeWatchlistIndex === num
                                  ? "border-blue-600 text-blue-600 font-black"
                                  : "border-transparent text-slate-400 hover:text-slate-600"
                              }`}
                            >
                              WL{num} <span className="text-[8px] opacity-65">({count})</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Dropdown to add a new stock to the active watchlist */}
                      <div className="relative">
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              handleAddStockToWatchlist(val);
                              e.target.value = ""; // Reset selection
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">＋ Add Stock to WL{activeWatchlistIndex} (NSE Nifty 50)...</option>
                          {nifty50Stocks
                            .filter((s) => !(watchlists[activeWatchlistIndex] || []).includes(s.symbol))
                            .map((s) => (
                              <option key={s.symbol} value={s.symbol}>
                                {s.symbol} - {s.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* List of Watchlist constituents */}
                      <div className="max-h-[220px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                        {(watchlists[activeWatchlistIndex] || []).length === 0 ? (
                          <div className="py-6 text-center text-[10px] text-slate-400 font-medium">
                            This watchlist is empty. Add up to 20 stocks from the selector above.
                          </div>
                        ) : (
                          (watchlists[activeWatchlistIndex] || []).map((sym) => {
                            const stock = nifty50Stocks.find((s) => s.symbol === sym);
                            if (!stock) return null;
                            const isUp = stock.pChange >= 0;
                            const isFocused = activeStockDisplay.toLowerCase() === stock.name.toLowerCase() || 
                                              activeStockDisplay.toLowerCase() === stock.symbol.toLowerCase();

                            return (
                              <div
                                key={sym}
                                onClick={() => {
                                  setSelectedStock(stock.name);
                                  setCustomStock("");
                                }}
                                className={`py-2 px-1.5 flex items-center justify-between cursor-pointer group rounded hover:bg-slate-50/80 transition-colors ${
                                  isFocused ? "bg-blue-50/70 border-l-2 border-blue-600 pl-1" : ""
                                }`}
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <span className="font-extrabold text-[11px] font-mono text-slate-950 uppercase group-hover:text-blue-600 transition-colors">
                                    {stock.symbol}
                                  </span>
                                  <p className="text-[9px] text-slate-400 truncate max-w-[140px] font-semibold">{stock.name}</p>
                                </div>
                                
                                <div className="flex items-center gap-3 shrink-0">
                                  <div className="text-right">
                                    <span className="font-bold text-[11px] font-mono text-slate-800">
                                      ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                                    </span>
                                    <p className={`text-[9px] font-extrabold font-mono ${isUp ? "text-emerald-600" : "text-rose-600"}`}>
                                      {isUp ? "▲" : "▼"}{Math.abs(stock.pChange).toFixed(2)}%
                                    </p>
                                  </div>

                                  {/* Delete stock from watchlist action button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation(); // Avoid triggering stock focus highlights
                                      handleRemoveStockFromWatchlist(sym);
                                    }}
                                    className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title={`Remove ${sym} from Watchlist`}
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Account Balances Matrix */}
                {(() => {
                  const isSystemFullyEnabled = !!gmailUser;
                  return (
                    <div className="relative bg-slate-900 text-white rounded-xl shadow-xs p-4 overflow-hidden flex flex-col gap-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Account Margin Feed (INR)</span>
                      <div className={`grid grid-cols-2 gap-4 transition-all ${!isSystemFullyEnabled ? "blur-[3px] opacity-20 select-none pointer-events-none" : ""}`}>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400">Trading Balance (Free)</span>
                          <span className="text-base font-mono font-bold text-emerald-400">
                            ₹{(portfolioData?.margins?.free || 150000).toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                          </span>
                        </div>
                        <div className="flex flex-col border-l border-slate-800 pl-4">
                          <span className="text-[9px] text-slate-400">Utilized Margin</span>
                          <span className="text-base font-mono font-bold text-amber-400">
                            ₹{(portfolioData?.margins?.utilized || 12450).toLocaleString("en-IN", { minimumFractionDigits: 1 })}
                          </span>
                        </div>
                      </div>

                      {!isSystemFullyEnabled && (
                        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center transition-all z-10 font-sans">
                          <Lock size={16} className="text-amber-500 mb-1.5" />
                          <span className="text-[10px] font-bold text-slate-100 uppercase tracking-wider">Trading Interface Locked</span>
                          <p className="text-[8px] text-slate-400 max-w-[240px] mt-0.5 leading-normal">
                            Please authorize your rsimomentum workspace via Google/Gmail Sign-in to unlock the trading console.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Live Order Placement Pad */}
                {(() => {
                  const activeSymbol = nifty50Stocks.find(s => s.name === activeStockDisplay || s.symbol === activeStockDisplay)?.symbol || "RELIANCE";
                  const isSystemFullyEnabled = !!gmailUser;
                  return (
                    <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm p-4.5 overflow-hidden flex flex-col gap-3.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-3 bg-blue-600 rounded-sm" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-tight">Simulated Order Pad</span>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-700 font-mono font-extrabold px-1.5 py-0.5 rounded">
                          {activeSymbol} (NSE)
                        </span>
                      </div>

                      {/* Buy / Sell Transaction Action Selectors */}
                      <div className={`flex flex-col gap-3.5 transition-all ${!isSystemFullyEnabled ? "blur-[3px] opacity-20 select-none pointer-events-none" : ""}`}>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setOrderAction("BUY")}
                            disabled={!isSystemFullyEnabled}
                            className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded transition-all cursor-pointer ${
                              orderAction === "BUY"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-150"
                            }`}
                          >
                            BUY
                          </button>
                          <button
                            onClick={() => setOrderAction("SELL")}
                            disabled={!isSystemFullyEnabled}
                            className={`flex-1 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded transition-all cursor-pointer ${
                              orderAction === "SELL"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-500 hover:bg-slate-150"
                            }`}
                          >
                            SELL
                          </button>
                        </div>

                        {/* Quantity Input Field */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] font-semibold text-slate-400 uppercase">Shares Quantity to execute</label>
                          <input
                            type="number"
                            value={orderQty}
                            min={1}
                            disabled={!isSystemFullyEnabled}
                            onChange={(e) => setOrderQty(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                          />
                        </div>

                        {/* Product Type (CNC vs MIS) & Order Style (MARKET vs LIMIT) */}
                        <div className="grid grid-cols-2 gap-3.5">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-semibold text-slate-400 uppercase">Product Style</label>
                            <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                              <button
                                onClick={() => setOrderProduct("CNC")}
                                disabled={!isSystemFullyEnabled}
                                className={`flex-1 py-1 text-[9px] font-extrabold rounded ${
                                  orderProduct === "CNC" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                                }`}
                              >
                                CNC (Delv)
                              </button>
                              <button
                                onClick={() => setOrderProduct("MIS")}
                                disabled={!isSystemFullyEnabled}
                                className={`flex-1 py-1 text-[9px] font-extrabold rounded ${
                                  orderProduct === "MIS" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                                }`}
                              >
                                MIS (Intra)
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-semibold text-slate-400 uppercase">Execution Type</label>
                            <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
                              <button
                                onClick={() => setOrderStyle("MARKET")}
                                disabled={!isSystemFullyEnabled}
                                className={`flex-1 py-1 text-[9px] font-extrabold rounded ${
                                  orderStyle === "MARKET" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                                }`}
                              >
                                Mkt
                              </button>
                              <button
                                onClick={() => setOrderStyle("LIMIT")}
                                disabled={!isSystemFullyEnabled}
                                className={`flex-1 py-1 text-[9px] font-extrabold rounded ${
                                  orderStyle === "LIMIT" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500"
                                }`}
                              >
                                Lmt
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Price input - shown only if LIMIT */}
                        {orderStyle === "LIMIT" && (
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-semibold text-slate-400 uppercase">Trigger Limit Price (INR)</label>
                            <input
                              type="number"
                              value={orderPrice}
                              disabled={!isSystemFullyEnabled}
                              onChange={(e) => setOrderPrice(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                            />
                          </div>
                        )}

                        {/* Submit button */}
                        <button
                          onClick={() => handlePlaceOrder(activeSymbol)}
                          disabled={!isSystemFullyEnabled}
                          className={`w-full text-xs font-bold uppercase py-2 cursor-pointer select-none text-center transition-all rounded shadow-xs text-white ${
                            orderAction === "BUY" ? "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800" : "bg-rose-600 hover:bg-rose-700 active:bg-rose-800"
                          } ${!isSystemFullyEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          Transmit {orderAction} Instruction
                        </button>

                        {/* Toast Alerts Notification inside Order Pad */}
                        {orderToast && (
                          <div className={`p-2 rounded text-[10px] leading-normal flex items-start gap-1 font-semibold ${
                            orderToast.error ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            <span>{orderToast.error ? "⚠️" : "✨"}</span>
                            <span>{orderToast.text}</span>
                          </div>
                        )}
                      </div>

                      {!isSystemFullyEnabled && (
                        <div className="absolute inset-0 bg-white/95 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center transition-all z-10 font-sans">
                          <Lock size={18} className="text-slate-500 mb-1.5" />
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Order Desk Locked</span>
                          <p className="text-[10px] text-slate-500 max-w-[220px] mt-1 leading-normal">
                            Please authorize your rsimomentum workspace via Google/Gmail Sign-in to unlock the simulated order transmission desk.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Holdings Lists CNC */}
                <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-2.5 overflow-hidden">
                  <div className={`flex flex-col gap-2.5 ${!isSystemFullyEnabled ? "blur-[3px] opacity-20 select-none pointer-events-none" : ""}`}>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1">
                        <Briefcase size={12} className="text-slate-600" />
                        My Equity Holdings (CNC)
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded">
                        {(portfolioData?.holdings || []).length} Assets
                      </span>
                    </div>

                    {portfolioLoading ? (
                      <div className="text-center py-4 text-slate-400 text-xs font-medium">Fetching portfolio assets...</div>
                    ) : (portfolioData?.holdings || []).length > 0 ? (
                      <div className="flex flex-col divide-y divide-slate-100 max-h-[180px] overflow-y-auto custom-scrollbar">
                        {portfolioData?.holdings.map((h, i) => {
                          const cost = h.averagePrice * h.qty;
                          const value = h.curPrice * h.qty;
                          const pnl = value - cost;
                          const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                          const isProfit = pnl >= 0;

                          return (
                            <div key={`${h.symbol}-${i}`} className="py-2 flex items-center justify-between text-xs">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-[11px] font-mono text-slate-900">{h.symbol}</span>
                                <span className="text-[9px] text-slate-400">{h.qty} shares @ ₹{h.averagePrice.toFixed(1)}</span>
                              </div>
                              <div className="text-right flex flex-col">
                                <span className="font-bold text-[11px] font-mono text-slate-800">
                                  ₹{value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                                </span>
                                <span className={`text-[10px] font-bold font-mono ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                                  {isProfit ? "+" : ""}
                                  ₹{pnl.toLocaleString("en-IN", { maximumFractionDigits: 1 })} ({pnlPct.toFixed(1)}%)
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-xs">No CNC portfolio holdings logged.</div>
                    )}
                  </div>

                  {!isSystemFullyEnabled && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center transition-all z-10 font-sans">
                      <Lock size={16} className="text-slate-500 mb-1.5" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Holdings Locked</span>
                      <p className="text-[9px] text-slate-500 max-w-[220px] mt-1 leading-normal">
                        Please authorize your rsimomentum workspace via Google/Gmail Sign-in to unlock your equity holdings database.
                      </p>
                    </div>
                  )}
                </div>

                {/* Active Intraday Positions MIS */}
                <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-2.5 overflow-hidden">
                  <div className={`flex flex-col gap-2.5 ${!isSystemFullyEnabled ? "blur-[3px] opacity-20 select-none pointer-events-none" : ""}`}>
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1">
                        <TrendingUp size={12} className="text-slate-600" />
                        Active MIS Positions
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-600 font-mono font-bold px-1.5 py-0.5 rounded">
                        {(portfolioData?.positions || []).length} Open
                      </span>
                    </div>

                    {portfolioLoading ? (
                      <div className="text-center py-4 text-slate-400 text-xs font-medium">Synced...</div>
                    ) : (portfolioData?.positions || []).length > 0 ? (
                      <div className="flex flex-col divide-y divide-slate-100 max-h-[170px] overflow-y-auto custom-scrollbar">
                        {portfolioData?.positions.map((p, i) => {
                          const cost = p.buyPrice * p.qty;
                          const value = p.curPrice * p.qty;
                          const pnl = value - cost;
                          const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                          const isProfit = pnl >= 0;

                          return (
                            <div key={`${p.symbol}-${i}`} className="py-2.5 flex items-center justify-between text-xs">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className="font-extrabold text-[11px] font-mono text-slate-900">{p.symbol}</span>
                                  <span className="text-[8px] px-1 bg-slate-100 text-slate-500 rounded font-mono font-bold uppercase">{p.type}</span>
                                </div>
                                <span className="text-[9px] text-slate-400">{p.qty} shares @ ₹{p.buyPrice.toFixed(1)}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-right flex flex-col pr-1">
                                  <span className="font-bold text-[11px] font-mono text-slate-800">LTP ₹{p.curPrice.toFixed(1)}</span>
                                  <span className={`text-[10px] font-bold font-mono ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>
                                    {isProfit ? "+" : ""}
                                    ₹{pnl.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
                                  </span>
                                </div>
                                
                                <button
                                  onClick={async () => {
                                    setOrderAction(p.qty > 0 ? "SELL" : "BUY");
                                    setOrderQty(Math.abs(p.qty));
                                    setOrderStyle("MARKET");
                                    setOrderProduct(p.type === "MIS" ? "MIS" : "CNC");
                                    await handlePlaceOrder(p.symbol);
                                  }}
                                  disabled={!isSystemFullyEnabled}
                                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold border border-rose-200 rounded px-2 py-1 text-[9px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Square Off
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-slate-400 text-xs">No active intraday positions open.</div>
                    )}
                  </div>

                  {!isSystemFullyEnabled && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-[1px] flex flex-col items-center justify-center p-4 text-center transition-all z-10 font-sans">
                      <Lock size={16} className="text-slate-500 mb-1.5" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Positions Locked</span>
                      <p className="text-[9px] text-slate-500 max-w-[220px] mt-1 leading-normal">
                        Please authorize your rsimomentum workspace via Google/Gmail Sign-in to unlock your active intraday positions ledger.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Right Column: Beautiful Preview, Width 8 cols */}
        <div className="lg:col-span-8 bg-slate-50/50 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-65px)]">
          
          {/* Always Rendered Interactive Technical Canvas */}
          <StockInteractiveChart
            stockName={activeStockDisplay}
            data={chartData}
            loading={chartLoading}
            interval={chartInterval}
            onIntervalChange={setChartInterval}
          />

          {/* Always Rendered Beautified Factual Overview Table in grid/row-column format */}
          {(() => {
            const metrics = getFactualTableMetrics(activeStockDisplay);
            return (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                      Factual Overview Matrix
                    </h3>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded font-bold">
                    NSE ID: {metrics.code}
                  </span>
                </div>
                
                {/* Responsive row-column structured grid */}
                <div className="overflow-x-auto rounded-lg border border-slate-100 max-h-[225px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-xs text-left text-slate-600 border-collapse">
                    <thead className="bg-slate-50/70 text-slate-500 uppercase tracking-wider font-mono text-[9px] border-b border-slate-150 sticky top-0 bg-white">
                      <tr>
                        <th className="py-2 px-3 font-semibold">Financial Metric</th>
                        <th className="py-2 px-3 font-semibold">Audited Declarations</th>
                        <th className="py-2 px-3 hidden sm:table-cell font-semibold font-mono">Asset Category</th>
                        <th className="py-2 px-3 font-semibold">Signal Multiple</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">Primary Sector</td>
                        <td className="py-2 px-3 text-slate-705 text-slate-700 font-medium">{metrics.sector}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">NSE Index Block</td>
                        <td className="py-2 px-3 text-slate-500">Regulated Asset</td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">Market Capitalization</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">{metrics.marketCap}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">Valuation Volume</td>
                        <td className="py-2 px-3 text-blue-600 font-bold">Mega-Cap Class</td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">Last Auction Price</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{metrics.curPrice}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">BSE Feed Quote</td>
                        <td className="py-2 px-3 text-emerald-600 font-semibold flex items-center gap-0.5"><ArrowUpRight size={10} /> Active Quote</td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">52-Week Limits</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{metrics.wHighLow}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">Historical Extremes</td>
                        <td className="py-2 px-3 text-slate-400">BSE High Range</td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">Price-to-Earnings (TTM)</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{metrics.pe}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">Earnings Yield</td>
                        <td className="py-2 px-3">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            parseFloat(metrics.pe) > 28 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {parseFloat(metrics.pe) > 28 ? "Premium multiple" : "Constructive value"}
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">Price-to-Book (P/B)</td>
                        <td className="py-2 px-3 font-mono text-slate-60) text-slate-600">{metrics.pb}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">Corporate Equity Ratio</td>
                        <td className="py-2 px-3 text-slate-500">Asset Valuation</td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">Annual Dividend Yield</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{metrics.divYield}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">Dividend Distribution</td>
                        <td className="py-2 px-3 text-teal-600 font-semibold font-sans">Yield Return</td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">Return on Equity (ROE)</td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">{metrics.roe}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">Capital Effectiveness</td>
                        <td className="py-2 px-3 font-semibold text-slate-700">{parseFloat(metrics.roe) > 20 ? "Superior Capital" : "Stable Capital"}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">Debt-to-Equity Ratio</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{metrics.debtToEquity}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">Leverage metrics</td>
                        <td className="py-2 px-3">
                          {metrics.debtToEquity.includes("Banking") ? (
                            <span className="text-slate-400 italic">Banking Tier-1</span>
                          ) : parseFloat(metrics.debtToEquity) > 0.5 ? (
                            <span className="text-amber-600 font-bold">Debt Levees</span>
                          ) : (
                            <span className="text-emerald-600 font-bold">Unleveraged</span>
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">Promoter Ownership Pattern</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{metrics.promoter}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400 font-sans">Equity Control patterns</td>
                        <td className="py-2 px-3 text-slate-500">Uncompromised</td>
                      </tr>
                      <tr className="hover:bg-slate-50/40">
                        <td className="py-2 px-3 font-medium text-slate-800">fiiDii allocations</td>
                        <td className="py-2 px-3 font-mono text-slate-600">{metrics.fiiDii}</td>
                        <td className="py-2 px-3 hidden sm:table-cell text-slate-400">Foreign/Domestic allocations</td>
                        <td className="py-2 px-3 text-blue-600 font-bold font-sans">Heavy Institutional</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Underneath: The Compile Research brief option generated below */}
          <div className="border-t border-slate-200/80 pt-4 flex flex-col gap-4">
            <div className="flex items-center gap-1.5 px-0.5">
              <Sparkles size={14} className="text-blue-500 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">
                Grounded Security Research Output
              </h3>
            </div>

            <AnimatePresence mode="wait">
            
            {/* 1. Loading Process State Panel */}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center py-20 px-4"
                key="loading-panel"
              >
                <div className="max-w-md w-full bg-white border border-slate-200 p-8 text-center shadow-lg rounded-xl relative overflow-hidden">
                  
                  <div className="relative mb-6">
                    <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 rounded-lg animate-pulse">
                      <Sparkles size={24} />
                    </div>
                  </div>

                  <div className="text-[10px] uppercase text-blue-600 font-bold tracking-widest mb-1.5">
                    [ Active Analytics Engine Running ]
                  </div>
                  <h3 className="font-bold text-slate-900 text-base mb-1">
                    Compiling Factual Equity Report
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mb-6">
                    Target: {customStock.trim() || selectedStock}
                  </p>

                  <div className="my-5 border-y border-slate-100 py-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-center mb-2">
                      <span className="inline-block text-[10px] text-blue-700 font-bold bg-blue-100/60 px-2 py-0.5 rounded uppercase">
                        Protocol Step {loadingStep + 1} of {LOADING_STATUSES.length}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-600 px-4 min-h-[40px] flex items-center justify-center leading-relaxed">
                      {LOADING_STATUSES[loadingStep]}
                    </div>
                  </div>

                  {/* progression bar styling */}
                  <div className="w-full bg-slate-100 h-1.5 border border-slate-200/80 overflow-hidden rounded-full">
                    <motion.div 
                      className="bg-blue-600 h-full rounded-full"
                      style={{ originX: 0 }}
                      animate={{ scaleX: (loadingStep + 1) / LOADING_STATUSES.length }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                  
                  <p className="text-[9px] text-slate-400 mt-4 uppercase font-semibold">
                    Live security indexing can take up to 20 seconds
                  </p>
                </div>
              </motion.div>
            )}

            {/* 2. Loaded Report Render Panel */}
            {!loading && result && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-5"
                key="report-panel"
              >
                
                {/* Control Actions bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                      Report Complete
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors rounded-lg shadow-sm"
                      title="Copy markdown content"
                    >
                      {copied ? (
                        <>
                          <Check size={13} className="text-emerald-500" />
                          <span className="text-slate-800">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} className="text-slate-500" />
                          <span className="text-slate-700">Copy Markdown</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-xs font-semibold hover:bg-slate-50 transition-colors rounded-lg shadow-sm"
                    >
                      <Printer size={13} className="text-slate-500" />
                      <span className="text-slate-700">Print Analysis</span>
                    </button>
                    
                    <button
                      onClick={() => setResult(null)}
                      className="px-3.5 py-2 bg-slate-100 border border-slate-200 text-xs font-semibold hover:bg-slate-200 text-slate-600 transition-colors rounded-lg"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Grounding Source Badge Query Info */}
                {result.searchMetadata?.webSearchQueries && (
                  <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-bold uppercase text-slate-800 mb-2.5 text-[10px] tracking-wide">
                      <Sparkles size={11} className="text-blue-500" />
                      Audited Grounding References Found:
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3 max-h-[80px] overflow-y-auto pr-1 custom-scrollbar">
                      {result.searchMetadata.webSearchQueries.map((query, index) => (
                        <span key={index} className="bg-slate-50 px-2 py-1 text-[10px] font-mono border border-slate-200 rounded text-slate-700">
                          "{query}"
                        </span>
                      ))}
                    </div>
                    
                    {/* Source retrieved links for citations */}
                    {result.searchMetadata?.groundingChunks && result.searchMetadata.groundingChunks.filter(c => c.web).length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                        <div className="font-bold text-[9px] uppercase text-slate-400 mb-1.5">Sources Consulted:</div>
                        <div className="flex flex-col gap-1.5 text-[11px] max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                          {result.searchMetadata.groundingChunks
                            .map((chunk, i) => chunk.web)
                            .filter((web): web is { uri: string; title: string } => !!web)
                            .filter((web, idx, self) => self.findIndex(t => t.uri === web.uri) === idx)
                            .slice(0, 4)
                            .map((web, idx) => (
                              <a 
                                key={idx} 
                                href={web.uri}
                                target="_blank" 
                                rel="noreferrer"
                                className="text-blue-600 hover:underline hover:text-blue-800 truncate block font-medium"
                              >
                                {idx + 1}. {web.title || web.uri}
                              </a>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Clean Minimalism Publication Canvas */}
                <div 
                  ref={reportRef} 
                  className="bg-white border border-slate-200 p-8 md:p-12 shadow-sm rounded-xl relative print:shadow-none print:border-none print:p-0"
                >
                  {/* Modern Publication Header */}
                  <div className="border-b border-slate-200 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                      <span className="bg-blue-600 text-white px-2 py-0.5 text-[9px] font-mono uppercase font-bold tracking-widest rounded-sm">
                        INSTITUTIONAL EQUITY BRIEF
                      </span>
                      <h2 className="text-xl font-bold tracking-tight uppercase text-slate-900 mt-2">
                        Securities Research Brief
                      </h2>
                      <p className="text-[10px] text-slate-400 uppercase font-mono mt-0.5 font-bold tracking-wider">
                        SEC REGISTERED ANALYST CHANNEL • STRICTLY CONFIDENTIAL
                      </p>
                    </div>
                    <div className="text-left md:text-right font-mono text-[10px] text-slate-500 leading-relaxed">
                      <div><strong>Ticker:</strong> {result.stockName}</div>
                      <div><strong>Methodology:</strong> P{result.modeId} - {result.modeTitle}</div>
                      <div><strong>Generated:</strong> {new Date(result.timestamp).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    </div>
                  </div>

                  {/* Standard Markdown Body */}
                  <div className="markdown-body">
                    <Markdown>{result.report}</Markdown>
                  </div>

                  {/* Clean Minimalist disclaimer block */}
                  <div className="mt-12 pt-6 border-t border-slate-200 text-[10px] leading-relaxed text-slate-400 font-mono">
                    <p className="font-bold uppercase text-slate-800 mb-1">REGULATORY COMPLIANCE AND SEBI DISCLAIMER:</p>
                    This automated report is compiled live for reference purposes. Factual disclosures are grounded through recent internet records retrieved at runtime. It does not constitute formal transactional advisory or professional asset brokerage services. Analyze independently or reference certified advisors.
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. Empty State (Pristine layout representation corresponding to the Prompt screenshots) */}
            {!loading && !result && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-grow flex flex-col justify-center h-full min-h-[485px]"
                key="empty-state"
              >
                
                {/* Clean Minimalism Notebook Sheet Mockup */}
                <div className="bg-white border border-slate-200 p-8 md:p-10 rounded-xl shadow-sm flex flex-col justify-between max-w-xl mx-auto h-full min-h-[490px] relative">
                  
                  {/* Decorative modern label sticker */}
                  <div className="absolute top-4 right-4 flex gap-1.5 items-center font-mono text-[9px] text-slate-400 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded uppercase tracking-wide font-bold">
                    <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span>
                    ACTIVE COMPILER SHELF
                  </div>

                  {/* Top Prompt Title Banner - cleanly aligned */}
                  <div className="mb-6">
                    <div className="inline-block bg-slate-50 border border-slate-200 rounded px-3 py-1 mb-2.5 text-xs text-blue-600 font-semibold">
                      Analyst Playbook Presets
                    </div>
                    <div className="text-slate-800">
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                        {selectedTemplate.title}
                      </h2>
                    </div>
                  </div>

                  {/* Asset target subtitle */}
                  <p className="text-slate-500 text-sm italic leading-relaxed mb-6 border-b border-slate-100 pb-3">
                    {selectedTemplate.subtitle.replace("[Selected Stock]", customStock.trim() || selectedStock || "[Selected Stock]")}
                  </p>

                  {/* Bullets List */}
                  <div className="mb-6 flex-grow max-h-[170px] overflow-y-auto pr-1 custom-scrollbar">
                    <ul className="space-y-2.5 pl-1 text-slate-700 text-sm">
                      {selectedTemplate.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-blue-500 text-base leading-none mt-0.5 shrink-0">•</span>
                          <span className="font-medium">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Disclaimer banner */}
                  <div className="pt-5 border-t border-slate-100 mt-auto">
                    <p className="text-xs text-slate-450 text-slate-500 italic mb-4 font-serif">
                      {selectedTemplate.footer}
                    </p>
                    
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-[10px] text-slate-500 leading-normal">
                      <div className="font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                        <Lock size={10} className="text-blue-600" />
                        SECURE LIVE RESEARCH PIPELINE:
                      </div>
                      Triggering "Execute Research Prompt" initiates a clean Express backend proxy connection to compile factual, un-cached disclosures with Gemini.
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </div>
      </div>

      {/* Gmail Sign In Modal */}
      <AnimatePresence>
        {showGoogleModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-xl flex flex-col gap-4 relative"
            >
              <button
                onClick={() => setShowGoogleModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
              
              <div className="flex flex-col items-center text-center gap-1.5 mt-2">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-1">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.66-.23-1.23-.63-1.67-1.13z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">Gmail Sign In</h3>
                <p className="text-[11px] text-slate-500 max-w-[260px] leading-relaxed">
                  Authenticate your workspace account. Login with gmail: <code className="text-blue-600 font-semibold select-all">xyz@gmail.com</code>
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const email = formData.get("email") as string;
                  if (!email) return;
                  handleGmailLogin(email);
                  setShowGoogleModal(false);
                }}
                className="flex flex-col gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gmail / Google Address</label>
                  <input
                    name="email"
                    type="email"
                    id="gmail-login-email-input"
                    required
                    placeholder="e.g. xyz@gmail.com"
                    defaultValue="xyz@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 px-3 py-2 text-xs font-mono rounded-lg focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  id="gmail-login-submit-btn"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase py-2.5 rounded-lg transition-colors cursor-pointer text-center"
                >
                  Verify and Sign In
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
