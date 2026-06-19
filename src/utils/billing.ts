import type { BillingResult, BillingSegment, DoublesShare, Rate, RateTier } from '@/types';
import { timeToMinutes, minutesToTime, minutesBetween } from './time';

function getRateAtMinute(rates: Rate[], minute: number): Rate | null {
  for (const r of rates) {
    const s = timeToMinutes(r.startTime);
    const e = timeToMinutes(r.endTime);
    if (minute >= s && minute < e) return r;
  }
  return null;
}

function sortRates(rates: Rate[]): Rate[] {
  return [...rates].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

export function calculateBilling(startTime: string, endTime: string, rates: Rate[]): BillingResult {
  const sortedRates = sortRates(rates);
  const segments: BillingSegment[] = [];
  let startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  let cur = startMin;

  while (cur < endMin) {
    const rate = getRateAtMinute(sortedRates, cur);
    if (!rate) {
      cur += 30;
      continue;
    }
    const rateEnd = Math.min(timeToMinutes(rate.endTime), endMin);
    const duration = rateEnd - cur;
    const amount = Number(((duration / 60) * rate.pricePerHour).toFixed(2));
    segments.push({
      startTime: minutesToTime(cur),
      endTime: minutesToTime(rateEnd),
      durationMinutes: duration,
      tier: rate.tier,
      tierName: rate.tierName,
      pricePerHour: rate.pricePerHour,
      amount,
      color: rate.color,
    });
    cur = rateEnd;
  }

  const totalAmount = Number(segments.reduce((sum, s) => sum + s.amount, 0));
  const totalMinutes = minutesBetween(startTime, endTime);
  return { segments, totalAmount, totalMinutes };
}

export function splitDoublesShare(totalAmount: number, leaderName: string, teammates: string[]): DoublesShare[] {
  const people = [leaderName, ...teammates];
  const count = people.length;
  if (count <= 1) {
    return [{ name: leaderName, amount: totalAmount, isLeader: true }];
  }
  const perPerson = Math.floor(totalAmount * 100 / count) / 100;
  const perPersonInt = Math.floor(totalAmount * 100 / count);
  const remainder = totalAmount * 100 - perPersonInt * count;
  const shares: DoublesShare[] = teammates.map((name) => ({
    name,
    amount: perPerson,
    isLeader: false,
  }));
  shares.unshift({
    name: leaderName,
    amount: Number(((perPersonInt + remainder) / 100).toFixed(2)),
    isLeader: true,
  });
  return shares;
}

export function tierLabel(tier: RateTier): string {
  const map: Record<RateTier, string> = {
    peak: '高峰',
    flat: '平峰',
    valley: '谷峰',
  };
  return map[tier];
}

export function tierColorClass(tier: RateTier): string {
  const map: Record<RateTier, string> = {
    peak: 'bg-red-100 text-red-700 border-red-200',
    flat: 'bg-blue-100 text-blue-700 border-blue-200',
    valley: 'bg-green-100 text-green-700 border-green-200',
  };
  return map[tier];
}
