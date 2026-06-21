import React, { useState, useRef, useMemo } from "react";
import { 
  TrendingUp, 
  Settings, 
  Layers, 
  BarChart4, 
  Percent, 
  Info,
  CalendarDays,
  LineChart,
  Eye,
  Activity
} from "lucide-react";

interface StockDataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma?: number;
  ema12?: number;
  ema26?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMid?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHist?: number;
}

interface StockInteractiveChartProps {
  stockName: string;
  data: StockDataPoint[];
  loading: boolean;
  interval: string;
  onIntervalChange: (interval: string) => void;
}

export default function StockInteractiveChart({
  stockName,
  data = [],
  loading,
  interval,
  onIntervalChange
}: StockInteractiveChartProps) {
  const [activeIndicators, setActiveIndicators] = useState({
    sma: true,
    ema: false,
    bbands: false,
    rsi: true,
    macd: false,
    volume: true
  });

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Toggle helpers
  const toggleIndicator = (ind: keyof typeof activeIndicators) => {
    setActiveIndicators(prev => ({
      ...prev,
      [ind]: !prev[ind]
    }));
  };

  // Dimensions
  const viewWidth = 720;
  const priceHeight = 240;
  const indicatorHeight = 70;
  
  // Calculate total height dynamically based on active indicator panes
  let dynamicHeight = priceHeight + 35; // default margin
  if (activeIndicators.rsi) dynamicHeight += indicatorHeight + 25;
  if (activeIndicators.macd) dynamicHeight += indicatorHeight + 25;

  // Active hover point
  const activePoint = useMemo(() => {
    if (data.length === 0) return null;
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < data.length) {
      return data[hoverIndex];
    }
    return data[data.length - 1]; // default to latest
  }, [data, hoverIndex]);

  // Calculate Price Limits (min and max) to fit candles, SMA, Bollinger Bands, etc.
  const priceMetrics = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    
    let absoluteMax = -Infinity;
    let absoluteMin = Infinity;

    data.forEach(d => {
      // Base highs/lows
      if (d.high > absoluteMax) absoluteMax = d.high;
      if (d.low < absoluteMin) absoluteMin = d.low;

      // Check active indicators
      if (activeIndicators.sma && d.sma !== undefined) {
        if (d.sma > absoluteMax) absoluteMax = d.sma;
        if (d.sma < absoluteMin) absoluteMin = d.sma;
      }
      if (activeIndicators.ema && d.ema12 !== undefined && d.ema26 !== undefined) {
        if (d.ema12 > absoluteMax) absoluteMax = d.ema12;
        if (d.ema12 < absoluteMin) absoluteMin = d.ema12;
        if (d.ema26 > absoluteMax) absoluteMax = d.ema26;
        if (d.ema26 < absoluteMin) absoluteMin = d.ema26;
      }
      if (activeIndicators.bbands && d.bbUpper !== undefined && d.bbLower !== undefined) {
        if (d.bbUpper > absoluteMax) absoluteMax = d.bbUpper;
        if (d.bbLower < absoluteMin) absoluteMin = d.bbLower;
      }
    });

    // Add padding (4% top, 4% bottom)
    const padding = (absoluteMax - absoluteMin) * 0.04 || 10;
    return {
      min: Math.max(0, absoluteMin - padding),
      max: absoluteMax + padding
    };
  }, [data, activeIndicators]);

  // Volume scale
  const maxVolume = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.volume));
  }, [data]);

  // RSI scale (0 to 100)
  // MACD scale (calculate max absolute MACD values for bounds)
  const macdMetrics = useMemo(() => {
    if (data.length === 0) return { val: 5 };
    const maxVal = Math.max(
      ...data.map(d => Math.max(
        Math.abs(d.macd || 0), 
        Math.abs(d.macdSignal || 0), 
        Math.abs(d.macdHist || 0)
      ))
    );
    return { val: maxVal || 2 };
  }, [data]);

  // Mouse move projection mapping
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Convert coordinate X of mouse to data index
    const paddingLeft = 10;
    const paddingRight = 60;
    const usableWidth = viewWidth - paddingLeft - paddingRight;
    const relativeX = x - paddingLeft;

    if (relativeX < 0) {
      setHoverIndex(0);
      return;
    }
    if (relativeX > usableWidth) {
      setHoverIndex(data.length - 1);
      return;
    }

    const ratio = relativeX / usableWidth;
    let idx = Math.floor(ratio * data.length);
    if (idx < 0) idx = 0;
    if (idx >= data.length) idx = data.length - 1;
    setHoverIndex(idx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Helper to map values to SVG pixel heights
  const getPriceY = (val: number) => {
    const scale = (val - priceMetrics.min) / (priceMetrics.max - priceMetrics.min);
    return priceHeight - scale * (priceHeight - 20) - 10;
  };

  const getRsiY = (val: number, startY: number) => {
    // RSI range is 0 to 100
    const scale = val / 100;
    return startY + indicatorHeight - scale * (indicatorHeight - 10) - 5;
  };

  const getMacdY = (val: number, startY: number) => {
    // Center is 0
    const limit = macdMetrics.val;
    const scale = val / limit; // -1 to 1
    const halfH = indicatorHeight / 2;
    return startY + halfH - scale * (halfH - 5);
  };

  // Build grid coordinate paths
  const pointSpacing = (viewWidth - 70) / Math.max(1, data.length - 1);
  const getX = (index: number) => 10 + index * pointSpacing;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 flex flex-col gap-4">
      
      {/* Top Controller Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></span>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
              Interactive Technical Canvas
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
            Realtime Analytics • Formula-Driven Execution
          </p>
        </div>

        {/* Intervals */}
        <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-1 gap-1">
          {["minute", "hourly", "day", "weekly", "yearly"].map((intervalKey) => (
            <button
              key={intervalKey}
              onClick={() => onIntervalChange(intervalKey)}
              className={`px-3 py-1 text-[10px] uppercase font-mono tracking-wider font-semibold rounded-md transition-all ${
                interval.toLowerCase() === intervalKey
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {intervalKey === "minute" ? "1 min" : intervalKey === "hourly" ? "1 hr" : intervalKey === "day" ? "Daily" : intervalKey === "weekly" ? "Weekly" : "Yearly"}
            </button>
          ))}
        </div>
      </div>

      {/* Live HUD - Interactive Tick Value Preview (Beautified Row & Column structure) */}
      {activePoint && (
        <div className="bg-slate-50/70 border border-slate-200/60 p-4 rounded-lg grid grid-cols-2 md:grid-cols-6 gap-y-3 gap-x-2 text-xs divide-y md:divide-y-0 md:divide-x divide-slate-200/80">
          
          <div className="flex flex-col justify-center px-2">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold mb-0.5">Timestamp</span>
            <span className="font-bold text-slate-800 truncate">{activePoint.time}</span>
          </div>

          <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold mb-0.5">Open Price</span>
            <span className="font-semibold text-slate-700">₹{activePoint.open.toLocaleString("en-IN")}</span>
          </div>

          <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold mb-0.5">High / Low</span>
            <span className="font-semibold text-slate-800">
              <span className="text-emerald-600 font-bold">₹{activePoint.high.toLocaleString("en-IN")}</span>
              <span className="text-slate-400 mx-1">/</span>
              <span className="text-rose-600 font-bold">₹{activePoint.low.toLocaleString("en-IN")}</span>
            </span>
          </div>

          <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold mb-0.5">Close Price</span>
            <span className="font-bold text-slate-900 bg-blue-50/50 px-1 py-0.5 rounded border border-blue-50">₹{activePoint.close.toLocaleString("en-IN")}</span>
          </div>

          <div className="flex flex-col justify-center px-2 pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold mb-0.5">Volume Traded</span>
            <span className="font-mono text-slate-600 font-medium">{activePoint.volume.toLocaleString("en-IN")}</span>
          </div>

          {/* Quick interactive indicators display calculated real-time */}
          <div className="flex flex-col justify-center px-3 pt-2 md:pt-0">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold mb-0.5">Technical Signal</span>
            {activePoint.rsi ? (
              <span className={`text-[10px] px-1.5 py-0.5 font-bold uppercase rounded w-fit ${
                activePoint.rsi > 70 
                  ? "bg-rose-100 text-rose-800"
                  : activePoint.rsi < 30
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-blue-100 text-blue-800"
              }`}>
                {activePoint.rsi > 70 ? "Overbought" : activePoint.rsi < 30 ? "Oversold" : "Neutral Range"}
              </span>
            ) : (
              <span className="text-slate-400 italic">Calculating...</span>
            )}
          </div>
        </div>
      )}

      {/* Main Indicators Toggle Ribbon */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50/40 p-2 border border-slate-100 rounded-lg">
        <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider px-1">
          Indicator Overlays:
        </span>
        
        <button
          onClick={() => toggleIndicator("sma")}
          className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
            activeIndicators.sma
              ? "bg-blue-50 border-blue-200 text-blue-700 font-semibold shadow-xs"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Activity size={10} className="text-blue-500" />
          SMA (20)
        </button>

        <button
          onClick={() => toggleIndicator("ema")}
          className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
            activeIndicators.ema
              ? "bg-amber-50 border-amber-200 text-amber-700 font-semibold shadow-xs"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <LineChart size={10} className="text-amber-550" />
          EMA (12/26)
        </button>

        <button
          onClick={() => toggleIndicator("bbands")}
          className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
            activeIndicators.bbands
              ? "bg-purple-50 border-purple-200 text-purple-700 font-semibold shadow-xs"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Eye size={10} className="text-purple-500" />
          Bollinger Bands
        </button>

        <div className="w-px h-4 bg-slate-200 mx-1"></div>

        <button
          onClick={() => toggleIndicator("rsi")}
          className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
            activeIndicators.rsi
              ? "bg-teal-50 border-teal-200 text-teal-700 font-semibold shadow-xs"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <Percent size={10} className="text-teal-600" />
          RSI Pane
        </button>

        <button
          onClick={() => toggleIndicator("macd")}
          className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold flex items-center gap-1.5 border transition-all ${
            activeIndicators.macd
              ? "bg-rose-50 border-rose-200 text-rose-700 font-semibold shadow-xs"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          <BarChart4 size={10} className="text-rose-500" />
          MACD Hist
        </button>
      </div>

      {/* SVG Interactive Plot Area */}
      <div 
        ref={containerRef}
        className="relative bg-[#FCFDFE] border border-slate-200/80 rounded-xl overflow-hidden min-h-[300px]"
      >
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-[11px] uppercase font-mono font-bold mt-2.5 text-slate-500">Querying technical series...</p>
          </div>
        )}

        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-xs text-slate-450 text-slate-400">
            No dataset fetched to render.
          </div>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${viewWidth} ${dynamicHeight}`}
            width="100%"
            height="100%"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="cursor-crosshair select-none font-sans"
          >
            {/* Price section background grid lines */}
            {[0.2, 0.4, 0.6, 0.8].map((ratio, idx) => {
              const y = 20 + ratio * (priceHeight - 40);
              const priceVal = priceMetrics.min + (1 - ratio) * (priceMetrics.max - priceMetrics.min);
              return (
                <g key={idx}>
                  <line
                    x1="10"
                    y1={y}
                    x2={viewWidth - 60}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                  />
                  <text
                    x={viewWidth - 55}
                    y={y + 3}
                    fill="#94A3B8"
                    fontSize="9"
                    fontWeight="500"
                    className="font-mono"
                  >
                    ₹{Math.floor(priceVal)}
                  </text>
                </g>
              );
            })}

            {/* Vertical timeline anchors (grid line labels) */}
            {data.map((d, index) => {
              if (index % Math.floor(data.length / 5 || 1) === 0) {
                const x = getX(index);
                return (
                  <g key={index}>
                    <line
                      x1={x}
                      y1="10"
                      x2={x}
                      y2={dynamicHeight - 20}
                      stroke="#F8FAFC"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={dynamicHeight - 5}
                      textAnchor="middle"
                      fill="#94A3B8"
                      fontSize="8"
                      className="font-mono font-semibold"
                    >
                      {d.time}
                    </text>
                  </g>
                );
              }
              return null;
            })}

            {/* Bollinger Bands Shaded Area & Boundaries */}
            {activeIndicators.bbands && (() => {
              let shadedPath = "";
              let upperLine = "";
              let lowerLine = "";

              data.forEach((d, idx) => {
                if (d.bbUpper !== undefined && d.bbLower !== undefined) {
                  const x = getX(idx);
                  const yUp = getPriceY(d.bbUpper);
                  const yLow = getPriceY(d.bbLower);
                  
                  if (idx === 19) { // period 20 starts
                    shadedPath += `M ${x} ${yUp}`;
                    upperLine += `M ${x} ${yUp}`;
                    lowerLine += `M ${x} ${yLow}`;
                  } else if (idx > 19) {
                    shadedPath += ` L ${x} ${yUp}`;
                    upperLine += ` L ${x} ${yUp}`;
                    lowerLine += ` L ${x} ${yLow}`;
                  }
                }
              });

              // Cycle back leftwards on bottom channel to close the poly shape
              for (let idx = data.length - 1; idx >= 19; idx--) {
                const d = data[idx];
                if (d.bbLower !== undefined) {
                  const x = getX(idx);
                  const yLow = getPriceY(d.bbLower);
                  shadedPath += ` L ${x} ${yLow}`;
                }
              }
              if (shadedPath) shadedPath += " Z";

              return (
                <g>
                  {shadedPath && (
                    <path
                      d={shadedPath}
                      fill="rgba(147, 51, 234, 0.05)"
                      stroke="none"
                    />
                  )}
                  {upperLine && (
                    <path
                      d={upperLine}
                      fill="none"
                      stroke="#C084FC"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  )}
                  {lowerLine && (
                    <path
                      d={lowerLine}
                      fill="none"
                      stroke="#C084FC"
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  )}
                </g>
              );
            })()}

            {/* SMA (20) Line */}
            {activeIndicators.sma && (() => {
              let pathStr = "";
              data.forEach((d, idx) => {
                if (d.sma !== undefined) {
                  const x = getX(idx);
                  const y = getPriceY(d.sma);
                  if (idx === 19) pathStr += `M ${x} ${y}`;
                  else if (idx > 19) pathStr += ` L ${x} ${y}`;
                }
              });
              return pathStr ? (
                <path
                  d={pathStr}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : null;
            })()}

            {/* EMA12 and EMA26 lines */}
            {activeIndicators.ema && (() => {
              let p12 = "";
              let p26 = "";
              data.forEach((d, idx) => {
                if (d.ema12 !== undefined && d.ema26 !== undefined) {
                  const x = getX(idx);
                  const y12 = getPriceY(d.ema12);
                  const y26 = getPriceY(d.ema26);
                  if (idx === 0) {
                    p12 += `M ${x} ${y12}`;
                    p26 += `M ${x} ${y26}`;
                  } else {
                    p12 += ` L ${x} ${y12}`;
                    p26 += ` L ${x} ${y26}`;
                  }
                }
              });
              return (
                <g>
                  <path d={p12} fill="none" stroke="#F59E0B" strokeWidth="1.5" />
                  <path d={p26} fill="none" stroke="#EC4899" strokeWidth="1.5" />
                </g>
              );
            })()}

            {/* Volume overlay columns (anchored at the bottom of the price pane) */}
            {activeIndicators.volume && (
              <g opacity="0.15">
                {data.map((d, idx) => {
                  const w = Math.max(1, pointSpacing - 1);
                  const x = getX(idx) - w / 2;
                  const ratio = d.volume / maxVolume;
                  const h = ratio * 45; // max 45px tall
                  const y = priceHeight - h - 5;
                  const color = d.close >= d.open ? "#10B981" : "#EF4444";
                  return (
                    <rect
                      key={idx}
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill={color}
                    />
                  );
                })}
              </g>
            )}

            {/* Candlestick Drawing plots */}
            {data.map((d, idx) => {
              const x = getX(idx);
              const yOpen = getPriceY(d.open);
              const yClose = getPriceY(d.close);
              const yHigh = getPriceY(d.high);
              const yLow = getPriceY(d.low);

              const isUp = d.close >= d.open;
              const barColor = isUp ? "#22C55E" : "#EF4444";
              const candleW = Math.max(3, pointSpacing * 0.62);

              return (
                <g key={idx}>
                  {/* Wick line */}
                  <line
                    x1={x}
                    y1={yHigh}
                    x2={x}
                    y2={yLow}
                    stroke={barColor}
                    strokeWidth="1.5"
                  />
                  {/* Real body column */}
                  <rect
                    x={x - candleW / 2}
                    y={Math.min(yOpen, yClose)}
                    width={candleW}
                    height={Math.max(1.5, Math.abs(yOpen - yClose))}
                    fill={isUp ? "#22C55E" : "#EF4444"}
                    stroke={isUp ? "none" : "#EF4444"}
                    strokeWidth="1"
                    rx="1"
                  />
                </g>
              );
            })}

            {/* Indicator pane 1: RSI (Relative Strength Index) */}
            {activeIndicators.rsi && (() => {
              const startY = priceHeight + 25;
              const limitLowY = getRsiY(30, startY);
              const limitHighY = getRsiY(70, startY);
              
              // RSI flow path
              let rsiPath = "";
              data.forEach((d, idx) => {
                if (d.rsi !== undefined) {
                  const x = getX(idx);
                  const y = getRsiY(d.rsi, startY);
                  if (idx === 14) rsiPath += `M ${x} ${y}`;
                  else if (idx > 14) rsiPath += ` L ${x} ${y}`;
                }
              });

              return (
                <g>
                  {/* Title / Labels */}
                  <text x="12" y={startY - 6} fontSize="9" fontWeight="bold" fill="#0D9488" className="font-mono tracking-wider uppercase">
                    RSI (14) • Range Index
                  </text>
                  <text x={viewWidth - 35} y={limitLowY + 3} fontSize="8" fontWeight="600" fill="#94A3B8" className="font-mono">
                    30
                  </text>
                  <text x={viewWidth - 35} y={limitHighY + 3} fontSize="8" fontWeight="600" fill="#94A3B8" className="font-mono">
                    70
                  </text>

                  {/* Envelope line ranges */}
                  <line x1="10" y1={limitLowY} x2={viewWidth - 60} y2={limitLowY} stroke="#CCFBF1" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="10" y1={limitHighY} x2={viewWidth - 60} y2={limitHighY} stroke="#FEE2E2" strokeWidth="1" strokeDasharray="3,3" />
                  
                  {/* Subtle Shaded Mid Channel */}
                  <rect x="10" y={limitHighY} width={viewWidth - 70} height={limitLowY - limitHighY} fill="#F0FDFA" opacity="0.38" />

                  {/* RSI Path line */}
                  {rsiPath && (
                    <path
                      d={rsiPath}
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="1.5"
                    />
                  )}
                </g>
              );
            })()}

            {/* Indicator pane 2: MACD Histogram & Lines */}
            {activeIndicators.macd && (() => {
              const startY = priceHeight + 25 + (activeIndicators.rsi ? indicatorHeight + 25 : 0);
              const centerY = getMacdY(0, startY);

              // MACD and Signal compilation paths
              let pMacd = "";
              let pSig = "";

              data.forEach((d, idx) => {
                if (d.macd !== undefined && d.macdSignal !== undefined) {
                  const x = getX(idx);
                  const yM = getMacdY(d.macd, startY);
                  const yS = getMacdY(d.macdSignal, startY);
                  if (idx === 0) {
                    pMacd += `M ${x} ${yM}`;
                    pSig += `M ${x} ${yS}`;
                  } else {
                    pMacd += ` L ${x} ${yM}`;
                    pSig += ` L ${x} ${yS}`;
                  }
                }
              });

              return (
                <g>
                  {/* Title / Labels */}
                  <text x="12" y={startY - 6} fontSize="9" fontWeight="bold" fill="#E11D48" className="font-mono tracking-wider uppercase">
                    MACD (12, 26, 9) • Divergence Momentum 
                  </text>

                  <line x1="10" y1={centerY} x2={viewWidth - 60} y2={centerY} stroke="#E2E8F0" strokeWidth="1" />

                  {/* Histogram bars */}
                  {data.map((d, idx) => {
                    if (d.macdHist === undefined) return null;
                    const w = Math.max(1.5, pointSpacing * 0.4);
                    const x = getX(idx) - w / 2;
                    const yVal = getMacdY(d.macdHist, startY);
                    const isBully = d.macdHist >= 0;
                    const barH = Math.abs(yVal - centerY);
                    const y = isBully ? centerY - barH : centerY;
                    const fill = isBully ? "rgba(16, 185, 129, 0.65)" : "rgba(239, 68, 68, 0.65)";
                    return (
                      <rect
                        key={idx}
                        x={x}
                        y={y}
                        width={w}
                        height={barH || 1}
                        fill={fill}
                      />
                    );
                  })}

                  {/* MACD Line */}
                  {pMacd && <path d={pMacd} fill="none" stroke="#2563EB" strokeWidth="1.2" />}
                  {pSig && <path d={pSig} fill="none" stroke="#F59E0B" strokeWidth="1.2" />}
                </g>
              );
            })()}

            {/* Vertical guidelines on cursor hover */}
            {hoverIndex !== null && (() => {
              const x = getX(hoverIndex);
              return (
                <g>
                  <line
                    x1={x}
                    y1="10"
                    x2={x}
                    y2={dynamicHeight - 20}
                    stroke="#475569"
                    strokeWidth="1.2"
                    strokeDasharray="4,4"
                  />
                  {/* Tiny pulsing focus point */}
                  <circle
                    cx={x}
                    cy={getPriceY(data[hoverIndex].close)}
                    r="4"
                    fill="#3B82F6"
                    stroke="#FFFF"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })()}
          </svg>
        )}
      </div>

      {/* Mini regulatory advisory footer */}
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-50 p-2 border border-slate-100 rounded-md font-mono">
        <Info size={11} className="text-blue-500 shrink-0" />
        <span>Use cursor sweep overlay directly atop curves to query coordinates and index indicator trends seamlessly.</span>
      </div>
    </div>
  );
}
