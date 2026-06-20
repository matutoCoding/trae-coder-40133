import { NavLink } from 'react-router-dom';
import { Calendar, MapPin, Receipt, Percent, Trophy, Users, BarChart3 } from 'lucide-react';

const navItems = [
  { to: '/', label: '排期总览', icon: Calendar },
  { to: '/dashboard', label: '运营看板', icon: BarChart3 },
  { to: '/members', label: '会员管理', icon: Users },
  { to: '/courts', label: '场地管理', icon: MapPin },
  { to: '/rates', label: '费率设置', icon: Percent },
  { to: '/bills', label: '账单中心', icon: Receipt },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-gradient-to-b from-tennis-950 to-tennis-900 text-white flex flex-col">
      <div className="px-5 py-6 border-b border-tennis-800 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-ball-500 flex items-center justify-center text-2xl shadow-lg">
          🎾
        </div>
        <div>
          <div className="font-display font-bold text-lg tracking-wide text-ball-400">ACE COURT</div>
          <div className="text-xs text-tennis-200">网球场地预约系统</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item-active' : ''}`
            }
          >
            <Icon size={18} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-tennis-800">
        <div className="rounded-lg bg-tennis-800/40 p-3 text-xs text-tennis-100">
          <div className="flex items-center gap-2 mb-1.5">
            <Trophy size={14} className="text-ball-400" />
            <span className="font-semibold text-ball-400">运营小贴士</span>
          </div>
          推荐会员在高峰前 24 小时完成预约，可在看板查看场地利用率。
        </div>
      </div>
    </aside>
  );
}
