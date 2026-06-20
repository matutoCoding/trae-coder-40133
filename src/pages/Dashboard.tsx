import { useMemo, useState } from 'react';
import {
  BarChart3, TrendingUp, DollarSign, XCircle, CalendarDays,
  ChevronLeft, ChevronRight, Calendar, ExternalLink, Grid3X3, Target,
} from 'lucide-react';
import { useAppStore } from '@/store';
import PageHeader from '@/components/PageHeader';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { todayStr, addDays, formatDateDisplay, parseDate, formatDate } from '@/utils/time';
import type { DashboardRange } from '@/types';

export default function Dashboard() {
  const computeDashboard = useAppStore((s) => s.computeDashboard);
  const navigate = useNavigate();

  const [range, setRange] = useState<DashboardRange>('week');
  const [cursorDate, setCursorDate] = useState(todayStr());

  function shiftCursor(days: number) {
    if (range === 'week') {
      setCursorDate(addDays(cursorDate, days > 0 ? 7 : -7));
    } else {
      setCursorDate(addDays(cursorDate, days));
    }
  }

  function getWeekRangeLabel(base: string) {
    const d = parseDate(base);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${formatDateDisplay(formatDate(monday))} - ${formatDateDisplay(formatDate(sunday))}`;
  }

  const data = useMemo(() => computeDashboard(cursorDate, range), [computeDashboard, cursorDate, range]);

  function drillToCourt(courtId: string) {
    navigate({
      pathname: '/',
      search: `?${createSearchParams({ courtId, date: data.from }).toString()}`,
    });
  }

  const cancelRate = data.totalBookings > 0
    ? Number(((data.totalCancels / (data.totalBookings + data.totalCancels)) * 100).toFixed(1))
    : 0;

  return (
    <div>
      <PageHeader
        title="运营看板"
        subtitle="按天或按周查看场地利用率、收入、取消次数，点击卡片可钻取到对应排期"
        icon={<BarChart3 size={22} />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setRange('day')}
                className={`px-3 py-2 text-sm font-medium transition ${
                  range === 'day' ? 'bg-tennis-700 text-white' : 'text-gray-600 hover:bg-tennis-50'
                }`}
              >
                <Grid3X3 size={14} className="inline mr-1" /> 天视图
              </button>
              <button
                onClick={() => setRange('week')}
                className={`px-3 py-2 text-sm font-medium transition border-l border-gray-200 ${
                  range === 'week' ? 'bg-tennis-700 text-white' : 'text-gray-600 hover:bg-tennis-50'
                }`}
              >
                <CalendarDays size={14} className="inline mr-1" /> 周视图
              </button>
            </div>

            <div className="flex items-center rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <button onClick={() => shiftCursor(-1)} className="px-3 py-2 hover:bg-tennis-50 text-gray-600 transition">
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-2 border-x border-gray-200 min-w-[180px] text-center">
                <div className="font-display font-bold text-tennis-950 text-sm">
                  {range === 'day' ? formatDateDisplay(cursorDate) : getWeekRangeLabel(cursorDate)}
                </div>
                <div className="text-[11px] text-gray-400 leading-none mt-0.5">
                  {range === 'day' ? '当日统计' : `${range === 'week' ? '本周' : ''}统计区间`}
                </div>
              </div>
              <button onClick={() => shiftCursor(1)} className="px-3 py-2 hover:bg-tennis-50 text-gray-600 transition">
                <ChevronRight size={18} />
              </button>
            </div>
            <button onClick={() => setCursorDate(todayStr())} className="btn-secondary">今天</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="card p-4 bg-gradient-to-br from-green-50 to-white border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">净收入</div>
            <DollarSign size={18} className="text-green-500" />
          </div>
          <div className="font-display font-bold text-2xl text-green-700">¥{data.netRevenue.toFixed(2)}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            收入 ¥{data.totalRevenue.toFixed(2)} · 退款 ¥{data.totalRefund.toFixed(2)}
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-red-50 to-white border-l-4 border-red-400">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">退款金额</div>
            <XCircle size={18} className="text-red-400" />
          </div>
          <div className="font-display font-bold text-2xl text-red-600">¥{data.totalRefund.toFixed(2)}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">{data.totalCancels} 次取消操作</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-tennis-50 to-white border-l-4 border-tennis-500">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">预约笔数</div>
            <Calendar size={18} className="text-tennis-500" />
          </div>
          <div className="font-display font-bold text-2xl text-tennis-800">{data.totalBookings}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {range === 'day' ? '当日有效预约' : '区间有效预约'}
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-l-4 border-amber-400">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">取消率</div>
            <XCircle size={18} className="text-amber-400" />
          </div>
          <div className="font-display font-bold text-2xl text-amber-700">{cancelRate}%</div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {data.totalCancels} / {data.totalBookings + data.totalCancels} 笔
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-sky-50 to-white border-l-4 border-sky-500 col-span-2 sm:col-span-3 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-gray-500">平均利用率</div>
            <Target size={18} className="text-sky-500" />
          </div>
          <div className="font-display font-bold text-2xl text-sky-700">{data.avgUtilization.toFixed(1)}%</div>
          <div className="mt-1.5 h-2 rounded-full bg-sky-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-500"
              style={{ width: `${Math.min(data.avgUtilization, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display font-bold text-tennis-950">每片场地运营数据</div>
            <div className="text-xs text-gray-500 mt-0.5">
              按收入从高到低排序，点击卡片跳转到对应场地的排期页面
            </div>
          </div>
          <div className="text-xs text-gray-400">
            统计区间：{formatDateDisplay(data.from)} → {formatDateDisplay(data.to)}
          </div>
        </div>

        {data.courts.length === 0 ? (
          <div className="text-center text-gray-400 py-10">暂无启用的场地</div>
        ) : (
          <div className="space-y-3">
            {data.courts.map((cs, idx) => {
              const utilColor = cs.utilization >= 70 ? 'from-green-400 to-green-600'
                : cs.utilization >= 40 ? 'from-amber-400 to-amber-500'
                : 'from-gray-400 to-gray-500';
              return (
                <div
                  key={cs.courtId}
                  onClick={() => drillToCourt(cs.courtId)}
                  className="group p-4 rounded-xl border border-gray-200 hover:border-tennis-400 hover:shadow-md transition cursor-pointer bg-white"
                >
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3 shrink-0 min-w-[180px]">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-tennis-600 to-tennis-800 text-white flex items-center justify-center font-display font-bold shadow-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-display font-bold text-tennis-950 flex items-center gap-2">
                          {cs.courtName}
                          <ExternalLink size={12} className="text-gray-400 group-hover:text-tennis-600 transition" />
                        </div>
                        <div className="text-[11px] text-gray-400">{cs.courtCode}</div>
                      </div>
                    </div>

                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="text-gray-500">
                          利用率 <span className="font-semibold text-gray-700">{cs.utilization.toFixed(1)}%</span>
                        </span>
                        <span className="text-gray-400 font-mono">
                          {Math.floor(cs.bookedMinutes / 60)}h{cs.bookedMinutes % 60}m / {Math.floor(cs.totalMinutes / 60)}h
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${utilColor} transition-all duration-700`}
                          style={{ width: `${Math.min(cs.utilization, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 shrink-0 min-w-[320px]">
                      <div className="text-center p-2 rounded-lg bg-green-50 border border-green-100">
                        <div className="text-[10px] text-gray-500">收入</div>
                        <div className="font-display font-bold text-green-700">¥{cs.revenue.toFixed(2)}</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-100">
                        <div className="text-[10px] text-gray-500">预约</div>
                        <div className="font-display font-bold text-blue-700">{cs.bookingCount} 笔</div>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-red-50 border border-red-100">
                        <div className="text-[10px] text-gray-500">取消</div>
                        <div className="font-display font-bold text-red-600">{cs.cancelCount} 次</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-tennis-600" />
            <div className="font-display font-bold text-tennis-950">收入构成</div>
          </div>
          <div className="space-y-2">
            {(() => {
              const total = data.courts.reduce((s, c) => s + c.revenue, 0);
              return data.courts.map((cs) => {
                const pct = total > 0 ? (cs.revenue / total) * 100 : 0;
                return (
                  <div key={cs.courtId}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{cs.courtName}</span>
                      <span className="text-gray-500">¥{cs.revenue.toFixed(2)} · {pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-tennis-400 to-tennis-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              });
            })()}
            {data.courts.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-4">暂无数据</div>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target size={18} className="text-sky-600" />
            <div className="font-display font-bold text-tennis-950">利用率排行</div>
          </div>
          <div className="space-y-2">
            {[...data.courts].sort((a, b) => b.utilization - a.utilization).map((cs, idx) => (
              <div key={cs.courtId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-ball-400 text-tennis-950'
                    : idx === 1 ? 'bg-gray-300 text-gray-700'
                    : idx === 2 ? 'bg-amber-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <span className="font-semibold text-gray-700">{cs.courtName}</span>
                    <span className="text-sky-600 font-bold">{cs.utilization.toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-sky-600"
                      style={{ width: `${Math.min(cs.utilization, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            {data.courts.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-4">暂无数据</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
