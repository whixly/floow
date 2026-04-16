import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, StickyNote, Calendar,
  Activity, Timer, Target, Settings, LogOut, Waves
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/notes', icon: StickyNote, label: 'Notes' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/habits', icon: Activity, label: 'Habits' },
  { to: '/pomodoro', icon: Timer, label: 'Pomodoro' },
  { to: '/goals', icon: Target, label: 'Goals' },
]

export default function Sidebar() {
  const { user } = useStore()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <aside className="w-60 h-screen flex flex-col t-sidebar fixed left-0 top-0 z-10 border-r border-white/10">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Waves size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-white">Floow</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-wider px-3 mb-2" style={{ color: 'var(--text-dim)' }}>
          Menu
        </p>
        <ul className="space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/95 shadow-sm'
                      : 'text-white hover:bg-white/15'
                  }`
                }
                style={({ isActive }) => isActive ? { color: 'var(--theme-bg)' } : {}}
              >
                <Icon size={18} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-4 pt-4 border-t border-white/10">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-white/95 shadow-sm' : 'text-white hover:bg-white/15'
              }`
            }
            style={({ isActive }) => isActive ? { color: 'var(--theme-bg)' } : {}}
          >
            <Settings size={18} />
            Settings
          </NavLink>
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {user?.user_metadata?.full_name ?? user?.email ?? 'User'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/50 hover:text-white transition-colors"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  )
}
