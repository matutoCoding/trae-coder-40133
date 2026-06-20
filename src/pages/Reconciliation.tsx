import { useMemo, useState } from 'react';
import {
  BookOpen, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Download,
  CreditCard, Wallet, Ticket, PlusCircle, MinusCircle, Undo2, DollarSign,
  ChevronDown, ChevronUp, Phone, Star, User, Receipt,
} from 'lucide-react';
import { useAppStore, getLevelMeta } from '@/store';
import PageHeader from '@/components/PageHeader';
import { todayStr, addDays, formatDateDisplay, parseDate } from '@/utils/time';
import type { WalletTxType, WalletTransaction, Member, Bill, Booking } from '@/types';

function txTypeMeta(type: WalletTxType) {
  switch (type) {
    case 'recharge':
      return { label: '会员充值', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: PlusCircle, dir: 'in' as const };
    case 'consume':
      return { label: '余额消费', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: MinusCircle, dir: 'out' as const };
    case 'refund':
      return { label: '余额退款', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: Undo2, dir: 'in' as const };
    case 'package_buy':
      return { label: '购买次卡', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', icon: Ticket, dir: 'out' as const };
    case 'package_use':
      return { label: '次卡核销', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: MinusCircle, dir: 'out' as const };
    case 'package_refund':
      return { label: '次卡退回', color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200', icon: Undo2, dir: 'in' as const };
    case 'cash_pay':
      return { label: '现金收款', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', icon: CreditCard, dir: 'in' as const };
    case 'card_pay':
      return { label: '刷卡收款', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: CreditCard, dir: 'in' as const };
  }
}

interface EnrichedTx extends WalletTransaction {
  member?: Member;
  bill?: Bill;
  booking?: Booking;
  courtName?: string;
}

function escapeCsv(v: any): string {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function Reconciliation() {
  const computeDailyReconciliation = useAppStore((s) => s.computeDailyReconciliation);
  const listDayTransactions = useAppStore((s) => s.listDayTransactions);
  const members = useAppStore((s) => s.members);
  const bills = useAppStore((s) => s.bills);
  const bookings = useAppStore((s) => s.bookings);
  const courts = useAppStore((s) => s.courts);

  const [cursor, setCursor] = useState(todayStr());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  const summary = useMemo(() => computeDailyReconciliation(cursor), [computeDailyReconciliation, cursor]);

  const txList: EnrichedTx[] = useMemo(() => {
    const raw = listDayTransactions(cursor);
    return raw.map((tx) => ({
      ...tx,
      member: tx.memberId ? members.find((m) => m.id === tx.memberId) : undefined,
      bill: tx.billId ? bills.find((b) => b.id === tx.billId) : undefined,
      booking: tx.bookingId ? bookings.find((b) => b.id === tx.bookingId) : undefined,
      courtName: tx.bookingId ? courts.find((c) => c.id === bookings.find((b) => b.id === tx.bookingId)?.courtId)?.name : undefined,
    }));
  }, [listDayTransactions, cursor, members, bills, bookings, courts]);

  function exportCsv() {
    const header = ['时间', '类型', '金额(元)', '收支', '会员姓名', '手机号', '会员等级', '支付方式', '余额变动', '次卡变动', '关联账单', '关联场地', '预约时段', '备注'];
    const rows = txList.map((tx) => {
      const meta = txTypeMeta(tx.type);
      const levelMeta = tx.member ? getLevelMeta(tx.member.level) : null;
      return [
        tx.createdAt ? new Date(tx.createdAt).toLocaleString('zh-CN') : '',
        meta.label,
        tx.amount.toFixed(2),
        meta.dir === 'in' ? '收入' : '支出',
        tx.member?.name ?? tx.customerName ?? '',
        tx.member?.phone ?? '',
        levelMeta?.label ?? '',
        tx.payMethod === 'cash' ? '现金' : tx.payMethod === 'card' ? '刷卡' : tx.payMethod === 'wallet' ? '余额' : tx.payMethod === 'package' ? '次卡' : '',
        tx.balanceAfter !== undefined ? `¥${tx.balanceAfter.toFixed(2)}` : '',
        tx.packageBalanceAfter !== undefined ? `${tx.packageBalanceAfter} 次` : '',
        tx.bill?.billNo ?? '',
        tx.courtName ?? '',
        tx.booking ? `${tx.booking.date} ${tx.booking.startTime}-${tx.booking.endTime}` : '',
        tx.note ?? '',
      ];
    });
    const csv = '\ufeff' + [header, ...rows].map((r) => r.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `日结对账_${cursor}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('已导出日结对账 CSV');
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-6 right-6 z-50 card bg-tennis-900 text-white px-4 py-2.5 animate-fade-in-up shadow-lg text-sm">
          {toast}
        </div>
      )}

      <PageHeader
        title="日结对账"
        subtitle="按日期汇总各类收款、退款，点击可展开当日每笔明细并导出表格"
        icon={<BookOpen size={22} />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-lg bg-white border border-gray-200 shadow-sm overflow-hidden">
              <button onClick={() => setCursor(addDays(cursor, -1))} className="px-3 py-2 hover:bg-tennis-50 text-gray-600 transition">
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-2 border-x border-gray-200 min-w-[200px] text-center">
                <div className="font-display font-bold text-tennis-950 text-sm flex items-center gap-1.5 justify-center">
                  <CalendarIcon size={14} /> {formatDateDisplay(cursor)}
                </div>
                <div className="text-[11px] text-gray-400 leading-none mt-0.5">
                  {summary.txCount} 笔交易 · {summary.bookingCount} 笔预约
                </div>
              </div>
              <button onClick={() => setCursor(addDays(cursor, 1))} className="px-3 py-2 hover:bg-tennis-50 text-gray-600 transition">
                <ChevronRight size={18} />
              </button>
            </div>
            <button onClick={() => setCursor(todayStr())} className="btn-secondary">今天</button>
            <button onClick={exportCsv} className="btn-primary">
              <Download size={14} className="mr-1.5" /> 导出 CSV
            </button>
          </div>
        }
      />

      {/* 汇总 KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <div className="card p-3 bg-gradient-to-br from-green-50 to-white border-l-4 border-green-500">
          <div className="text-[10px] text-gray-500">现金收款</div>
          <div className="font-display font-bold text-base text-green-700 mt-0.5">¥{summary.cashIncome.toFixed(2)}</div>
        </div>
        <div className="card p-3 bg-gradient-to-br from-blue-50 to-white border-l-4 border-blue-500">
          <div className="text-[10px] text-gray-500">刷卡收款</div>
          <div className="font-display font-bold text-base text-blue-700 mt-0.5">¥{summary.cardIncome.toFixed(2)}</div>
        </div>
        <div className="card p-3 bg-gradient-to-br from-tennis-50 to-white border-l-4 border-tennis-500">
          <div className="text-[10px] text-gray-500">余额扣款</div>
          <div className="font-display font-bold text-base text-tennis-700 mt-0.5">¥{summary.walletIncome.toFixed(2)}</div>
        </div>
        <div className="card p-3 bg-gradient-to-br from-amber-50 to-white border-l-4 border-amber-500">
          <div className="text-[10px] text-gray-500">次卡核销</div>
          <div className="font-display font-bold text-base text-amber-700 mt-0.5">¥{summary.packageIncome.toFixed(2)}</div>
        </div>
        <div className="card p-3 bg-gradient-to-br from-sky-50 to-white border-l-4 border-sky-500">
          <div className="text-[10px] text-gray-500">会员充值</div>
          <div className="font-display font-bold text-base text-sky-700 mt-0.5">¥{summary.rechargeIncome.toFixed(2)}</div>
        </div>
        <div className="card p-3 bg-gradient-to-br from-purple-50 to-white border-l-4 border-purple-500">
          <div className="text-[10px] text-gray-500">次卡销售</div>
          <div className="font-display font-bold text-base text-purple-700 mt-0.5">¥{summary.packageBuyIncome.toFixed(2)}</div>
        </div>
        <div className="card p-3 bg-gradient-to-br from-red-50 to-white border-l-4 border-red-400">
          <div className="text-[10px] text-gray-500">退款退回</div>
          <div className="font-display font-bold text-base text-red-600 mt-0.5">¥{summary.refundAmount.toFixed(2)}</div>
        </div>
        <div className="card p-3 bg-gradient-to-br from-emerald-50 to-white border-l-4 border-emerald-500">
          <div className="text-[10px] text-gray-500">净收入</div>
          <div className="font-display font-bold text-base text-emerald-700 mt-0.5">¥{summary.netIncome.toFixed(2)}</div>
        </div>
      </div>

      {/* 总览大数字 */}
      <div className="card p-6 mb-6 bg-gradient-to-br from-tennis-50 via-ball-50 to-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <div className="text-xs text-gray-500 mb-1">当日总收入</div>
            <div className="font-display font-bold text-4xl text-tennis-900 flex items-baseline gap-2">
              <DollarSign size={28} className="text-green-600" />
              ¥{summary.totalIncome.toFixed(2)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-white/70 border border-tennis-100 text-center">
              <div className="text-gray-500">场地预约</div>
              <div className="font-display font-bold text-lg text-tennis-800 mt-1">
                ¥{(summary.cashIncome + summary.cardIncome + summary.walletIncome + summary.packageIncome).toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-white/70 border border-sky-100 text-center">
              <div className="text-gray-500">储值充值</div>
              <div className="font-display font-bold text-lg text-sky-700 mt-1">¥{summary.rechargeIncome.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-lg bg-white/70 border border-purple-100 text-center">
              <div className="text-gray-500">套餐销售</div>
              <div className="font-display font-bold text-lg text-purple-700 mt-1">¥{summary.packageBuyIncome.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>📊 交易笔数：<span className="font-bold text-gray-800">{summary.txCount}</span> 笔</div>
            <div>🎾 关联预约：<span className="font-bold text-gray-800">{summary.bookingCount}</span> 笔</div>
            <div>💸 退款金额：<span className="font-bold text-red-600">¥{summary.refundAmount.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* 明细列表 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Receipt size={16} className="text-tennis-600" /> 当日交易明细
          </div>
          <div className="text-xs text-gray-400">共 {txList.length} 条</div>
        </div>

        {txList.length === 0 ? (
          <div className="card p-10 text-center text-gray-400">当日暂无交易流水</div>
        ) : (
          <div className="space-y-2">
            {txList.map((tx) => {
              const isOpen = expanded === tx.id;
              const meta = txTypeMeta(tx.type);
              const Icon = meta.icon;
              const levelMeta = tx.member ? getLevelMeta(tx.member.level) : null;
              const isIn = meta.dir === 'in';
              return (
                <div key={tx.id} className="card animate-fade-in-up overflow-hidden">
                  <div
                    onClick={() => setExpanded(isOpen ? null : tx.id)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-tennis-50/40 transition text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm shrink-0 ${meta.bg} ${meta.color} border ${meta.border}`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-800">{meta.label}</span>
                          {(tx.member?.name || tx.customerName) && (
                            <span className="text-sm text-gray-600">
                              · {tx.member?.name ?? tx.customerName}
                            </span>
                          )}
                          {levelMeta && (
                            <span className={`tag border text-[10px] ${levelMeta.bg} ${levelMeta.color}`}>
                              <Star size={9} className="mr-0.5 inline" /> {levelMeta.label}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                          {tx.member?.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={9} /> {tx.member.phone}
                            </span>
                          )}
                          {tx.courtName && <span>· {tx.courtName}</span>}
                          {tx.booking && (
                            <span>· {tx.booking.date} {tx.booking.startTime}-{tx.booking.endTime}</span>
                          )}
                          {tx.createdAt && (
                            <span>· {new Date(tx.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        <div className="text-[10px] text-gray-400">{isIn ? '入账' : '出账'}</div>
                        <div className={`font-display font-bold text-base ${isIn ? 'text-green-600' : 'text-gray-700'}`}>
                          {isIn ? '+' : '-'}¥{tx.amount.toFixed(2)}
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        <div className={`p-3 rounded-xl border ${
                          tx.member ? 'bg-gradient-to-br from-ball-50 to-tennis-50 border-tennis-200' : 'bg-gray-50 border-gray-100'
                        }`}>
                          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                            <User size={13} /> 客户信息
                          </div>
                          {(tx.member || tx.customerName) ? (
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold shadow-sm ring-2 ring-white ${
                                levelMeta ? `${levelMeta.bg} ${levelMeta.color}` : 'bg-gray-200 text-gray-600'
                              }`}>
                                {(tx.member?.name ?? tx.customerName ?? '?').charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-gray-800">{tx.member?.name ?? tx.customerName}</span>
                                  {levelMeta && (
                                    <span className={`tag border ${levelMeta.bg} ${levelMeta.color}`}>
                                      <Star size={9} className="mr-0.5 inline" /> {levelMeta.label}
                                    </span>
                                  )}
                                  {tx.customerType === 'walkin' && (
                                    <span className="tag bg-gray-100 text-gray-600 border border-gray-200 text-[10px]">散客</span>
                                  )}
                                </div>
                                {tx.member?.phone && (
                                  <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                    <Phone size={10} /> {tx.member.phone}
                                  </div>
                                )}
                                {tx.balanceAfter !== undefined && (
                                  <div className="text-[11px] text-green-700 mt-0.5">
                                    变动后余额：¥{tx.balanceAfter.toFixed(2)}
                                  </div>
                                )}
                                {tx.packageBalanceAfter !== undefined && (
                                  <div className="text-[11px] text-purple-700 mt-0.5">
                                    变动后次卡：{tx.packageBalanceAfter} 次
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">无客户信息</div>
                          )}
                        </div>

                        <div className="p-3 rounded-xl bg-white border border-gray-200 text-xs">
                          <div className="text-xs font-semibold text-gray-700 mb-2">流水详情</div>
                          <div className="space-y-1.5 text-gray-600">
                            <div className="flex justify-between">
                              <span className="text-gray-400">流水类型</span>
                              <span className="font-medium">{meta.label}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">变动金额</span>
                              <span className={`font-bold ${isIn ? 'text-green-600' : 'text-gray-700'}`}>
                                {isIn ? '+' : '-'}¥{tx.amount.toFixed(2)}
                              </span>
                            </div>
                            {tx.payMethod && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">支付方式</span>
                                <span className="font-medium">
                                  {tx.payMethod === 'cash' ? '现金' : tx.payMethod === 'card' ? '刷卡' : tx.payMethod === 'wallet' ? '余额' : '次卡'}
                                </span>
                              </div>
                            )}
                            {tx.bill && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">关联账单</span>
                                <span className="font-mono font-medium">{tx.bill.billNo}</span>
                              </div>
                            )}
                            {tx.courtName && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">预约信息</span>
                                <span className="font-medium">{tx.courtName} · {tx.booking?.startTime}-{tx.booking?.endTime}</span>
                              </div>
                            )}
                            {tx.note && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">备注</span>
                                <span className="font-medium">{tx.note}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-400">发生时间</span>
                              <span>{tx.createdAt ? new Date(tx.createdAt).toLocaleString('zh-CN') : '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
