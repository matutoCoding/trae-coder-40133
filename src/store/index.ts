import { create } from 'zustand';
import type {
  Bill, Booking, Court, DashboardRange, DashboardSummary,
  Member, MemberLevel, PaymentMethod, PaymentStatus, Rate,
  RefundReason, RefundRecord, WalletTransaction,
} from '@/types';
import { loadData, saveData, genId, genBillNo } from '@/utils/storage';
import { addDays, formatDate, parseDate, todayStr, timeToMinutes } from '@/utils/time';
import { calculateBilling, splitDoublesShare } from '@/utils/billing';
import { checkBookingConflict } from '@/utils/conflict';
import { hasRateGapInRange, formatRateGapList } from '@/utils/rateGap';

const DAY_START_MIN = timeToMinutes('06:00');
const DAY_END_MIN = timeToMinutes('22:00');
const DAY_AVAIL_MIN = DAY_END_MIN - DAY_START_MIN;

function normalizeBill(b: any): Bill {
  return {
    ...b,
    paymentStatus: (b.paymentStatus ?? 'pending') as PaymentStatus,
    refunds: b.refunds ?? [],
    refundAmount: b.refundAmount ?? 0,
  } as Bill;
}

function normalizeBooking(b: any): Booking {
  return {
    ...b,
    customerType: b.customerType ?? 'walkin',
  } as Booking;
}

const LEVEL_META: Record<MemberLevel, { label: string; color: string; bg: string }> = {
  normal: { label: '普通', color: 'text-gray-700', bg: 'bg-gray-100' },
  silver: { label: '银卡', color: 'text-slate-700', bg: 'bg-slate-200' },
  gold: { label: '金卡', color: 'text-amber-800', bg: 'bg-amber-100' },
  platinum: { label: '钻石', color: 'text-sky-800', bg: 'bg-sky-100' },
};

export const MEMBER_LEVELS = Object.entries(LEVEL_META).map(([value, m]) => ({
  value: value as MemberLevel,
  label: m.label,
  color: m.color,
  bg: m.bg,
}));

export function getLevelMeta(level: MemberLevel) {
  return LEVEL_META[level] ?? LEVEL_META.normal;
}

const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'm1', name: '张三', phone: '13800138001', level: 'gold',
    balance: 520, totalRecharge: 1000, totalConsume: 480,
    note: '每周三固定打球', createdAt: new Date().toISOString(),
  },
  {
    id: 'm2', name: '李四', phone: '13900139002', level: 'silver',
    balance: 180, totalRecharge: 500, totalConsume: 320,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm3', name: '王五', phone: '13700137003', level: 'platinum',
    balance: 2680, totalRecharge: 5000, totalConsume: 2320,
    note: '双打队长，经常带人', createdAt: new Date().toISOString(),
  },
];

const DEFAULT_COURTS: Court[] = [
  { id: 'c1', name: '中心球场', type: 'hard', code: 'CTR-01', active: true, createdAt: new Date().toISOString() },
  { id: 'c2', name: '红土练习场', type: 'clay', code: 'CLY-01', active: true, createdAt: new Date().toISOString() },
  { id: 'c3', name: '草地训练场', type: 'grass', code: 'GRS-01', active: true, createdAt: new Date().toISOString() },
];

const DEFAULT_RATES: Rate[] = [
  { id: 'r1', tier: 'valley', tierName: '谷峰', startTime: '06:00', endTime: '12:00', pricePerHour: 50, color: '#81c784' },
  { id: 'r2', tier: 'flat', tierName: '平峰', startTime: '12:00', endTime: '18:00', pricePerHour: 80, color: '#64b5f6' },
  { id: 'r3', tier: 'peak', tierName: '高峰', startTime: '18:00', endTime: '22:00', pricePerHour: 120, color: '#e57373' },
];

