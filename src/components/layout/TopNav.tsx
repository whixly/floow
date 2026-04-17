import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, StickyNote,
  Calendar, Activity, Timer, Target, Settings, LogOut,
  Layers, Brain
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store/useStore'

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/app/notes', icon: StickyNote, label: 'Notes' },
  { to: '/app/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/app/habits', icon: Activity, label: 'Habits' },
  { to: '/app/pomodoro', icon: Timer, label: 'Pomodoro' },
  { to: '/app/goals', icon: Target, label: 'Goals' },
  { to: '/app/flashcards', icon: Layers, label: 'Flashcards' },
  { to: '/app/quiz', icon: Brain, label: 'Quiz' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
]

// Eye center positions in mini-SVG viewBox (0 0 100 50)
const ME1 = { x: 37, y: 22 }
const ME2 = { x: 63, y: 22 }

function calcEye(cx: number, cy: number, tx: number, ty: number, maxR = 4) {
  const dx = tx - cx; const dy = ty - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return { x: cx, y: cy }
  const r = Math.min(maxR, dist)
  return { x: cx + (dx / dist) * r, y: cy + (dy / dist) * r }
}

export default function TopNav() {
  const { user, avatarUrl, profileUsername } = useStore()
  const navigate = useNavigate()
  const miniSvgRef = useRef<SVGSVGElement>(null)
  const [e1, setE1] = useState(ME1)
  const [e2, setE2] = useState(ME2)

  useEffect(() => {
    const onMouse = (ev: MouseEvent) => {
      const svg = miniSvgRef.current
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = ev.clientX; pt.y = ev.clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const { x, y } = pt.matrixTransform(ctm.inverse())
      setE1(calcEye(ME1.x, ME1.y, x, y))
      setE2(calcEye(ME2.x, ME2.y, x, y))
    }
    window.addEventListener('mousemove', onMouse)
    return () => window.removeEventListener('mousemove', onMouse)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const displayName = profileUsername ?? user?.email?.split('@')[0] ?? 'user'
  const initial = displayName[0].toUpperCase()

  return (
    <header className="t-sidebar border-b border-white/10 fixed top-0 left-0 right-0 z-20">
      <div className="flex items-center h-14 px-4 gap-3 max-w-screen-xl mx-auto">

        {/* ── Logo — sphere-style dark background ── */}
        <button onClick={() => navigate('/app')} className="flex items-center flex-shrink-0">
          <svg ref={miniSvgRef} viewBox="0 0 100 50" className="w-16 h-10" style={{ borderRadius: 8 }}>
            <defs>
              {/* Sphere-style gradient: bright lime highlight → dark green shadow */}
              <radialGradient id="mg" cx="28%" cy="22%" r="68%">
                <stop offset="0%"   stopColor="#a3ff9a" />
                <stop offset="38%"  stopColor="#22c55e" />
                <stop offset="100%" stopColor="#071a07" />
              </radialGradient>
              <radialGradient id="mk" cx="28%" cy="22%" r="68%">
                <stop offset="0%"   stopColor="#ffffff" />
                <stop offset="45%"  stopColor="#86efac" />
                <stop offset="100%" stopColor="#166534" />
              </radialGradient>
            </defs>

            {/* Dark background */}
            <rect x="0" y="0" width="100" height="50" rx="8" fill="#040a04" />

            {/* o1 ring */}
            {[[20,8],[30,8],[20,16],[30,16],[20,24],[30,24],[20,32],[28,32]].map(([cx,cy]) => (
              <circle key={`m1${cx}${cy}`} cx={cx} cy={cy} r="3.5" fill="url(#mg)" />
            ))}
            {/* o1 eye */}
            <circle cx={e1.x} cy={e1.y} r="4.5" fill="url(#mk)" />

            {/* o2 ring */}
            {[[50,8],[60,8],[50,16],[60,16],[50,24],[60,24],[50,32],[58,32]].map(([cx,cy]) => (
              <circle key={`m2${cx}${cy}`} cx={cx} cy={cy} r="3.5" fill="url(#mg)" />
            ))}
            {/* o2 eye */}
            <circle cx={e2.x} cy={e2.y} r="4.5" fill="url(#mk)" />

            {/* lips — 3 throbbing dots */}
            {[37, 45, 53].map((cx, i) => (
              <circle
                key={`lip${i}`}
                cx={cx} cy={43} r="2.5"
                fill="url(#mk)"
                style={{
                  animation: `lipPulse 1.4s ease-in-out ${i * 0.22}s infinite`,
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                }}
              />
            ))}
          </svg>
        </button>

        {/* ── Navigation tabs ── */}
        <nav className="flex-1 flex items-center overflow-x-auto scrollbar-none gap-1 px-2">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex-shrink-0 ${
                  isActive
                    ? 'bg-white/90 shadow-sm'
                    : 'text-white/75 hover:text-white hover:bg-white/15'
                }`
              }
              style={({ isActive }) => isActive ? { color: 'var(--theme-bg)' } : {}}
            >
              <Icon size={14} />
              <span className="hidden md:block">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── Profile ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-white text-xs font-semibold leading-tight">
              {displayName}
            </span>
          </div>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-8 h-8 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold border-2 border-white/30">
              {initial}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white transition ml-1"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </header>
  )
}
