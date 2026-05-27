export type RestaurantStatus = "active" | "trial" | "churn-risk" | "disabled" | "revoked";
export type UserStatus = "active" | "disabled" | "revoked";

export type RestaurantSummary = {
  id: string;
  brandName: string;
  locationName: string;
  ownerEmail: string;
  plan: "starter" | "growth" | "pro";
  status: RestaurantStatus;
  statusReason?: string;
  billingStatus?: string;
  mrr: number;
  todayRevenue: number;
  ordersToday: number;
  createdAt: string;
  totalRevenueRange: number;
  memberSince: string;
  packageExpiresAt: string | null;
};

export type RevenueRange = "week" | "month" | "year";

export type Overview = {
  totalRestaurants: number;
  activeRestaurants: number;
  trialRestaurants: number;
  mrr: number;
  gmVToday: number;
  ordersToday: number;
  totalRevenueRange: number;
  range: RevenueRange;
};

export type RevenuePoint = {
  date: string;
  revenue: number;
  orders: number;
};

export type PaymentHistoryRecord = {
  id: string;
  orderId: string | null;
  takeawayOrderId: string | null;
  paymentType: "order" | "takeaway";
  oldStatus: string;
  newStatus: string;
  paymentMode: string | null;
  amount: number | null;
  reason: string | null;
  actorName: string;
  actorRole: string | null;
  createdAt: string;
};

export type AnalyticsTopItem = {
  name: string;
  orders: number;
  revenue: number;
};

export type RestaurantDetail = {
  restaurant: RestaurantSummary;
  totalRevenueLifetime: number;
  totalOrdersLifetime: number;
  range: RevenueRange;
  revenueSeries: RevenuePoint[];
  paymentHistory: PaymentHistoryRecord[];
};

export type RestaurantUser = {
  id: string;
  name: string;
  email: string;
  role: "manager" | "chef" | "waiter" | "cashier";
  status: UserStatus;
};

export type FeedbackItem = {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  source: "menu" | "checkout" | "service";
  restaurantName?: string;
};

export type DowntimeItem = {
  id: string;
  startedAt: string;
  endedAt: string;
  minutes: number;
  reason: string;
  severity: "low" | "medium" | "high";
};

export type GlobalDiscount = {
  id: string;
  name: string;
  code: string;
  discountType: "percent" | "flat";
  discountValue: number;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
};

export type CouponCampaign = {
  id: string;
  name: string;
  couponCode: string;
  restaurantID: string;
  restaurantName: string;
};

export type CouponRedemption = {
  id: string;
  campaignID: string;
  campaignName: string;
  orderID: string;
  restaurantID: string;
  restaurantName: string;
  codeUsed: string;
  discountAmount: number;
  redeemedAt: string;
  orderStatus: string;
};

export type RestaurantOption = {
  id: string;
  name: string;
};

export type AdminMenuCategory = {
  id: string;
  name: string;
};

export type AdminMenuItem = {
  id: string;
  restaurantId: string;
  categoryId: string | null;
  categoryName: string;
  name: string;
  description: string;
  price: number;
  isVeg: boolean;
  isAvailable: boolean;
  imageUrl: string;
  modelGlb: string;
  createdAt: string;
};

export type AdminStaffMember = {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: UserStatus;
  joinedAt: string;
};

export type StaffTicket = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  userName: string;
  userRole: string;
  adminResponse: string;
  createdAt: string;
  respondedAt: string | null;
};

export type DowntimeLog = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  reason: string;
  severity: string;
  minutes: number;
  startedAt: string;
  endedAt: string;
  createdAt: string;
};

export type PaymentRecord = {
  id: string;
  orderId: string;
  restaurantId: string;
  restaurantName: string;
  amount: number;
  mode: string;
  status: string;
  createdAt: string;
  capturedAt: string | null;
};

export type OrderRecord = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  sessionId: string;
  status: string;
  totalItems: number;
  subtotal: number;
  createdAt: string;
};

export type TakeawayOrderRecord = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  orderType: string;
  status: string;
  customerName: string;
  total: number;
  paymentMode: string;
  createdAt: string;
};

export type QAdminUser = {
  id: string;
  username: string;
  createdAt: string;
};

export type AuditLogRecord = {
  id: string;
  actorEmail: string;
  action: string;
  targetId: string | null;
  targetType: string | null;
  metadata: any;
  createdAt: string;
};

export type PlatformOperations = {
  summary: {
    restaurantCount: number;
    menuItemCount: number;
    staffCount: number;
    openTickets: number;
    paidPaymentsToday: number;
    paymentVolumeToday: number;
    activeCoupons: number;
    activeGlobalDiscounts: number;
    todayOrders: number;
    todayTakeawayOrders: number;
  };
  restaurants: RestaurantOption[];
  payments: PaymentRecord[];
  orders: OrderRecord[];
  takeawayOrders: TakeawayOrderRecord[];
  tickets: StaffTicket[];
  downtime: DowntimeLog[];
  coupons: CouponCampaign[];
  globalDiscounts: GlobalDiscount[];
  qadmins: QAdminUser[];
};
