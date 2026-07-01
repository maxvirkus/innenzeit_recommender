import { useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise, InstructionStep, NarrationLine } from '../domain/types';
import { NARRATION } from '../data/narration';
import { describeCaution } from '../domain/caution';

interface Props {
  exercise: Exercise;
}

/**
 * Playback speed for the pre-generated narration. Slightly below 1.0 for a
 * calmer, less rushed delivery. Pitch is preserved (`preservesPitch`). Line and
 * word highlighting use the audio's *media* time, so they stay in sync
 * regardless of the rate; the experience clock converts media time to real
 * seconds via this factor.
 */
const SPEECH_RATE = 0.92;

function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return `${m}:${rest.toString().padStart(2, '0')}`;
}

/** Splits an instruction block into individual sentences ("lines"). */
function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["“”»]?/g);
  const trimmed = (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
  return trimmed.length > 0 ? trimmed : [text.trim()];
}

/**
 * Builds line-level timing. If pre-generated narration exists for the practice,
 * its exact per-line timestamps are used. Otherwise each instruction block is
 * split into sentences and the block's duration is distributed across them by
 * character length (an estimate until real audio is generated).
 */
function buildLines(
  exercise: Exercise,
  narrationLines: NarrationLine[] | null,
): NarrationLine[] {
  if (narrationLines && narrationLines.length > 0) return narrationLines;

  const lines: NarrationLine[] = [];
  let offset = 0;
  for (const step of exercise.instructions as InstructionStep[]) {
    const sentences = splitSentences(step.text);
    const totalChars = sentences.reduce((a, s) => a + s.length, 0) || 1;
    let cursor = offset;
    sentences.forEach((sentence, idx) => {
      const isLast = idx === sentences.length - 1;
      const end = isLast
        ? offset + step.durationSeconds
        : cursor + step.durationSeconds * (sentence.length / totalChars);
      lines.push({ text: sentence, startSeconds: cursor, endSeconds: end });
      cursor = end;
    });
    offset += step.durationSeconds;
  }
  return lines;
}

/**
 * One instruction step mapped onto the continuous narration audio, plus the
 * silence to insert after it so the step occupies its intended duration.
 * All experience-time fields are in real seconds (media time divided by the
 * playback rate).
 */
interface StepSegment {
  /** Media-time offset in the audio where this step's speech starts. */
  audioStart: number;
  /** Media-time offset in the audio where this step's speech ends. */
  audioEnd: number;
  /** Real spoken length of the step (media length / SPEECH_RATE). */
  speakReal: number;
  /** Silence inserted after the step so it lasts its intended duration. */
  pauseAfter: number;
  /** Experience-time offset (real seconds) where this step's speech begins. */
  expStart: number;
}

interface Schedule {
  segments: StepSegment[];
  /** Step index for each narration line. */
  lineStep: number[];
  /** Total intended experience length in real seconds. */
  expTotal: number;
}

/**
 * Builds the pause schedule for pre-generated narration: real guided meditations
 * leave long silences, but a raw TTS track only contains the spoken words. Each
 * instruction step is padded with trailing silence so it lasts its intended
 * `durationSeconds`, stretching the session to the full designed length while
 * keeping word/line highlighting synced to the (continuous) audio.
 */
function buildSchedule(
  exercise: Exercise,
  lines: NarrationLine[],
  rate: number,
): Schedule | null {
  const steps = exercise.instructions as InstructionStep[];
  const counts = steps.map((s) => splitSentences(s.text).length);
  const totalCount = counts.reduce((a, b) => a + b, 0);
  // Safety: if the sentence split no longer matches the generated lines, skip
  // pause scheduling and fall back to plain continuous playback.
  if (totalCount !== lines.length) return null;

  const segments: StepSegment[] = [];
  const lineStep: number[] = [];
  let li = 0;
  let expCursor = 0;

  steps.forEach((step, k) => {
    const i0 = li;
    const i1 = li + counts[k];
    for (let i = i0; i < i1; i++) lineStep[i] = k;
    const audioStart = lines[i0].startSeconds;
    const audioEnd = lines[i1 - 1].endSeconds;
    const speakReal = Math.max(0, (audioEnd - audioStart) / rate);
    const pauseAfter = Math.max(0, step.durationSeconds - speakReal);
    segments.push({ audioStart, audioEnd, speakReal, pauseAfter, expStart: expCursor });
    expCursor += speakReal + pauseAfter;
    li = i1;
  });

  return { segments, lineStep, expTotal: expCursor };
}

function pickGermanVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const german = voices.filter((v) => v.lang.toLowerCase().startsWith('de'));
  if (german.length === 0) return null;
  const rank = (v: SpeechSynthesisVoice) => {
    const name = v.name.toLowerCase();
    let score = 0;
    if (v.lang.toLowerCase() === 'de-de') score += 1;
    if (/enhanced|premium|neural|natural/.test(name)) score += 5;
    if (/siri/.test(name)) score += 4;
    if (/google/.test(name)) score += 3;
    if (!v.localService) score += 1;
    return score;
  };
  return [...german].sort((a, b) => rank(b) - rank(a))[0];
}

