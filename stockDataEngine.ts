// stockDataEngine.ts
// Mathematical computations for Technical Indicators & Stock Chart Time-Series

export interface StockDataPoint {
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

// Deterministic seedable random number generator so charts remain stable for specific stocks
function createRandom(seedString: string) {
  let h = 1779033703 ^ seedString.length;
  for (let i = 0; i < seedString.length; i++) {
    h = Math.imul(h ^ seedString.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function generateHistoricalMetricsSlice(stockName: string, interval: string): StockDataPoint[] {
  const rand = createRandom(stockName + interval);
  
  // Decide base price and volatility based on stockName
  let basePrice = 1500;
  let typicalVol = 1.8; // default moderate volatility (percent change per tick)
  const norm = stockName.toLowerCase();

  if (norm.includes("reliance")) {
    basePrice = 2940;
    typicalVol = 1.2;
  } else if (norm.includes("tcs") || norm.includes("consultancy")) {
    basePrice = 3850;
    typicalVol = 1.1;
  } else if (norm.includes("hdfc")) {
    basePrice = 1640;
    typicalVol = 1.3;
  } else if (norm.includes("infosys") || norm.includes("infy")) {
    basePrice = 1480;
    typicalVol = 1.6;
  } else if (norm.includes("sbi") || norm.includes("state")) {
    basePrice = 830;
    typicalVol = 1.9;
  } else if (norm.includes("itc")) {
    basePrice = 430;
    typicalVol = 1.0;
  } else {
    // Custom stocks logic
    basePrice = 250 + Math.floor(rand() * 4000);
    typicalVol = 1.0 + rand() * 2.0;
  }

  // Choose steps/data points and formatting based on interval
  let steps = 80;
  let timeFormatter = (index: number) => `Day -${steps - index}`;
  const now = new Date();

  switch (interval.toLowerCase()) {
    case "minute":
      steps = 60;
      timeFormatter = (idx) => {
        const d = new Date(now.getTime() - (steps - idx) * 60000);
        return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
      };
      typicalVol *= 0.15; // smaller changes minute-to-minute
      break;
    case "hourly":
      steps = 48;
      timeFormatter = (idx) => {
        const d = new Date(now.getTime() - (steps - idx) * 3600000);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
      };
      typicalVol *= 0.35;
      break;
    case "weekly":
      steps = 104; // 2 years of weekly bars
      timeFormatter = (idx) => {
        const d = new Date(now.getTime() - (steps - idx) * 7 * 86400000);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
      };
      typicalVol *= 3.2; // wider swings weekly
      break;
    case "yearly":
      steps = 15; // 15 years history
      timeFormatter = (idx) => {
        return (now.getFullYear() - steps + idx).toString();
      };
      typicalVol *= 9.5; // massive year-to-year swings
      break;
    case "day":
    default:
      steps = 90; // 90 days history
      timeFormatter = (idx) => {
        const d = new Date(now.getTime() - (steps - idx) * 86400000);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      };
      break;
  }

  // Step 1: Generate Raw Price Walk (Brownian motion style)
  const data: StockDataPoint[] = [];
  let currentPrice = basePrice * (0.8 + rand() * 0.4); // randomize start price somewhat
  
  for (let i = 0; i < steps; i++) {
    const time = timeFormatter(i);
    // Drift upward slightly for real market bias
    const drift = 0.05; 
    const changePercent = (rand() - 0.48 + drift) * typicalVol;
    const previousClose = currentPrice;
    currentPrice = previousClose * (1 + changePercent / 100);

    const open = previousClose;
    const close = currentPrice;
    
    // High-Low limits
    const rawHigh = Math.max(open, close) * (1 + (rand() * typicalVol) / 200);
    const rawLow = Math.min(open, close) * (1 - (rand() * typicalVol) / 200);
    
    const high = Number(rawHigh.toFixed(2));
    const low = Number(rawLow.toFixed(2));
    const vol = Math.floor(50000 + rand() * 1950000);

    data.push({
      time,
      open: Number(open.toFixed(2)),
      high,
      low,
      close: Number(close.toFixed(2)),
      volume: vol
    });
  }

  // Step 2: Compute Indicators
  const prices = data.map(d => d.close);

  // Simple Moving Average (SMA - period 20)
  const smaPeriod = 20;
  for (let i = 0; i < steps; i++) {
    if (i >= smaPeriod - 1) {
      let sum = 0;
      for (let j = 0; j < smaPeriod; j++) {
        sum += prices[i - j];
      }
      data[i].sma = Number((sum / smaPeriod).toFixed(2));
    }
  }

  // Exponential Moving Average helper
  const computeEMA = (period: number): number[] => {
    const k = 2 / (period + 1);
    const ema: number[] = [];
    if (prices.length === 0) return ema;
    
    // Initial point as SMA
    let initialSum = 0;
    for (let j = 0; j < Math.min(period, prices.length); j++) {
      initialSum += prices[j];
    }
    let currentEMA = initialSum / Math.min(period, prices.length);
    ema.push(currentEMA);

    for (let i = 1; i < prices.length; i++) {
      currentEMA = prices[i] * k + currentEMA * (1 - k);
      ema.push(currentEMA);
    }
    return ema;
  };

  const ema12 = computeEMA(12);
  const ema26 = computeEMA(26);

  // Map EMAs
  for (let i = 0; i < steps; i++) {
    data[i].ema12 = Number(ema12[i].toFixed(2));
    data[i].ema26 = Number(ema26[i].toFixed(2));
  }

  // Bollinger Bands (20 period, 2 StdDev)
  const bbPeriod = 20;
  for (let i = 0; i < steps; i++) {
    if (i >= bbPeriod - 1) {
      // Mean
      let sum = 0;
      for (let j = 0; j < bbPeriod; j++) {
        sum += prices[i - j];
      }
      const mean = sum / bbPeriod;
      
      // Std Dev
      let varianceSum = 0;
      for (let j = 0; j < bbPeriod; j++) {
        varianceSum += Math.pow(prices[i - j] - mean, 2);
      }
      const stdDev = Math.sqrt(varianceSum / bbPeriod);
      
      data[i].bbMid = Number(mean.toFixed(2));
      data[i].bbUpper = Number((mean + 2 * stdDev).toFixed(2));
      data[i].bbLower = Number((mean - 2 * stdDev).toFixed(2));
    }
  }

  // RSI (Period 14)
  const rsiPeriod = 14;
  let avgGain = 0;
  let avgLoss = 0;

  // First RSI item setup
  if (steps > rsiPeriod) {
    let gains = 0;
    let losses = 0;
    for (let i = 1; i <= rsiPeriod; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    avgGain = gains / rsiPeriod;
    avgLoss = losses / rsiPeriod;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    data[rsiPeriod].rsi = Number((100 - (100 / (1 + rs))).toFixed(2));

    // Dynamic Wilder smoothing
    for (let i = rsiPeriod + 1; i < steps; i++) {
      const diff = prices[i] - prices[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      
      avgGain = (avgGain * 13 + gain) / 14;
      avgLoss = (avgLoss * 13 + loss) / 14;
      
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      data[i].rsi = Number((100 - (100 / (1 + rs))).toFixed(2));
    }
  }

  // MACD (12, 26, 9)
  const macdLine: number[] = [];
  for (let i = 0; i < steps; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }

  // Signal Line: 9-day EMA of MacdLine
  const computeSignalEMA = (series: number[], period: number): number[] => {
    const k = 2 / (period + 1);
    const signal: number[] = [];
    if (series.length === 0) return signal;
    
    let currentSignalEMA = series[0];
    signal.push(currentSignalEMA);

    for (let i = 1; i < series.length; i++) {
      currentSignalEMA = series[i] * k + currentSignalEMA * (1 - k);
      signal.push(currentSignalEMA);
    }
    return signal;
  };

  const signalLine = computeSignalEMA(macdLine, 9);

  for (let i = 0; i < steps; i++) {
    data[i].macd = Number(macdLine[i].toFixed(2));
    data[i].macdSignal = Number(signalLine[i].toFixed(2));
    data[i].macdHist = Number((macdLine[i] - signalLine[i]).toFixed(2));
  }

  return data;
}
