import { create } from 'zustand';
import type {
  Bill, Booking, Court, DashboardRange, DashboardSummary,
  Member, MemberLevel, MemberPackage, PaymentMethod, PaymentStatus, Rate,
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
    payMethod: b.payMethod ?? (b.status === 'cancelled' ? 'pending' : 'pending'),
  } as Booking;
}

function normalizeMember(m: any): Member {
  return {
    ...m,
    totalPackageBuy: m.totalPackageBuy ?? 0,
    totalPackageUse: m.totalPackageUse ?? 0,
  } as Member;
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

export const PACKAGE_TEMPLATES = [
  { name: '10次卡', times: 10, price: 600, perPrice: 60 },
  { name: '20次卡', times: 20, price: 1000, perPrice: 50 },
  { name: '50次卡', times: 50, price: 2000, perPrice: 40 },
  { name: '100次年卡', times: 100, price: 3600, perPrice: 36 },
];

const DEFAULT_MEMBERS: Member[] = [
  {
    id: 'm1', name: '张三', phone: '13800138001', level: 'gold',
    balance: 520, totalRecharge: 1000, totalConsume: 480,
    totalPackageBuy: 0, totalPackageUse: 0,
    note: '每周三固定打球', createdAt: new Date().toISOString(),
  },
  {
    id: 'm2', name: '李四', phone: '13900139002', level: 'silver',
    balance: 180, totalRecharge: 500, totalConsume: 320,
    totalPackageBuy: 10, totalPackageUse: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'm3', name: '王五', phone: '13700137003', level: 'platinum',
    balance: 2680, totalRecharge: 5000, totalConsume: 2320,
    totalPackageBuy: 20, totalPackageUse: 8,
    note: '双打队长，经常带人', createdAt: new Date().toISOString(),
  },
];

const DEFAULT_PACKAGES: MemberPackage[] = [
  {
    id: 'p1', memberId: 'm2', packageName: '10次卡',
    totalCount: 10, usedCount: 3, remainingCount: 7,
    price: 600, perTimes: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'p2', memberId: 'm3', packageName: '20次卡',
    totalCount: 20, usedCount: 8, remainingCount: 12,
    price: 1000, perTimes: 1,
    createdAt: new Date().toISOString(),
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
      totalAmount: 75, payMethod: 'wallet', status: 'active', createdAt: new Date().toISOString(),
    },
    {
      id: 'b2', courtId: 'c1', date: today, startTime: '18:00', endTime: '20:00',
      customerName: mLi?.name ?? '李四', customerType: 'member', memberId: mLi?.id,
      bookingType: 'doubles', teammates: ['王五', '赵六', '孙七'],
      totalAmount: 240, payMethod: 'pending', status: 'active', createdAt: new Date().toISOString(),
    },
    {
      id: 'b3', courtId: 'c2', date: tomorrow, startTime: '14:00', endTime: '16:00',
      customerName: '周八散客', customerType: 'walkin',
      bookingType: 'singles', teammates: [],
      totalAmount: 160, payMethod: 'cash', status: 'active', createdAt: new Date().toISOString(),
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
    const payMethod = b.payMethod === 'pending' || b.payMethod === 'package'
      ? undefined
      : b.payMethod as PaymentMethod;
    return {
      id: genId('bl_'),
      bookingId: b.id,
      billNo: genBillNo(),
      totalAmount: billing.totalAmount,
      segments: billing.segments,
      shares,
      paymentStatus: payMethod ? 'paid' : 'pending',
      paymentMethod: payMethod,
      refunds: [],
      refundAmount: 0,
      memberId: member?.id,
      memberSnapshot: member ? { id: member.id, name: member.name, phone: member.phone, level: member.level } : undefined,
      paidAt: payMethod ? new Date().toISOString() : undefined,
      createdAt: b.createdAt,
    };
  });
}

