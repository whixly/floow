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

// Pre-created elements — iOS requires play() to be called on the SAME element
// that was unlocked during a user gesture. We unlock all of them upfront.
let pool: { focus: HTMLAudioElement[]; break: HTMLAudioElement[] } | null = null
let currentAudio: HTMLAudioElement | null = null

// Call during a user-gesture (play button click).
// Silently plays-then-pauses every song element so iOS marks them all as unlocked.
export function unlockAudio() {
  if (pool) return
  const makeEl = (src: string) => {
    const a = new Audio(src)
    a.volume = 0
    // play() during user gesture unlocks the element on iOS
    a.play()
      .then(() => { a.pause(); a.currentTime = 0; a.volume = 1 })
      .catch(() => { a.volume = 1 })
    return a
  }
  pool = {
    focus: FOCUS_SONGS.map(makeEl),
    break: BREAK_SONGS.map(makeEl),
  }
}

export function playPomSound(completedMode: 'work' | 'short_break' | 'long_break') {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }

  if (pool) {
    // Reuse the pre-unlocked element — required for iOS autoplay
    const list = completedMode === 'work' ? pool.focus : pool.break
    const audio = list[Math.floor(Math.random() * list.length)]
    audio.currentTime = 0
    audio.volume = 1
    currentAudio = audio
    audio.play().catch((err) => {
      console.warn('[pomSound] playback failed:', err)
    })
  } else {
    // Fallback for desktop when unlockAudio was skipped
    const songs = completedMode === 'work' ? FOCUS_SONGS : BREAK_SONGS
    const audio = new Audio(songs[Math.floor(Math.random() * songs.length)])
    currentAudio = audio
    audio.play().catch((err) => {
      console.warn('[pomSound] playback failed:', err)
    })
  }
}
