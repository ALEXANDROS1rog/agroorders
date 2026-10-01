export function speakGreek(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return false;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.lang = "el-GR";
  utterance.rate = 0.9;
  utterance.pitch = 1;

  const voices = window.speechSynthesis.getVoices();

  const greekVoice = voices.find((voice) =>
    voice.lang.toLowerCase().startsWith("el"),
  );

  if (greekVoice) {
    utterance.voice = greekVoice;
  }

  window.speechSynthesis.speak(utterance);

  return true;
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
