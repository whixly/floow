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

// One persistent element — iOS keeps it unlocked as long as we reuse the same instance.
// Swapping .src on an already-unlocked element works fine on iOS Safari.
let audioEl: HTMLAudioElement | null = null

// Call on the play button tap (user gesture).
export function unlockAudio() {
  if (audioEl) return
  audioEl = new Audio(FOCUS_SONGS[0])
  audioEl.volume = 0
  audioEl.play()
    .then(() => { audioEl!.pause(); audioEl!.currentTime = 0; audioEl!.volume = 1 })
    .catch(() => { if (audioEl) audioEl.volume = 1 })
}

export function playPomSound(completedMode: 'work' | 'short_break' | 'long_break') {
  const songs = completedMode === 'work' ? FOCUS_SONGS : BREAK_SONGS
  const pick = songs[Math.floor(Math.random() * songs.length)]

  if (audioEl) {
    // Reuse the unlocked element — swap source then load() so browser fetches the new file
    audioEl.pause()
    audioEl.src = pick
    audioEl.load()
    audioEl.volume = 1
    audioEl.play().catch((err) => console.warn('[pomSound] playback failed:', err))
  } else {
    // Desktop fallback (no gesture needed)
    audioEl = new Audio(pick)
    audioEl.play().catch((err) => console.warn('[pomSound] playback failed:', err))
  }
}
