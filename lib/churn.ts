export interface ChurnSignals {
  daysSinceLastOrder: number | null;
  lastOrderDate: string | null;
  deadQrScans7d: number;
  totalQrScans7d: number;
  deadQrScanRate: number; // 0 - 100 percentage
  orderDropPct7d: number | null; // e.g. 50 means 50% drop
  ordersLast7d: number;
  ordersPrior7d: number;
  riskScore: number; // 0 - 100
  riskLevel: "critical" | "high" | "moderate" | "low";
  reasons: string[];
  recommendedAction: string;
}

export interface ChurnEvaluationInput {
  daysSinceLastOrder: number | null;
  lastOrderDate: string | null;
  deadQrScans7d: number;
  totalQrScans7d: number;
  ordersLast7d: number;
  ordersPrior7d: number;
  billingStatus?: string;
  hasDowntimeLast30d?: boolean;
}

export function evaluateChurnSignals(input: ChurnEvaluationInput): ChurnSignals {
  const {
    daysSinceLastOrder,
    lastOrderDate,
    deadQrScans7d,
    totalQrScans7d,
    ordersLast7d,
    ordersPrior7d,
    billingStatus,
  } = input;

  let score = 0;
  const reasons: string[] = [];

  // 1. Inactivity evaluation
  if (daysSinceLastOrder === null) {
    score += 45;
    reasons.push("Zero lifetime orders recorded on platform");
  } else if (daysSinceLastOrder >= 14) {
    score += 45;
    reasons.push(`${daysSinceLastOrder} days since last placed order`);
  } else if (daysSinceLastOrder >= 7) {
    score += 25;
    reasons.push(`${daysSinceLastOrder} days without order activity`);
  } else if (daysSinceLastOrder >= 3) {
    score += 10;
    reasons.push(`${daysSinceLastOrder} days since last order`);
  }

  // 2. Dead QR scans evaluation (Diners opening sessions but placing zero orders)
  const deadQrScanRate =
    totalQrScans7d > 0
      ? Math.round((deadQrScans7d / totalQrScans7d) * 100)
      : 0;

  if (totalQrScans7d >= 3) {
    if (deadQrScanRate >= 70) {
      score += 35;
      reasons.push(
        `${deadQrScanRate}% dead QR scans (${deadQrScans7d}/${totalQrScans7d} diners abandoned menu without ordering)`
      );
    } else if (deadQrScanRate >= 45) {
      score += 20;
      reasons.push(
        `High scan drop-off: ${deadQrScanRate}% abandoned sessions (${deadQrScans7d} dead scans)`
      );
    }
  }

  // 3. Week-over-week order velocity drop
  let orderDropPct7d: number | null = null;
  if (ordersPrior7d > 0) {
    const diff = ordersPrior7d - ordersLast7d;
    if (diff > 0) {
      orderDropPct7d = Math.round((diff / ordersPrior7d) * 100);
      if (orderDropPct7d >= 60) {
        score += 25;
        reasons.push(`Order volume fell by ${orderDropPct7d}% over last 7 days`);
      } else if (orderDropPct7d >= 35) {
        score += 15;
        reasons.push(`Order velocity declined by ${orderDropPct7d}%`);
      }
    } else {
      orderDropPct7d = 0;
    }
  } else if (ordersPrior7d === 0 && ordersLast7d === 0 && daysSinceLastOrder !== null && daysSinceLastOrder > 7) {
    orderDropPct7d = 100;
  }

  // 4. Billing signals
  const normBilling = (billingStatus || "").toLowerCase();
  if (["past_due", "halted", "expired", "canceled"].includes(normBilling)) {
    score += 20;
    reasons.push(`Subscription billing status is ${normBilling.replace("_", " ")}`);
  }

  // Cap score between 0 and 100
  const riskScore = Math.min(100, Math.max(0, score));

  // Determine risk level
  let riskLevel: "critical" | "high" | "moderate" | "low" = "low";
  let recommendedAction = "Engagement healthy. Routine monitoring.";

  if (riskScore >= 75) {
    riskLevel = "critical";
    if (deadQrScanRate >= 60) {
      recommendedAction =
        "Urgent: Check physical table QR stands & diner Wi-Fi connectivity. Diners are scanning but not placing orders.";
    } else if (daysSinceLastOrder && daysSinceLastOrder >= 7) {
      recommendedAction =
        "High churn alert: Call restaurant owner immediately to troubleshoot POS hardware or kitchen offline status.";
    } else {
      recommendedAction =
        "Critical retention risk: Schedule immediate account manager check-in or retention offer.";
    }
  } else if (riskScore >= 45) {
    riskLevel = "high";
    recommendedAction =
      "Priority follow-up: Investigate drop in order flow or dead scans with store manager.";
  } else if (riskScore >= 20) {
    riskLevel = "moderate";
    recommendedAction =
      "Watchlist: Monitor order volume and check if staff needs re-training on QR flow.";
  }

  if (reasons.length === 0) {
    reasons.push("Consistent daily orders and healthy QR scan conversion");
  }

  return {
    daysSinceLastOrder,
    lastOrderDate,
    deadQrScans7d,
    totalQrScans7d,
    deadQrScanRate,
    orderDropPct7d,
    ordersLast7d,
    ordersPrior7d,
    riskScore,
    riskLevel,
    reasons,
    recommendedAction,
  };
}