function makeDefaultBookings(members: Member[]): Booking[] {
  const today = todayStr();
  const tomorrow = addDays(today, 1);
  const mZhang = members.find((m) => m.name === '张三');
  const mLi = members.find((m) => m.name === '李四');
  return [
    {
      id: 'b1', courtId: 'c1', date: today, startTime: '08:00', endTime: '09:30',
      customerName: mZhang?.name ?? '张三', customerType: 'member', memberId: mZhang?.id,
      bookingType: 'singles', teammates: [],
      totalAmount: 75, status: 'active', createdAt: new Date().toISOString(),
    },
    {
      id: 'b2', courtId: 'c1', date: today, startTime: '18:00', endTime: '20:00',
      customerName: mLi?.name ?? '李四', customerType: 'member', memberId: mLi?.id,
      bookingType: 'doubles', teammates: ['王五', '赵六', '孙七'],
      totalAmount: 240, status: 'active', createdAt: new Date().toISOString(),
    },
    {
      id: 'b3', courtId: 'c2', date: tomorrow, startTime: '14:00', endTime: '16:00',
      customerName: '周八散客', customerType: 'walkin',
      bookingType: 'singles', teammates: [],
      totalAmount: 160, status: 'active', createdAt: new Date().toISOString(),
    },
  ];
}

function makeDefaultBills(bookings: Booking[], rates: Rate[], members: Member[]): Bill[] {
  return bookings.filter((b) => b.status === 'active').map((b) => {
    const billing = calculateBilling(b.startTime, b.endTime, rates);
    const shares = b.bookingType === 'doubles'
      ? splitDoublesShare(billing.totalAmount, b.customerName, b.teammates)
      : undefined;
    const member = b.memberId ? members.find((m) => m.id === b.memberId) : undefined;
    return {
      id: genId('bl_'),
      bookingId: b.id,
      billNo: genBillNo(),
      totalAmount: billing.totalAmount,
      segments: billing.segments,
      shares,
      paymentStatus: 'pending' as PaymentStatus,
      refunds: [],
      refundAmount: 0,
      memberId: member?.id,
      memberSnapshot: member ? { id: member.id, name: member.name, phone: member.phone, level: member.level } : undefined,
      createdAt: b.createdAt,
    };
  });
}

function getDateRange(base: string, range: DashboardRange): string[] {
  if (range === 'day') return [base];
  const d = parseDate(base);
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(monday);
    t.setDate(monday.getDate() + i);
    return formatDate(t);
  });
}

interface AppState {
  courts: Court[];
  rates: Rate[];
  bookings: Booking[];
  bills: Bill[];
  members: Member[];
  walletTxs: WalletTransaction[];
  inited: boolean;

  initIfNeeded: () => void;

  addCourt: (c: Omit<Court, 'id' | 'createdAt'>) => void;
  updateCourt: (id: string, patch: Partial<Court>) => void;

  addRate: (r: Omit<Rate, 'id'>) => void;
  updateRate: (id: string, patch: Partial<Rate>) => void;
  removeRate: (id: string) => void;

  addMember: (m: Omit<Member, 'id' | 'createdAt' | 'balance' | 'totalRecharge' | 'totalConsume'>) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  rechargeMember: (id: string, amount: number, note?: string) => { ok: boolean; error?: string };

  createBooking: (data: {
    courtId: string;
    date: string;
    startTime: string;
    endTime: string;
    customerName: string;
    customerType: 'member' | 'walkin';
    memberId?: string;
    bookingType: 'singles' | 'doubles';
    teammates: string[];
    paymentMethod?: PaymentMethod;
  }) => { ok: boolean; error?: string; booking?: Booking };

  cancelBooking: (id: string, reason?: RefundReason, note?: string) => { ok: boolean; error?: string };

  settleBill: (billId: string, method: PaymentMethod) => { ok: boolean; error?: string };
  markBillPaid: (billId: string) => void;

