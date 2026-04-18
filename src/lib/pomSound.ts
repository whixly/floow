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

// Shuffle queues — refilled once all songs have played
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

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

// iOS: must reuse the single element that was unlocked during the user gesture.
// Android/Desktop: creating a new Audio() after any user interaction works fine —
// calling load() on a reused element breaks playback on Android Chrome.
let iosAudioEl: HTMLAudioElement | null = null
let currentEl: HTMLAudioElement | null = null

export function unlockAudio() {
  if (!isIOS) return
  if (iosAudioEl) return
  iosAudioEl = new Audio(FOCUS_SONGS[0])
  iosAudioEl.volume = 0
  iosAudioEl.play()
    .then(() => { iosAudioEl!.pause(); iosAudioEl!.currentTime = 0; iosAudioEl!.volume = 1 })
    .catch(() => { if (iosAudioEl) iosAudioEl.volume = 1 })
}

export function playPomSound(completedMode: 'work' | 'short_break' | 'long_break') {
  const pick = pickNext(completedMode === 'work')

  if (isIOS && iosAudioEl) {
    // iOS: swap src on the already-unlocked element
    iosAudioEl.pause()
    iosAudioEl.src = pick
    iosAudioEl.load()
    iosAudioEl.volume = 1
    iosAudioEl.play().catch(err => console.warn('[pomSound] iOS playback failed:', err))
  } else {
    // Android + Desktop: fresh element per play — no load() issues
    if (currentEl) { currentEl.pause(); currentEl.currentTime = 0 }
    currentEl = new Audio(pick)
    currentEl.volume = 1
    currentEl.play().catch(err => console.warn('[pomSound] playback failed:', err))
  }
}
