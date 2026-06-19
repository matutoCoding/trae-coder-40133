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

export interface Booking {
  id: string;
  courtId: string;
  date: string;
  startTime: string;
  endTime: string;
  customerName: string;
  bookingType: BookingType;
  teammates: string[];
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
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

export interface Bill {
  id: string;
  bookingId: string;
  billNo: string;
  totalAmount: number;
  segments: BillingSegment[];
  shares?: DoublesShare[];
  createdAt: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflictingBookings: Booking[];
}
