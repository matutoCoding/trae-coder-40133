import type { Rate, RateGap } from '@/types';
import { timeToMinutes, minutesToTime, DAY_START, DAY_END } from './time';

export function findRateGaps(rates: Rate[], scopeStart = DAY_START, scopeEnd = DAY_END): RateGap[] {
  const gaps: RateGap[] = [];
  if (rates.length === 0) {
    const duration = timeToMinutes(scopeEnd) - timeToMinutes(scopeStart);
    return [{ startTime: scopeStart, endTime: scopeEnd, durationMinutes: duration }];
  }

  const sorted = [...rates].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const scopeStartMin = timeToMinutes(scopeStart);
  const scopeEndMin = timeToMinutes(scopeEnd);

  let cursor = scopeStartMin;

  for (const r of sorted) {
    const rStart = timeToMinutes(r.startTime);
    const rEnd = timeToMinutes(r.endTime);
    const effStart = Math.max(rStart, scopeStartMin);
    const effEnd = Math.min(rEnd, scopeEndMin);
    if (effStart >= effEnd) continue;

    if (cursor < effStart) {
      gaps.push({
        startTime: minutesToTime(cursor),
        endTime: minutesToTime(effStart),
        durationMinutes: effStart - cursor,
      });
    }
    cursor = Math.max(cursor, effEnd);
  }

  if (cursor < scopeEndMin) {
    gaps.push({
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(scopeEndMin),
      durationMinutes: scopeEndMin - cursor,
    });
  }

  return gaps;
}

export function hasRateGapInRange(
  rates: Rate[],
  startTime: string,
  endTime: string
): { hasGap: boolean; gaps: RateGap[] } {
  const allGaps = findRateGaps(rates);
  const sMin = timeToMinutes(startTime);
  const eMin = timeToMinutes(endTime);
  const overlapped: RateGap[] = [];
  for (const g of allGaps) {
    const gS = timeToMinutes(g.startTime);
    const gE = timeToMinutes(g.endTime);
    if (sMin < gE && eMin > gS) {
      const ovStart = Math.max(sMin, gS);
      const ovEnd = Math.min(eMin, gE);
      overlapped.push({
        startTime: minutesToTime(ovStart),
        endTime: minutesToTime(ovEnd),
        durationMinutes: ovEnd - ovStart,
      });
    }
  }
  return { hasGap: overlapped.length > 0, gaps: overlapped };
}

export function formatRateGapList(gaps: RateGap[]): string {
  return gaps.map((g) => `${g.startTime}-${g.endTime}`).join('、');
}