  checkConflict: (
    courtId: string, date: string, startTime: string, endTime: string, excludeBookingId?: string
  ) => { hasConflict: boolean; conflictingBookings: Booking[] };

  checkRateGap: (startTime: string, endTime: string) => { hasGap: boolean; gaps: any[]; message?: string };
  calcBilling: (startTime: string, endTime: string) => ReturnType<typeof calculateBilling>;

  computeDashboard: (base: string, range: DashboardRange) => DashboardSummary;
  listMemberBookings: (memberId: string) => Booking[];
  listMemberTxs: (memberId: string) => WalletTransaction[];
}

export const useAppStore = create<AppState>((set, get) => ({
  courts: [],
  rates: [],
  bookings: [],
  bills: [],
  members: [],
  walletTxs: [],
  inited: false,

  initIfNeeded() {
    if (get().inited) return;
    const courts = loadData<Court[]>('courts', []);
    const rates = loadData<Rate[]>('rates', []);
    const rawBookings = loadData<any[]>('bookings', []);
    const rawBills = loadData<any[]>('bills', []);
    const members = loadData<Member[]>('members', []);
    const walletTxs = loadData<WalletTransaction[]>('walletTxs', []);
    const bookings = rawBookings.map(normalizeBooking);
    const bills = rawBills.map(normalizeBill);

    if (courts.length === 0) {
      saveData('courts', DEFAULT_COURTS);
      saveData('rates', DEFAULT_RATES);
      saveData('members', DEFAULT_MEMBERS);
      const dBookings = makeDefaultBookings(DEFAULT_MEMBERS);
      saveData('bookings', dBookings);
      const dBills = makeDefaultBills(dBookings, DEFAULT_RATES, DEFAULT_MEMBERS);
      saveData('bills', dBills);
      saveData('walletTxs', []);
      set({
        courts: DEFAULT_COURTS, rates: DEFAULT_RATES, members: DEFAULT_MEMBERS,
        bookings: dBookings, bills: dBills, walletTxs: [], inited: true,
      });
    } else {
      saveData('bookings', bookings);
      saveData('bills', bills);
      set({ courts, rates, bookings, bills, members, walletTxs, inited: true });
    }
  },

  addCourt(c) {
    const court: Court = { ...c, id: genId('c_'), createdAt: new Date().toISOString() };
    const next = [...get().courts, court];
    saveData('courts', next);
    set({ courts: next });
  },
  updateCourt(id, patch) {
    const next = get().courts.map((c) => (c.id === id ? { ...c, ...patch } : c));
    saveData('courts', next);
    set({ courts: next });
  },

  addRate(r) {
    const next = [...get().rates, { ...r, id: genId('r_') }];
    saveData('rates', next);
    set({ rates: next });
  },
  updateRate(id, patch) {
    const next = get().rates.map((r) => (r.id === id ? { ...r, ...patch } : r));
    saveData('rates', next);
    set({ rates: next });
  },
  removeRate(id) {
    const next = get().rates.filter((r) => r.id !== id);
    saveData('rates', next);
    set({ rates: next });
  },

  addMember(m) {
    const member: Member = {
      ...m,
      id: genId('m_'),
      balance: 0,
      totalRecharge: 0,
      totalConsume: 0,
      createdAt: new Date().toISOString(),
    };
    const next = [...get().members, member];
    saveData('members', next);
    set({ members: next });
  },

  updateMember(id, patch) {
    const next = get().members.map((m) => (m.id === id ? { ...m, ...patch } : m));
    saveData('members', next);
    set({ members: next });
  },

  rechargeMember(id, amount, note) {
    if (amount <= 0) return { ok: false, error: '充值金额必须大于 0' };
    const now = new Date().toISOString();
    let tx: WalletTransaction | null = null;
    const nextMembers = get().members.map((m) => {
      if (m.id !== id) return m;
      const balance = Number((m.balance + amount).toFixed(2));
      const totalRecharge = Number((m.totalRecharge + amount).toFixed(2));
      tx = {
        id: genId('wt_'), memberId: id, type: 'recharge', amount,
        balanceAfter: balance, note, createdAt: now,
      };
      return { ...m, balance, totalRecharge };
    });
    saveData('members', nextMembers);
    const nextTxs = [...get().walletTxs, tx!];
    saveData('walletTxs', nextTxs);
    set({ members: nextMembers, walletTxs: nextTxs });
    return { ok: true };
  },

  checkConflict(courtId, date, startTime, endTime, excludeBookingId) {
    return checkBookingConflict(get().bookings, courtId, date, startTime, endTime, excludeBookingId);
  },

  checkRateGap(startTime, endTime) {
    const result = hasRateGapInRange(get().rates, startTime, endTime);
    if (result.hasGap) {
      return { ...result, message: `以下时段暂无费率：${formatRateGapList(result.gaps)}，请先到费率设置补齐后再预约` };
    }
    return result;
  },

  calcBilling(startTime, endTime) {
    return calculateBilling(startTime, endTime, get().rates);
  },

  createBooking(data) {
    const { courtId, date, startTime, endTime, customerName, customerType, memberId, bookingType, teammates, paymentMethod } = data;
    const conflict = get().checkConflict(courtId, date, startTime, endTime);
    if (conflict.hasConflict) {
      const names = conflict.conflictingBookings.map((b) => `${b.customerName}(${b.startTime}-${b.endTime})`).join('、');
      return { ok: false, error: `时段冲突，已被 ${names} 预订` };
    }
    const gap = get().checkRateGap(startTime, endTime);
    if (gap.hasGap) return { ok: false, error: gap.message };
    const billing = get().calcBilling(startTime, endTime);
    if (billing.totalAmount <= 0 || billing.segments.length === 0) {
      return { ok: false, error: '所选时段暂无对应费率，请先在「费率设置」补齐' };
    }

    const member = customerType === 'member' && memberId ? get().members.find((m) => m.id === memberId) : undefined;
    if (customerType === 'member' && !member) return { ok: false, error: '未找到对应会员' };

    const now = new Date().toISOString();
    const booking: Booking = {
      id: genId('b_'),
      courtId, date, startTime, endTime,
      customerName: member?.name ?? customerName,
      customerType,
      memberId: member?.id,
      bookingType, teammates,
      totalAmount: billing.totalAmount,
      status: 'active',
      createdAt: now,
    };

    const nextBookings = [...get().bookings, booking];
    saveData('bookings', nextBookings);

    const shares = bookingType === 'doubles'
      ? splitDoublesShare(billing.totalAmount, booking.customerName, teammates)
      : undefined;

    let payMethod: PaymentMethod | undefined;
    let payStatus: PaymentStatus = 'pending';
    let paidAt: string | undefined;
    let nextMembers = get().members;
    let nextTxs = get().walletTxs;

    if (paymentMethod) {
      if (paymentMethod === 'wallet') {
        if (!member) return { ok: false, error: '余额扣款需选择会员' };
        if (member.balance < billing.totalAmount) {
          return { ok: false, error: `会员余额不足（当前 ¥${member.balance.toFixed(2)}），请先充值或更换支付方式` };
        }
        const newBalance = Number((member.balance - billing.totalAmount).toFixed(2));
        const newConsume = Number((member.totalConsume + billing.totalAmount).toFixed(2));
        nextMembers = nextMembers.map((m) => m.id === member.id ? { ...m, balance: newBalance, totalConsume: newConsume } : m);
        const tx: WalletTransaction = {
          id: genId('wt_'), memberId: member.id, type: 'consume',
          amount: billing.totalAmount, balanceAfter: newBalance,
          bookingId: booking.id, createdAt: now,
        };
        nextTxs = [...nextTxs, tx];
      }
      payMethod = paymentMethod;
      payStatus = 'paid';
      paidAt = now;
    }

    const bill: Bill = {
      id: genId('bl_'),
      bookingId: booking.id,
      billNo: genBillNo(),
      totalAmount: billing.totalAmount,
      segments: billing.segments,
      shares,
      paymentStatus: payStatus,
      paymentMethod: payMethod,
      memberId: member?.id,
      memberSnapshot: member ? { id: member.id, name: member.name, phone: member.phone, level: member.level } : undefined,
      paidAt,
      refunds: [],
      refundAmount: 0,
      createdAt: now,
    };
    const nextBills = [...get().bills, bill];
    saveData('bills', nextBills);
    saveData('members', nextMembers);
    saveData('walletTxs', nextTxs);

    set({
      bookings: nextBookings, bills: nextBills,
      members: nextMembers, walletTxs: nextTxs,
    });
    return { ok: true, booking };
  },

  cancelBooking(id, reason = 'user_cancel', note) {
    const booking = get().bookings.find((b) => b.id === id);
    if (!booking) return { ok: false, error: '预约不存在' };
    if (booking.status !== 'active') return { ok: false, error: '预约已退订' };

    const now = new Date().toISOString();
    const nextBookings = get().bookings.map((b) =>
      b.id === id ? { ...b, status: 'cancelled' as const, cancelledAt: now } : b
    );
    saveData('bookings', nextBookings);

    let nextBills = get().bills;
    let nextMembers = get().members;
    let nextTxs = get().walletTxs;

    nextBills = nextBills.map((b) => {
      if (b.bookingId !== id) return b;
      const refundMethod: PaymentMethod = b.paymentMethod === 'wallet' ? 'wallet' : 'cash';
      const refundAmount = b.totalAmount;
      const refund: RefundRecord = {
        id: genId('rf_'), billId: b.id, bookingId: id,
        amount: refundAmount, reason, refundMethod, note, createdAt: now,
      };
      const newRefunds = [...(b.refunds ?? []), refund];
      if (refundMethod === 'wallet' && b.memberId) {
        const mIdx = nextMembers.findIndex((m) => m.id === b.memberId);
        if (mIdx >= 0) {
          const m = nextMembers[mIdx];
          const newBalance = Number((m.balance + refundAmount).toFixed(2));
          nextMembers = nextMembers.map((mm, i) => i === mIdx ? { ...mm, balance: newBalance } : mm);
          const tx: WalletTransaction = {
            id: genId('wt_'), memberId: m.id, type: 'refund',
            amount: refundAmount, balanceAfter: newBalance,
            billId: b.id, bookingId: id, note, createdAt: now,
          };
          nextTxs = [...nextTxs, tx];
        }
      }
      return {
        ...b,
        paymentStatus: 'refunded' as PaymentStatus,
        refunds: newRefunds,
        refundAmount: newRefunds.reduce((s, r) => s + r.amount, 0),
      };
    });

    saveData('bills', nextBills);
    saveData('members', nextMembers);
    saveData('walletTxs', nextTxs);
    set({ bookings: nextBookings, bills: nextBills, members: nextMembers, walletTxs: nextTxs });
    return { ok: true };
  },

  settleBill(billId, method) {
    const bill = get().bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, error: '账单不存在' };
    if (bill.paymentStatus !== 'pending') return { ok: false, error: '账单不是待收款状态' };

    const now = new Date().toISOString();
    let nextMembers = get().members;
    let nextTxs = get().walletTxs;

    if (method === 'wallet') {
      if (!bill.memberId) return { ok: false, error: '余额扣款需关联会员' };
      const m = nextMembers.find((x) => x.id === bill.memberId);
      if (!m) return { ok: false, error: '会员不存在' };
      if (m.balance < bill.totalAmount) {
        return { ok: false, error: `余额不足（当前 ¥${m.balance.toFixed(2)}）` };
      }
      const newBalance = Number((m.balance - bill.totalAmount).toFixed(2));
      const newConsume = Number((m.totalConsume + bill.totalAmount).toFixed(2));
      nextMembers = nextMembers.map((x) => x.id === m.id ? { ...x, balance: newBalance, totalConsume: newConsume } : x);
      const tx: WalletTransaction = {
        id: genId('wt_'), memberId: m.id, type: 'consume',
        amount: bill.totalAmount, balanceAfter: newBalance,
        billId: bill.id, bookingId: bill.bookingId, createdAt: now,
      };
      nextTxs = [...nextTxs, tx];
    }

    const nextBills = get().bills.map((b) =>
      b.id === billId
        ? { ...b, paymentStatus: 'paid' as PaymentStatus, paymentMethod: method, paidAt: now }
        : b
    );

    saveData('bills', nextBills);
    saveData('members', nextMembers);
    saveData('walletTxs', nextTxs);
    set({ bills: nextBills, members: nextMembers, walletTxs: nextTxs });
    return { ok: true };
  },

  markBillPaid(billId) {
    get().settleBill(billId, 'cash');
  },

  computeDashboard(base, range) {
    const dates = getDateRange(base, range);
    const setDates = new Set(dates);
    const from = dates[0];
    const to = dates[dates.length - 1];
    const { courts, bookings, bills } = get();

    const perCourt = courts.filter((c) => c.active).map((court) => {
      let bookedMinutes = 0;
      let cancelledMinutes = 0;
      let bookingCount = 0;
      let cancelCount = 0;
      let revenue = 0;
      let refunded = 0;

      const rangeBookings = bookings.filter((b) => b.courtId === court.id && setDates.has(b.date));
      for (const b of rangeBookings) {
        const mins = timeToMinutes(b.endTime) - timeToMinutes(b.startTime);
        const bill = bills.find((x) => x.bookingId === b.id);
        if (b.status === 'active') {
          bookedMinutes += mins;
          bookingCount += 1;
          if (bill && bill.paymentStatus !== 'refunded') revenue += bill.totalAmount;
        } else if (b.status === 'cancelled') {
          cancelledMinutes += mins;
          cancelCount += 1;
          if (bill) refunded += bill.refundAmount ?? 0;
        }
      }

      const totalMinutes = DAY_AVAIL_MIN * dates.length;
      const utilization = totalMinutes > 0 ? Math.min(100, (bookedMinutes / totalMinutes) * 100) : 0;

      return {
        courtId: court.id,
        courtName: court.name,
        courtCode: court.code,
        totalMinutes,
        bookedMinutes,
        cancelledMinutes,
        utilization,
        revenue: Number(revenue.toFixed(2)),
        refunded: Number(refunded.toFixed(2)),
        bookingCount,
        cancelCount,
      };
    });

    const totalRevenue = perCourt.reduce((s, c) => s + c.revenue, 0);
    const totalRefund = perCourt.reduce((s, c) => s + c.refunded, 0);
    const totalBookings = perCourt.reduce((s, c) => s + c.bookingCount, 0);
    const totalCancels = perCourt.reduce((s, c) => s + c.cancelCount, 0);
    const avgUtil = perCourt.length ? perCourt.reduce((s, c) => s + c.utilization, 0) / perCourt.length : 0;

    return {
      range, from, to,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalRefund: Number(totalRefund.toFixed(2)),
      netRevenue: Number((totalRevenue - totalRefund).toFixed(2)),
      totalBookings, totalCancels,
      avgUtilization: Number(avgUtil.toFixed(2)),
      courts: perCourt.sort((a, b) => b.revenue - a.revenue),
    };
  },

  listMemberBookings(memberId) {
    return get().bookings
      .filter((b) => b.memberId === memberId)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  },

  listMemberTxs(memberId) {
    return get().walletTxs
      .filter((t) => t.memberId === memberId)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  },
}));
