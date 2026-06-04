import { useEffect, useMemo, useState } from 'react';
import { MoodSelector } from './components/MoodSelector';
import { TimeOfDaySelector } from './components/TimeOfDaySelector';
import { RecommendationResult } from './components/RecommendationResult';
import { CalculationWalkthrough } from './components/CalculationWalkthrough';
import { BackgroundPage } from './components/BackgroundPage';
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
  return <AuthedApp />;
}

type Tab = 'recommender' | 'background';

function AuthedApp() {
  const [tab, setTab] = useState<Tab>('recommender');

  return (
    <div className="app">
      <nav className="tab-bar" aria-label="Bereiche">
        <button
          className={tab === 'recommender' ? 'active' : ''}
          onClick={() => setTab('recommender')}
        >
          Recommender-Test
        </button>
        <button
          className={tab === 'background' ? 'active' : ''}
          onClick={() => setTab('background')}
        >
          Hintergrund
        </button>
      </nav>

      {tab === 'recommender' ? <RecommenderApp /> : <BackgroundPage />}
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
            <CalculationWalkthrough
              result={result}
              selectedMoodIds={selected}
              timeOfDay={timeOfDay}
              settings={settings}
              userIntent={userIntent}
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
              onSaveToProfile={(fb) => setHistory((prev) => [...prev, fb])}
            />
          )}

          <ProfileSummary history={history} onReset={() => setHistory([])} />
        </div>
      </div>
    </>
  );
}
