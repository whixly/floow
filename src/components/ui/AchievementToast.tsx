import { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'
import { X } from 'lucide-react'
import { subscribeAchievements, type Achievement } from '../../lib/achievement'

const TYPE_ICON: Record<string, string> = {
  task:     '✓',
  habit:    '~',
  pomodoro: '◎',
  goal:     '◈',
}

const TYPE_COLOR: Record<string, string> = {
  task:     'rgba(52,211,153,0.9)',
  habit:    'rgba(96,165,250,0.9)',
  pomodoro: 'rgba(251,191,36,0.9)',
  goal:     'rgba(167,139,250,0.9)',
}

const CONFETTI_COLORS: Record<string, string[]> = {
  task:     ['#34d399', '#6ee7b7', '#d1fae5', '#fff'],
  habit:    ['#60a5fa', '#93c5fd', '#dbeafe', '#fff'],
  pomodoro: ['#fbbf24', '#fcd34d', '#fef3c7', '#fff'],
  goal:     ['#a78bfa', '#c4b5fd', '#ede9fe', '#fff'],
}

function shoot(type: string) {
  const colors = CONFETTI_COLORS[type] ?? ['#34d399', '#fff']
  // Main burst from bottom-center
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { x: 0.5, y: 0.85 },
    colors,
    startVelocity: 45,
    gravity: 0.9,
    scalar: 1.1,
    zIndex: 99999,
  })
  // Side burst left
  setTimeout(() => confetti({
    particleCount: 40,
    angle: 60,
    spread: 50,
    origin: { x: 0, y: 0.9 },
    colors,
    startVelocity: 35,
    gravity: 0.9,
    zIndex: 99999,
  }), 80)
  // Side burst right
  setTimeout(() => confetti({
    particleCount: 40,
    angle: 120,
    spread: 50,
    origin: { x: 1, y: 0.9 },
    colors,
    startVelocity: 35,
    gravity: 0.9,
    zIndex: 99999,
  }), 80)
}

interface ToastItem extends Achievement {
  exiting: boolean
}

const DURATION = 4500  // ms before auto-dismiss

export default function AchievementToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    return subscribeAchievements((achievement) => {
      // Add toast
      setToasts(prev => [...prev, { ...achievement, exiting: false }])

      // Fire confetti
      shoot(achievement.type)

      // Start exit animation just before removal
      setTimeout(() => {
        setToasts(prev =>
          prev.map(t => t.id === achievement.id ? { ...t, exiting: true } : t)
        )
      }, DURATION - 400)

      // Remove
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== achievement.id))
      }, DURATION)
    })
  }, [])

  const dismiss = (id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t))
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 380)
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            animation: toast.exiting
              ? 'toastOut 0.38s cubic-bezier(0.4,0,1,1) forwards'
              : 'toastIn 0.38s cubic-bezier(0,0,0.2,1) forwards',
            maxWidth: 320,
          }}
        >
          <div
            className="flex items-start gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-sm"
            style={{
              background: 'rgba(10,15,30,0.88)',
              border: `1px solid ${TYPE_COLOR[toast.type]}`,
              boxShadow: `0 0 24px ${TYPE_COLOR[toast.type]}40`,
            }}
          >
            {/* Icon badge */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black flex-shrink-0 mt-0.5"
              style={{ background: `${TYPE_COLOR[toast.type]}25`, color: TYPE_COLOR[toast.type] }}
            >
              {TYPE_ICON[toast.type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: TYPE_COLOR[toast.type] }}>
                Achievement Unlocked
              </p>
              <p className="text-sm text-white/90 leading-snug font-medium">
                {toast.message}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => dismiss(toast.id)}
              className="text-white/30 hover:text-white/70 transition flex-shrink-0 mt-0.5"
            >
              <X size={13} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-[2px] rounded-full mt-0.5 mx-1 overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full"
              style={{
                background: TYPE_COLOR[toast.type],
                animation: `toastProgress ${DURATION}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ))}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(110%) scale(0.9); }
          to   { opacity: 1; transform: translateX(0)   scale(1);   }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0)   scale(1);   }
          to   { opacity: 0; transform: translateX(110%) scale(0.9); }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  )
}
