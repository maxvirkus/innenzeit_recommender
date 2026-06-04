import { EXERCISES } from '../data/exercises';
import { DIMENSION_LABELS, STATE_GOAL_LABELS } from '../domain/explain';
import type { DepthCategory } from '../domain/types';

const PIPELINE: { title: string; desc: string }[] = [
  {
    title: 'Zustände',
    desc: '1–3 gewählte Gefühle (z. B. „Gestresst“, „Müde“).',
  },
  {
    title: 'Profil',
    desc: 'Fünf Dimensionen, aus den Zuständen verrechnet.',
  },
  {
    title: 'Zustandsziel',
    desc: 'Eine von acht Triage-Regeln bestimmt das kurzfristige Ziel.',
  },
  {
    title: 'Sicherheitsfilter',
    desc: 'Riskante Übungen werden für das Profil ausgeschlossen.',
  },
  {
    title: 'Scoring',
    desc: 'Jede erlaubte Übung bekommt Punkte aus sechs Bausteinen.',
  },
  {
    title: 'Ranking',
    desc: 'Höchster Score = Empfehlung, danach zwei Alternativen.',
  },
];

const DIMENSIONS: {
  key: keyof typeof DIMENSION_LABELS;
  pos: string;
  neg: string;
}[] = [
  { key: 'valence', pos: 'gut gelaunt', neg: 'gedrückt' },
  { key: 'energy', pos: 'wach / aktiviert', neg: 'müde / flau' },
  { key: 'stress', pos: 'angespannt', neg: 'entspannt' },
  { key: 'heaviness', pos: 'schwer / belastet', neg: 'leicht' },
  { key: 'stability', pos: 'geerdet / sicher', neg: 'haltlos' },
];

const TRIAGE: { rule: string; goal: keyof typeof STATE_GOAL_LABELS }[] = [
  { rule: 'Hohe Schwere + gedrückte Stimmung', goal: 'emotional_support' },
  { rule: '„Gestresst“ gewählt oder Stress hoch', goal: 'stress_reduction' },
  { rule: 'Stabilität niedrig', goal: 'grounding' },
  { rule: 'Niedrige Energie ohne Stress', goal: 'gentle_activation' },
  { rule: '„Energiegeladen“ gewählt', goal: 'focus' },
  { rule: 'Gute Stimmung, kein Stress/Schwere', goal: 'positive_integration' },
  { rule: 'Abend ohne spezielle Notlage', goal: 'evening_regulation' },
  { rule: 'Standard (sonst)', goal: 'focus' },
];

const BUILDING_BLOCKS: {
  name: string;
  what: string;
  scale: string;
}[] = [
  {
    name: 'StateFit',
    what: 'Passt die Übung zum Zustandsziel? Direkt, indirekt oder gar nicht.',
    scale: '+5 / +1 / -2',
  },
  {
    name: 'ProfilFit',
    what: 'Wirkt die Übung genau gegen das, was das Profil gerade braucht? (Skalarprodukt aus Wirkung × Bedarf).',
    scale: '-4 … +6',
  },
  {
    name: 'LangzeitFit',
    what: 'Deckt sie die langfristigen Onboarding-Ziele ab?',
    scale: '0 … +4',
  },
  {
    name: 'Persönl. Evidenz',
    what: 'Wie hat die Person die Übung in ähnlichen Lagen früher bewertet (ab 3 Einträgen)?',
    scale: '-2 … +2',
  },
  {
    name: 'Wissenschaft',
    what: 'Wie gut ist die Übung durch Studien gestützt?',
    scale: '0 … +3',
  },
  {
    name: 'Risiko',
    what: 'Mögliche Kontraindikationen — wird abgezogen.',
    scale: '0 … -3',
  },
];

const DEPTH_LABELS: Record<DepthCategory, string> = {
  basic: 'Einsteig',
  moderate: 'Mittel',
  deep: 'Tief',
};

/**
 * Standalone, visual explainer of how the recommender works. Static content —
 * no inputs — meant to be read top to bottom by the (non-technical) team.
 */
