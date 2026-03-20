import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

type MaybeAudioContext = AudioContext | null;

const MIN_BPM = 20;
const MAX_BPM = 300;


function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function App() {
  const [numeratorText, setNumeratorText] = useState('4');
  const [denominatorText, setDenominatorText] = useState('4');
  const [bpmText, setBpmText] = useState('120');
  const [isRunning, setIsRunning] = useState(false);
  const [isGreen, setIsGreen] = useState(false);
  const [beatInBar, setBeatInBar] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const numerator = useMemo(() => sanitizePositiveInteger(numeratorText, 4), [numeratorText]);
  const denominator = useMemo(() => sanitizePositiveInteger(denominatorText, 4), [denominatorText]);
  const bpm = useMemo(() => clamp(sanitizePositiveInteger(bpmText, 120), MIN_BPM, MAX_BPM), [bpmText]);

  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<MaybeAudioContext>(null);
  const beatCounterRef = useRef(0);

  useEffect(() => {
    return () => {
      stopMetronome();
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    stopTimerOnly();
    startTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm, numerator, isRunning]);

  function ensureAudioContext(): MaybeAudioContext {
    if (typeof window === 'undefined') {
      return null;
    }

    if (!audioContextRef.current) {
      const AudioCtx =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtx) {
        return null;
      }

      audioContextRef.current = new AudioCtx();
    }

    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }

  function playClick(isBarStart: boolean): void {
    if (!audioEnabled) {
      return;
    }

    const audioContext = ensureAudioContext();
    if (!audioContext) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = 'square';
    oscillator.frequency.value = isBarStart ? 1320 : 920;

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  function triggerBeat(): void {
    const currentBeat = (beatCounterRef.current % numerator) + 1;
    const isBarStart = currentBeat === 1;

    setBeatInBar(currentBeat);
    
    playClick(isBarStart);

    setIsGreen((prev) => !prev);
    
    beatCounterRef.current += 1;
  }

  function stopTimerOnly(): void {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function stopMetronome(): void {
    stopTimerOnly();
    setIsRunning(false);
    setBeatInBar(1);
    beatCounterRef.current = 0;
  }

  function startTimer(): void {
    const intervalMs = 60000 / bpm;
    triggerBeat();
    intervalRef.current = window.setInterval(triggerBeat, intervalMs);
  }

  function handleStart(): void {
    beatCounterRef.current = 0;
    setIsRunning(true);
    ensureAudioContext();
  }

  function handleBpmStep(delta: number): void {
    const nextBpm = clamp(bpm + delta, MIN_BPM, MAX_BPM);
    setBpmText(String(nextBpm));
  }

  function handleNumberInput(
    setter: (value: string) => void,
    event: ChangeEvent<HTMLInputElement>
  ): void {
    const cleaned = event.target.value.replace(/[^0-9]/g, '');
    setter(cleaned);
  }

  function handleBpmBlur(): void {
    setBpmText(String(bpm));
  }

  function handleNumeratorBlur(): void {
    setNumeratorText(String(numerator));
  }

  function handleDenominatorBlur(): void {
    setDenominatorText(String(denominator));
  }

  return (
    <main className="app-shell">
      <section className="card">
        <div className="title-block">
          <h1>Metrognome</h1>
        </div>

        <div className="control-group">
          <label htmlFor="numerator">Time signature</label>
          <div className="time-signature-row">
            <input
              id="numerator"
              inputMode="numeric"
              pattern="[0-9]*"
              value={numeratorText}
              onChange={(event) => handleNumberInput(setNumeratorText, event)}
              onBlur={handleNumeratorBlur}
              aria-label="Time signature top number"
            />
            <span>/</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={denominatorText}
              onChange={(event) => handleNumberInput(setDenominatorText, event)}
              onBlur={handleDenominatorBlur}
              aria-label="Time signature bottom number"
            />
          </div>
        </div>

        <div className="control-group">
          <label htmlFor="bpm">Tempo (BPM)</label>
          <div className="tempo-row">
            <button type="button" onClick={() => handleBpmStep(-1)} aria-label="Decrease BPM">
              −
            </button>
            <input
              id="bpm"
              inputMode="numeric"
              pattern="[0-9]*"
              value={bpmText}
              onChange={(event) => handleNumberInput(setBpmText, event)}
              onBlur={handleBpmBlur}
              aria-label="Tempo in beats per minute"
            />
            <button type="button" onClick={() => handleBpmStep(1)} aria-label="Increase BPM">
              +
            </button>
          </div>
        </div>

        <div className="pulse-wrapper" aria-live="polite">
          <div className={`pulse-box ${isGreen ? 'green' : 'white'}`}>
            <span>{isRunning ? `Beat ${beatInBar}` : 'Ready'}</span>
          </div>
        </div>

        <div className="info-row">
          <div>
            <span className="info-label">Current</span>
            <strong>
              {numerator}/{denominator}
            </strong>
          </div>
          <div>
            <span className="info-label">BPM</span>
            <strong>{bpm}</strong>
          </div>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={audioEnabled}
            onChange={() => setAudioEnabled((current) => !current)}
          />
          <span>Audio click enabled</span>
        </label>

        <div className="action-row">
          <button type="button" className="primary" onClick={handleStart} disabled={isRunning}>
            Start
          </button>
          <button type="button" className="secondary" onClick={stopMetronome} disabled={!isRunning}>
            Stop
          </button>
        </div>
      </section>
    </main>
  );
}

export default App;
