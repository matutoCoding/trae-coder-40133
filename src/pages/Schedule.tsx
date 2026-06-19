import { useMemo, useState } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Plus, XCircle, User, Users,
  CalendarDays, Grid3X3, Filter, RotateCcw,
} from 'lucide-react';
import { useAppStore } from '@/store';
import PageHeader from '@/components/PageHeader';
import BookingModal from '@/components/BookingModal';
import {
  todayStr, addDays, formatDateDisplay, generateTimeSlots, timeToMinutes,
  formatDate, parseDate,
} from '@/utils/time';
import type { Booking, Court } from '@/types';

type ViewMode = 'day' | 'week';

const TIME_SLOTS = generateTimeSlots();
const DAY_START_MIN = timeToMinutes('06:00');
const DAY_END_MIN = timeToMinutes('22:00');
const TOTAL_MIN = DAY_END_MIN - DAY_START_MIN;

function getBookingTopHeight(b: Booking) {
  const start = timeToMinutes(b.startTime) - DAY_START_MIN;
  const end = timeToMinutes(b.endTime) - DAY_START_MIN;
  const top = (start / TOTAL_MIN) * 100;
  const height = Math.max(((end - start) / TOTAL_MIN) * 100, 4);
  return { top: `${top}%`, height: `${height}%` };
}

function getWeekDates(base: string): string[] {
  const d = parseDate(base);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const t = new Date(monday);
    t.setDate(monday.getDate() + i);
    return formatDate(t);
  });
}