function makeDefaultWalletTxs(members: Member[], bookings: Booking[]): WalletTransaction[] {
  const txs: WalletTransaction[] = [];
  const m1 = members.find((m) => m.id === 'm1');
  const m2 = members.find((m) => m.id === 'm2');
  const m3 = members.find((m) => m.id === 'm3');
  const b1 = bookings.find((b) => b.id === 'b1');
  const now = new Date().toISOString();

  if (m1) {
    txs.push({
      id: genId('wt_'), memberId: m1.id, type: 'recharge',
      amount: 1000, balanceAfter: 1000,
      note: '初始充值', createdAt: now,
    });
    if (b1) {
      txs.push({
        id: genId('wt_'), memberId: m1.id, type: 'consume',
        amount: 75, balanceAfter: 520,
        bookingId: b1.id, createdAt: now,
      });
    }
  }
  if (m2) {
    txs.push({
      id: genId('wt_'), memberId: m2.id, type: 'recharge',
      amount: 500, balanceAfter: 500,
      note: '初始充值', createdAt: now,
    });
    txs.push({
      id: genId('wt_'), memberId: m2.id, type: 'package_buy',
      amount: 600, balanceAfter: 180, packageBalanceAfter: 7,
      note: '购买10次卡', createdAt: now,
    });
  }
  if (m3) {
    txs.push({
      id: genId('wt_'), memberId: m3.id, type: 'recharge',
      amount: 5000, balanceAfter: 5000,
      note: '初始充值', createdAt: now,
    });
    txs.push({
      id: genId('wt_'), memberId: m3.id, type: 'package_buy',
      amount: 1000, balanceAfter: 2680, packageBalanceAfter: 12,
      note: '购买20次卡', createdAt: now,
    });
  }

  return txs.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
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
  memberPackages: MemberPackage[];
  walletTxs: WalletTransaction[];
  inited: boolean;

  initIfNeeded: () => void;

  addCourt: (c: Omit<Court, 'id' | 'createdAt'>) => void;
  updateCourt: (id: string, patch: Partial<Court>) => void;

  addRate: (r: Omit<Rate, 'id'>) => void;
  updateRate: (id: string, patch: Partial<Rate>) => void;
  removeRate: (id: string) => void;

  addMember: (m: Omit<Member, 'id' | 'createdAt' | 'balance' | 'totalRecharge' | 'totalConsume' | 'totalPackageBuy' | 'totalPackageUse'>) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  rechargeMember: (id: string, amount: number, note?: string) => { ok: boolean; error?: string };

  buyPackage: (memberId: string, template: { name: string; times: number; price: number }, note?: string) => { ok: boolean; error?: string; pkg?: MemberPackage };
  listMemberPackages: (memberId: string) => MemberPackage[];
  getMemberTotalPackageRemaining: (memberId: string) => number;

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
    payMethod: PaymentMethod | 'pending' | 'package';
    packageId?: string;
  }) => { ok: boolean; error?: string; booking?: Booking };

  cancelBooking: (id: string, reason?: RefundReason, note?: string) => { ok: boolean; error?: string };

  settleBill: (billId: string, method: PaymentMethod | 'package') => { ok: boolean; error?: string };
  markBillPaid: (billId: string) => void;

  checkConflict: (
    courtId: string, date: string, startTime: string, endTime: string, excludeBookingId?: string
  ) => { hasConflict: boolean; conflictingBookings: Booking[] };

  checkRateGap: (startTime: string, endTime: string) => { hasGap: boolean; gaps: any[]; message?: string };
  calcBilling: (startTime: string, endTime: string) => ReturnType<typeof calculateBilling>;

  computeDashboard: (base: string, range: DashboardRange) => DashboardSummary;
  computeDailyReconciliation: (date: string) => import('@/types').DailyReconciliationSummary;
  listDayTransactions: (date: string) => WalletTransaction[];
  computeMemberAnalytics: (memberId: string) => import('@/types').MemberDetailAnalytics;
  listMemberBookings: (memberId: string) => Booking[];
  listMemberTxs: (memberId: string) => WalletTransaction[];
}

