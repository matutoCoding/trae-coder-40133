export type CourtType = 'hard' | 'clay' | 'grass';

export interface Court {
  id: string;
  name: string;
  type: CourtType;
  code: string;
  active: boolean;
  createdAt: string;
}

export type RateTier = 'peak' | 'flat' | 'valley';

export interface Rate {
  id: string;
  tier: RateTier;
  tierName: string;
  startTime: string;
  endTime: string;
  pricePerHour: number;
  color: string;
}

export type BookingType = 'singles' | 'doubles';

export type BookingStatus = 'active' | 'cancelled';

export type MemberLevel = 'normal' | 'silver' | 'gold' | 'platinum';

export interface Member {
  id: string;
  name: string;
  phone: string;
  level: MemberLevel;
  balance: number;
  totalRecharge: number;
  totalConsume: number;
  totalPackageBuy: number;
  totalPackageUse: number;
  note?: string;
  createdAt: string;
}

export type WalletTxType = 'recharge' | 'consume' | 'refund' | 'package_buy' | 'package_use' | 'package_refund' | 'cash_pay' | 'card_pay';

export interface WalletTransaction {
  id: string;
  memberId?: string;
  type: WalletTxType;
  amount: number;
  balanceAfter?: number;
  packageBalanceAfter?: number;
  billId?: string;
  bookingId?: string;
  packageId?: string;
  payMethod?: 'cash' | 'card' | 'wallet' | 'package';
  customerName?: string;
  customerType?: 'member' | 'walkin';
  note?: string;
  createdAt: string;
}

export type PackageType = 'count';

export interface MemberPackage {
  id: string;
  memberId: string;
  packageName: string;
  totalCount: number;
  usedCount: number;
  remainingCount: number;
  price: number;
  perTimes: number;
  expireAt?: string;
  note?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerType: 'member' | 'walkin';
  memberId?: string;
  bookingType: BookingType;
  teammates: string[];
  totalAmount: number;
  payMethod: PaymentMethod | 'pending' | 'package';
  packageId?: string;
  packageUsedCount?: number;
  status: BookingStatus;
  createdAt: string;
  cancelledAt?: string;
}

export interface BillingSegment {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  tier: RateTier;
  tierName: string;
  pricePerHour: number;
  amount: number;
  color: string;
}

export interface BillingResult {
  segments: BillingSegment[];
  totalAmount: number;
  totalMinutes: number;
}

export interface DoublesShare {
  name: string;
  amount: number;
  isLeader: boolean;
}

export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'wallet' | 'card';

export type RefundReason = 'user_cancel' | 'system_cancel' | 'other';

export interface RefundRecord {
  id: string;
  billId: string;
  bookingId: string;
  amount: number;
  reason: RefundReason;
  refundMethod: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface Bill {
  id: string;
  bookingId: string;
  billNo: string;
  totalAmount: number;
  segments: BillingSegment[];
  shares?: DoublesShare[];
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  memberId?: string;
  memberSnapshot?: { id: string; name: string; phone: string; level: MemberLevel };
  paidAt?: string;
  refundAmount?: number;
  refunds?: RefundRecord[];
  createdAt: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingBookings: Booking[];
}

export interface RateGap {
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export type DashboardRange = 'day' | 'week';

export interface CourtStats {
  courtId: string;
  courtName: string;
  courtCode: string;
  totalMinutes: number;
  bookedMinutes: number;
  cancelledMinutes: number;
  utilization: number;
  revenue: number;
  refunded: number;
  bookingCount: number;
  cancelCount: number;
}

export interface MemberRankingItem {
  memberId: string;
  memberName: string;
  memberLevel: MemberLevel;
  bookingCount: number;
  totalSpend: number;
  totalRecharge: number;
}

export interface DashboardSummary {
  range: DashboardRange;
  from: string;
  to: string;
  totalRevenue: number;
  totalRefund: number;
  netRevenue: number;
  memberRevenue: number;
  walkinRevenue: number;
  rechargeRevenue: number;
  pendingAmount: number;
  paidAmount: number;
  totalBookings: number;
  totalCancels: number;
  memberBookingCount: number;
  walkinBookingCount: number;
  uniqueMembers: number;
  repeatMemberRate: number;
  avgUtilization: number;
  courts: CourtStats[];
  memberRanking: MemberRankingItem[];
}

export interface DailyReconciliationSummary {
  date: string;
  cashIncome: number;
  cardIncome: number;
  walletIncome: number;
  packageIncome: number;
  rechargeIncome: number;
  packageBuyIncome: number;
  refundAmount: number;
  totalIncome: number;
  netIncome: number;
  txCount: number;
  bookingCount: number;
}

export interface MemberDetailAnalytics {
  memberId: string;
  totalSpend: number;
  totalRecharge: number;
  bookingCount: number;
  lastVisit: string | null;
  favoriteCourtId: string | null;
  favoriteCourtName: string | null;
  monthlyTrend: { month: string; amount: number; count: number }[];
  packageProgress: { packageName: string; total: number; used: number; remaining: number; pct: number }[];
}
