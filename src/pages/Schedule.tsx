import { useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus, XCircle, User, Users } from 'lucide-react';
import { useAppStore } from '@/store';
import PageHeader from '@/components/PageHeader';
import BookingModal from '@/components/BookingModal';
import { todayStr, addDays, formatDateDisplay, generateTimeSlots, timeToMinutes } from '@/utils/time';
import type { Booking, Court } from '@/types';
import { tierColorClass } from '@/utils/billing';

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

export default function Schedule() {
  const courts = useAppStore((s) => s.courts);
  const bookings = useAppStore((s) => s.bookings);
  const cancelBooking = useAppStore((s) => s.cancelBooking);

  const [date, setDate] = useState(todayStr());
  const [modal, setModal] = useState<{ open: boolean; court: Court | null; start?: string; end?: string }>({
    open: false, court: null,
  });

  const activeCourts = useMemo(() => courts.filter((c) => c.active), [courts]);
  const dayBookings = useMemo(
    () => bookings.filter((b) => b.date === date),
    [bookings, date]
  );

  function openBooking(court: Court, start?: string, end?: string) {
    setModal({ open: true, court, start, end });
  }

  function onCancelBooking(b: Booking) {
    if (confirm(`确认退订「${b.customerName}」${b.startTime}-${b.endTime} 的预约？时段将被释放。`)) {
      cancelBooking(b.id);
    }
  }

  function slotToRange(slotIndex: number) {
    const start = TIME_SLOTS[slotIndex];
    const end = slotIndex + 1 < TIME_SLOTS.length ? TIME_SLOTS[slotIndex + 1] : '22:00';
    return { start, end };
  }

  return (
    <div>
      <PageHeader
        title="排期总览"
        subtitle="按日期查看所有场地时段占用情况，点击空白时段快速创建预约"
        icon={<Calendar size={22} />}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setDate(addDays(date, -1))}
                className="px-3 py-2 hover:bg-tennis-50 text-gray-600 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-2 border-x border-gray-200 min-w-[140px] text-center">
                <div className="font-display font-bold text-tennis-950">{formatDateDisplay(date)}</div>
                <div className="text-[11px] text-gray-400 leading-none">{date}</div>
              </div>
              <button
                onClick={() => setDate(addDays(date, 1))}
                className="px-3 py-2 hover:bg-tennis-50 text-gray-600 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <button
              onClick={() => setDate(todayStr())}
              className="btn-secondary"
            >
              今天
            </button>
            {activeCourts[0] && (
              <button onClick={() => openBooking(activeCourts[0])} className="btn-accent">
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
          <span className="w-3 h-3 rounded bg-gray-300" /> 已退订
        </div>
      </div>

      {activeCourts.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">暂无启用的场地，请先到「场地管理」新增</div>
      ) : (
        <div className="card overflow-hidden relative">
          <div className="overflow-x-auto scrollbar-thin">
            <div className="grid" style={{ gridTemplateColumns: `80px repeat(${activeCourts.length}, minmax(160px, 1fr))`, minWidth: 80 + activeCourts.length * 180 }}>
              <div className="sticky left-0 z-10 bg-gradient-to-b from-tennis-50 to-white border-b border-r border-tennis-100" />
              {activeCourts.map((c) => (
                <div key={c.id} className="px-3 py-4 bg-gradient-to-b from-tennis-50 to-white border-b border-r border-tennis-100 text-center">
                  <div className="font-display font-bold text-tennis-950">{c.name}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{c.code}</div>
                </div>
              ))}

              {TIME_SLOTS.map((slot, slotIdx) => {
                const { end } = slotToRange(slotIdx);
                return (
                  <div key={slot} className="contents group">
                    <div className="sticky left-0 z-10 bg-white border-r border-b border-gray-100 text-xs text-gray-500 px-2 py-3 text-right font-mono group-hover:bg-tennis-50 transition">
                      {slot}
                    </div>
                    {activeCourts.map((court) => {
                      const hour = Number(slot.slice(0, 2));
                      const isHourMark = hour % 2 === 0 && slot.endsWith(':00');
                      return (
                        <div
                          key={court.id + slot}
                          onClick={() => openBooking(court, slot, end)}
                          className={`relative border-r border-b cursor-pointer transition ${
                            isHourMark ? 'bg-gray-50/60 border-gray-200' : 'border-gray-100 bg-white'
                          } hover:bg-ball-300/30 min-h-[44px]`}
                          title={`${court.name} ${slot}-${end} 点击预约`}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {activeCourts.map((court, colIdx) => {
            const courtBookings = dayBookings.filter((b) => b.courtId === court.id);
            return (
              <div
                key={court.id + '-overlay'}
                className="pointer-events-none absolute"
                style={{
                  left: `calc(80px + (100% - 80px) * ${colIdx / activeCourts.length} + 2px)`,
                  top: '90px',
                  width: `calc((100% - 80px) / ${activeCourts.length} - 4px)`,
                  height: `calc(${TIME_SLOTS.length} * 44px)`,
                }}
              >
                {courtBookings.map((b) => {
                  const pos = getBookingTopHeight(b);
                  const isCancelled = b.status === 'cancelled';
                  return (
                    <button
                      key={b.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCancelled) onCancelBooking(b);
                      }}
                      className={`absolute left-0 right-0 rounded-lg mx-0.5 px-2 py-1.5 text-left text-white text-xs overflow-hidden pointer-events-auto transition hover:brightness-110 shadow ${
                        isCancelled ? 'bg-gray-400/70' : 'bg-gradient-to-br from-tennis-700 to-tennis-800'
                      }`}
                      style={{ top: pos.top, height: pos.height }}
                      title={isCancelled ? '已退订' : `点击退订：${b.customerName} ${b.startTime}-${b.endTime}`}
                    >
                      <div className="flex items-center gap-1 font-semibold truncate">
                        {b.bookingType === 'doubles' ? <Users size={12} /> : <User size={12} />}
                        <span className="truncate">{b.customerName}</span>
                        {b.bookingType === 'doubles' && b.teammates.length > 0 && (
                          <span className="text-[10px] opacity-80">+{b.teammates.length}</span>
                        )}
                      </div>
                      <div className="text-[10px] opacity-90 font-mono mt-0.5">
                        {b.startTime}-{b.endTime} · ¥{b.totalAmount}
                      </div>
                      {!isCancelled && (
                        <div className="absolute top-1 right-1 opacity-0 hover:opacity-100 transition">
                          <XCircle size={14} />
                        </div>
                      )}
                      {isCancelled && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800/40 backdrop-blur-[1px]">
                          <span className="text-[10px] font-bold bg-white/90 text-gray-600 px-2 py-0.5 rounded">已退订</span>
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

      {dayBookings.length > 0 && (
        <div className="mt-6 card">
          <div className="px-5 py-3 border-b border-gray-100 bg-tennis-50 flex items-center justify-between">
            <div className="font-semibold text-tennis-800">当日预约列表</div>
            <div className="text-xs text-gray-500">共 {dayBookings.filter((b) => b.status === 'active').length} 条有效预约</div>
          </div>
          <div className="divide-y divide-gray-100">
            {dayBookings.map((b) => {
              const court = courts.find((c) => c.id === b.courtId);
              return (
                <div key={b.id} className="px-5 py-3 flex items-center justify-between hover:bg-tennis-50/30 transition">
                  <div className="flex items-center gap-3">
                    <span className={`tag border ${b.status === 'active' ? tierColorClass('peak').replace('border-red-200', 'border-green-200 bg-green-50 text-green-700') : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {b.status === 'active' ? '有效' : '已退订'}
                    </span>
                    <div>
                      <div className="font-semibold text-gray-800">
                        {b.customerName}
                        {b.bookingType === 'doubles' && (
                          <span className="ml-2 text-xs text-gray-500">
                            双打（含 {b.teammates.join('、') || '无队友'}）
                          </span>
                        )}
                        {b.bookingType === 'singles' && <span className="ml-2 text-xs text-gray-500">单打</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {court?.name} · {b.startTime} - {b.endTime} · ¥{b.totalAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {b.status === 'active' && (
                    <button onClick={() => onCancelBooking(b)} className="btn-danger text-xs !px-3 !py-1.5">
                      退订并释放
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modal.court && (
        <BookingModal
          open={modal.open}
          onClose={() => setModal({ open: false, court: null })}
          court={modal.court}
          date={date}
          initialStart={modal.start}
          initialEnd={modal.end}
        />
      )}
    </div>
  );
}