export const useAppStore = create<AppState>((set, get) => ({
  courts: [],
  rates: [],
  bookings: [],
  bills: [],
  members: [],
  memberPackages: [],
  walletTxs: [],
  inited: false,

  initIfNeeded() {
    if (get().inited) return;
    const courts = loadData<Court[]>('courts', []);
    const rates = loadData<Rate[]>('rates', []);
    const rawBookings = loadData<any[]>('bookings', []);
    const rawBills = loadData<any[]>('bills', []);
    const rawMembers = loadData<any[]>('members', []);
    const memberPackages = loadData<MemberPackage[]>('memberPackages', []);
    const walletTxs = loadData<WalletTransaction[]>('walletTxs', []);

    const members = rawMembers.map(normalizeMember);
    const bookings = rawBookings.map(normalizeBooking);
    const bills = rawBills.map(normalizeBill);

    if (courts.length === 0) {
      saveData('courts', DEFAULT_COURTS);
      saveData('rates', DEFAULT_RATES);
      saveData('members', DEFAULT_MEMBERS);
      saveData('memberPackages', DEFAULT_PACKAGES);
      const dBookings = makeDefaultBookings(DEFAULT_MEMBERS);
      saveData('bookings', dBookings);
      const dBills = makeDefaultBills(dBookings, DEFAULT_RATES, DEFAULT_MEMBERS);
      saveData('bills', dBills);
      const dTxs = makeDefaultWalletTxs(DEFAULT_MEMBERS, dBookings);
      saveData('walletTxs', dTxs);
      set({
        courts: DEFAULT_COURTS, rates: DEFAULT_RATES,
        members: DEFAULT_MEMBERS, memberPackages: DEFAULT_PACKAGES,
        bookings: dBookings, bills: dBills, walletTxs: dTxs, inited: true,
      });
    } else {
      saveData('bookings', bookings);
      saveData('bills', bills);
      saveData('members', members);
      set({ courts, rates, bookings, bills, members, memberPackages, walletTxs, inited: true });
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
      totalPackageBuy: 0,
      totalPackageUse: 0,
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

  buyPackage(memberId, template, note) {
    if (template.price <= 0 || template.times <= 0) return { ok: false, error: '套餐参数异常' };
    const member = get().members.find((m) => m.id === memberId);
    if (!member) return { ok: false, error: '会员不存在' };

    const now = new Date().toISOString();
    const pkg: MemberPackage = {
      id: genId('pkg_'),
      memberId,
      packageName: template.name,
      totalCount: template.times,
      usedCount: 0,
      remainingCount: template.times,
      price: template.price,
      perTimes: 1,
      note,
      createdAt: now,
    };

    const newBalance = Number((member.balance - template.price).toFixed(2));
    const newTotalBuy = member.totalPackageBuy + template.times;
    const newTotalPackageBuyAmount = Number((member.totalRecharge + 0).toFixed(2));

    const nextPackages = [...get().memberPackages, pkg];
    const nextMembers = get().members.map((m) =>
      m.id === memberId ? {
        ...m,
        balance: newBalance,
        totalPackageBuy: newTotalBuy,
        totalRecharge: newTotalPackageBuyAmount,
      } : m
    );

    const pkgRemain = get().getMemberTotalPackageRemaining(memberId) + template.times;
    const tx: WalletTransaction = {
      id: genId('wt_'), memberId, type: 'package_buy',
      amount: template.price, balanceAfter: newBalance,
      packageBalanceAfter: pkgRemain,
      packageId: pkg.id, note: note ?? `购买${template.name}`,
      createdAt: now,
    };
    const nextTxs = [...get().walletTxs, tx];

    saveData('memberPackages', nextPackages);
    saveData('members', nextMembers);
    saveData('walletTxs', nextTxs);
    set({ memberPackages: nextPackages, members: nextMembers, walletTxs: nextTxs });
    return { ok: true, pkg };
  },

  listMemberPackages(memberId) {
    return get().memberPackages
      .filter((p) => p.memberId === memberId)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  },

  getMemberTotalPackageRemaining(memberId) {
    return get().memberPackages
      .filter((p) => p.memberId === memberId)
      .reduce((s, p) => s + p.remainingCount, 0);
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
    const { courtId, date, startTime, endTime, customerName, customerType, memberId, bookingType, teammates, payMethod, packageId } = data;
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
    let usePackageId: string | undefined;
    let packageUsedCount = 0;

    if (payMethod === 'package') {
      if (!member) return { ok: false, error: '次卡核销需选择会员' };
      const totalRemaining = get().getMemberTotalPackageRemaining(member.id);
      if (totalRemaining < 1) return { ok: false, error: '会员次卡余额不足，请先购买次卡套餐' };
      if (packageId) {
        const pkg = get().memberPackages.find((p) => p.id === packageId && p.memberId === member.id);
        if (!pkg || pkg.remainingCount < 1) return { ok: false, error: '所选次卡余额不足' };
        usePackageId = pkg.id;
        packageUsedCount = 1;
      } else {
        const firstPkg = get().memberPackages
          .filter((p) => p.memberId === member.id && p.remainingCount > 0)
          .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))[0];
        if (!firstPkg) return { ok: false, error: '没有可用的次卡' };
        usePackageId = firstPkg.id;
        packageUsedCount = 1;
      }
    }

    const booking: Booking = {
      id: genId('b_'),
      courtId, date, startTime, endTime,
      customerName: member?.name ?? customerName,
      customerType,
      memberId: member?.id,
      bookingType, teammates,
      totalAmount: billing.totalAmount,
      payMethod,
      packageId: usePackageId,
      packageUsedCount: payMethod === 'package' ? packageUsedCount : undefined,
      status: 'active',
      createdAt: now,
    };

    const nextBookings = [...get().bookings, booking];
    saveData('bookings', nextBookings);

    const shares = bookingType === 'doubles'
      ? splitDoublesShare(billing.totalAmount, booking.customerName, teammates)
      : undefined;

    let payMethodForBill: PaymentMethod | undefined;
    let payStatus: PaymentStatus = 'pending';
    let paidAt: string | undefined;
    let nextMembers = get().members;
    let nextPackages = get().memberPackages;
    let nextTxs = get().walletTxs;

    if (payMethod !== 'pending') {
      if (payMethod === 'wallet') {
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
        payMethodForBill = 'wallet';
        payStatus = 'paid';
        paidAt = now;
      } else if (payMethod === 'cash' || payMethod === 'card') {
        payMethodForBill = payMethod;
        payStatus = 'paid';
        paidAt = now;
        const tx: WalletTransaction = {
          id: genId('wt_'),
          memberId: member?.id,
          type: payMethod === 'cash' ? 'cash_pay' : 'card_pay',
          amount: billing.totalAmount,
          bookingId: booking.id,
          payMethod,
          customerName: member?.name ?? customerName,
          customerType,
          createdAt: now,
        };
        nextTxs = [...nextTxs, tx];
      } else if (payMethod === 'package') {
        if (!member || !usePackageId) return { ok: false, error: '次卡核销异常' };
        nextPackages = nextPackages.map((p) =>
          p.id === usePackageId
            ? { ...p, usedCount: p.usedCount + packageUsedCount, remainingCount: p.remainingCount - packageUsedCount }
            : p
        );
        const newUseCount = member.totalPackageUse + packageUsedCount;
        nextMembers = nextMembers.map((m) => m.id === member!.id ? { ...m, totalPackageUse: newUseCount } : m);
        const remainAfter = get().getMemberTotalPackageRemaining(member.id);
        const tx: WalletTransaction = {
          id: genId('wt_'), memberId: member.id, type: 'package_use',
          amount: 0, balanceAfter: member.balance,
          packageBalanceAfter: remainAfter - packageUsedCount,
          bookingId: booking.id, packageId: usePackageId,
          note: `次卡核销（${billing.totalAmount.toFixed(2)}元等额）`,
          createdAt: now,
        };
        nextTxs = [...nextTxs, tx];
        payStatus = 'paid';
        paidAt = now;
      }
    }

    const bill: Bill = {
      id: genId('bl_'),
      bookingId: booking.id,
      billNo: genBillNo(),
      totalAmount: billing.totalAmount,
      segments: billing.segments,
      shares,
      paymentStatus: payStatus,
      paymentMethod: payMethodForBill,
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
    saveData('memberPackages', nextPackages);
    saveData('walletTxs', nextTxs);

    set({
      bookings: nextBookings, bills: nextBills,
      members: nextMembers, memberPackages: nextPackages, walletTxs: nextTxs,
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
    let nextPackages = get().memberPackages;
    let nextTxs = get().walletTxs;

    nextBills = nextBills.map((b) => {
      if (b.bookingId !== id) return b;

      // 只有已支付（paymentStatus=paid）的订单才产生退款记录
      if (b.paymentStatus !== 'paid') {
        // 待收款取消：不退款、不产生资金记录，状态设为 refunded 仅用于标识订单已取消
        return {
          ...b,
          paymentStatus: 'refunded' as PaymentStatus,
          refunds: [],
          refundAmount: 0,
        };
      }

      let refundMethod: PaymentMethod | 'package';
      if (booking.payMethod === 'package') refundMethod = 'package';
      else refundMethod = b.paymentMethod === 'wallet' ? 'wallet' : 'cash';

      const refundAmount = b.totalAmount;
      const refund: RefundRecord = {
        id: genId('rf_'), billId: b.id, bookingId: id,
        amount: refundAmount, reason, refundMethod: refundMethod as PaymentMethod, note, createdAt: now,
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
      } else if (refundMethod === 'package' && booking.packageId && b.memberId) {
        const pkgId = booking.packageId;
        const used = booking.packageUsedCount ?? 1;
        nextPackages = nextPackages.map((p) =>
          p.id === pkgId
            ? { ...p, usedCount: Math.max(0, p.usedCount - used), remainingCount: p.remainingCount + used }
            : p
        );
        const member = nextMembers.find((m) => m.id === b.memberId);
        if (member) {
          const newUse = Math.max(0, member.totalPackageUse - used);
          nextMembers = nextMembers.map((m) => m.id === b.memberId ? { ...m, totalPackageUse: newUse } : m);
          const remainAfter = nextPackages.filter((p) => p.memberId === b.memberId).reduce((s, p) => s + p.remainingCount, 0);
          const tx: WalletTransaction = {
            id: genId('wt_'), memberId: b.memberId, type: 'package_refund',
            amount: 0, balanceAfter: member.balance,
            packageBalanceAfter: remainAfter,
            billId: b.id, bookingId: id, packageId: pkgId,
            note: `次卡退回${used}次`,
            createdAt: now,
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
    saveData('memberPackages', nextPackages);
    saveData('walletTxs', nextTxs);
    set({
      bookings: nextBookings, bills: nextBills,
      members: nextMembers, memberPackages: nextPackages, walletTxs: nextTxs,
    });
    return { ok: true };
  },

  settleBill(billId, method) {
    const bill = get().bills.find((b) => b.id === billId);
    if (!bill) return { ok: false, error: '账单不存在' };
    if (bill.paymentStatus !== 'pending') return { ok: false, error: '账单不是待收款状态' };

    const now = new Date().toISOString();
    let nextMembers = get().members;
    let nextPackages = get().memberPackages;
    let nextTxs = get().walletTxs;
    let payMethod: PaymentMethod | undefined;

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
      payMethod = 'wallet';
    } else if (method === 'package') {
      if (!bill.memberId) return { ok: false, error: '次卡核销需关联会员' };
      const totalRemain = get().getMemberTotalPackageRemaining(bill.memberId);
      if (totalRemain < 1) return { ok: false, error: '次卡余额不足' };
      const firstPkg = get().memberPackages
        .filter((p) => p.memberId === bill.memberId && p.remainingCount > 0)
        .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))[0];
      if (!firstPkg) return { ok: false, error: '没有可用的次卡' };
      nextPackages = nextPackages.map((p) =>
        p.id === firstPkg.id ? { ...p, usedCount: p.usedCount + 1, remainingCount: p.remainingCount - 1 } : p
      );
      const m = nextMembers.find((x) => x.id === bill.memberId);
      if (m) {
        const newUse = m.totalPackageUse + 1;
        nextMembers = nextMembers.map((x) => x.id === bill.memberId ? { ...x, totalPackageUse: newUse } : x);
        const remainAfter = totalRemain - 1;
        const tx: WalletTransaction = {
          id: genId('wt_'), memberId: bill.memberId, type: 'package_use',
          amount: 0, balanceAfter: m.balance,
          packageBalanceAfter: remainAfter,
          billId: bill.id, bookingId: bill.bookingId, packageId: firstPkg.id,
          note: `次卡核销（${bill.totalAmount.toFixed(2)}元等额）`,
          createdAt: now,
        };
        nextTxs = [...nextTxs, tx];
      }
    } else {
      payMethod = method as PaymentMethod;
      if (payMethod === 'cash' || payMethod === 'card') {
        const booking = get().bookings.find((b) => b.id === bill.bookingId);
        const tx: WalletTransaction = {
          id: genId('wt_'),
          memberId: bill.memberId,
          type: payMethod === 'cash' ? 'cash_pay' : 'card_pay',
          amount: bill.totalAmount,
          billId: bill.id,
          bookingId: bill.bookingId,
          payMethod,
          customerName: bill.memberSnapshot?.name ?? booking?.customerName,
          customerType: booking?.customerType,
          createdAt: now,
        };
        nextTxs = [...nextTxs, tx];
      }
    }

    const bookingPayMethod: any = payMethod ?? method;
    const nextBookings = get().bookings.map((b) =>
      b.id === bill.bookingId ? { ...b, payMethod: bookingPayMethod } : b
    );

    const nextBills = get().bills.map((b) =>
      b.id === billId
        ? { ...b, paymentStatus: 'paid' as PaymentStatus, paymentMethod: payMethod, paidAt: now }
        : b
    );

    saveData('bookings', nextBookings);
    saveData('bills', nextBills);
    saveData('members', nextMembers);
    saveData('memberPackages', nextPackages);
    saveData('walletTxs', nextTxs);
    set({ bookings: nextBookings, bills: nextBills, members: nextMembers, memberPackages: nextPackages, walletTxs: nextTxs });
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
    const { courts, bookings, bills, members, walletTxs } = get();

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
          // 只有已到账（paid）才算收入
          if (bill && bill.paymentStatus === 'paid') revenue += bill.totalAmount;
        } else if (b.status === 'cancelled') {
          cancelledMinutes += mins;
          cancelCount += 1;
          // 只有已支付后退款的才算退款金额
          if (bill && bill.refundAmount && bill.paymentMethod) refunded += bill.refundAmount;
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

    // 收入按已到账统计
    const totalRevenue = perCourt.reduce((s, c) => s + c.revenue, 0);
    const totalRefund = perCourt.reduce((s, c) => s + c.refunded, 0);
    const totalBookings = perCourt.reduce((s, c) => s + c.bookingCount, 0);
    const totalCancels = perCourt.reduce((s, c) => s + c.cancelCount, 0);
    const avgUtil = perCourt.length ? perCourt.reduce((s, c) => s + c.utilization, 0) / perCourt.length : 0;

    // 会员/散客收入拆分（按已到账）
    let memberRevenue = 0;
    let walkinRevenue = 0;
    let memberBookingCount = 0;
    let walkinBookingCount = 0;
    let pendingAmount = 0;
    let paidAmount = 0;

    const rangeBookingsAll = bookings.filter((b) => setDates.has(b.date) && b.status === 'active');
    for (const b of rangeBookingsAll) {
      const bill = bills.find((x) => x.bookingId === b.id);
      if (!bill) continue;
      if (bill.paymentStatus === 'paid') {
        paidAmount += bill.totalAmount;
        if (b.customerType === 'member') memberRevenue += bill.totalAmount;
        else walkinRevenue += bill.totalAmount;
      } else if (bill.paymentStatus === 'pending') {
        pendingAmount += bill.totalAmount;
      }
      if (b.customerType === 'member') memberBookingCount += 1;
      else walkinBookingCount += 1;
    }

    // 充值收入（储值收款，按时间筛选账单创建日期）
    let rechargeRevenue = 0;
    for (const tx of walletTxs) {
      const txDate = tx.createdAt?.slice(0, 10);
      if (!txDate) continue;
      if (!setDates.has(txDate)) continue;
      if (tx.type === 'recharge') rechargeRevenue += tx.amount;
    }

    // 会员消费排行（按时间范围内预约金额）
    const memberMap = new Map<string, { count: number; spend: number; recharge: number }>();
    for (const b of rangeBookingsAll) {
      if (!b.memberId) continue;
      const bill = bills.find((x) => x.bookingId === b.id);
      const amount = bill?.paymentStatus === 'paid' ? bill.totalAmount : 0;
      const cur = memberMap.get(b.memberId) ?? { count: 0, spend: 0, recharge: 0 };
      cur.count += 1;
      cur.spend += amount;
      memberMap.set(b.memberId, cur);
    }
    // 加上充值金额
    for (const tx of walletTxs) {
      const txDate = tx.createdAt?.slice(0, 10);
      if (!txDate || !setDates.has(txDate)) continue;
      if (tx.type !== 'recharge') continue;
      const cur = memberMap.get(tx.memberId) ?? { count: 0, spend: 0, recharge: 0 };
      cur.recharge += tx.amount;
      memberMap.set(tx.memberId, cur);
    }

    const memberRanking = Array.from(memberMap.entries())
      .map(([memberId, v]) => {
        const m = members.find((x) => x.id === memberId);
        return {
          memberId,
          memberName: m?.name ?? '未知',
          memberLevel: m?.level ?? 'normal',
          bookingCount: v.count,
          totalSpend: Number(v.spend.toFixed(2)),
          totalRecharge: Number(v.recharge.toFixed(2)),
        };
      })
      .sort((a, b) => b.totalSpend + b.totalRecharge - (a.totalSpend + a.totalRecharge));

    // 复购会员数 = 有 2 次及以上预约的会员数
    const uniqueMembers = memberMap.size;
    const repeatMembers = Array.from(memberMap.values()).filter((v) => v.count >= 2).length;
    const repeatMemberRate = uniqueMembers > 0 ? (repeatMembers / uniqueMembers) * 100 : 0;

    return {
      range, from, to,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalRefund: Number(totalRefund.toFixed(2)),
      netRevenue: Number((totalRevenue - totalRefund).toFixed(2)),
      memberRevenue: Number(memberRevenue.toFixed(2)),
      walkinRevenue: Number(walkinRevenue.toFixed(2)),
      rechargeRevenue: Number(rechargeRevenue.toFixed(2)),
      pendingAmount: Number(pendingAmount.toFixed(2)),
      paidAmount: Number(paidAmount.toFixed(2)),
      totalBookings, totalCancels,
      memberBookingCount, walkinBookingCount,
      uniqueMembers,
      repeatMemberRate: Number(repeatMemberRate.toFixed(2)),
      avgUtilization: Number(avgUtil.toFixed(2)),
      courts: perCourt.sort((a, b) => b.revenue - a.revenue),
      memberRanking,
    };
  },

  computeDailyReconciliation(date: string) {
    const { walletTxs, bookings, bills } = get();
    let cashIncome = 0;
    let cardIncome = 0;
    let walletIncome = 0;
    let packageIncome = 0;
    let rechargeIncome = 0;
    let packageBuyIncome = 0;
    let refundAmount = 0;
    const txIds = new Set<string>();
    const bookingIds = new Set<string>();

    for (const tx of walletTxs) {
      const txDate = tx.createdAt?.slice(0, 10);
      if (txDate !== date) continue;
      txIds.add(tx.id);
      if (tx.bookingId) bookingIds.add(tx.bookingId);
      switch (tx.type) {
        case 'cash_pay': cashIncome += tx.amount; break;
        case 'card_pay': cardIncome += tx.amount; break;
        case 'consume': walletIncome += tx.amount; break;
        case 'package_use': packageIncome += tx.amount > 0 ? tx.amount : 0; break;
        case 'recharge': rechargeIncome += tx.amount; break;
        case 'package_buy': packageBuyIncome += tx.amount; break;
        case 'refund':
        case 'package_refund':
          refundAmount += tx.amount; break;
      }
    }

    // 对于历史数据（老的 paid 账单没有对应 tx），补上
    for (const bill of bills) {
      const billDate = bill.paidAt?.slice(0, 10) ?? bill.createdAt.slice(0, 10);
      if (billDate !== date) continue;
      if (bill.paymentStatus !== 'paid') continue;
      // 有对应 tx 的不计入
      const hasTx = Array.from(txIds).some((id) => walletTxs.find((t) => t.id === id)?.billId === bill.id);
      if (hasTx) continue;
      if (bill.paymentMethod === 'cash') cashIncome += bill.totalAmount;
      else if (bill.paymentMethod === 'card') cardIncome += bill.totalAmount;
      else if (bill.paymentMethod === 'wallet') walletIncome += bill.totalAmount;
    }

    const totalIncome = cashIncome + cardIncome + walletIncome + packageIncome + rechargeIncome + packageBuyIncome;

    return {
      date,
      cashIncome: Number(cashIncome.toFixed(2)),
      cardIncome: Number(cardIncome.toFixed(2)),
      walletIncome: Number(walletIncome.toFixed(2)),
      packageIncome: Number(packageIncome.toFixed(2)),
      rechargeIncome: Number(rechargeIncome.toFixed(2)),
      packageBuyIncome: Number(packageBuyIncome.toFixed(2)),
      refundAmount: Number(refundAmount.toFixed(2)),
      totalIncome: Number(totalIncome.toFixed(2)),
      netIncome: Number((totalIncome - refundAmount).toFixed(2)),
      txCount: txIds.size,
      bookingCount: bookingIds.size,
    };
  },

  listDayTransactions(date: string) {
    return get().walletTxs
      .filter((t) => (t.createdAt?.slice(0, 10) ?? '') === date)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  },

  computeMemberAnalytics(memberId: string) {
    const { bookings, bills, walletTxs, courts, memberPackages } = get();
    const mBookings = bookings.filter((b) => b.memberId === memberId);
    const mTxs = walletTxs.filter((t) => t.memberId === memberId);
    const mPackages = memberPackages.filter((p) => p.memberId === memberId);

    let totalSpend = 0;
    let totalRecharge = 0;
    for (const tx of mTxs) {
      if (tx.type === 'consume' || tx.type === 'cash_pay' || tx.type === 'card_pay') totalSpend += tx.amount;
      if (tx.type === 'recharge') totalRecharge += tx.amount;
    }

    const lastVisit = mBookings.length > 0
      ? mBookings.sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime))[0].date
      : null;

    // 常用场地
    const courtCount = new Map<string, number>();
    for (const b of mBookings) {
      if (b.status !== 'active') continue;
      courtCount.set(b.courtId, (courtCount.get(b.courtId) ?? 0) + 1);
    }
    let favoriteCourtId: string | null = null;
    let maxCount = 0;
    for (const [id, c] of courtCount.entries()) {
      if (c > maxCount) { maxCount = c; favoriteCourtId = id; }
    }
    const favoriteCourt = favoriteCourtId ? courts.find((c) => c.id === favoriteCourtId) : null;

    // 近 6 个月趋势
    const monthMap = new Map<string, { amount: number; count: number }>();
    for (const b of mBookings) {
      const bill = bills.find((x) => x.bookingId === b.id);
      if (!bill || bill.paymentStatus !== 'paid') continue;
      const m = b.date.slice(0, 7);
      const cur = monthMap.get(m) ?? { amount: 0, count: 0 };
      cur.amount += bill.totalAmount;
      cur.count += 1;
      monthMap.set(m, cur);
    }
    const monthlyTrend = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, v]) => ({ month, amount: Number(v.amount.toFixed(2)), count: v.count }));

    // 次卡进度
    const packageProgress = mPackages.map((p) => ({
      packageName: p.packageName,
      total: p.totalCount,
      used: p.usedCount,
      remaining: p.remainingCount,
      pct: Number(((p.usedCount / Math.max(p.totalCount, 1)) * 100).toFixed(1)),
    }));

    return {
      memberId,
      totalSpend: Number(totalSpend.toFixed(2)),
      totalRecharge: Number(totalRecharge.toFixed(2)),
      bookingCount: mBookings.length,
      lastVisit,
      favoriteCourtId,
      favoriteCourtName: favoriteCourt?.name ?? null,
      monthlyTrend,
      packageProgress,
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
