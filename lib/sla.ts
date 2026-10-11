export type TicketPriority = "critical" | "high" | "normal" | "low";

export interface SlaTarget {
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

export const SLA_TARGETS: Record<TicketPriority, SlaTarget> = {
  critical: {
    firstResponseMinutes: 60, // 1 hour
    resolutionMinutes: 240, // 4 hours
  },
  high: {
    firstResponseMinutes: 240, // 4 hours
    resolutionMinutes: 720, // 12 hours
  },
  normal: {
    firstResponseMinutes: 720, // 12 hours
    resolutionMinutes: 1440, // 24 hours
  },
  low: {
    firstResponseMinutes: 1440, // 24 hours
    resolutionMinutes: 2880, // 48 hours
  },
};

export interface TicketSlaDetails {
  priority: TicketPriority;
  targetResponseMinutes: number;
  targetResolutionMinutes: number;
  elapsedMinutes: number;
  responseElapsedMinutes: number | null;
  resolutionElapsedMinutes: number | null;
  isResponded: boolean;
  isResolved: boolean;
  responseStatus: "met" | "breached" | "approaching_breach" | "within_sla";
  resolutionStatus: "resolved_in_sla" | "resolved_breached" | "breached" | "in_progress";
  badgeText: string;
  badgeClass: string;
  timeRemainingMinutes: number | null;
}

export interface SlaSummaryMetrics {
  totalTickets: number;
  openTickets: number;
  breachedCount: number;
  approachingCount: number;
  complianceRate: number; // 0 - 100 percentage
  avgResponseMinutes: number;
  avgResolutionMinutes: number;
}

export function normalizePriority(raw: string | null | undefined): TicketPriority {
  const p = (raw || "").toLowerCase().trim();
  if (p === "critical" || p === "urgent") return "critical";
  if (p === "high") return "high";
  if (p === "low") return "low";
  return "normal";
}

export function formatSlaMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

const formatMinutes = formatSlaMinutes;

export function evaluateTicketSla(ticket: {
  priority: string;
  created_at: string;
  status: string;
  admin_responded_at?: string | null;
  resolved_at?: string | null;
}): TicketSlaDetails {
  const priority = normalizePriority(ticket.priority);
  const target = SLA_TARGETS[priority];
  const createdDate = new Date(ticket.created_at);
  const now = new Date();

  const totalElapsedMinutes = Math.max(
    0,
    Math.round((now.getTime() - createdDate.getTime()) / (1000 * 60))
  );

  const isResponded = Boolean(ticket.admin_responded_at);
  const isResolved = ticket.status === "resolved" || ticket.status === "wont_fix";

  let responseElapsedMinutes: number | null = null;
  if (ticket.admin_responded_at) {
    const respDate = new Date(ticket.admin_responded_at);
    responseElapsedMinutes = Math.max(
      0,
      Math.round((respDate.getTime() - createdDate.getTime()) / (1000 * 60))
    );
  }

  let resolutionElapsedMinutes: number | null = null;
  if (ticket.resolved_at) {
    const resDate = new Date(ticket.resolved_at);
    resolutionElapsedMinutes = Math.max(
      0,
      Math.round((resDate.getTime() - createdDate.getTime()) / (1000 * 60))
    );
  } else if (isResolved && ticket.admin_responded_at) {
    resolutionElapsedMinutes = responseElapsedMinutes;
  }

  // Response status
  let responseStatus: TicketSlaDetails["responseStatus"] = "within_sla";
  let badgeText = "";
  let badgeClass = "";
  let timeRemainingMinutes: number | null = null;

  if (isResponded && responseElapsedMinutes !== null) {
    if (responseElapsedMinutes <= target.firstResponseMinutes) {
      responseStatus = "met";
      badgeText = `FRT Met (${formatMinutes(responseElapsedMinutes)})`;
      badgeClass = "bg-emerald-100 text-emerald-800 border border-emerald-200";
    } else {
      responseStatus = "breached";
      const breachBy = responseElapsedMinutes - target.firstResponseMinutes;
      badgeText = `FRT Breached by ${formatMinutes(breachBy)}`;
      badgeClass = "bg-rose-100 text-rose-800 border border-rose-200";
    }
  } else {
    // Unresponded
    const remaining = target.firstResponseMinutes - totalElapsedMinutes;
    timeRemainingMinutes = remaining;

    if (remaining < 0) {
      responseStatus = "breached";
      badgeText = `FRT Overdue by ${formatMinutes(Math.abs(remaining))}`;
      badgeClass = "bg-rose-100 text-rose-800 border border-rose-200 animate-pulse";
    } else if (remaining <= 30) {
      responseStatus = "approaching_breach";
      badgeText = `⚠️ SLA Due in ${formatMinutes(remaining)}`;
      badgeClass = "bg-orange-100 text-orange-800 border border-orange-200";
    } else {
      responseStatus = "within_sla";
      badgeText = `SLA OK (${formatMinutes(remaining)} left)`;
      badgeClass = "bg-blue-50 text-blue-700 border border-blue-200";
    }
  }

  // Resolution status
  let resolutionStatus: TicketSlaDetails["resolutionStatus"] = "in_progress";
  if (isResolved) {
    if (
      resolutionElapsedMinutes !== null &&
      resolutionElapsedMinutes <= target.resolutionMinutes
    ) {
      resolutionStatus = "resolved_in_sla";
    } else {
      resolutionStatus = "resolved_breached";
    }
  } else if (totalElapsedMinutes > target.resolutionMinutes) {
    resolutionStatus = "breached";
  }

  return {
    priority,
    targetResponseMinutes: target.firstResponseMinutes,
    targetResolutionMinutes: target.resolutionMinutes,
    elapsedMinutes: totalElapsedMinutes,
    responseElapsedMinutes,
    resolutionElapsedMinutes,
    isResponded,
    isResolved,
    responseStatus,
    resolutionStatus,
    badgeText,
    badgeClass,
    timeRemainingMinutes,
  };
}

export function computeSlaSummary(
  tickets: Array<{
    priority: string;
    created_at: string;
    status: string;
    admin_responded_at?: string | null;
    resolved_at?: string | null;
  }>
): SlaSummaryMetrics {
  if (tickets.length === 0) {
    return {
      totalTickets: 0,
      openTickets: 0,
      breachedCount: 0,
      approachingCount: 0,
      complianceRate: 100,
      avgResponseMinutes: 0,
      avgResolutionMinutes: 0,
    };
  }

  let breached = 0;
  let approaching = 0;
  let open = 0;
  let responseTimes: number[] = [];
  let resolutionTimes: number[] = [];

  for (const t of tickets) {
    const sla = evaluateTicketSla(t);
    if (!sla.isResolved) open++;
    if (sla.responseStatus === "breached" || sla.resolutionStatus === "breached") {
      breached++;
    } else if (sla.responseStatus === "approaching_breach") {
      approaching++;
    }

    if (sla.responseElapsedMinutes !== null) {
      responseTimes.push(sla.responseElapsedMinutes);
    }
    if (sla.resolutionElapsedMinutes !== null) {
      resolutionTimes.push(sla.resolutionElapsedMinutes);
    }
  }

  const compliantTickets = tickets.length - breached;
  const complianceRate = Math.round((compliantTickets / tickets.length) * 100);

  const avgResponseMinutes =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  const avgResolutionMinutes =
    resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length)
      : 0;

  return {
    totalTickets: tickets.length,
    openTickets: open,
    breachedCount: breached,
    approachingCount: approaching,
    complianceRate,
    avgResponseMinutes,
    avgResolutionMinutes,
  };
}
