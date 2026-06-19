import type { Booking, ConflictResult } from '@/types';
import { timeToMinutes } from './time';

export function checkTimeOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
}

export function checkBookingConflict(
  bookings: Booking[],
  courtId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): ConflictResult {
  const conflicting = bookings.filter((b) => {
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status !== 'active') return false;
    if (b.courtId !== courtId) return false;
    if (b.date !== date) return false;
    return checkTimeOverlap(startTime, endTime, b.startTime, b.endTime);
  });
  return {
    hasConflict: conflicting.length > 0,
    conflictingBookings: conflicting,
  };
}

export function checkRateOverlap(
  rates: { id?: string; startTime: string; endTime: string }[],
  startTime: string,
  endTime: string,
  excludeId?: string
): boolean {
  return rates.some((r) => {
    if (excludeId && r.id === excludeId) return false;
    return checkTimeOverlap(startTime, endTime, r.startTime, r.endTime);
  });
}
