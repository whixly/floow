import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

function calcEye(cx: number, cy: number, tx: number, ty: number, maxR = 7) {
  const dx = tx - cx
  const dy = ty - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 1) return { x: cx, y: cy }
  const r = Math.min(maxR, dist)
  return { x: cx + (dx / dist) * r, y: cy + (dy / dist) * r }
}

// Eye base centers in SVG viewBox (0 0 680 250)
const E1 = { x: 231, y: 132 }
const E2 = { x: 309, y: 132 }

export default function LandingPage() {
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const [e1, setE1] = useState(E1)
  const [e2, setE2] = useState(E2)
  const [hoverLips, setHoverLips] = useState(false)

  useEffect(() => {
    // Desktop: mouse tracking
    const onMouse = (ev: MouseEvent) => {
      const svg = svgRef.current
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = ev.clientX; pt.y = ev.clientY
      const ctm = svg.getScreenCTM()
      if (!ctm) return
      const { x, y } = pt.matrixTransform(ctm.inverse())
      setE1(calcEye(E1.x, E1.y, x, y))
      setE2(calcEye(E2.x, E2.y, x, y))
    }
    // Mobile: device tilt
    const onTilt = (ev: DeviceOrientationEvent) => {
      const gx = Math.max(-45, Math.min(45, ev.gamma ?? 0))
      const gy = Math.max(-45, Math.min(45, (ev.beta ?? 45) - 45))
      const dx = (gx / 45) * 7
      const dy = (gy / 45) * 7
      setE1({ x: E1.x + dx, y: E1.y + dy })
      setE2({ x: E2.x + dx, y: E2.y + dy })
    }
    window.addEventListener('mousemove', onMouse)
    window.addEventListener('deviceorientation', onTilt)
    return () => {
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('deviceorientation', onTilt)
    }
  }, [])

  return (
    <div className="min-h-screen t-bg flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 rounded-full bg-white/5 -top-20 -left-20 blur-3xl" />
        <div className="absolute w-80 h-80 rounded-full bg-white/5 bottom-10 right-10 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-6 px-4">
        {/* Tagline above */}
        <p className="text-white/50 text-sm tracking-widest uppercase font-medium">
          Focus. Level up. Optimize. Overcome. Win.
        </p>

        {/* Main SVG Logo */}
        <svg
          ref={svgRef}
          viewBox="80 36 370 180"
          className="w-full max-w-sm sm:max-w-md md:max-w-lg"
          style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.18))' }}
        >
          <defs>
            <radialGradient id="lg" cx="35%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#d1fae5" />
              <stop offset="100%" stopColor="#059669" />
            </radialGradient>
            <radialGradient id="lk" cx="35%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#ecfdf5" />
              <stop offset="100%" stopColor="#34d399" />
            </radialGradient>
          </defs>

          {/* ── f ── */}
          {[[108,60],[124,48],[138,54],[108,78],[108,96],[108,114],[126,114],[142,114],[108,132],[108,150],[108,168]].map(([cx,cy]) => (
            <circle key={`f${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#lg)" />
          ))}

          {/* ── l ── */}
          {[[174,42],[174,60],[174,78],[174,96],[174,114],[174,132],[174,150],[174,168]].map(([cx,cy]) => (
            <circle key={`l${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#lg)" />
          ))}

          {/* ── o1 (outer ring) ── */}
          {[[204,96],[222,96],[240,96],[258,96],[204,114],[258,114],[204,132],[258,132],[204,150],[258,150],[204,168],[222,168],[240,168],[258,168]].map(([cx,cy]) => (
            <circle key={`o1${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#lg)" />
          ))}
          {/* o1 eye — dynamic */}
          <circle cx={e1.x} cy={e1.y} r="9" fill="url(#lk)" style={{ transition: 'cx 0.05s, cy 0.05s' }} />

          {/* ── o2 (outer ring) ── */}
          {[[282,96],[300,96],[318,96],[336,96],[282,114],[336,114],[282,132],[336,132],[282,150],[336,150],[282,168],[300,168],[318,168],[336,168]].map(([cx,cy]) => (
            <circle key={`o2${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#lg)" />
          ))}
          {/* o2 eye — dynamic */}
          <circle cx={e2.x} cy={e2.y} r="9" fill="url(#lk)" style={{ transition: 'cx 0.05s, cy 0.05s' }} />

          {/* ── w ── */}
          {[[366,96],[420,96],[366,114],[420,114],[366,132],[393,132],[420,132],[366,150],[379,150],[393,150],[407,150],[420,150],[372,168],[393,168],[414,168]].map(([cx,cy]) => (
            <circle key={`w${cx}${cy}`} cx={cx} cy={cy} r="7" fill="url(#lg)" />
          ))}

          {/* ── Lips — throbbing, clickable ── */}
          <g
            onClick={() => navigate('/auth')}
            onMouseEnter={() => setHoverLips(true)}
            onMouseLeave={() => setHoverLips(false)}
            style={{ cursor: 'pointer' }}
          >
            {/* Invisible wider hit area */}
            <rect x="244" y="183" width="52" height="26" fill="transparent" rx="13" />
            {[258, 270, 282].map((cx, i) => (
              <circle
                key={`lip${i}`}
                cx={cx} cy={196} r={hoverLips ? 7 : 5}
                fill="url(#lk)"
                style={{
                  animation: `lipPulse 1.4s ease-in-out ${i * 0.22}s infinite`,
                  transformBox: 'fill-box',
                  transformOrigin: 'center',
                  transition: 'r 0.2s',
                }}
              />
            ))}
          </g>
        </svg>

        {/* CTA hint */}
        <div
          onClick={() => navigate('/auth')}
          className="flex flex-col items-center gap-2 cursor-pointer group"
        >
          <p className="text-white/60 text-sm group-hover:text-white/90 transition-colors">
            tap the lips to get started
          </p>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white/40 group-hover:bg-white/80 transition-colors"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lipPulse {
          0%, 100% { transform: scale(1); opacity: 0.65; }
          50%       { transform: scale(1.6); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
