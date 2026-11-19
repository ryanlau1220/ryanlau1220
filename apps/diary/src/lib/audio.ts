/**
 * Procedural sound for the diary: a warm ambient bed (soft pad, drifting air, candle crackle)
 * and small effects. Everything is synthesized with Web Audio, so there are no files to load.
 * Audio starts only after the visitor's first gesture, as browsers require.
 */

export type DiarySound = "click" | "open" | "page" | "chime" | "close";

const STORAGE_KEY = "diary:sound:v1";

class DiaryAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private crackleTimer: number | null = null;
  private enabled = true;
  private listeners = new Set<(enabled: boolean) => void>();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        this.enabled = window.localStorage.getItem(STORAGE_KEY) !== "off";
      } catch {
        this.enabled = true;
      }
    }
  }

  get isEnabled() {
    return this.enabled;
  }

  subscribe(listener: (enabled: boolean) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.context) {
      const Context =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.context.destination);
      this.noise = this.createNoise(this.context);
      this.startAmbience();
    }
    if (this.context.state === "suspended") void this.context.resume();
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // Sound still toggles for this visit without storage.
    }
    if (enabled) this.unlock();
    if (this.context && this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(enabled ? 0.9 : 0, this.context.currentTime, 0.25);
    }
    for (const listener of this.listeners) listener(enabled);
  }

  play(sound: DiarySound) {
    const context = this.context;
    if (!(context && this.master && this.enabled)) return;
    const now = context.currentTime;
    switch (sound) {
      case "click":
        this.tone(220, 0.12, 0.18, "triangle", now);
        this.burst(now, 0.03, 2600, 0.12);
        break;
      case "close":
        this.tone(150, 0.25, 0.22, "sine", now);
        this.burst(now, 0.08, 900, 0.15);
        break;
      case "open":
        this.tone(90, 0.6, 0.3, "sine", now);
        this.sweep(now + 0.05, 0.9, 400, 1800, 0.12);
        break;
      case "page":
        this.sweep(now, 0.45, 900, 3800, 0.16);
        break;
      case "chime":
        [1318.5, 1975.5, 2637].forEach((frequency, index) => {
          this.tone(frequency, 2.4, 0.05, "sine", now + index * 0.12);
        });
        break;
    }
  }

  private createNoise(context: AudioContext) {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let index = 0; index < data.length; index++) {
      brown = (brown + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[index] = brown * 3.5;
    }
    return buffer;
  }

  private startAmbience() {
    const context = this.context!;
    this.ambience = context.createGain();
    this.ambience.gain.value = 0;
    this.ambience.gain.setTargetAtTime(1, context.currentTime, 2.5);
    this.ambience.connect(this.master!);

    // Soft pad: an open fifth with a gentle third, slowly breathing.
    const padFilter = context.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 900;
    const padGain = context.createGain();
    padGain.gain.value = 0.018;
    padFilter.connect(padGain).connect(this.ambience);
    [110, 164.81, 277.18, 220.5].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 3 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = (index - 1.5) * 4;
      oscillator.connect(padFilter);
      oscillator.start();
    });
    const lfo = context.createOscillator();
    const lfoDepth = context.createGain();
    lfo.frequency.value = 0.07;
    lfoDepth.gain.value = 0.009;
    lfo.connect(lfoDepth).connect(padGain.gain);
    lfo.start();

    // Drifting air through the room.
    const air = context.createBufferSource();
    air.buffer = this.noise;
    air.loop = true;
    const airFilter = context.createBiquadFilter();
    airFilter.type = "bandpass";
    airFilter.frequency.value = 500;
    airFilter.Q.value = 0.6;
    const airGain = context.createGain();
    airGain.gain.value = 0.05;
    air.connect(airFilter).connect(airGain).connect(this.ambience);
    air.start();
    const airLfo = context.createOscillator();
    const airDepth = context.createGain();
    airLfo.frequency.value = 0.05;
    airDepth.gain.value = 260;
    airLfo.connect(airDepth).connect(airFilter.frequency);
    airLfo.start();

    const crackle = () => {
      if (this.context && this.enabled) {
        const at = this.context.currentTime;
        const pops = 1 + Math.floor(Math.random() * 3);
        for (let index = 0; index < pops; index++) {
          this.burst(
            at + Math.random() * 0.25,
            0.012 + Math.random() * 0.02,
            2200 + Math.random() * 2500,
            0.05,
            this.ambience!,
          );
        }
      }
      this.crackleTimer = window.setTimeout(crackle, 350 + Math.random() * 1400);
    };
    crackle();
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    at: number,
  ) {
    const context = this.context!;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain).connect(this.master!);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  }

  private burst(
    at: number,
    duration: number,
    frequency: number,
    volume: number,
    destination?: AudioNode,
  ) {
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 1.4;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source
      .connect(filter)
      .connect(gain)
      .connect(destination ?? this.master!);
    source.start(at, Math.random() * 1.5, duration + 0.02);
  }

  private sweep(at: number, duration: number, from: number, to: number, volume: number) {
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(to, at + duration * 0.6);
    filter.frequency.exponentialRampToValueAtTime(from, at + duration);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + duration * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter).connect(gain).connect(this.master!);
    source.start(at, Math.random(), duration + 0.05);
  }

  dispose() {
    if (this.crackleTimer !== null) window.clearTimeout(this.crackleTimer);
    void this.context?.close();
    this.context = null;
  }
}

let instance: DiaryAudio | null = null;

export function getDiaryAudio() {
  instance ??= new DiaryAudio();
  return instance;
}
