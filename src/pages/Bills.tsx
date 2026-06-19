import { useMemo, useState } from 'react';
import { Receipt, ChevronDown, ChevronUp, Printer, Search } from 'lucide-react';
import { useAppStore } from '@/store';
import PageHeader from '@/components/PageHeader';
import { tierColorClass } from '@/utils/billing';
import { formatDateDisplay } from '@/utils/time';

export default function Bills() {
  const bills = useAppStore((s) => s.bills);
  const bookings = useAppStore((s) => s.bookings);
  const courts = useAppStore((s) => s.courts);
  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const list = useMemo(() => {
    const merged = bills.map((bill) => {
      const booking = bookings.find((b) => b.id === bill.bookingId);
      const court = booking ? courts.find((c) => c.id === booking.courtId) : undefined;
      return { bill, booking, court };
    });
    const sorted = merged.sort((a, b) => (b.bill.createdAt ?? '').localeCompare(a.bill.createdAt ?? ''));
    if (!keyword.trim()) return sorted;
    const kw = keyword.trim().toLowerCase();
    return sorted.filter(({ bill, booking, court }) =>
      bill.billNo.toLowerCase().includes(kw) ||
      booking?.customerName.toLowerCase().includes(kw) ||
      court?.name.toLowerCase().includes(kw) ||
      court?.code.toLowerCase().includes(kw)
    );
  }, [bills, bookings, courts, keyword]);

  const totalAmount = list.reduce((sum, x) => sum + x.bill.totalAmount, 0);

  function printBill(billNo: string) {
    window.print();
  }

  return (
    <div>
      <PageHeader
        title="账单中心"
        subtitle="查看所有预约账单明细，含分段计费与双打费用分摊"
        icon={<Receipt size={22} />}
        action={
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索账单号/姓名/场地..."
              className="input-base pl-9 w-72"
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 bg-gradient-to-br from-tennis-50 to-white">
          <div className="text-xs text-gray-500">账单总数</div>
          <div className="font-display font-bold text-3xl text-tennis-800 mt-1">{list.length}</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-ball-50 to-white">
          <div className="text-xs text-gray-500">累计营收</div>
          <div className="font-display font-bold text-3xl text-tennis-800 mt-1">¥{totalAmount.toFixed(2)}</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-gray-50 to-white">
          <div className="text-xs text-gray-500">平均单额</div>
          <div className="font-display font-bold text-3xl text-tennis-800 mt-1">
            ¥{list.length ? (totalAmount / list.length).toFixed(2) : '0.00'}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="card p-10 text-center text-gray-400">暂无账单记录</div>
        )}
        {list.map(({ bill, booking, court }) => {
          const isOpen = expanded === bill.id;
          return (
            <div key={bill.id} className="card animate-fade-in-up overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : bill.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-tennis-50/40 transition text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-tennis-600 to-tennis-800 text-white flex items-center justify-center shadow-sm shrink-0">
                    <Receipt size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-tennis-950">{bill.billNo}</span>
                      {booking?.bookingType === 'doubles' && (
                        <span className="tag bg-ball-100 text-ball-700 border border-ball-200">双打</span>
                      )}
                      {booking?.bookingType === 'singles' && (
                        <span className="tag bg-blue-50 text-blue-600 border border-blue-200">单打</span>
                      )}
                      {booking?.status === 'cancelled' && (
                        <span className="tag bg-gray-100 text-gray-500 border border-gray-200">预约已退订</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 truncate">
                      {booking?.customerName} · {court?.name} ({court?.code}) · {booking?.date && formatDateDisplay(booking.date)} {booking?.startTime}-{booking?.endTime}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">金额</div>
                    <div className="font-display font-bold text-xl text-tennis-800">¥{bill.totalAmount.toFixed(2)}</div>
                  </div>
                  {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="text-sm font-semibold text-gray-700 mb-3">分段计费明细</div>
                      <div className="space-y-2">
                        {bill.segments.map((seg, i) => (
                          <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2.5 rounded bg-white">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`tag border ${tierColorClass(seg.tier)}`}>{seg.tierName}</span>
                              <span className="text-gray-600">{seg.startTime} - {seg.endTime}</span>
                              <span className="text-xs text-gray-400">({seg.durationMinutes}分钟 × ¥{seg.pricePerHour}/h)</span>
                            </div>
                            <span className="font-semibold text-gray-700">¥{seg.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-2 mt-2 border-t border-dashed border-gray-200">
                          <span className="text-sm text-gray-600">合计</span>
                          <span className="font-display font-bold text-xl text-tennis-800">¥{bill.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {bill.shares && bill.shares.length > 1 && (
                      <div className="p-4 rounded-xl bg-tennis-50/50 border border-tennis-100">
                        <div className="text-sm font-semibold text-tennis-800 mb-3">双打费用分摊</div>
                        <div className="space-y-2">
                          {bill.shares.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-sm py-2 px-2.5 rounded bg-white border border-tennis-100">
                              <span className="text-gray-700 flex items-center gap-2">
                                {s.name}
                                {s.isLeader && <span className="tag bg-ball-100 text-ball-700">队长</span>}
                              </span>
                              <span className="font-semibold text-tennis-800">¥{s.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end gap-2 print:hidden">
                    <button onClick={() => printBill(bill.id)} className="btn-secondary">
                      <Printer size={14} className="mr-1.5" /> 打印账单
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
