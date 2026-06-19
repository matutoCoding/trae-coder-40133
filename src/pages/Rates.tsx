import { useMemo, useState } from 'react';
import { Percent, Plus, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import type { Rate, RateTier } from '@/types';
import { checkRateOverlap } from '@/utils/conflict';
import { generateTimeSlots, timeToMinutes } from '@/utils/time';
import { tierColorClass, tierLabel } from '@/utils/billing';

const TIER_OPTIONS: { value: RateTier; label: string; color: string }[] = [
  { value: 'valley', label: '谷峰', color: '#81c784' },
  { value: 'flat', label: '平峰', color: '#64b5f6' },
  { value: 'peak', label: '高峰', color: '#e57373' },
];

const TIME_SLOTS = generateTimeSlots();

function emptyForm() {
  return {
    tier: 'flat' as RateTier,
    tierName: '平峰',
    startTime: '12:00',
    endTime: '18:00',
    pricePerHour: 80,
    color: '#64b5f6',
  };
}

export default function Rates() {
  const rates = useAppStore((s) => s.rates);
  const addRate = useAppStore((s) => s.addRate);
  const updateRate = useAppStore((s) => s.updateRate);
  const removeRate = useAppStore((s) => s.removeRate);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Rate | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState<string>('');

  const sorted = useMemo(
    () => [...rates].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [rates]
  );

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowModal(true);
  }

  function openEdit(r: Rate) {
    setEditing(r);
    setForm({
      tier: r.tier,
      tierName: r.tierName,
      startTime: r.startTime,
      endTime: r.endTime,
      pricePerHour: r.pricePerHour,
      color: r.color,
    });
    setError('');
    setShowModal(true);
  }

  function onSubmit() {
    setError('');
    if (form.startTime >= form.endTime) {
      setError('结束时间必须晚于开始时间');
      return;
    }
    if (form.pricePerHour <= 0) {
      setError('单价必须大于 0');
      return;
    }
    const overlap = checkRateOverlap(rates, form.startTime, form.endTime, editing?.id);
    if (overlap) {
      setError('时段与已有费率重叠，请调整');
      return;
    }
    const tierMeta = TIER_OPTIONS.find((t) => t.value === form.tier)!;
    const payload = { ...form, tierName: tierMeta.label, color: tierMeta.color };
    if (editing) {
      updateRate(editing.id, payload);
    } else {
      addRate(payload);
    }
    setShowModal(false);
  }

  return (
    <div>
      <PageHeader
        title="费率设置"
        subtitle="维护分时段费率，支持高峰/平峰/谷峰多档差异化计费"
        icon={<Percent size={22} />}
        action={
          <button onClick={openAdd} className="btn-accent">
            <Plus size={16} className="mr-1.5" /> 新增费率
          </button>
        }
      />

      <div className="card">
        <div className="grid grid-cols-12 px-5 py-3 bg-tennis-50 border-b border-tennis-100 text-sm font-semibold text-tennis-800">
          <div className="col-span-2">档位</div>
          <div className="col-span-3">时段区间</div>
          <div className="col-span-2">单价 (元/小时)</div>
          <div className="col-span-4 text-center">覆盖时间段可视化</div>
          <div className="col-span-1 text-right">操作</div>
        </div>

        <div className="divide-y divide-gray-100">
          {sorted.length === 0 && (
            <div className="px-5 py-10 text-center text-gray-400">暂无费率，点击右上角新增</div>
          )}
          {sorted.map((r) => {
            const startMin = timeToMinutes(r.startTime);
            const endMin = timeToMinutes(r.endTime);
            const DAY_START = timeToMinutes('06:00');
            const DAY_END = timeToMinutes('22:00');
            const TOTAL = DAY_END - DAY_START;
            const leftPct = ((startMin - DAY_START) / TOTAL) * 100;
            const widthPct = ((endMin - startMin) / TOTAL) * 100;
            return (
            <div key={r.id} className="grid grid-cols-12 px-5 py-4 items-center hover:bg-tennis-50/40 transition">
              <div>
                <span className={`tag border ${tierColorClass(r.tier)}`}>{r.tierName}</span>
              </div>
              <div className="font-mono text-gray-700">
                {r.startTime} — {r.endTime}
              </div>
              <div>
                <span className="font-display font-bold text-xl text-tennis-800">¥{r.pricePerHour}</span>
                <span className="text-xs text-gray-400 ml-1">/小时</span>
              </div>
              <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 rounded-full"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    backgroundColor: r.color,
                    opacity: 0.75,
                  }}
                />
                <div className="absolute inset-0 flex justify-between px-2 text-[10px] text-gray-500 items-center">
                  <span>06:00</span>
                  <span>22:00</span>
                </div>
              </div>
              <div className="flex justify-end gap-1">
                <button
                  onClick={() => openEdit(r)}
                  className="w-8 h-8 rounded-lg hover:bg-tennis-100 text-tennis-700 flex items-center justify-center transition"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`确认删除「${r.tierName} ${r.startTime}-${r.endTime}」费率？`)) removeRate(r.id);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '编辑费率' : '新增费率'}
        size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">取消</button>
            <button onClick={onSubmit} className="btn-primary">{editing ? '保存修改' : '确认新增'}</button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="label-base">费率档位</label>
            <div className="grid grid-cols-3 gap-2">
              {TIER_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, tier: t.value, tierName: t.label, color: t.color })}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    form.tier === t.value
                      ? 'border-tennis-600 bg-tennis-50 text-tennis-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: t.color }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">开始时间</label>
              <select
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="input-base"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-base">结束时间</label>
              <select
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="input-base"
              >
                {TIME_SLOTS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
                <option value="22:00">22:00</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label-base">每小时单价 (元)</label>
            <input
              type="number"
              min={0}
              step={10}
              value={form.pricePerHour}
              onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })}
              className="input-base"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
