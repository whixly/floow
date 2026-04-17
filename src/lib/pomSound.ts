const FOCUS_SONGS = [
  '/sounds/focus/light song.mp3',
  '/sounds/focus/pirates_of_carribean.mp3',
  '/sounds/focus/star_wars_theme.mp3',
  '/sounds/focus/f1_theme.mp3',
  '/sounds/focus/wall_e.mp3',
]

const BREAK_SONGS = [
  '/sounds/break/jarvis_alarm.mp3',
  '/sounds/break/ddu_ddu_max_verstappen.mp3',
  '/sounds/break/barney_theme.mp3',
  '/sounds/break/avengers.mp3',
]

let currentAudio: HTMLAudioElement | null = null
let audioCtx: AudioContext | null = null

// Call this inside a user-gesture handler (e.g. clicking Start).
// Browsers block autoplay unless an AudioContext was resumed during a gesture.
export function unlockAudio() {
  if (audioCtx) return
  try {
    audioCtx = new AudioContext()
    // Resume immediately so the context is active for later programmatic plays
    if (audioCtx.state === 'suspended') audioCtx.resume()
    // Play a silent 0.01s buffer to fully unlock the audio pipeline
    const buf = audioCtx.createBuffer(1, 1, 22050)
    const src = audioCtx.createBufferSource()
    src.buffer = buf
    src.connect(audioCtx.destination)
    src.start(0)
  } catch {
    // AudioContext not supported — fall back gracefully
  }
}

export function playPomSound(completedMode: 'work' | 'short_break' | 'long_break') {
  const songs = completedMode === 'work' ? FOCUS_SONGS : BREAK_SONGS
  const pick = songs[Math.floor(Math.random() * songs.length)]

  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }

  const audio = new Audio(pick)
  currentAudio = audio
  audio.play().catch((err) => {
    console.warn('Pomodoro sound blocked:', err)
  })
}
