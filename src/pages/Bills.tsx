import { useMemo, useState } from 'react';
import {
  Receipt, ChevronDown, ChevronUp, Printer, Search, DollarSign, RotateCcw,
  Filter as FilterIcon, Clock, CheckCircle2, Undo2, Wallet, CreditCard, Users,
  User, Phone, Star, AlertTriangle,
} from 'lucide-react';
import { useAppStore, getLevelMeta } from '@/store';
import PageHeader from '@/components/PageHeader';
import { tierColorClass } from '@/utils/billing';
import { formatDateDisplay } from '@/utils/time';
import type { PaymentStatus, PaymentMethod, RefundReason } from '@/types';

const STATUS_FILTERS: { value: 'all' | PaymentStatus; label: string; color: string }[] = [
  { value: 'all', label: '全部', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  { value: 'pending', label: '待收款', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'paid', label: '已收款', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'refunded', label: '已退款', color: 'bg-gray-200 text-gray-600 border-gray-300' },
];

const REASON_LABEL: Record<RefundReason, string> = {
  user_cancel: '用户退订',
  system_cancel: '系统取消',
  other: '其他原因',
};

function statusMeta(s: PaymentStatus) {
  switch (s) {
    case 'pending':
      return { label: '待收款', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock };
    case 'paid':
      return { label: '已收款', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 };
    case 'refunded':
      return { label: '已退款', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Undo2 };
  }
}

function paymentMethodLabel(m?: PaymentMethod) {
  if (!m) return { label: '待结算', icon: Clock, color: 'text-gray-500', bg: 'bg-gray-100' };
  switch (m) {
    case 'cash':
      return { label: '现金收款', icon: CreditCard, color: 'text-green-700', bg: 'bg-green-50' };
    case 'wallet':
      return { label: '余额扣款', icon: Wallet, color: 'text-tennis-700', bg: 'bg-tennis-50' };
    case 'card':
      return { label: '刷卡收款', icon: CreditCard, color: 'text-blue-700', bg: 'bg-blue-50' };
  }
}

export default function Bills() {
  const bills = useAppStore((s) => s.bills);
  const bookings = useAppStore((s) => s.bookings);
  const courts = useAppStore((s) => s.courts);
  const members = useAppStore((s) => s.members);
  const markBillPaid = useAppStore((s) => s.markBillPaid);
  const settleBill = useAppStore((s) => s.settleBill);

  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  const list = useMemo(() => {
    const merged = bills.map((bill) => {
      const booking = bookings.find((b) => b.id === bill.bookingId);
      const court = booking ? courts.find((c) => c.id === booking.courtId) : undefined;
      const member = bill.memberId ? members.find((m) => m.id === bill.memberId) : undefined;
      return { bill, booking, court, member };
    });
    const sorted = merged.sort((a, b) => (b.bill.createdAt ?? '').localeCompare(a.bill.createdAt ?? ''));
    const filtered = statusFilter === 'all' ? sorted : sorted.filter((x) => x.bill.paymentStatus === statusFilter);
    if (!keyword.trim()) return filtered;
    const kw = keyword.trim().toLowerCase();
    return filtered.filter(({ bill, booking, court, member }) =>
      bill.billNo.toLowerCase().includes(kw) ||
      booking?.customerName.toLowerCase().includes(kw) ||
      court?.name.toLowerCase().includes(kw) ||
      court?.code.toLowerCase().includes(kw) ||
      member?.name.toLowerCase().includes(kw) ||
      member?.phone.includes(kw)
    );
  }, [bills, bookings, courts, members, keyword, statusFilter]);

  const stats = useMemo(() => {
    const pending = bills.filter((b) => b.paymentStatus === 'pending');
    const paid = bills.filter((b) => b.paymentStatus === 'paid');
    const refunded = bills.filter((b) => b.paymentStatus === 'refunded');
    const pendingTotal = pending.reduce((s, b) => s + b.totalAmount, 0);
    const paidTotal = paid.reduce((s, b) => s + b.totalAmount, 0);
    const refundTotal = refunded.reduce((s, b) => s + (b.refundAmount ?? 0), 0);
    return {
      pendingCount: pending.length, pendingTotal,
      paidCount: paid.length, paidTotal,
      refundCount: refunded.length, refundTotal,
    };
  }, [bills]);

  function printBill() {
    window.print();
  }

  function handleSettle(billId: string, method: PaymentMethod, memberHint?: { name: string }) {
    const res = settleBill(billId, method);
    if (!res.ok) {
      showToast('收款失败：' + (res.error ?? ''));
      return;
    }
    const label = method === 'wallet' ? '余额扣款' : method === 'cash' ? '现金收款' : '刷卡收款';
    showToast(`${memberHint ? `会员「${memberHint.name}」` : ''}${label}成功！`);
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-6 right-6 z-50 card bg-tennis-900 text-white px-4 py-2.5 animate-fade-in-up shadow-lg text-sm">
          {toast}
        </div>
      )}

      <PageHeader
        title="账单中心"
        subtitle="查看账单、标记收款、跟踪退款记录，掌握资金流水"
        icon={<Receipt size={22} />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索账单号/姓名/场地/会员手机号..."
                className="input-base pl-9 w-72"
              />
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4 bg-gradient-to-br from-amber-50 to-white border-l-4 border-amber-400">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">待收款</div>
              <div className="font-display font-bold text-2xl text-amber-700 mt-1">¥{stats.pendingTotal.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stats.pendingCount} 笔待处理</div>
            </div>
            <Clock size={26} className="text-amber-400" />
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-green-50 to-white border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">已收款</div>
              <div className="font-display font-bold text-2xl text-green-700 mt-1">¥{stats.paidTotal.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stats.paidCount} 笔已到账</div>
            </div>
            <DollarSign size={26} className="text-green-500" />
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-gray-50 to-white border-l-4 border-gray-400">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-500">已退款</div>
              <div className="font-display font-bold text-2xl text-gray-600 mt-1">¥{stats.refundTotal.toFixed(2)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{stats.refundCount} 笔退款记录</div>
            </div>
            <RotateCcw size={26} className="text-gray-400" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterIcon size={14} className="text-gray-400 ml-1" />
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              statusFilter === f.value
                ? f.color + ' shadow-sm ring-2 ring-offset-1 ring-gray-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
            {f.value !== 'all' && (
              <span className="ml-1.5 opacity-80">
                ({f.value === 'pending' ? stats.pendingCount : f.value === 'paid' ? stats.paidCount : stats.refundCount})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="card p-10 text-center text-gray-400">暂无匹配的账单记录</div>
        )}
        {list.map(({ bill, booking, court, member }) => {
          const isOpen = expanded === bill.id;
          const sMeta = statusMeta(bill.paymentStatus);
          const StatusIcon = sMeta.icon;
          const payMeta = paymentMethodLabel(bill.paymentMethod);
          const customerType = booking?.customerType ?? 'walkin';
          const displayMember = member ?? bill.memberSnapshot;
          const levelMeta = displayMember?.level ? getLevelMeta(displayMember.level) : null;
          return (
            <div key={bill.id} className="card animate-fade-in-up overflow-hidden">
              <div
                onClick={() => setExpanded(isOpen ? null : bill.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-tennis-50/40 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${
                    bill.paymentStatus === 'paid' ? 'bg-gradient-to-br from-green-500 to-green-700 text-white'
                      : bill.paymentStatus === 'refunded' ? 'bg-gradient-to-br from-gray-400 to-gray-600 text-white'
                      : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
                  }`}>
                    <Receipt size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-tennis-950">{bill.billNo}</span>
                      <span className={`tag border ${sMeta.color} inline-flex items-center gap-1`}>
                        <StatusIcon size={11} /> {sMeta.label}
                      </span>
                      {bill.paymentStatus !== 'pending' && bill.paymentMethod && (
                        <span className={`tag border ${payMeta.bg} ${payMeta.color} border-gray-200 inline-flex items-center gap-1`}>
                          {(() => { const I = payMeta.icon; return <I size={10} />; })()} {payMeta.label}
                        </span>
                      )}
                      {booking?.bookingType === 'doubles' && (
                        <span className="tag bg-ball-100 text-ball-700 border border-ball-200">双打</span>
                      )}
                      {booking?.bookingType === 'singles' && (
                        <span className="tag bg-blue-50 text-blue-600 border border-blue-200">单打</span>
                      )}
                      {booking?.status === 'cancelled' && bill.paymentStatus !== 'refunded' && (
                        <span className="tag bg-gray-100 text-gray-500 border border-gray-200">预约已退订</span>
                      )}
                      {customerType === 'member' && (
                        <span className="tag bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                          <Users size={10} /> 会员
                        </span>
                      )}
                      {customerType === 'walkin' && (
                        <span className="tag bg-gray-50 text-gray-600 border border-gray-200 inline-flex items-center gap-1">
                          <User size={10} /> 散客
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      <span>{booking?.customerName} · {court?.name} ({court?.code})</span>
                      {displayMember && (
                        <span className="flex items-center gap-1">
                          <Phone size={10} /> {displayMember.phone}
                          {levelMeta && (
                            <span className={`tag border text-[10px] ${levelMeta.bg} ${levelMeta.color}`}>
                              <Star size={9} className="mr-0.5 inline" /> {levelMeta.label}
                            </span>
                          )}
                        </span>
                      )}
                      <span>· {booking?.date && formatDateDisplay(booking.date)} {booking?.startTime}-{booking?.endTime}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">
                      {bill.paymentStatus === 'refunded' ? '退款金额' : '金额'}
                    </div>
                    <div className={`font-display font-bold text-xl ${
                      bill.paymentStatus === 'refunded' ? 'text-gray-500 line-through' : 'text-tennis-800'
                    }`}>
                      ¥{bill.totalAmount.toFixed(2)}
                    </div>
                    {bill.paymentStatus === 'refunded' && bill.refundAmount && (
                      <div className="text-xs text-red-500 font-semibold">-¥{bill.refundAmount.toFixed(2)}</div>
                    )}
                  </div>
                  {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </div>
              </div>

              {isOpen && (
                <div className="px-5 pb-5 pt-0 border-t border-gray-50">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
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

                    <div className="space-y-4">
                      {(displayMember || customerType === 'walkin') && (
                        <div className={`p-4 rounded-xl border ${
                          customerType === 'member'
                            ? 'bg-gradient-to-br from-ball-50 to-tennis-50 border-tennis-200'
                            : 'bg-gray-50 border-gray-100'
                        }`}>
                          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            {customerType === 'member' ? <Users size={15} className="text-tennis-600" /> : <User size={15} />}
                            {customerType === 'member' ? '会员信息' : '散客信息'}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg shadow-sm ring-2 ring-white ${
                              customerType === 'member' && levelMeta
                                ? `${levelMeta.bg} ${levelMeta.color}`
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {(booking?.customerName ?? '?').charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800">{booking?.customerName}</span>
                                {levelMeta && (
                                  <span className={`tag border ${levelMeta.bg} ${levelMeta.color}`}>
                                    <Star size={10} className="mr-1 inline" /> {levelMeta.label}
                                  </span>
                                )}
                              </div>
                              {displayMember?.phone && (
                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                  <Phone size={11} /> {displayMember.phone}
                                </div>
                              )}
                              {customerType === 'member' && member && (
                                <div className="text-xs text-green-700 mt-0.5">
                                  当前余额：¥{member.balance.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

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

                      {bill.refunds && bill.refunds.length > 0 && (
                        <div className="p-4 rounded-xl bg-red-50/60 border border-red-200">
                          <div className="flex items-center gap-2 text-sm font-semibold text-red-700 mb-3">
                            <Undo2 size={15} /> 退款记录 ({bill.refunds.length})
                          </div>
                          <div className="space-y-2">
                            {bill.refunds.map((r) => {
                              const method = r.refundMethod === 'wallet'
                                ? { label: '退回余额', bg: 'bg-green-100 text-green-700 border-green-200', icon: Wallet }
                                : r.refundMethod === 'cash'
                                  ? { label: '现金退款', bg: 'bg-red-100 text-red-700 border-red-200', icon: CreditCard }
                                  : { label: '刷卡退款', bg: 'bg-blue-100 text-blue-700 border-blue-200', icon: CreditCard };
                              const I = method.icon;
                              return (
                                <div key={r.id} className="p-3 rounded-lg bg-white border border-red-100 text-sm">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="tag bg-red-100 text-red-700 border border-red-200">
                                        {REASON_LABEL[r.reason] ?? '退款'}
                                      </span>
                                      <span className={`tag border ${method.bg}`}>
                                        <I size={10} className="mr-1 inline" /> {method.label}
                                      </span>
                                    </div>
                                    <span className="font-bold text-red-600">-¥{r.amount.toFixed(2)}</span>
                                  </div>
                                  {r.note && <div className="text-xs text-gray-500">备注：{r.note}</div>}
                                  <div className="text-[11px] text-gray-400 mt-1">
                                    {new Date(r.createdAt).toLocaleString('zh-CN')}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-xl bg-white border border-gray-200 text-sm">
                        <div className="text-xs text-gray-400 mb-2">账单时间线</div>
                        <div className="space-y-1.5 text-xs text-gray-600">
                          <div>
                            <span className="inline-block w-16 text-gray-400">创建：</span>
                            {new Date(bill.createdAt).toLocaleString('zh-CN')}
                          </div>
                          {bill.paidAt && (
                            <div>
                              <span className="inline-block w-16 text-green-600 font-semibold">收款：</span>
                              {new Date(bill.paidAt).toLocaleString('zh-CN')}
                              {bill.paymentMethod && (
                                <span className="ml-2 text-gray-500">
                                  ({bill.paymentMethod === 'wallet' ? '余额扣款' : bill.paymentMethod === 'cash' ? '现金' : '刷卡'})
                                </span>
                              )}
                            </div>
                          )}
                          {booking?.cancelledAt && (
                            <div>
                              <span className="inline-block w-16 text-gray-500 font-semibold">退订：</span>
                              {new Date(booking.cancelledAt).toLocaleString('zh-CN')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-end gap-2 print:hidden">
                    <button onClick={() => printBill()} className="btn-secondary">
                      <Printer size={14} className="mr-1.5" /> 打印账单
                    </button>
                    {bill.paymentStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            if (confirm(`确认将账单 ${bill.billNo} 标记为现金收款？金额 ¥${bill.totalAmount.toFixed(2)}`)) {
                              markBillPaid(bill.id);
                              showToast('现金收款已登记');
                            }
                          }}
                          className="btn-primary"
                        >
                          <CreditCard size={14} className="mr-1.5" /> 现金收款
                        </button>
                        {displayMember && (
                          <button
                            onClick={() => {
                              const mem = members.find((m) => m.id === (displayMember as any).id);
                              if (mem && mem.balance < bill.totalAmount) {
                                alert(`会员「${mem.name}」余额不足（当前 ¥${mem.balance.toFixed(2)}），请先充值后再操作，或使用现金收款。`);
                                return;
                              }
                              if (confirm(`确认使用会员「${displayMember.name}」的余额扣款 ¥${bill.totalAmount.toFixed(2)}？`)) {
                                handleSettle(bill.id, 'wallet', { name: displayMember.name });
                              }
                            }}
                            className="btn-accent"
                          >
                            <Wallet size={14} className="mr-1.5" /> 余额扣款
                            {member && (
                              <span className="ml-1.5 text-[10px] opacity-90">(¥{member.balance.toFixed(2)})</span>
                            )}
                          </button>
                        )}
                      </>
                    )}
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
