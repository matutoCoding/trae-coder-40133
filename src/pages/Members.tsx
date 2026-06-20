import { useMemo, useState } from 'react';
import {
  Users, Plus, Edit2, Trash2, Search, Wallet, Phone, Star,
  ChevronDown, ChevronUp, X, CreditCard, ArrowDownCircle, ArrowUpCircle, RotateCcw,
  Calendar, Receipt,
} from 'lucide-react';
import { useAppStore, getLevelMeta, MEMBER_LEVELS } from '@/store';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import type { Member, MemberLevel } from '@/types';
import { formatDateDisplay } from '@/utils/time';

function MemberLevelBadge({ level }: { level: MemberLevel }) {
  const meta = getLevelMeta(level);
  return (
    <span className={`tag border ${meta.bg} ${meta.color}`}>
      <Star size={10} className="mr-1 inline" /> {meta.label}
    </span>
  );
}

interface MemberModalProps {
  open: boolean;
  onClose: () => void;
  editing?: Member | null;
  onSubmit: (data: { name: string; phone: string; level: MemberLevel; note?: string }) => void;
}

function MemberFormModal({ open, onClose, editing, onSubmit }: MemberModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState<MemberLevel>('normal');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  useMemoEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setPhone(editing?.phone ?? '');
      setLevel(editing?.level ?? 'normal');
      setNote(editing?.note ?? '');
      setErr('');
    }
  }, [open, editing]);

  function submit() {
    setErr('');
    if (!name.trim()) { setErr('请输入会员姓名'); return; }
    if (!/^1\d{10}$/.test(phone)) { setErr('请输入有效的 11 位手机号'); return; }
    onSubmit({ name: name.trim(), phone, level, note: note.trim() || undefined });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? '编辑会员资料' : '新增会员'}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={submit} className="btn-accent">{editing ? '保存修改' : '创建会员'}</button>
        </>
      }
    >
      <div className="space-y-4">
        {err && <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}
        <div>
          <label className="label-base">会员姓名 *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="请输入姓名" className="input-base" />
        </div>
        <div>
          <label className="label-base">手机号码 *</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11 位手机号" maxLength={11} className="input-base" />
        </div>
        <div>
          <label className="label-base">会员等级</label>
          <div className="grid grid-cols-4 gap-2">
            {MEMBER_LEVELS.map((lv) => (
              <button
                key={lv.value}
                onClick={() => setLevel(lv.value)}
                className={`px-2 py-2 rounded-lg border-2 text-xs font-semibold transition ${
                  level === lv.value
                    ? 'border-tennis-600 ' + lv.bg + ' ' + lv.color
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                {lv.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label-base">备注</label>
          <textarea
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="备注信息，如打球习惯、偏好场地等" rows={3}
            className="input-base resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}

interface RechargeModalProps {
  open: boolean;
  onClose: () => void;
  member: Member | null;
  onSubmit: (memberId: string, amount: number, note?: string) => void;
}

function RechargeModal({ open, onClose, member, onSubmit }: RechargeModalProps) {
  const [amount, setAmount] = useState<string>('100');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const presets = [100, 300, 500, 1000, 2000, 5000];

  useMemoEffect(() => {
    if (open) { setAmount('100'); setNote(''); setErr(''); }
  }, [open]);

  function submit() {
    setErr('');
    const n = Number(amount);
    if (!member) return;
    if (!n || n <= 0) { setErr('请输入有效的充值金额'); return; }
    onSubmit(member.id, n, note.trim() || undefined);
    onClose();
  }

  if (!member) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`为「${member.name}」充值余额`}
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={submit} className="btn-accent">
            <CreditCard size={14} className="mr-1.5" /> 确认充值
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {err && <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{err}</div>}
        <div className="p-4 rounded-xl bg-gradient-to-br from-tennis-50 to-ball-50 border border-tennis-100 flex items-center justify-between">
          <div>
            <div className="font-display font-bold text-tennis-950">{member.name}</div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Phone size={11} /> {member.phone}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">当前余额</div>
            <div className="font-display font-bold text-2xl text-tennis-800">¥{member.balance.toFixed(2)}</div>
          </div>
        </div>
        <div>
          <label className="label-base">快捷金额</label>
          <div className="grid grid-cols-6 gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className={`py-2 rounded-lg border-2 font-semibold text-sm transition ${
                  Number(amount) === p
                    ? 'border-tennis-600 bg-tennis-50 text-tennis-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                ¥{p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label-base">充值金额</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">¥</span>
            <input
              type="number" min={1} step={1}
              value={amount} onChange={(e) => setAmount(e.target.value)}
              className="input-base pl-7" placeholder="输入金额"
            />
          </div>
          {Number(amount) > 0 && (
            <div className="text-xs text-green-700 mt-1.5">
              充值后余额：¥{Number((member.balance + Number(amount)).toFixed(2)).toFixed(2)}
            </div>
          )}
        </div>
        <div>
          <label className="label-base">充值备注</label>
          <input
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="如：赠送充值、活动充值等（可选）" className="input-base"
          />
        </div>
      </div>
    </Modal>
  );
}

function useMemoEffect(fn: () => void, deps: any[]) {
  useMemo(() => { fn(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function Members() {
  const members = useAppStore((s) => s.members);
  const addMember = useAppStore((s) => s.addMember);
  const updateMember = useAppStore((s) => s.updateMember);
  const rechargeMember = useAppStore((s) => s.rechargeMember);
  const listMemberBookings = useAppStore((s) => s.listMemberBookings);
  const listMemberTxs = useAppStore((s) => s.listMemberTxs);
  const bookings = useAppStore((s) => s.bookings);
  const bills = useAppStore((s) => s.bills);
  const courts = useAppStore((s) => s.courts);

  const [keyword, setKeyword] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'wallet'>('bookings');
  const [formModal, setFormModal] = useState<{ open: boolean; editing: Member | null }>({ open: false, editing: null });
  const [rechargeModal, setRechargeModal] = useState<{ open: boolean; member: Member | null }>({ open: false, member: null });
  const [toast, setToast] = useState<string>('');

  const list = useMemo(() => {
    const sorted = [...members].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    if (!keyword.trim()) return sorted;
    const kw = keyword.trim().toLowerCase();
    return sorted.filter((m) =>
      m.name.toLowerCase().includes(kw) || m.phone.includes(kw) || (m.note ?? '').toLowerCase().includes(kw)
    );
  }, [members, keyword]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  function handleFormSubmit(data: { name: string; phone: string; level: MemberLevel; note?: string }) {
    if (formModal.editing) {
      updateMember(formModal.editing.id, data);
      showToast('会员资料已更新');
    } else {
      addMember(data);
      showToast('会员创建成功');
    }
  }

  function handleRecharge(memberId: string, amount: number, note?: string) {
    const res = rechargeMember(memberId, amount, note);
    if (!res.ok) { showToast('充值失败：' + (res.error ?? '')); return; }
    showToast(`充值成功 ¥${amount.toFixed(2)}`);
  }

  function getBillForBooking(bookingId: string) {
    return bills.find((b) => b.bookingId === bookingId);
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-6 right-6 z-50 card bg-tennis-900 text-white px-4 py-2.5 animate-fade-in-up shadow-lg text-sm">
          {toast}
        </div>
      )}

      <PageHeader
        title="会员管理"
        subtitle="建立会员档案、充值储值余额、查询历史预约和消费流水"
        icon={<Users size={22} />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={keyword} onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索姓名/手机号/备注..."
                className="input-base pl-9 w-64"
              />
            </div>
            <button onClick={() => setFormModal({ open: true, editing: null })} className="btn-accent">
              <Plus size={16} className="mr-1.5" /> 新增会员
            </button>
          </div>
        }
      />

      {list.length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          {keyword ? '没有匹配的会员，请调整搜索条件' : '暂无会员档案，点击右上角「新增会员」开始建档'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((m) => {
            const meta = getLevelMeta(m.level);
            const mBookings = listMemberBookings(m.id);
            const mTxs = listMemberTxs(m.id);
            const isOpen = expanded === m.id;
            return (
              <div key={m.id} className="card overflow-hidden animate-fade-in-up">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${meta.bg} ${meta.color} flex items-center justify-center font-display font-bold text-lg shadow-sm ring-2 ring-white`}>
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-display font-bold text-tennis-950 text-lg leading-tight">{m.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <MemberLevelBadge level={m.level} />
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone size={11} /> {m.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setRechargeModal({ open: true, member: m })}
                        title="充值"
                        className="w-8 h-8 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition flex items-center justify-center"
                      >
                        <Wallet size={15} />
                      </button>
                      <button
                        onClick={() => setFormModal({ open: true, editing: m })}
                        title="编辑"
                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex items-center justify-center"
                      >
                        <Edit2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-ball-50 to-white border border-ball-100 text-center">
                      <div className="text-[10px] text-gray-500">账户余额</div>
                      <div className="font-display font-bold text-tennis-800">¥{m.balance.toFixed(2)}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-green-50 to-white border border-green-100 text-center">
                      <div className="text-[10px] text-gray-500">累计充值</div>
                      <div className="font-display font-bold text-green-700">¥{m.totalRecharge.toFixed(2)}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-gradient-to-br from-red-50 to-white border border-red-100 text-center">
                      <div className="text-[10px] text-gray-500">累计消费</div>
                      <div className="font-display font-bold text-red-600">¥{m.totalConsume.toFixed(2)}</div>
                    </div>
                  </div>

                  {m.note && (
                    <div className="text-xs text-gray-500 p-2 rounded bg-gray-50 border border-gray-100">
                      💬 {m.note}
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setExpanded(isOpen ? null : m.id)}
                  className="px-5 py-2.5 border-t border-gray-100 bg-tennis-50/40 hover:bg-tennis-50 transition cursor-pointer flex items-center justify-between text-xs text-gray-600"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} /> 历史预约 {mBookings.length} 条
                    </span>
                    <span className="flex items-center gap-1">
                      <Receipt size={12} /> 资金流水 {mTxs.length} 条
                    </span>
                  </div>
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-gray-50 bg-white">
                    <div className="flex mt-3 mb-3 rounded-lg bg-gray-100 p-0.5">
                      <button
                        onClick={() => setActiveTab('bookings')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                          activeTab === 'bookings' ? 'bg-white text-tennis-800 shadow-sm' : 'text-gray-500'
                        }`}
                      >
                        <Calendar size={12} className="inline mr-1" /> 历史预约
                      </button>
                      <button
                        onClick={() => setActiveTab('wallet')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition ${
                          activeTab === 'wallet' ? 'bg-white text-tennis-800 shadow-sm' : 'text-gray-500'
                        }`}
                      >
                        <Wallet size={12} className="inline mr-1" /> 储值流水
                      </button>
                    </div>

                    {activeTab === 'bookings' && (
                      <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                        {mBookings.length === 0 && (
                          <div className="text-center text-gray-400 text-xs py-6">暂无预约记录</div>
                        )}
                        {mBookings.map((b) => {
                          const court = courts.find((c) => c.id === b.courtId);
                          const bill = getBillForBooking(b.id);
                          return (
                            <div key={b.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className={`tag border ${
                                    b.status === 'active'
                                      ? 'bg-green-50 text-green-700 border-green-200'
                                      : 'bg-gray-100 text-gray-500 border-gray-200'
                                  }`}>
                                    {b.status === 'active' ? '有效' : '已退订'}
                                  </span>
                                  <span className={`tag border ${
                                    b.bookingType === 'doubles'
                                      ? 'bg-ball-100 text-ball-700 border-ball-200'
                                      : 'bg-blue-50 text-blue-600 border-blue-200'
                                  }`}>
                                    {b.bookingType === 'doubles' ? '双打' : '单打'}
                                  </span>
                                </div>
                                <span className="font-semibold text-tennis-800">¥{b.totalAmount.toFixed(2)}</span>
                              </div>
                              <div className="text-xs text-gray-600">
                                {court?.name} · {formatDateDisplay(b.date)} {b.startTime}-{b.endTime}
                              </div>
                              {bill && (
                                <div className="text-[10px] text-gray-400 mt-1">
                                  账单：{bill.billNo} · {bill.paymentStatus === 'paid' ? '已收款' : bill.paymentStatus === 'refunded' ? '已退款' : '待收款'}
                                  {bill.paymentMethod && ` · ${bill.paymentMethod === 'wallet' ? '余额扣款' : bill.paymentMethod === 'cash' ? '现金' : '刷卡'}`}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {activeTab === 'wallet' && (
                      <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                        {mTxs.length === 0 && (
                          <div className="text-center text-gray-400 text-xs py-6">暂无资金流水，充值后会显示</div>
                        )}
                        {mTxs.map((t) => {
                          const isRecharge = t.type === 'recharge';
                          const isRefund = t.type === 'refund';
                          const Icon = isRecharge ? ArrowDownCircle : isRefund ? RotateCcw : ArrowUpCircle;
                          const color = isRecharge || isRefund ? 'text-green-600' : 'text-red-600';
                          const bg = isRecharge || isRefund ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100';
                          return (
                            <div key={t.id} className={`p-3 rounded-lg border ${bg} text-sm`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Icon size={14} className={color} />
                                  <span className={`font-semibold ${color}`}>
                                    {isRecharge ? '充值' : isRefund ? '退款退回' : '消费扣款'}
                                  </span>
                                </div>
                                <span className={`font-bold ${color}`}>
                                  {isRecharge || isRefund ? '+' : '-'}¥{t.amount.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-gray-500">
                                <span>余额：¥{t.balanceAfter.toFixed(2)}</span>
                                <span>{new Date(t.createdAt).toLocaleString('zh-CN')}</span>
                              </div>
                              {t.note && (
                                <div className="text-[11px] text-gray-400 mt-0.5">备注：{t.note}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <MemberFormModal
        open={formModal.open}
        onClose={() => setFormModal({ open: false, editing: null })}
        editing={formModal.editing}
        onSubmit={handleFormSubmit}
      />
      <RechargeModal
        open={rechargeModal.open}
        onClose={() => setRechargeModal({ open: false, member: null })}
        member={rechargeModal.member}
        onSubmit={handleRecharge}
      />
    </div>
  );
}
