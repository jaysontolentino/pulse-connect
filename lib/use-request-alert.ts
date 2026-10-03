import { useCallback, useRef } from "react";

const VIBRATION_PATTERN = [120, 80, 120];
// Two quiet rising notes, so it reads as a chime rather than a ringtone.
const NOTES_HZ = [660, 880];
const NOTE_GAP_S = 0.14;
const NOTE_LENGTH_S = 0.35;
const PEAK_GAIN = 0.08;

/** Plays a soft tone and vibrates when a connection or video request arrives. */
export function useRequestAlert() {
  const ctxRef = useRef<AudioContext | null>(null);

  // Browsers only allow audio after a user gesture, and Safari requires the
  // context to be created or resumed inside the gesture handler itself.
  const unlock = useCallback(() => {
    ctxRef.current ??= new AudioContext();
    void ctxRef.current.resume().catch(() => {});
  }, []);

  const play = useCallback(() => {
    navigator.vibrate?.(VIBRATION_PATTERN);

    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});

    NOTES_HZ.forEach((hz, i) => {
      const start = ctx.currentTime + i * NOTE_GAP_S;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = hz;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + NOTE_LENGTH_S);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + NOTE_LENGTH_S);
    });
  }, []);

  return { unlock, play };
}