export function BackgroundPage() {
  return (
    <div className="bg-page">
      <header className="app-header">
        <h1>So funktioniert der Algorithmus</h1>
        <p className="intro">
          Der Recommender folgt einer festen, nachvollziehbaren Kette. Keine
          Blackbox: Jeder Schritt ist eine einfache Regel oder eine Rechnung mit
          wenigen Zahlen.
        </p>
      </header>

      {/* Pipeline */}
      <section className="bg-section">
        <h2>Die Pipeline auf einen Blick</h2>
        <div className="bg-pipeline">
          {PIPELINE.map((stage, i) => (
            <div className="bg-pipe-item" key={stage.title}>
              <div className="bg-pipe-card">
                <span className="bg-pipe-num">{i + 1}</span>
                <h3>{stage.title}</h3>
                <p>{stage.desc}</p>
              </div>
              {i < PIPELINE.length - 1 && (
                <span className="bg-pipe-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Dimensions */}
      <section className="bg-section">
        <h2>Schritt 1 · Die fünf Dimensionen</h2>
        <p className="intro">
          Jeder gewählte Zustand liefert fünf Werte von -2 bis +2. Sie sind die
          gemeinsame Sprache des ganzen Systems.
        </p>
        <div className="bg-dim-grid">
          {DIMENSIONS.map((d) => (
            <div className="bg-dim" key={d.key}>
              <div className="bg-dim-name">{DIMENSION_LABELS[d.key]}</div>
              <div className="bg-dim-scale">
                <span className="bg-dim-neg">− {d.neg}</span>
                <span className="bg-dim-pos">{d.pos} +</span>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-pooling">
          <div className="bg-pool-card">
            <h4>Mittelwert</h4>
            <p>
              <strong>Stimmung</strong> & <strong>Energie</strong> beschreiben
              die Gesamttönung — gegensätzliche Zustände dürfen sich ausgleichen.
            </p>
          </div>
          <div className="bg-pool-card">
            <h4>Worst-Case</h4>
            <p>
              <strong>Stress</strong> & <strong>Schwere</strong> (Maximum),{' '}
              <strong>Stabilität</strong> (Minimum): ein belastendes Signal darf
              nicht von einem ruhigeren verwässert werden.
            </p>
          </div>
        </div>
      </section>

      {/* Triage */}
      <section className="bg-section">
        <h2>Schritt 2 · Zustandsziel (Triage)</h2>
        <p className="intro">
          Acht Regeln werden von oben nach unten geprüft — von der
          spezifischsten Not zur allgemeinsten. Die <strong>erste</strong>{' '}
          zutreffende Regel gewinnt.
        </p>
        <ol className="bg-triage">
          {TRIAGE.map((t, i) => (
            <li key={i}>
              <span className="bg-triage-num">{i + 1}</span>
              <span className="bg-triage-rule">{t.rule}</span>
              <span className="bg-triage-arrow">→</span>
              <span className="bg-triage-goal">
                {STATE_GOAL_LABELS[t.goal]}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Safety */}
      <section className="bg-section">
        <h2>Schritt 3 · Sicherheitsfilter</h2>
        <p className="intro">
          Vor der Bewertung fliegen unpassende oder riskante Übungen raus —
          unabhängig vom Zustandsziel. Beispiele: intensive Atemtechniken bei
          hohem Stress, Tiefenpraxis ohne Freigabe bei instabilem Profil. Was
          ausgeschlossen wird, zeigt der Recommender transparent an.
        </p>
      </section>

      {/* Scoring */}
      <section className="bg-section">
        <h2>Schritt 4 · Scoring aus sechs Bausteinen</h2>
        <div className="bg-blocks">
          {BUILDING_BLOCKS.map((b) => (
            <div className="bg-block" key={b.name}>
              <div className="bg-block-head">
                <span className="bg-block-name">{b.name}</span>
                <span className="bg-block-scale">{b.scale}</span>
              </div>
              <p>{b.what}</p>
            </div>
          ))}
        </div>

        <div className="bg-modes">
          <div className="bg-mode bg-mode-acute">
            <h4>Modus „akut“</h4>
            <p className="bg-mode-when">
              Stress ≥ 1,2 <em>oder</em> Stabilität ≤ -1,5
            </p>
            <p>
              Der unmittelbare Zustand zählt am meisten: StateFit &amp; ProfilFit
              dominieren, Langzeitziele treten zurück, Risiko wird stark
              bestraft.
            </p>
          </div>
          <div className="bg-mode bg-mode-calm">
            <h4>Modus „ausgeglichen“</h4>
            <p className="bg-mode-when">kein akuter Zustand</p>
            <p>
              Mehr Raum für Langzeitziele und persönliche Erfahrung — die
              Empfehlung darf stärker auf Entwicklung statt Akut-Hilfe zielen.
            </p>
          </div>
        </div>
      </section>

      {/* Why profileFit */}
      <section className="bg-section">
        <h2>Warum der ProfilFit entscheidend ist</h2>
        <p className="intro">
          Ohne ProfilFit würden alle Übungen eines Zustandsziels gleich punkten —
          jede Stress-Kombination führte zur exakt gleichen Übung. Der ProfilFit
          vergleicht die <strong>Wirkung</strong> jeder Übung mit dem{' '}
          <strong>konkreten Bedarf</strong> des Profils. So bekommen
          unterschiedliche Stimmungslagen unterschiedliche Empfehlungen — und das
          bleibt erklärbar: „belohnt wird die Übung, deren Wirkung dem aktuellen
          Zustand am besten entgegenwirkt“.
        </p>
      </section>

      {/* Catalog */}
      <section className="bg-section">
        <h2>Der Übungskatalog</h2>
        <p className="intro">
          {EXERCISES.length} Übungen, alle zu Hause mit der App machbar
          (Atmung &amp; Meditation).
        </p>
        <div className="table-scroll">
          <table className="bg-catalog">
            <thead>
              <tr>
                <th>Übung</th>
                <th>Dauer</th>
                <th>Tiefe</th>
                <th>Zustandsziele</th>
                <th>Wiss.</th>
                <th>Risiko</th>
              </tr>
            </thead>
            <tbody>
              {EXERCISES.map((e) => (
                <tr key={e.id}>
                  <td>{e.title}</td>
                  <td className="num">{e.durationMinutes} min</td>
                  <td>{DEPTH_LABELS[e.depthCategory]}</td>
                  <td>
                    {e.stateGoals
                      .map((g) => STATE_GOAL_LABELS[g])
                      .join(', ')}
                  </td>
                  <td className="num">{e.sciencePrior}</td>
                  <td className="num">{e.contraindicationRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
