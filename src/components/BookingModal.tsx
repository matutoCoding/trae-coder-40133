import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, UserPlus, X, Users, User, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import { useAppStore } from '@/store';
import type { BookingType, Court } from '@/types';
import { generateTimeSlots } from '@/utils/time';
import { splitDoublesShare, tierColorClass } from '@/utils/billing';

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
  const checkConflict = useAppStore((s) => s.checkConflict);
  const calcBilling = useAppStore((s) => s.calcBilling);
  const createBooking = useAppStore((s) => s.createBooking);

  const [courtId, setCourtId] = useState(court.id);
  const [startTime, setStartTime] = useState(initialStart ?? '18:00');
  const [endTime, setEndTime] = useState(initialEnd ?? '20:00');
  const [customerName, setCustomerName] = useState('');
  const [bookingType, setBookingType] = useState<BookingType>('singles');
  const [teammates, setTeammates] = useState<string[]>([]);
  const [teammateInput, setTeammateInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (open) {
      setCourtId(court.id);
      setStartTime(initialStart ?? '18:00');
      setEndTime(initialEnd ?? '20:00');
      setCustomerName('');
      setBookingType('singles');
      setTeammates([]);
      setTeammateInput('');
      setError('');
      setSuccess('');
    }
  }, [open, court.id, initialStart, initialEnd]);

  const billing = useMemo(() => {
    if (startTime >= endTime) return null;
    return calcBilling(startTime, endTime);
  }, [startTime, endTime, calcBilling]);

  const conflict = useMemo(() => {
    if (!courtId || startTime >= endTime) return null;
    return checkConflict(courtId, date, startTime, endTime);
  }, [courtId, date, startTime, endTime, checkConflict]);

  const shares = useMemo(() => {
    if (!billing || bookingType !== 'doubles') return null;
    const name = customerName || '(预约人)';
    return splitDoublesShare(billing.totalAmount, name, teammates);
  }, [billing, bookingType, customerName, teammates]);

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

  function submit() {
    setError('');
    setSuccess('');
    if (!customerName.trim()) {
      setError('请填写预约人姓名');
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
    const res = createBooking({
      courtId,
      date,
      startTime,
      endTime,
      customerName: customerName.trim(),
      bookingType,
      teammates,
    });
    if (!res.ok) {
      setError(res.error ?? '预约失败');
      return;
    }
    setSuccess('预约成功！时段已锁定，账单已生成。');
    setTimeout(() => {
      onClose();
    }, 1200);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`预约场地 · ${court.name}`}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={submit} className="btn-accent" disabled={!!conflict?.hasConflict || !billing}>
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

        <div>
          <label className="label-base">预约人姓名</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="请输入预约人姓名"
            className="input-base"
          />
        </div>

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
                  <div className="flex items-center gap-2">
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
            提示：系统未配置费率，将无法计算费用。请到「费率设置」配置。
          </div>
        )}
      </div>
    </Modal>
  );
}
