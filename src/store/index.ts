import { create } from 'zustand';
import type { Bill, Booking, Court, Rate } from '@/types';
import { loadData, saveData, genId, genBillNo } from '@/utils/storage';
import { todayStr, addDays } from '@/utils/time';
import { calculateBilling, splitDoublesShare } from '@/utils/billing';
import { checkBookingConflict } from '@/utils/conflict';

interface AppState {
  courts: Court[];
  rates: Rate[];
  bookings: Booking[];
  bills: Bill[];
  inited: boolean;

  initIfNeeded: () => void;

  addCourt: (c: Omit<Court, 'id' | 'createdAt'>) => void;
  updateCourt: (id: string, patch: Partial<Court>) => void;

  addRate: (r: Omit<Rate, 'id'>) => void;
  updateRate: (id: string, patch: Partial<Rate>) => void;
  removeRate: (id: string) => void;

  createBooking: (data: {
    courtId: string;
    date: string;
    startTime: string;
    endTime: string;
    customerName: string;
    bookingType: 'singles' | 'doubles';
    teammates: string[];
  }) => { ok: boolean; error?: string; booking?: Booking };

  cancelBooking: (id: string) => void;

  checkConflict: (
    courtId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
  ) => { hasConflict: boolean; conflictingBookings: Booking[] };

  calcBilling: (startTime: string, endTime: string) => ReturnType<typeof calculateBilling>;
}

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

function makeDefaultBookings(): Booking[] {
  const today = todayStr();
  const tomorrow = addDays(today, 1);
  return [
    {
      id: 'b1', courtId: 'c1', date: today, startTime: '08:00', endTime: '09:30',
      customerName: '张三', bookingType: 'singles', teammates: [],
      totalAmount: 75, status: 'active', createdAt: new Date().toISOString(),
    },
    {
      id: 'b2', courtId: 'c1', date: today, startTime: '18:00', endTime: '20:00',
      customerName: '李四', bookingType: 'doubles', teammates: ['王五', '赵六', '孙七'],
      totalAmount: 240, status: 'active', createdAt: new Date().toISOString(),
    },
    {
      id: 'b3', courtId: 'c2', date: tomorrow, startTime: '14:00', endTime: '16:00',
      customerName: '周八', bookingType: 'singles', teammates: [],
      totalAmount: 160, status: 'active', createdAt: new Date().toISOString(),
    },
  ];
}

function makeDefaultBills(bookings: Booking[], rates: Rate[]): Bill[] {
  return bookings.filter((b) => b.status === 'active').map((b) => {
    const billing = calculateBilling(b.startTime, b.endTime, rates);
    const shares = b.bookingType === 'doubles'
      ? splitDoublesShare(billing.totalAmount, b.customerName, b.teammates)
      : undefined;
    return {
      id: genId('bl_'),
      bookingId: b.id,
      billNo: genBillNo(),
      totalAmount: billing.totalAmount,
      segments: billing.segments,
      shares,
      createdAt: b.createdAt,
    };
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  courts: [],
  rates: [],
  bookings: [],
  bills: [],
  inited: false,

  initIfNeeded() {
    if (get().inited) return;
    const courts = loadData<Court[]>('courts', []);
    const rates = loadData<Rate[]>('rates', []);
    const bookings = loadData<Booking[]>('bookings', []);
    const bills = loadData<Bill[]>('bills', []);

    if (courts.length === 0) {
      saveData('courts', DEFAULT_COURTS);
      saveData('rates', DEFAULT_RATES);
      const dBookings = makeDefaultBookings();
      saveData('bookings', dBookings);
      const dBills = makeDefaultBills(dBookings, DEFAULT_RATES);
      saveData('bills', dBills);
      set({ courts: DEFAULT_COURTS, rates: DEFAULT_RATES, bookings: dBookings, bills: dBills, inited: true });
    } else {
      set({ courts, rates, bookings, bills, inited: true });
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

  checkConflict(courtId, date, startTime, endTime, excludeBookingId) {
    return checkBookingConflict(get().bookings, courtId, date, startTime, endTime, excludeBookingId);
  },

  calcBilling(startTime, endTime) {
    return calculateBilling(startTime, endTime, get().rates);
  },

  createBooking(data) {
    const { courtId, date, startTime, endTime, customerName, bookingType, teammates } = data;
    const conflict = get().checkConflict(courtId, date, startTime, endTime);
    if (conflict.hasConflict) {
      const names = conflict.conflictingBookings.map((b) => `${b.customerName}(${b.startTime}-${b.endTime})`).join('、');
      return { ok: false, error: `时段冲突，已被 ${names} 预订` };
    }
    const billing = get().calcBilling(startTime, endTime);
    const booking: Booking = {
      id: genId('b_'),
      courtId, date, startTime, endTime,
      customerName, bookingType, teammates,
      totalAmount: billing.totalAmount,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    const nextBookings = [...get().bookings, booking];
    saveData('bookings', nextBookings);

    const shares = bookingType === 'doubles'
      ? splitDoublesShare(billing.totalAmount, customerName, teammates)
      : undefined;
    const bill: Bill = {
      id: genId('bl_'),
      bookingId: booking.id,
      billNo: genBillNo(),
      totalAmount: billing.totalAmount,
      segments: billing.segments,
      shares,
      createdAt: new Date().toISOString(),
    };
    const nextBills = [...get().bills, bill];
    saveData('bills', nextBills);

    set({ bookings: nextBookings, bills: nextBills });
    return { ok: true, booking };
  },

  cancelBooking(id) {
    const nextBookings = get().bookings.map((b) =>
      b.id === id ? { ...b, status: 'cancelled' as const } : b
    );
    saveData('bookings', nextBookings);
    set({ bookings: nextBookings });
  },
}));
