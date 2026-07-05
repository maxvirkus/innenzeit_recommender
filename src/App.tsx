import { useEffect, useMemo, useState } from 'react';
import { track } from '@vercel/analytics/react';
import { MoodSelector } from './components/MoodSelector';
import { TimeOfDaySelector } from './components/TimeOfDaySelector';
import { RecommendationResult } from './components/RecommendationResult';
import { CalculationWalkthrough } from './components/CalculationWalkthrough';
import { BackgroundPage } from './components/BackgroundPage';
import { CombinatoricsExplorer } from './components/CombinatoricsExplorer';
import { SettingsPanel } from './components/SettingsPanel';
import { GuideChat } from './components/GuideChat';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ProfileSummary } from './components/ProfileSummary';
import { PasswordGate } from './components/PasswordGate';
import {
  DEFAULT_USER_SETTINGS,
  recommendExercises,
} from './domain/recommender';
import type {
  MoodId,
  SessionFeedback,
  TimeOfDay,
  UserSettings,
} from './domain/types';
import { getDefaultTimeOfDay } from './timeOfDay';
import { useLocalStorage } from './useLocalStorage';
import { checkSession } from './api';

export default function App() {
  const [authState, setAuthState] = useState<'loading' | 'in' | 'out'>(
    'loading',
  );

  useEffect(() => {
    // In local dev there is no serverless backend, so skip the password gate
    // and let the team test the algorithm directly.
    if (import.meta.env.DEV) {
      setAuthState('in');
      return;
    }
    checkSession().then((ok) => setAuthState(ok ? 'in' : 'out'));
  }, []);

  if (authState === 'loading') {
    return <div className="gate">Lade…</div>;
  }
  if (authState === 'out') {
    return <PasswordGate onAuthenticated={() => setAuthState('in')} />;
  }
  return <AuthedApp />;
}

type Tab = 'recommender' | 'combinatorics' | 'background';

function AuthedApp() {
  const [tab, setTab] = useState<Tab>('recommender');

  return (
    <div className="app">
      <nav className="tab-bar" aria-label="Bereiche">
        <button
          className={tab === 'recommender' ? 'active' : ''}
          onClick={() => { setTab('recommender'); track('tab_switch', { tab: 'recommender' }); }}
        >
          Recommender
        </button>
        <button
          className={tab === 'combinatorics' ? 'active' : ''}
          onClick={() => { setTab('combinatorics'); track('tab_switch', { tab: 'combinatorics' }); }}
        >
          Kombinatorik
        </button>
        <button
          className={tab === 'background' ? 'active' : ''}
          onClick={() => { setTab('background'); track('tab_switch', { tab: 'background' }); }}
        >
          Hintergrund
        </button>
      </nav>

      {tab === 'recommender' && <RecommenderApp />}
      {tab === 'combinatorics' && <CombinatoricsExplorer />}
      {tab === 'background' && <BackgroundPage />}
    </div>
  );
}

function RecommenderApp() {
  const [selected, setSelected] = useState<MoodId[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() =>
    getDefaultTimeOfDay(),
  );
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    'iz_settings',
    DEFAULT_USER_SETTINGS,
  );
  const [history, setHistory] = useLocalStorage<SessionFeedback[]>(
    'iz_history',
    [],
  );
  // Practice ids of recently completed sessions (newest first). Drives the
  // tolerance-band rotation so near-tied exercises take turns.
  const [recentlyServed, setRecentlyServed] = useLocalStorage<string[]>(
    'iz_recent',
    [],
  );

  const result = useMemo(
    () =>
      recommendExercises({
        selectedMoodIds: selected,
        timeOfDay,
        userSettings: settings,
        history,
        recentlyServed,
      }),
    [selected, timeOfDay, settings, history, recentlyServed],
  );

  const hasSelection = selected.length > 0;

  return (
    <>
      <header className="app-header">
        <h1>Innenzeit Recommender Test</h1>
        <p className="intro">
          Wähle 1 bis maximal 3 Zustände aus. Der Prototyp zeigt eine empfohlene
          Übung, zwei Alternativen und eine nachvollziehbare Live-Berechnung.
        </p>
      </header>

      <div className="workspace">
        <div className="input-column">
          <SettingsPanel settings={settings} onChange={setSettings} />

          <h2>Zustände</h2>
          <MoodSelector
            selected={selected}
            onChange={(next) => {
              if (selected.length === 0 && next.length > 0) {
                track('first_mood_selected', { mood: next[0] });
              }
              setSelected(next);
            }}
          />

          <h2>Tageszeit</h2>
          <TimeOfDaySelector value={timeOfDay} onChange={setTimeOfDay} />
        </div>

        <div className="result-column">
          <h2>Empfehlung</h2>
          {hasSelection ? (
            <RecommendationResult result={result} />
          ) : (
            <div className="empty">Bitte mindestens einen Zustand wählen.</div>
          )}

          {hasSelection && (
            <GuideChat
              key={selected.join(',')}
              selectedMoodIds={selected}
              timeOfDay={timeOfDay}
              settings={settings}
              history={history}
              recentlyServed={recentlyServed}
            />
          )}

          {hasSelection && (
            <CalculationWalkthrough
              result={result}
              selectedMoodIds={selected}
              timeOfDay={timeOfDay}
              settings={settings}
            />
          )}

          {hasSelection && (
            <FeedbackPanel
              primary={result.primary}
              selectedMoodIds={selected}
              profile={result.profile}
              stateGoal={result.stateGoal}
              longTermGoals={settings.longTermGoals}
              profileCount={history.length}
              onSaveToProfile={(fb) => {
                setHistory((prev) => [...prev, fb]);
                // Remember this practice as most-recently served so the
                // rotation gives other near-tied exercises a turn next time.
                setRecentlyServed((prev) =>
                  [fb.practiceId, ...prev.filter((id) => id !== fb.practiceId)].slice(
                    0,
                    10,
                  ),
                );
              }}
            />
          )}

          <ProfileSummary history={history} onReset={() => setHistory([])} />
        </div>
      </div>
    </>
  );
}