const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function Schedule() {
  const courts = useAppStore((s) => s.courts);
  const bookings = useAppStore((s) => s.bookings);
  const cancelBooking = useAppStore((s) => s.cancelBooking);

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [cursorDate, setCursorDate] = useState(todayStr());
  const [selectedCourts, setSelectedCourts] = useState<string[]>([]);
  const [showCourtFilter, setShowCourtFilter] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; court: Court | null; date: string; start?: string; end?: string }>({
    open: false, court: null, date: todayStr(),
  });

  const activeCourts = useMemo(() => {
    const list = courts.filter((c) => c.active);
    if (selectedCourts.length === 0) return list;
    return list.filter((c) => selectedCourts.includes(c.id));
  }, [courts, selectedCourts]);

  const weekDates = useMemo(() => getWeekDates(cursorDate), [cursorDate]);
  const displayDates = viewMode === 'day' ? [cursorDate] : weekDates;

  function shiftCursor(days: number) {
    if (viewMode === 'week') {
      setCursorDate(addDays(cursorDate, days > 0 ? 7 : -7));
    } else {
      setCursorDate(addDays(cursorDate, days));
    }
  }

  function openBooking(court: Court, date: string, start?: string, end?: string) {
    setModal({ open: true, court, date, start, end });
  }

  function openRebookFromCancelled(court: Court, b: Booking) {
    setModal({ open: true, court, date: b.date, start: b.startTime, end: b.endTime });
  }

  function onCancelBooking(b: Booking) {
    if (confirm(`确认退订「${b.customerName}」${b.startTime}-${b.endTime} 的预约？\n将生成退款记录，时段释放后可重新预约。`)) {
      cancelBooking(b.id, 'user_cancel');
    }
  }

  function toggleCourtFilter(id: string) {
    setSelectedCourts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function slotToRange(slotIndex: number) {
    const start = TIME_SLOTS[slotIndex];
    const end = slotIndex + 1 < TIME_SLOTS.length ? TIME_SLOTS[slotIndex + 1] : '22:00';
    return { start, end };
  }

  function buildColumns() {
    const cols: { court: Court; date: string }[] = [];
    for (const court of activeCourts) {
      for (const date of displayDates) {
        cols.push({ court, date });
      }
    }
    return cols;
  }

  const columns = buildColumns();
  const totalCols = columns.length;

  function getBookingsForCol(courtId: string, date: string) {
    return bookings.filter((b) => b.courtId === courtId && b.date === date);
  }

  return (
    <div>
      <PageHeader
        title="排期总览"
        subtitle={viewMode === 'day' ? '按日期查看场地时段占用，点击空白创建预约；点击已退订卡片可原时段重新下单' : '周视图概览每片场地的预约密度，支持按周快速浏览'}
        icon={<Calendar size={22} />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowCourtFilter(!showCourtFilter)}
                className={`btn-secondary ${selectedCourts.length > 0 ? 'ring-2 ring-tennis-400' : ''}`}
              >
                <Filter size={14} className="mr-1.5" />
                场地筛选
                {selectedCourts.length > 0 && <span className="ml-1.5 tag bg-tennis-100 text-tennis-800">{selectedCourts.length}</span>}
              </button>
              {showCourtFilter && (
                <div className="absolute right-0 top-12 z-30 w-60 card animate-fade-in-up p-2 space-y-1">
                  <div className="px-2 py-1 text-xs text-gray-500 border-b border-gray-100 mb-1">
                    选择要显示的场地（不选=全部）
                  </div>
                  {courts.filter((c) => c.active).map((c) => (
                    <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-tennis-50 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={selectedCourts.includes(c.id)}
                        onChange={() => toggleCourtFilter(c.id)}
                        className="accent-tennis-700"
                      />
                      <span>{c.name}</span>
                      <span className="ml-auto text-xs text-gray-400">{c.code}</span>
                    </label>
                  ))}
                  {selectedCourts.length > 0 && (
                    <button
                      onClick={() => setSelectedCourts([])}
                      className="w-full mt-2 text-xs text-tennis-700 hover:text-tennis-800 py-1 flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={12} /> 重置
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="inline-flex rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-2 text-sm font-medium transition ${
                  viewMode === 'day' ? 'bg-tennis-700 text-white' : 'text-gray-600 hover:bg-tennis-50'
                }`}
              >
                <Grid3X3 size={14} className="inline mr-1" /> 日视图
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-2 text-sm font-medium transition border-l border-gray-200 ${
                  viewMode === 'week' ? 'bg-tennis-700 text-white' : 'text-gray-600 hover:bg-tennis-50'
                }`}
              >
                <CalendarDays size={14} className="inline mr-1" /> 周视图
              </button>
            </div>

            <div className="flex items-center rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => shiftCursor(-1)}
                className="px-3 py-2 hover:bg-tennis-50 text-gray-600 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-2 border-x border-gray-200 min-w-[150px] text-center">
                <div className="font-display font-bold text-tennis-950 text-sm">
                  {viewMode === 'day'
                    ? formatDateDisplay(cursorDate)
                    : `${formatDateDisplay(weekDates[0])} - ${formatDateDisplay(weekDates[6])}`}
                </div>
                <div className="text-[11px] text-gray-400 leading-none mt-0.5">{cursorDate}</div>
              </div>
              <button
                onClick={() => shiftCursor(1)}
                className="px-3 py-2 hover:bg-tennis-50 text-gray-600 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button onClick={() => setCursorDate(todayStr())} className="btn-secondary">今天</button>
            {activeCourts[0] && (
              <button
                onClick={() => openBooking(activeCourts[0], cursorDate)}
                className="btn-accent"
              >
                <Plus size={16} className="mr-1.5" /> 新建预约
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 px-2.5 py-1 rounded-full bg-white border">
          <span className="w-3 h-3 rounded bg-tennis-600/80" /> 已预约
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 px-2.5 py-1 rounded-full bg-white border">
          <span className="w-3 h-3 rounded bg-ball-400/60" /> 可预约
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-gray-600 px-2.5 py-1 rounded-full bg-white border">
          <span className="w-3 h-3 rounded bg-gray-400/70" /> 已退订（可点击重约）
        </div>
      </div>

      {activeCourts.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">暂无启用的场地，请先到「场地管理」新增</div>
      ) : (
        <div className="card overflow-hidden relative">
          <div className="overflow-x-auto scrollbar-thin">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `80px repeat(${totalCols}, minmax(140px, 1fr))`,
                minWidth: 80 + totalCols * 150,
              }}
            >
              <div className="sticky left-0 z-10 bg-gradient-to-b from-tennis-50 to-white border-b border-r border-tennis-100" />

              {columns.map((col, idx) => {
                const isFirstOfDay = viewMode === 'week' ? idx % 7 === 0 : true;
                const dayIdx = viewMode === 'week' ? idx % 7 : 0;
                const isWeekend = dayIdx >= 5;
                return (
                  <div
                    key={`${col.court.id}-${col.date}-${idx}`}
                    className={`px-2 py-3 bg-gradient-to-b from-tennis-50 to-white border-b border-r border-tennis-100 text-center ${
                      isWeekend ? 'bg-amber-50/40' : ''
                    } ${!isFirstOfDay && viewMode === 'week' ? 'border-l border-dashed border-tennis-200' : ''}`}
                  >
                    {viewMode === 'week' && (
                      <div className={`text-[10px] font-semibold ${isWeekend ? 'text-amber-600' : 'text-gray-400'}`}>
                        {WEEK_LABELS[dayIdx]}
                      </div>
                    )}
                    <div className="font-display font-bold text-tennis-950 text-sm leading-tight">
                      {col.court.name}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {viewMode === 'week' ? formatDateDisplay(col.date).split(' ')[0] : col.court.code}
                    </div>
                  </div>
                );
              })}

              {TIME_SLOTS.map((slot, slotIdx) => {
                const { end } = slotToRange(slotIdx);
                return (
                  <div key={slot} className="contents group">
                    <div className="sticky left-0 z-10 bg-white border-r border-b border-gray-100 text-xs text-gray-500 px-2 py-3 text-right font-mono group-hover:bg-tennis-50 transition">
                      {slot}
                    </div>
                    {columns.map((col, idx) => {
                      const hour = Number(slot.slice(0, 2));
                      const isHourMark = hour % 2 === 0 && slot.endsWith(':00');
                      const dayIdx = viewMode === 'week' ? idx % 7 : 0;
                      const isWeekend = dayIdx >= 5;
                      return (
                        <div
                          key={col.court.id + col.date + slot + idx}
                          onClick={() => openBooking(col.court, col.date, slot, end)}
                          className={`relative border-r border-b cursor-pointer transition min-h-[44px] ${
                            isHourMark
                              ? `bg-gray-50/60 border-gray-200 ${isWeekend ? 'bg-amber-50/30' : ''}`
                              : `border-gray-100 bg-white ${isWeekend ? 'bg-amber-50/10' : ''}`
                          } hover:bg-ball-300/30`}
                          title={`${col.court.name} · ${formatDateDisplay(col.date)} ${slot}-${end} 点击预约`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {columns.map((col, colIdx) => {
            const colBookings = getBookingsForCol(col.court.id, col.date);
            if (colBookings.length === 0) return null;
            const headerH = 64;
            const colWidth = `calc((100% - 80px) / ${totalCols})`;
            const left = `calc(80px + ${colIdx} * (100% - 80px) / ${totalCols} + 2px)`;
            return (
              <div
                key={col.court.id + col.date + '-overlay-' + colIdx}
                className="pointer-events-none absolute"
                style={{
                  left,
                  top: `${headerH}px`,
                  width: `calc(${colWidth} - 4px)`,
                  height: `calc(${TIME_SLOTS.length} * 44px)`,
                }}
              >
                {colBookings.map((b) => {
                  const pos = getBookingTopHeight(b);
                  const isCancelled = b.status === 'cancelled';
                  return (
                    <button
                      key={b.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCancelled) {
                          openRebookFromCancelled(col.court, b);
                        } else {
                          onCancelBooking(b);
                        }
                      }}
                      className={`absolute left-0 right-0 rounded-lg mx-0.5 px-2 py-1.5 text-left text-white text-[11px] overflow-hidden pointer-events-auto transition hover:brightness-110 shadow ${
                        isCancelled
                          ? 'bg-gradient-to-br from-gray-500 to-gray-600 ring-2 ring-dashed ring-ball-400/70'
                          : 'bg-gradient-to-br from-tennis-700 to-tennis-800'
                      }`}
                      style={{ top: pos.top, height: pos.height }}
                      title={
                        isCancelled
                          ? `已退订 · 点击按原时段重新预约：${b.customerName} ${b.startTime}-${b.endTime}`
                          : `点击退订：${b.customerName} ${b.startTime}-${b.endTime}`
                      }
                    >
                      <div className="flex items-center gap-1 font-semibold truncate">
                        {b.bookingType === 'doubles' ? <Users size={12} /> : <User size={12} />}
                        <span className="truncate">{b.customerName}</span>
                      </div>
                      <div className="text-[10px] opacity-90 font-mono leading-tight">
                        {b.startTime}-{b.endTime} · ¥{b.totalAmount}
                      </div>
                      {isCancelled && (
                        <div className="mt-0.5 text-[10px] bg-ball-400 text-tennis-950 font-bold rounded px-1 inline-block">
                          ↻ 已退订，点此重约
                        </div>
                      )}
                      {!isCancelled && (
                        <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition">
                          <XCircle size={14} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {displayDates.map((date) => {
        const dayBookings = bookings.filter((b) => b.date === date && activeCourts.some((c) => c.id === b.courtId));
        if (dayBookings.length === 0) return null;
        return (
          <div key={date} className="mt-6 card">
            <div className="px-5 py-3 border-b border-gray-100 bg-tennis-50 flex items-center justify-between flex-wrap gap-2">
              <div className="font-semibold text-tennis-800">
                {formatDateDisplay(date)} · 当日预约记录
              </div>
              <div className="text-xs text-gray-500">
                有效 {dayBookings.filter((b) => b.status === 'active').length} 条 /
                已退订 {dayBookings.filter((b) => b.status === 'cancelled').length} 条
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {dayBookings.map((b) => {
                const court = courts.find((c) => c.id === b.courtId);
                return (
                  <div key={b.id} className="px-5 py-3 flex items-center justify-between hover:bg-tennis-50/30 transition flex-wrap gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`tag border ${
                          b.status === 'active'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {b.status === 'active' ? '有效' : '已退订'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 truncate">
                          {b.customerName}
                          {b.bookingType === 'doubles' && (
                            <span className="ml-2 text-xs text-gray-500 font-normal">
                              双打（{b.teammates.length ? b.teammates.join('、') : '无队友'}）
                            </span>
                          )}
                          {b.bookingType === 'singles' && (
                            <span className="ml-2 text-xs text-gray-500 font-normal">单打</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">
                          {court?.name} · {b.startTime} - {b.endTime} · ¥{b.totalAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {b.status === 'cancelled' && court && (
                        <button
                          onClick={() => openBooking(court, b.date, b.startTime, b.endTime)}
                          className="btn-accent text-xs !px-3 !py-1.5"
                        >
                          原时段重约
                        </button>
                      )}
                      {b.status === 'active' && (
                        <button onClick={() => onCancelBooking(b)} className="btn-danger text-xs !px-3 !py-1.5">
                          退订并退款
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {modal.court && (
        <BookingModal
          open={modal.open}
          onClose={() => setModal({ open: false, court: null, date: todayStr() })}
          court={modal.court}
          date={modal.date}
          initialStart={modal.start}
          initialEnd={modal.end}
        />
      )}
    </div>
  );
}