export function ExercisePlayer({ exercise }: Props) {
  const narration = NARRATION[exercise.id] ?? null;
  const hasAudio = narration != null;
  const caution = describeCaution(exercise);

  const lines = useMemo(
    () => buildLines(exercise, narration?.lines ?? null),
    [exercise, narration],
  );
  // Pause schedule (audio mode only): stretches the session to its full
  // designed length by inserting silence between guidance steps.
  const schedule = useMemo(
    () => (hasAudio ? buildSchedule(exercise, lines, SPEECH_RATE) : null),
    [hasAudio, exercise, lines],
  );
  const totalSeconds = schedule
    ? schedule.expTotal
    : narration?.durationSeconds ?? exercise.durationMinutes * 60;

  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsed, setElapsed] = useState(0); // experience seconds (real time)
  const [audioTime, setAudioTime] = useState(0); // media time (drives highlight)
  // Voice preview only matters in the fallback (no pre-generated audio) mode.
  const [voiceOn, setVoiceOn] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const spokenLineRef = useRef<number>(-1);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Which step's speech is currently playing (index into schedule.segments).
  const curStepRef = useRef(0);
  // Active inserted-silence phase, if any.
  const pauseRef = useRef<{ startAt: number; durMs: number; expBase: number; stepIndex: number } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const progressBarRef = useRef<HTMLDivElement>(null);
  // Mirror of the experience time, so the fallback timer and direct progress-bar
  // painting don't depend on the (batched) `elapsed` state.
  const expRef = useRef(0);

  /**
   * Single source of truth for advancing the experience clock: updates the
   * `elapsed` state (for the time label / aria) and paints the progress bar
   * directly via a ref, so the bar moves smoothly every frame regardless of how
   * React batches the surrounding re-renders.
   */
  function applyExp(expNow: number) {
    expRef.current = expNow;
    setElapsed(expNow);
    const bar = progressBarRef.current;
    if (bar) {
      const pct = totalSeconds > 0 ? (expNow / totalSeconds) * 100 : 0;
      bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }
  }

  const speechSupported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;
  const useBrowserVoice = !hasAudio && speechSupported;

  // Load and remember the best German voice (fallback mode only).
  useEffect(() => {
    if (!useBrowserVoice) return;
    const synth = window.speechSynthesis;
    const load = () => {
      const v = pickGermanVoice(synth.getVoices());
      if (v) voiceRef.current = v;
    };
    load();
    synth.addEventListener('voiceschanged', load);
    return () => synth.removeEventListener('voiceschanged', load);
  }, [useBrowserVoice]);

  // In audio mode, line/word highlighting follows the media (audio) time; in
  // fallback mode the estimated line timeline is the experience timeline.
  const highlightTime = hasAudio ? audioTime : elapsed;

  // The line whose [start, end) interval contains the current time. During an
  // inserted pause (audio frozen at a step's end) the last spoken line stays
  // active, so the lyrics don't jump back to the top.
  const activeIndex = useMemo(() => {
    if (finished) return lines.length - 1;
    const t = highlightTime;
    let idx = lines.findIndex((l) => t >= l.startSeconds && t < l.endSeconds);
    if (idx === -1) {
      for (let i = lines.length - 1; i >= 0; i--) {
        if (t >= lines[i].startSeconds) {
          idx = i;
          break;
        }
      }
    }
    return idx === -1 ? 0 : idx;
  }, [highlightTime, finished, lines]);

  const activeLine = lines[activeIndex];
  const started = running || finished || elapsed > 0;

  // Within the active line, the index of the word currently being spoken.
  // Only available when the line carries per-word timings (real audio).
  const activeWordIndex = useMemo(() => {
    const words = activeLine?.words;
    if (!started || !words || words.length === 0) return -1;
    for (let i = words.length - 1; i >= 0; i--) {
      if (highlightTime >= words[i].startSeconds) return i;
    }
    return -1;
  }, [activeLine, highlightTime, started]);

  function speak(text: string) {
    if (!speechSupported) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voiceRef.current?.lang ?? 'de-DE';
    if (voiceRef.current) utter.voice = voiceRef.current;
    utter.rate = 0.9;
    synth.speak(utter);
  }

  function stopSpeaking() {
    if (speechSupported) window.speechSynthesis.cancel();
  }

  // Keep the active line vertically centered, lyrics-app style.
  useEffect(() => {
    const vp = viewportRef.current;
    const line = lineRefs.current[activeIndex];
    if (!vp || !line) return;
    const target = line.offsetTop - vp.clientHeight / 2 + line.clientHeight / 2;
    vp.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [activeIndex]);

  // Apply the calmer playback rate whenever the audio element is (re)mounted.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = SPEECH_RATE;
    (a as HTMLAudioElement & { preservesPitch?: boolean }).preservesPitch = true;
  }, [hasAudio]);

  // Initialise / re-sync the progress bar width on mount and when the practice
  // (and thus the total length) changes. During playback the tick keeps it
  // updated directly via the ref.
  useEffect(() => {
    const bar = progressBarRef.current;
    if (!bar) return;
    const pct = totalSeconds > 0 ? (expRef.current / totalSeconds) * 100 : 0;
    bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }, [totalSeconds, exercise.id]);

  // Clock. Three modes:
  //  1. audio + schedule: play speech, then pause the audio for the inserted
  //     silence between steps, so the session lasts its full designed length.
  //  2. audio without schedule: plain continuous playback.
  //  3. fallback (no audio): a manual timer over the estimated line timeline.
  useEffect(() => {
    if (!running) return;
    const audio = audioRef.current;

    const tick = (now: number) => {
      if (hasAudio && audio && schedule) {
        const pause = pauseRef.current;
        if (pause) {
          const inPause = now - pause.startAt;
          if (inPause >= pause.durMs) {
            pauseRef.current = null;
            const nextStep = pause.stepIndex + 1;
            if (nextStep >= schedule.segments.length) {
              applyExp(schedule.expTotal);
              setRunning(false);
              setFinished(true);
              return;
            }
            curStepRef.current = nextStep;
            applyExp(schedule.segments[nextStep].expStart);
            void audio.play();
          } else {
            applyExp(pause.expBase + inPause / 1000);
          }
        } else {
          const at = audio.currentTime;
          setAudioTime(at);
          const k = Math.min(curStepRef.current, schedule.segments.length - 1);
          const seg = schedule.segments[k];
          applyExp(seg.expStart + Math.max(0, (at - seg.audioStart) / SPEECH_RATE));
          // Reached the end of a non-final step → insert its silence.
          if (k < schedule.segments.length - 1 && at >= seg.audioEnd - 0.04) {
            if (seg.pauseAfter > 0) {
              audio.pause();
              pauseRef.current = {
                startAt: now,
                durMs: seg.pauseAfter * 1000,
                expBase: seg.expStart + seg.speakReal,
                stepIndex: k,
              };
            } else {
              curStepRef.current = k + 1;
            }
          }
        }
      } else if (hasAudio && audio) {
        applyExp(audio.currentTime);
        setAudioTime(audio.currentTime);
      } else {
        if (lastTickRef.current == null) lastTickRef.current = now;
        const delta = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
        applyExp(Math.min(expRef.current + delta, totalSeconds));
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      lastTickRef.current = null;
    };
  }, [running, hasAudio, schedule, totalSeconds]);

  // Completion in the fallback (no-audio) mode; audio mode finishes via the
  // tick loop / the audio `ended` event.
  useEffect(() => {
    if (!hasAudio && running && elapsed >= totalSeconds) {
      setRunning(false);
      setFinished(true);
      stopSpeaking();
    }
  }, [elapsed, running, hasAudio, totalSeconds]);

  // Speak each line once as it becomes active (fallback + voice on).
  useEffect(() => {
    if (!running || !voiceOn || !useBrowserVoice || !activeLine) return;
    if (spokenLineRef.current !== activeIndex) {
      spokenLineRef.current = activeIndex;
      speak(activeLine.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, running, voiceOn, useBrowserVoice]);

  useEffect(() => () => stopSpeaking(), []);

  function handleStart() {
    if (finished) {
      applyExp(0);
      setAudioTime(0);
      setFinished(false);
      spokenLineRef.current = -1;
      curStepRef.current = 0;
      pauseRef.current = null;
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
    lastTickRef.current = null;
    if (hasAudio && audioRef.current) {
      audioRef.current.playbackRate = SPEECH_RATE;
      // Resuming mid-silence: don't play audio; the tick counts the pause down.
      if (pauseRef.current) {
        pauseRef.current.startAt = performance.now();
      } else {
        void audioRef.current.play();
      }
    }
    setRunning(true);
  }

  function handlePause() {
    setRunning(false);
    if (pauseRef.current) {
      // Freeze the remaining silence so it resumes correctly.
      const p = pauseRef.current;
      p.durMs = Math.max(0, p.durMs - (performance.now() - p.startAt));
    } else if (hasAudio && audioRef.current) {
      audioRef.current.pause();
    }
    stopSpeaking();
    spokenLineRef.current = -1;
  }

  function handleReset() {
    setRunning(false);
    setFinished(false);
    applyExp(0);
    setAudioTime(0);
    spokenLineRef.current = -1;
    curStepRef.current = 0;
    pauseRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stopSpeaking();
  }

  /** Jump to another line by index (clamped). Works while playing or paused. */
  function seekToLine(index: number) {
    const clamped = Math.max(0, Math.min(lines.length - 1, index));
    const target = lines[clamped].startSeconds;
    setFinished(false);
    pauseRef.current = null;
    spokenLineRef.current = -1;

    if (schedule) {
      const k = schedule.lineStep[clamped];
      const seg = schedule.segments[k];
      curStepRef.current = k;
      setAudioTime(target);
      applyExp(seg.expStart + Math.max(0, (target - seg.audioStart) / SPEECH_RATE));
    } else {
      setAudioTime(target);
      applyExp(target);
    }

    if (audioRef.current) {
      audioRef.current.currentTime = target;
      if (running) void audioRef.current.play();
    }
    if (running && useBrowserVoice && voiceOn) {
      spokenLineRef.current = clamped;
      speak(lines[clamped].text);
    }
  }

  /**
   * Seek to an absolute experience time (real seconds), e.g. from clicking the
   * progress bar. Maps the time back onto the narration audio, landing either
   * inside a step's speech or inside its trailing silence.
   */
  function seekToExperienceTime(seconds: number) {
    const target = Math.max(0, Math.min(totalSeconds, seconds));
    setFinished(false);
    spokenLineRef.current = -1;

    if (schedule) {
      // Find the step whose [expStart, expStart+speak+pause) contains target.
      let k = schedule.segments.length - 1;
      for (let i = 0; i < schedule.segments.length; i++) {
        const s = schedule.segments[i];
        if (target < s.expStart + s.speakReal + s.pauseAfter) {
          k = i;
          break;
        }
      }
      const seg = schedule.segments[k];
      curStepRef.current = k;
      const intoStep = target - seg.expStart;

      if (intoStep <= seg.speakReal) {
        // Inside the spoken part → resume audio at the matching media time.
        pauseRef.current = null;
        const at = seg.audioStart + intoStep * SPEECH_RATE;
        setAudioTime(at);
        applyExp(target);
        if (audioRef.current) {
          audioRef.current.currentTime = at;
          if (running) void audioRef.current.play();
        }
      } else {
        // Inside the trailing silence → hold audio at the step's end.
        setAudioTime(seg.audioEnd);
        applyExp(target);
        if (audioRef.current) {
          audioRef.current.currentTime = seg.audioEnd;
          audioRef.current.pause();
        }
        const remaining = seg.speakReal + seg.pauseAfter - intoStep;
        pauseRef.current = {
          startAt: performance.now(),
          durMs: remaining * 1000,
          expBase: target,
          stepIndex: k,
        };
      }
    } else {
      pauseRef.current = null;
      setAudioTime(target);
      applyExp(target);
      if (audioRef.current) {
        audioRef.current.currentTime = target;
        if (running) void audioRef.current.play();
      }
    }

    if (running && useBrowserVoice && voiceOn && activeLine) {
      spokenLineRef.current = activeIndex;
      speak(activeLine.text);
    }
  }

  /** Seek by clicking (or dragging) anywhere on the progress track. */
  function handleProgressPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const frac = (e.clientX - rect.left) / rect.width;
    seekToExperienceTime(frac * totalSeconds);
  }

  function handleProgressKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = 5;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekToExperienceTime(expRef.current + step);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekToExperienceTime(expRef.current - step);
    } else if (e.key === 'Home') {
      e.preventDefault();
      seekToExperienceTime(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      seekToExperienceTime(totalSeconds);
    }
  }

  function toggleVoice() {
    setVoiceOn((prev) => {
      const next = !prev;
      if (!next) stopSpeaking();
      else if (running && activeLine) {
        spokenLineRef.current = activeIndex;
        speak(activeLine.text);
      }
      return next;
    });
  }

  return (
    <div className="player">
      {caution && (
        <p className="caution-note" role="note">
          <span aria-hidden>⚠️</span> {caution}
        </p>
      )}
      {hasAudio && (
        <audio
          ref={audioRef}
          src={narration.audioUrl}
          preload="auto"
          onEnded={() => {
            // The spoken track finished. If the last step still has trailing
            // silence, count it down before completing; otherwise finish now.
            if (schedule && running) {
              const last = schedule.segments.length - 1;
              const seg = schedule.segments[last];
              setAudioTime(seg.audioEnd);
              if (seg.pauseAfter > 0) {
                pauseRef.current = {
                  startAt: performance.now(),
                  durMs: seg.pauseAfter * 1000,
                  expBase: seg.expStart + seg.speakReal,
                  stepIndex: last,
                };
                return;
              }
            }
            setElapsed(totalSeconds);
            setRunning(false);
            setFinished(true);
          }}
        />
      )}

      <div className="player-controls">
        <button
          type="button"
          className="player-btn"
          onClick={() => seekToLine(activeIndex - 1)}
          disabled={!started || activeIndex === 0}
          aria-label="Eine Zeile zurück"
        >
          ⏮
        </button>
        {!running ? (
          <button type="button" className="player-btn primary" onClick={handleStart}>
            {finished ? 'Nochmal' : elapsed > 0 ? 'Weiter' : 'Übung starten'}
          </button>
        ) : (
          <button type="button" className="player-btn" onClick={handlePause}>
            Pause
          </button>
        )}
        <button
          type="button"
          className="player-btn"
          onClick={() => seekToLine(activeIndex + 1)}
          disabled={!started || activeIndex >= lines.length - 1}
          aria-label="Eine Zeile vor"
        >
          ⏭
        </button>
        <button
          type="button"
          className="player-btn"
          onClick={handleReset}
          disabled={elapsed === 0 && !finished}
        >
          Zurücksetzen
        </button>
        {useBrowserVoice && (
          <button
            type="button"
            className={`player-btn voice${voiceOn ? ' on' : ''}`}
            onClick={toggleVoice}
            aria-pressed={voiceOn}
          >
            {voiceOn ? '🔊 Stimme an' : '🔈 Stimme aus'}
          </button>
        )}
        <span className="player-time">
          {mmss(elapsed)} / {mmss(totalSeconds)}
        </span>
      </div>

      <div
        className="player-progress"
        role="slider"
        tabIndex={0}
        aria-label="Fortschritt – zum Spulen klicken"
        aria-valuemin={0}
        aria-valuemax={Math.floor(totalSeconds)}
        aria-valuenow={Math.floor(elapsed)}
        aria-valuetext={`${mmss(elapsed)} von ${mmss(totalSeconds)}`}
        onPointerDown={handleProgressPointer}
        onKeyDown={handleProgressKeyDown}
      >
        <div className="player-progress-bar" ref={progressBarRef} />
      </div>

      <div className="player-lyrics" ref={viewportRef}>
        <div className="player-lyrics-inner">
          {lines.map((line, i) => {
            const isCurrent = started && i === activeIndex;
            const state = isCurrent
              ? 'current'
              : i < activeIndex
                ? 'past'
                : 'upcoming';
            return (
              <p
                key={i}
                ref={(el) => {
                  lineRefs.current[i] = el;
                }}
                className={`player-line ${state}`}
                onClick={() => seekToLine(i)}
              >
                {isCurrent && line.words && line.words.length > 0
                  ? line.words.map((word, w) => (
                      <span
                        key={w}
                        className={`player-word${
                          w === activeWordIndex
                            ? ' current'
                            : w < activeWordIndex
                              ? ' past'
                              : ''
                        }`}
                      >
                        {word.text}
                        {w < line.words!.length - 1 ? ' ' : ''}
                      </span>
                    ))
                  : line.text}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
