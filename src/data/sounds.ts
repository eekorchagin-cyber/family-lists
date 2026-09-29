export type ConfirmSound = 'add' | 'bought' | 'clear' | 'delete' | 'family'

let audio: AudioContext | null = null

function context(): AudioContext | null {
  const Ctx =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audio) audio = new Ctx()
  if (audio.state === 'suspended') void audio.resume()
  return audio
}

function note(
  ctx: AudioContext,
  frequency: number,
  at: number,
  duration: number,
  type: OscillatorType,
  volume: number,
) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, at)
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(at)
  osc.stop(at + duration + 0.02)
}

/** Короткий «вжух»: шум, который быстро уходит вниз, как отправка письма. */
function whoosh(ctx: AudioContext, at: number) {
  const duration = 0.32
  const length = Math.floor(ctx.sampleRate * duration)
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.setValueAtTime(0.85, at)
  filter.frequency.setValueAtTime(2200, at)
  filter.frequency.exponentialRampToValueAtTime(140, at + duration)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, at)
  gain.gain.exponentialRampToValueAtTime(0.16, at + 0.04)
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start(at)
  source.stop(at + duration)
}

/** Короткий сигнал в момент нажатия. На iPhone играет после жеста пользователя. */
export function playConfirmSound(kind: ConfirmSound) {
  const ctx = context()
  if (!ctx) return
  const at = ctx.currentTime
  if (kind === 'add') {
    note(ctx, 523.25, at, 0.09, 'sine', 0.07)
    note(ctx, 659.25, at + 0.08, 0.13, 'sine', 0.06)
    return
  }
  if (kind === 'bought') {
    note(ctx, 740, at, 0.055, 'triangle', 0.05)
    return
  }
  if (kind === 'clear') {
    note(ctx, 587.33, at, 0.1, 'sine', 0.06)
    note(ctx, 440, at + 0.09, 0.16, 'sine', 0.05)
    return
  }
  if (kind === 'delete') {
    whoosh(ctx, at)
    return
  }
  note(ctx, 784, at, 0.09, 'sine', 0.07)
  note(ctx, 988, at + 0.1, 0.09, 'sine', 0.06)
  note(ctx, 1175, at + 0.2, 0.16, 'sine', 0.05)
}

if (typeof window !== 'undefined') {
  window.addEventListener(
    'pointerdown',
    () => {
      const ctx = context()
      if (ctx?.state === 'suspended') void ctx.resume()
    },
    { passive: true },
  )
}
