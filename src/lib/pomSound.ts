const FOCUS_SONGS = [
  '/sounds/focus/light_song.mp3',
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
let unlocked = false

// Call during a user-gesture (click). Plays a silent audio which tells the
// browser this page has permission to play audio automatically later.
export function unlockAudio() {
  if (unlocked) return
  // Minimal valid WAV encoded as base64 — completely silent, < 1ms
  const SILENT_WAV = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
  const a = new Audio(SILENT_WAV)
  a.volume = 0
  a.play()
    .then(() => { unlocked = true; a.pause() })
    .catch(() => {})
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
    console.warn('[pomSound] playback failed:', err)
  })
}
