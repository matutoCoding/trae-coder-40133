import { useState } from 'react';
import { MapPin, Plus, Edit3, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store';
import PageHeader from '@/components/PageHeader';
import Modal from '@/components/Modal';
import type { Court, CourtType } from '@/types';

const COURT_TYPES: { value: CourtType; label: string; colorClass: string }[] = [
  { value: 'hard', label: '硬地', colorClass: 'bg-hard-500' },
  { value: 'clay', label: '红土', colorClass: 'bg-clay-500' },
  { value: 'grass', label: '草地', colorClass: 'bg-grass-500' },
];

function getTypeMeta(type: CourtType) {
  return COURT_TYPES.find((t) => t.value === type) ?? COURT_TYPES[0];
}

export default function Courts() {
  const courts = useAppStore((s) => s.courts);
  const addCourt = useAppStore((s) => s.addCourt);
  const updateCourt = useAppStore((s) => s.updateCourt);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Court | null>(null);
  const [form, setForm] = useState({ name: '', type: 'hard' as CourtType, code: '', active: true });

  function openAdd() {
    setEditing(null);
    setForm({ name: '', type: 'hard', code: '', active: true });
    setShowModal(true);
  }

  function openEdit(c: Court) {
    setEditing(c);
    setForm({ name: c.name, type: c.type, code: c.code, active: c.active });
    setShowModal(true);
  }

  function onSubmit() {
    if (!form.name.trim() || !form.code.trim()) return;
    if (editing) {
      updateCourt(editing.id, form);
    } else {
      addCourt(form);
    }
    setShowModal(false);
  }

  function toggleActive(c: Court) {
    updateCourt(c.id, { active: !c.active });
  }

  return (
    <div>
      <PageHeader
        title="场地管理"
        subtitle="维护网球场基础档案，配置场地类型与启用状态"
        icon={<MapPin size={22} />}
        action={
          <button onClick={openAdd} className="btn-accent">
            <Plus size={16} className="mr-1.5" /> 新增场地
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {courts.map((court) => {
          const meta = getTypeMeta(court.type);
          return (
            <div key={court.id} className="card animate-fade-in-up">
              <div className="h-24 bg-gradient-to-br from-tennis-600 to-tennis-800 relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_30%,white,transparent_40%)]" />
                <div className="absolute top-3 right-3 flex gap-1">
                  <button
                    onClick={() => openEdit(court)}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(court)}
                    className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
                    title={court.active ? '点击停用' : '点击启用'}
                  >
                    {court.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                  </button>
                </div>
                <div className="absolute bottom-3 left-4">
                  <div className="text-white/70 text-xs font-medium tracking-wider">场地编号</div>
                  <div className="text-white font-display font-bold text-xl tracking-wider">{court.code}</div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg text-tennis-950">{court.name}</h3>
                  <span className={`tag ${court.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {court.active ? '启用中' : '已停用'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className={`w-3 h-3 rounded-full ${meta.colorClass}`} />
                  <span>{meta.label}场地</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? '编辑场地' : '新增场地'}
        size="sm"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary">取消</button>
            <button onClick={onSubmit} className="btn-primary" disabled={!form.name.trim() || !form.code.trim()}>
              {editing ? '保存修改' : '确认新增'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label-base">场地名称</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="如：中心球场"
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">场地编号</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="如：CTR-01"
              className="input-base"
            />
          </div>
          <div>
            <label className="label-base">场地类型</label>
            <div className="grid grid-cols-3 gap-2">
              {COURT_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, type: t.value })}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition ${
                    form.type === t.value
                      ? 'border-tennis-600 bg-tennis-50 text-tennis-800'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${t.colorClass}`} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="label-base mb-0">启用状态</span>
            <button
              onClick={() => setForm({ ...form, active: !form.active })}
              className="text-tennis-700"
            >
              {form.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
