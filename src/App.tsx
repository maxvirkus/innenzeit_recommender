import { useEffect, useMemo, useState } from 'react';
import { MoodSelector } from './components/MoodSelector';
import { TimeOfDaySelector } from './components/TimeOfDaySelector';
import { RecommendationResult } from './components/RecommendationResult';
import { DebugPanel } from './components/DebugPanel';
import { SettingsPanel } from './components/SettingsPanel';
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
  UserIntent,
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
  return <RecommenderApp />;
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
  const [userIntent, setUserIntent] = useState<UserIntent>('auto');
  const [history, setHistory] = useLocalStorage<SessionFeedback[]>(
    'iz_history',
    [],
  );

  const result = useMemo(
    () =>
      recommendExercises({
        selectedMoodIds: selected,
        timeOfDay,
        userSettings: settings,
        userIntent,
        history,
      }),
    [selected, timeOfDay, settings, userIntent, history],
  );

  const hasSelection = selected.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Innenzeit Recommender Test</h1>
        <p className="intro">
          Wähle 1 bis maximal 3 Zustände aus. Der Prototyp zeigt eine empfohlene
          Übung, zwei Alternativen und eine Debug-Ansicht.
        </p>
      </header>

      <div className="workspace">
        <div className="input-column">
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            userIntent={userIntent}
            onIntentChange={setUserIntent}
          />

          <h2>Zustände</h2>
          <MoodSelector selected={selected} onChange={setSelected} />

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
            <FeedbackPanel
              primary={result.primary}
              selectedMoodIds={selected}
              profile={result.profile}
              stateGoal={result.stateGoal}
              longTermGoals={settings.longTermGoals}
              profileCount={history.length}
              onSaveToProfile={(fb) => setHistory((prev) => [...prev, fb])}
            />
          )}

          <ProfileSummary history={history} onReset={() => setHistory([])} />

          {hasSelection && (
            <DebugPanel
              result={result}
              selectedMoodIds={selected}
              longTermGoals={settings.longTermGoals}
              historyCount={history.length}
            />
          )}
        </div>
      </div>
    </div>
  );
}
