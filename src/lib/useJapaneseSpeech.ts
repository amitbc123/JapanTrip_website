import { useCallback, useEffect, useState } from "react"

const isSupported = typeof window !== "undefined" && "speechSynthesis" in window

function pickJapaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return voices.find((v) => v.lang === "ja-JP") ?? voices.find((v) => v.lang.toLowerCase().startsWith("ja"))
}

/** Reads Japanese text aloud with the device's own text-to-speech (Web
 *  Speech API), so it also works offline wherever the phone has a Japanese
 *  voice installed. `speakingId` tracks which item is currently playing. */
export function useJapaneseSpeech() {
  const [speakingId, setSpeakingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupported) return
    // Voices load asynchronously on some browsers (Chrome, iOS) — touching
    // the list early makes them available by the first tap.
    window.speechSynthesis.getVoices()
    return () => window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback((id: string, text: string) => {
    if (!isSupported) return
    const synth = window.speechSynthesis
    synth.cancel()
    // "..." / "/" / "[X]" are placeholders in the written phrase, not speech.
    const spoken = text.replace(/\.\.\.|…/g, "、").replace(/\s*\/\s*/g, "、").replace(/\[.*?\]/g, "")
    const utterance = new SpeechSynthesisUtterance(spoken)
    utterance.lang = "ja-JP"
    const voice = pickJapaneseVoice()
    if (voice) utterance.voice = voice
    utterance.rate = 0.85
    const done = () => setSpeakingId((current) => (current === id ? null : current))
    utterance.onend = done
    utterance.onerror = done
    setSpeakingId(id)
    synth.speak(utterance)
  }, [])

  return { isSupported, speakingId, speak }
}
