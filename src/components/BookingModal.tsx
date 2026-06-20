import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, UserPlus, X, Users, User, CheckCircle2, Link2,
  Search, Wallet, CreditCard, Clock, Phone, Star, ChevronDown, ChevronUp,
} from 'lucide-react';
import Modal from './Modal';
import { useAppStore, getLevelMeta } from '@/store';
import type { BookingType, Court, Member, PaymentMethod } from '@/types';
import { generateTimeSlots } from '@/utils/time';
import { splitDoublesShare, tierColorClass } from '@/utils/billing';
import { findRateGaps, formatRateGapList } from '@/utils/rateGap';
import { Link } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  court: Court;
  date: string;
  initialStart?: string;
  initialEnd?: string;
}

const TIME_SLOTS = generateTimeSlots();

export default function BookingModal({ open, onClose, court, date, initialStart, initialEnd }: Props) {
  const courts = useAppStore((s) => s.courts);
  const rates = useAppStore((s) => s.rates);
  const members = useAppStore((s) => s.members);
  const checkConflict = useAppStore((s) => s.checkConflict);
  const checkRateGap = useAppStore((s) => s.checkRateGap);
  const calcBilling = useAppStore((s) => s.calcBilling);
  const createBooking = useAppStore((s) => s.createBooking);

  const [courtId, setCourtId] = useState(court.id);
  const [startTime, setStartTime] = useState(initialStart ?? '18:00');
  const [endTime, setEndTime] = useState(initialEnd ?? '20:00');
  const [customerType, setCustomerType] = useState<'walkin' | 'member'>('walkin');
  const [walkinName, setWalkinName] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [bookingType, setBookingType] = useState<BookingType>('singles');
  const [teammates, setTeammates] = useState<string[]>([]);
  const [teammateInput, setTeammateInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pending' | PaymentMethod>('pending');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      setCourtId(court.id);
      setStartTime(initialStart ?? '18:00');
      setEndTime(initialEnd ?? '20:00');
      setCustomerType('walkin');
      setWalkinName('');
      setMemberSearch('');
      setSelectedMemberId(null);
      setMemberDropdownOpen(false);
      setBookingType('singles');
      setTeammates([]);
      setTeammateInput('');
      setPaymentMethod('pending');
      setError('');
      setSuccess('');
    }
  }, [open, court.id, initialStart, initialEnd]);

  const selectedMember = useMemo<Member | null>(() => {
    if (!selectedMemberId) return null;
    return members.find((m) => m.id === selectedMemberId) ?? null;
  }, [selectedMemberId, members]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 6);
    const kw = memberSearch.trim().toLowerCase();
    return members
      .filter((m) => m.name.toLowerCase().includes(kw) || m.phone.includes(kw))
      .slice(0, 8);
  }, [members, memberSearch]);

  const globalGaps = useMemo(() => findRateGaps(rates), [rates]);

  const rangeGap = useMemo(() => {
    if (startTime >= endTime) return null;
    return checkRateGap(startTime, endTime);
  }, [startTime, endTime, checkRateGap]);

  const billing = useMemo(() => {
    if (startTime >= endTime) return null;
    if (rangeGap?.hasGap) return null;
    return calcBilling(startTime, endTime);
  }, [startTime, endTime, calcBilling, rangeGap]);

  const conflict = useMemo(() => {
    if (!courtId || startTime >= endTime) return null;
    return checkConflict(courtId, date, startTime, endTime);
  }, [courtId, date, startTime, endTime, checkConflict]);

  const shares = useMemo(() => {
    if (!billing || bookingType !== 'doubles') return null;
    const name = customerType === 'member' ? selectedMember?.name ?? '(会员)' : walkinName || '(预约人)';
    return splitDoublesShare(billing.totalAmount, name, teammates);
  }, [billing, bookingType, customerType, selectedMember, walkinName, teammates]);

  const balanceAfterWallet = useMemo(() => {
    if (!selectedMember || paymentMethod !== 'wallet' || !billing) return null;
    return Number((selectedMember.balance - billing.totalAmount).toFixed(2));
  }, [selectedMember, paymentMethod, billing]);

  const walletInsufficient = useMemo(() => {
    if (!selectedMember || paymentMethod !== 'wallet' || !billing) return false;
    return selectedMember.balance < billing.totalAmount;
  }, [selectedMember, paymentMethod, billing]);

  const customerName = customerType === 'member' ? selectedMember?.name ?? '' : walkinName;

  function addTeammate() {
    const name = teammateInput.trim();
    if (!name) return;
    if (teammates.length >= 3) {
      setError('双打最多 3 名队友（共 4 人）');
      return;
    }
    if (teammates.includes(name)) {
      setError('队友姓名重复');
      return;
    }
    setTeammates([...teammates, name]);
    setTeammateInput('');
    setError('');
  }

  function removeTeammate(name: string) {
    setTeammates(teammates.filter((t) => t !== name));
  }

  function selectMember(m: Member) {
    setSelectedMemberId(m.id);
    setMemberSearch(m.name);
    setMemberDropdownOpen(false);
    setError('');
  }

  function submit() {
    setError('');
    setSuccess('');

    if (customerType === 'walkin' && !walkinName.trim()) {
      setError('请填写预约人姓名');
      return;
    }
    if (customerType === 'member' && !selectedMember) {
      setError('请选择会员');
      return;
    }
    if (startTime >= endTime) {
      setError('结束时间必须晚于开始时间');
      return;
    }
    if (conflict?.hasConflict) {
      setError('所选时段与已有预约冲突');
      return;
    }
    if (rangeGap?.hasGap) {
      setError(rangeGap.message ?? '所选时段存在未配置费率的区间');
      return;
    }
    if (paymentMethod === 'wallet' && walletInsufficient) {
      setError(`会员余额不足（当前 ¥${selectedMember!.balance.toFixed(2)}），请先充值或更换支付方式`);
      return;
    }

    const res = createBooking({
      courtId,
      date,
      startTime,
      endTime,
      customerName: customerName.trim(),
      customerType,
      memberId: customerType === 'member' ? selectedMember!.id : undefined,
      bookingType,
      teammates,
      paymentMethod: paymentMethod === 'pending' ? undefined : paymentMethod,
    });
    if (!res.ok) {
      setError(res.error ?? '预约失败');
      return;
    }
    const payHint = paymentMethod === 'pending'
      ? '账单已生成（默认待收款）'
      : paymentMethod === 'wallet'
        ? `已从会员余额扣款 ¥${billing!.totalAmount.toFixed(2)}`
        : paymentMethod === 'cash'
          ? '已标记现金收款'
          : '已标记刷卡收款';
    setSuccess(`预约成功！时段已锁定。${payHint}。`);
    setTimeout(() => {
      onClose();
    }, 1600);
  }

  const canSubmit = !conflict?.hasConflict && !rangeGap?.hasGap && !!billing && billing.totalAmount > 0 && !walletInsufficient
    && (customerType === 'walkin' ? !!walkinName.trim() : !!selectedMember);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`预约场地 · ${court.name} · ${date}`}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={submit} className="btn-accent" disabled={!canSubmit}>
            确认预约 ¥{billing?.totalAmount.toFixed(2) ?? '0.00'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {globalGaps.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs space-y-1.5">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="font-semibold">
                  当前费率未覆盖全天，存在 {globalGaps.length} 处缺口：
                  {formatRateGapList(globalGaps)}
                </div>
                <div className="mt-1 opacity-90">
                  涉及这些区间的时段将无法下单，请先
                  <Link to="/rates" className="underline font-semibold inline-flex items-center gap-1 mx-1 hover:text-amber-900">
                    <Link2 size={11} /> 到费率设置补齐
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label-base">场地</label>
            <select value={courtId} onChange={(e) => setCourtId(e.target.value)} className="input-base">
              {courts.filter((c) => c.active).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-base">开始时间</label>
            <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className="input-base">
              {TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label-base">结束时间</label>
            <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className="input-base">
              {TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}
              <option value="22:00">22:00</option>
            </select>
          </div>
        </div>

        {rangeGap?.hasGap && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">所选时段存在费率缺口，暂无法下单</div>
              <div className="text-xs mt-1 opacity-90">
                缺口时段：{formatRateGapList(rangeGap.gaps)}
              </div>
            </div>
          </div>
        )}

        {conflict?.hasConflict && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">时段冲突</div>
              <div className="text-xs mt-1 opacity-90">
                已被：{conflict.conflictingBookings.map((b) => `${b.customerName} ${b.startTime}-${b.endTime}`).join('、')}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="label-base">客户类型</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setCustomerType('walkin'); setSelectedMemberId(null); }}
              className={`px-3 py-2.5 rounded-lg border-2 flex items-center justify-center gap-2 text-sm font-medium transition ${
                customerType === 'walkin'
                  ? 'border-tennis-600 bg-tennis-50 text-tennis-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <User size={16} /> 散客
            </button>
            <button
              onClick={() => { setCustomerType('member'); setWalkinName(''); }}
              className={`px-3 py-2.5 rounded-lg border-2 flex items-center justify-center gap-2 text-sm font-medium transition ${
                customerType === 'member'
                  ? 'border-tennis-600 bg-tennis-50 text-tennis-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Users size={16} /> 会员
            </button>
          </div>
        </div>

        {customerType === 'walkin' ? (
          <div>
            <label className="label-base">预约人姓名</label>
            <input
              value={walkinName}
              onChange={(e) => setWalkinName(e.target.value)}
              placeholder="请输入散客姓名"
              className="input-base"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <label className="label-base">搜索并选择会员</label>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={selectedMember && memberSearch === selectedMember.name ? selectedMember.name : memberSearch}
                  onChange={(e) => { setMemberSearch(e.target.value); setMemberDropdownOpen(true); setSelectedMemberId(null); }}
                  onFocus={() => setMemberDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setMemberDropdownOpen(false), 180)}
                  placeholder="输入会员姓名或手机号搜索..."
                  className="input-base pl-9 pr-10"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {memberDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>
              {memberDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 card p-1 max-h-64 overflow-y-auto animate-fade-in-up">
                  {filteredMembers.length === 0 ? (
                    <div className="px-3 py-6 text-center text-gray-400 text-sm">
                      没有匹配的会员
                      <Link to="/members" className="block mt-2 text-tennis-600 underline text-xs">去会员管理新建</Link>
                    </div>
                  ) : (
                    filteredMembers.map((m) => {
                      const meta = getLevelMeta(m.level);
                      const isSelected = selectedMemberId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectMember(m)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-3 ${
                            isSelected ? 'bg-tennis-50 ring-2 ring-tennis-400' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full ${meta.bg} ${meta.color} flex items-center justify-center font-display font-bold shrink-0`}>
                            {m.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">{m.name}</span>
                              <span className={`tag border text-[10px] ${meta.bg} ${meta.color}`}>
                                <Star size={9} className="mr-0.5 inline" /> {meta.label}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                              <Phone size={10} /> {m.phone}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-gray-400">余额</div>
                            <div className={`font-display font-bold ${m.balance > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                              ¥{m.balance.toFixed(2)}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {selectedMember && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-ball-50 to-tennis-50 border border-tennis-200">
                <div className="flex items-center gap-3">
                  {(() => {
                    const meta = getLevelMeta(selectedMember.level);
                    return (
                      <div className={`w-12 h-12 rounded-full ${meta.bg} ${meta.color} flex items-center justify-center font-display font-bold text-lg shadow-sm ring-2 ring-white`}>
                        {selectedMember.name.charAt(0)}
                      </div>
                    );
                  })()}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-tennis-950">{selectedMember.name}</span>
                      {(() => {
                        const meta = getLevelMeta(selectedMember.level);
                        return (
                          <span className={`tag border ${meta.bg} ${meta.color}`}>
                            <Star size={10} className="mr-1 inline" /> {meta.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <Phone size={11} /> {selectedMember.phone}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500">账户余额</div>
                    <div className={`font-display font-bold text-xl ${selectedMember.balance > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                      ¥{selectedMember.balance.toFixed(2)}
                    </div>
                  </div>
                </div>
                {selectedMember.note && (
                  <div className="mt-2 pt-2 border-t border-tennis-200/50 text-xs text-gray-500">
                    💬 {selectedMember.note}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label-base">打球类型</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setBookingType('singles')}
              className={`px-3 py-2.5 rounded-lg border-2 flex items-center justify-center gap-2 text-sm font-medium transition ${
                bookingType === 'singles'
                  ? 'border-tennis-600 bg-tennis-50 text-tennis-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <User size={16} /> 单打
            </button>
            <button
              onClick={() => setBookingType('doubles')}
              className={`px-3 py-2.5 rounded-lg border-2 flex items-center justify-center gap-2 text-sm font-medium transition ${
                bookingType === 'doubles'
                  ? 'border-tennis-600 bg-tennis-50 text-tennis-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Users size={16} /> 双打
            </button>
          </div>
        </div>

        {bookingType === 'doubles' && (
          <div className="p-4 rounded-xl bg-tennis-50/60 border border-tennis-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="label-base mb-0">双打队友（最多 3 人）</label>
              <span className="text-xs text-gray-500">{teammates.length}/3</span>
            </div>
            <div className="flex gap-2">
              <input
                value={teammateInput}
                onChange={(e) => setTeammateInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTeammate())}
                placeholder="输入队友姓名后回车或点击添加"
                className="input-base flex-1"
              />
              <button onClick={addTeammate} className="btn-primary shrink-0" disabled={teammates.length >= 3}>
                <UserPlus size={16} className="mr-1" /> 添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {teammates.length === 0 && (
                <span className="text-xs text-gray-400 py-1">暂无队友，费用将仅由预约人承担</span>
              )}
              {teammates.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-tennis-200 text-sm text-tennis-800">
                  {t}
                  <button onClick={() => removeTeammate(t)} className="text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="label-base">支付方式</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod('pending')}
              className={`px-2 py-2.5 rounded-lg border-2 flex flex-col items-center gap-1 text-xs font-semibold transition ${
                paymentMethod === 'pending'
                  ? 'border-amber-500 bg-amber-50 text-amber-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <Clock size={16} /> 待收款
            </button>
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`px-2 py-2.5 rounded-lg border-2 flex flex-col items-center gap-1 text-xs font-semibold transition ${
                paymentMethod === 'cash'
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <CreditCard size={16} /> 现金收款
            </button>
            <button
              onClick={() => {
                if (customerType !== 'member') {
                  setError('储值扣款仅会员可用，请切换为会员类型或先选择会员');
                  setCustomerType('member');
                  return;
                }
                setPaymentMethod('wallet');
                setError('');
              }}
              className={`px-2 py-2.5 rounded-lg border-2 flex flex-col items-center gap-1 text-xs font-semibold transition ${
                paymentMethod === 'wallet'
                  ? 'border-tennis-600 bg-tennis-50 text-tennis-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              } ${customerType !== 'member' ? 'opacity-60' : ''}`}
            >
              <Wallet size={16} /> 储值扣款
            </button>
          </div>

          {paymentMethod === 'pending' && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              预约后账单将标记为「待收款」，可后续到「账单中心」完成收款操作。
            </div>
          )}

          {paymentMethod === 'wallet' && selectedMember && billing && (
            <div className={`mt-2 text-xs rounded-lg p-3 border ${
              walletInsufficient
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-tennis-50 border-tennis-200 text-tennis-800'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span>当前余额</span>
                <span className="font-bold">¥{selectedMember.balance.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span>本次消费</span>
                <span className="font-bold">-¥{billing.totalAmount.toFixed(2)}</span>
              </div>
              <div className={`flex items-center justify-between pt-1.5 mt-1.5 border-t border-dashed ${
                walletInsufficient ? 'border-red-300' : 'border-tennis-300'
              }`}>
                <span className="font-semibold">{walletInsufficient ? '⚠️ 余额不足' : '扣款后余额'}</span>
                <span className={`font-display font-bold text-lg ${walletInsufficient ? 'text-red-600' : 'text-green-700'}`}>
                  {walletInsufficient
                    ? `还差 ¥${(billing.totalAmount - selectedMember.balance).toFixed(2)}`
                    : `¥${balanceAfterWallet!.toFixed(2)}`}
                </span>
              </div>
            </div>
          )}
        </div>

        {billing && (
          <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-700">费用明细</div>
              <div className="flex items-baseline">
                <span className="text-xs text-gray-400 mr-1">合计</span>
                <span className="font-display font-bold text-2xl text-tennis-800">¥{billing.totalAmount.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mb-2">
              总时长 {Math.floor(billing.totalMinutes / 60)}小时{(billing.totalMinutes % 60)}分
            </div>
            <div className="space-y-1.5">
              {billing.segments.map((seg, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm py-1.5 px-2 rounded bg-white">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`tag border ${tierColorClass(seg.tier)}`}>{seg.tierName}</span>
                    <span className="text-gray-600">{seg.startTime} - {seg.endTime}</span>
                    <span className="text-gray-400 text-xs">({seg.durationMinutes}分 × ¥{seg.pricePerHour}/h)</span>
                  </div>
                  <span className="font-semibold text-gray-700">¥{seg.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {shares && (
              <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                <div className="text-sm font-semibold text-gray-700 mb-2">双打费用分摊</div>
                <div className="space-y-1">
                  {shares.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span className="text-gray-600">
                        {s.name}
                        {s.isLeader && <span className="ml-1.5 tag bg-ball-100 text-ball-700">队长</span>}
                      </span>
                      <span className="font-semibold text-tennis-800">¥{s.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {rates.length === 0 && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
            提示：系统未配置任何费率，无法下单。请到「费率设置」配置。
          </div>
        )}
      </div>
    </Modal>
  );
}
