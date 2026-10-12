export type BroadcastSeverity = "info" | "warning" | "critical";
export type BroadcastScope = "global" | "restaurant";
export type BroadcastAudience = "all" | "diners" | "staff";

export interface BroadcastBanner {
  id: string;
  title: string;
  message: string;
  severity: BroadcastSeverity;
  scope: BroadcastScope;
  restaurant_id: string | null;
  restaurant_name?: string | null;
  target_audience: BroadcastAudience;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BroadcastPreset {
  id: string;
  label: string;
  title: string;
  message: string;
  severity: BroadcastSeverity;
  target_audience: BroadcastAudience;
}

export const BROADCAST_PRESETS: BroadcastPreset[] = [
  {
    id: "upi_degradation",
    label: "Payment Gateway / UPI Degradation",
    title: "UPI & Netbanking Latency Alert",
    message: "HDFC & NPCI UPI networks are experiencing transient timeouts. Diners are encouraged to use Cards or Counter Cash.",
    severity: "critical",
    target_audience: "all",
  },
  {
    id: "scheduled_maintenance",
    label: "Scheduled System Maintenance",
    title: "Off-Peak Platform Maintenance",
    message: "Scheduled cloud performance maintenance in progress. Active orders and billing remain unaffected.",
    severity: "warning",
    target_audience: "all",
  },
  {
    id: "kitchen_delays",
    label: "High Kitchen Volume / Service Delay",
    title: "Rush Hour Kitchen Notice",
    message: "Our kitchen is experiencing peak rush. Food preparation time may be extended by 15-20 minutes. Thank you for your patience!",
    severity: "warning",
    target_audience: "diners",
  },
  {
    id: "pos_offline_warning",
    label: "POS Local Network Alert",
    title: "Local Network Check Required",
    message: "Local WiFi printer connectivity drops detected. Ensure all KOT printers are switched on and connected to the main subnet.",
    severity: "info",
    target_audience: "staff",
  },
  {
    id: "service_outage",
    label: "Emergency Service Interruption",
    title: "Temporary Service Outage",
    message: "We are currently addressing an unexpected service interruption. The core team is actively deploying a fix.",
    severity: "critical",
    target_audience: "all",
  },
];
