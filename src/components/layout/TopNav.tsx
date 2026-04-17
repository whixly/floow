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

// Eye center positions — same coordinate space as LandingPage
const ME1 = { x: 231, y: 132 }
const ME2 = { x: 309, y: 132 }

function calcEye(cx: number, cy: number, tx: number, ty: number, maxR = 7) {
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

        {/* ── Logo — full floow wordmark ── */}
        <button onClick={() => navigate('/app')} className="flex items-center flex-shrink-0">
          <svg ref={miniSvgRef} viewBox="89 27 360 184" className="h-10 w-auto" style={{ borderRadius: 8 }}>
            <defs>
              <radialGradient id="mg" cx="35%" cy="30%" r="60%">
                <stop offset="0%"  stopColor="#5DCAA5" />
                <stop offset="100%" stopColor="#0F6E56" />
              </radialGradient>
              <radialGradient id="mk" cx="35%" cy="30%" r="60%">
                <stop offset="0%"  stopColor="#1D9E75" />
                <stop offset="100%" stopColor="#085041" />
              </radialGradient>
            </defs>

            {/* Dark background */}
            <rect x="89" y="27" width="360" height="184" rx="8" fill="#040a04" />

            {/* f */}
            {[[108,60],[124,48],[138,54],[108,78],[108,96],[108,114],[126,114],[142,114],[108,132],[108,150],[108,168]].map(([cx,cy]) => (
              <circle key={`f${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#mg)" />
            ))}

            {/* l */}
            {[[174,42],[174,60],[174,78],[174,96],[174,114],[174,132],[174,150],[174,168]].map(([cx,cy]) => (
              <circle key={`l${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#mg)" />
            ))}

            {/* o1 ring */}
            {[[204,96],[222,96],[240,96],[258,96],[204,114],[258,114],[204,132],[258,132],[204,150],[258,150],[204,168],[222,168],[240,168],[258,168]].map(([cx,cy]) => (
              <circle key={`o1${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#mg)" />
            ))}
            {/* o1 eye */}
            <circle cx={e1.x} cy={e1.y} r="9" fill="url(#mk)" />

            {/* o2 ring */}
            {[[282,96],[300,96],[318,96],[336,96],[282,114],[336,114],[282,132],[336,132],[282,150],[336,150],[282,168],[300,168],[318,168],[336,168]].map(([cx,cy]) => (
              <circle key={`o2${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#mg)" />
            ))}
            {/* o2 eye */}
            <circle cx={e2.x} cy={e2.y} r="9" fill="url(#mk)" />

            {/* w — no middle dots on top row */}
            {[[362,96],[434,96],[362,114],[398,114],[434,114],[362,132],[398,132],[434,132],[362,150],[380,150],[398,150],[416,150],[434,150],[362,168],[380,168],[416,168],[434,168]].map(([cx,cy]) => (
              <circle key={`w${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#mg)" />
            ))}

            {/* lips — 3 throbbing dots */}
            {[258, 270, 282].map((cx, i) => (
              <circle
                key={`lip${i}`}
                cx={cx} cy={196} r="5"
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
