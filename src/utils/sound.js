export const playSuccessBeep = async () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  const audioContext = new AudioContext()
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
  gain.gain.setValueAtTime(0.001, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.18, audioContext.currentTime + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.13)

  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start()
  oscillator.stop(audioContext.currentTime + 0.14)

  await new Promise((resolve) => {
    oscillator.onended = resolve
  })
  await audioContext.close()
}
