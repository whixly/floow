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

// Shuffle queues — refilled once all songs have played (no repeats until exhausted)
let focusQueue: string[] = []
let breakQueue: string[] = []

function shuffle(arr: string[]): string[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickNext(isWork: boolean): string {
  if (isWork) {
    if (focusQueue.length === 0) focusQueue = shuffle(FOCUS_SONGS)
    return focusQueue.pop()!
  } else {
    if (breakQueue.length === 0) breakQueue = shuffle(BREAK_SONGS)
    return breakQueue.pop()!
  }
}

// One persistent element — iOS keeps it unlocked as long as we reuse the same instance.
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
  const pick = pickNext(completedMode === 'work')

  if (audioEl) {
    audioEl.pause()
    audioEl.src = pick
    audioEl.load()
    audioEl.volume = 1
    audioEl.play().catch((err) => console.warn('[pomSound] playback failed:', err))
  } else {
    audioEl = new Audio(pick)
    audioEl.play().catch((err) => console.warn('[pomSound] playback failed:', err))
  }
}
