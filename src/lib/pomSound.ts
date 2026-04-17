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

export function playPomSound(completedMode: 'work' | 'short_break' | 'long_break') {
  const songs = completedMode === 'work' ? FOCUS_SONGS : BREAK_SONGS
  const src = songs[Math.floor(Math.random() * songs.length)]

  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }

  const audio = new Audio(src)
  currentAudio = audio
  audio.play().catch(() => {})
}
