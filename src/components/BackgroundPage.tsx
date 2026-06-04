import { EXERCISES } from '../data/exercises';
import { SCIENTIFIC_SOURCES } from '../data/scientificSources';
import {
  DIMENSION_LABELS,
  MECHANISM_LABELS,
  STATE_GOAL_LABELS,
} from '../domain/explain';
import type { DepthCategory, Mechanism } from '../domain/types';

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
    desc: 'Triage-Regeln (Sicherheit zuerst) bestimmen das kurzfristige Ziel.',
  },
  {
    title: 'Sicherheitsfilter',
    desc: 'Riskante Übungen werden hart ausgeschlossen, der Rest behutsam dosiert.',
  },
  {
    title: 'Scoring',
    desc: 'Jede erlaubte Übung bekommt Punkte aus mehreren Bausteinen.',
  },
  {
    title: 'Ranking',
    desc: 'Bester Score = Empfehlung, danach zwei Alternativen.',
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
  { rule: 'Stabilität sehr niedrig, ohne akuten Stress — erst Halt geben', goal: 'grounding' },
  { rule: '„Gestresst“ gewählt oder Stress hoch', goal: 'stress_reduction' },
  {
    rule: 'Hohe Schwere + gedrückte Stimmung',
    goal: 'emotional_support',
  },
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
    what: 'Bringt die Übung das Profil näher an einen ausgeglichenen Ziel-Zustand? Verglichen wird der Abstand vorher/nachher.',
    scale: '-4 … +6',
  },
  {
    name: 'MechanismFit',
    what: 'Passt das angenommene Wirkprinzip der Übung zum Zustandsziel?',
    scale: '0 … +4',
  },
  {
    name: 'LangzeitFit',
    what: 'Deckt sie die langfristigen Onboarding-Ziele ab?',
    scale: '0 … +4',
  },
  {
    name: 'Persönl. Evidenz',
    what: 'Wie hat die Person ähnliche Übungen früher bewertet? Bayesianisch geglättet, damit wenige Rückmeldungen nicht überreagieren.',
    scale: '-2 … +2',
  },
  {
    name: 'EvidenzFit',
    what: 'Plausibilität aus mehreren Facetten (Studienlage, Wirkmechanismus, Eignung, App-Tauglichkeit, Sicherheit).',
    scale: '0 … +3',
  },
  {
    name: 'Sicherheits-Faktor',
    what: 'Dämpft riskante, aber erlaubte Übungen je nach Zustand (z. B. intensiv bei hohem Stress).',
    scale: '×0 … ×1',
  },
  {
    name: 'Risiko',
    what: 'Mögliche Kontraindikationen — wird zusätzlich moderat abgezogen.',
    scale: '0 … -3',
  },
];

const MECHANISMS: Mechanism[] = [
  'parasympathetic_activation',
  'attentional_anchoring',
  'sensory_grounding',
  'cognitive_reappraisal',
  'self_compassion',
  'positive_affect_broadening',
  'behavioral_activation',
  'interoceptive_awareness',
];

const DEPTH_LABELS: Record<DepthCategory, string> = {
  basic: 'Einstieg',
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
          wenigen Zahlen. Die wissenschaftlichen Bezüge sind als{' '}
          <em>Plausibilität</em> gedacht — nicht als Beweis, dass eine Übung
          „optimal“ ist.
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
          Die Regeln werden von oben nach unten geprüft — <strong>Sicherheit
          zuerst</strong>: Wer wenig Halt hat, wird zuerst stabilisiert, bevor
          tiefer gearbeitet wird. Die <strong>erste</strong> zutreffende Regel
          gewinnt.
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
        <h2>Schritt 3 · Sicherheit: harter Filter + sanfte Dosierung</h2>
        <p className="intro">
          Sicherheit wirkt auf zwei Ebenen. Zuerst ein <strong>harter
          Filter</strong>: riskante oder unpassende Übungen werden ganz
          ausgeschlossen (z. B. intensive Atemtechniken bei hohem Stress,
          Tiefenpraxis ohne Freigabe bei instabilem Profil). Danach ein{' '}
          <strong>weicher Sicherheits-Faktor</strong>, der erlaubte, aber für den
          aktuellen Zustand etwas fordernde Übungen behutsamer dosiert, statt sie
          komplett auszuschließen. Was hart ausgeschlossen wird, zeigt der
          Recommender transparent an.
        </p>
      </section>

      {/* Scoring */}
      <section className="bg-section">
        <h2>Schritt 4 · Scoring aus mehreren Bausteinen</h2>
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
              dominieren, Langzeitziele treten zurück.
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
          simuliert die <strong>Wirkung</strong> jeder Übung auf dein Profil und
          prüft, ob der Abstand zu einem ausgeglichenen <strong>Ziel-Zustand</strong>{' '}
          kleiner wird. So bekommen unterschiedliche Stimmungslagen
          unterschiedliche Empfehlungen — und das bleibt erklärbar: „belohnt wird
          die Übung, die dich spürbar näher an Balance bringt“.
        </p>
      </section>

      {/* Mechanisms */}
      <section className="bg-section">
        <h2>Wirkprinzipien statt fester Listen</h2>
        <p className="intro">
          Statt Übungen fest an Ziele zu koppeln, beschreibt jede Übung ihre
          angenommenen <strong>Wirkprinzipien</strong>. Passt ein Wirkprinzip zum
          Zustandsziel, steigt der MechanismFit. Das hält die Logik erklärbar und
          erweiterbar.
        </p>
        <div className="bg-blocks">
          {MECHANISMS.map((m) => (
            <div className="bg-block" key={m}>
              <div className="bg-block-head">
                <span className="bg-block-name">{MECHANISM_LABELS[m]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Evidence profile */}
      <section className="bg-section">
        <h2>Evidenz als mehrere Facetten</h2>
        <p className="intro">
          Früher gab es eine einzelne „Wissenschafts“-Zahl. Jetzt hat jede Übung
          ein <strong>Evidenz-Profil</strong> aus fünf Facetten (jeweils 0–3):
          Studienlage, Plausibilität des Wirkmechanismus, Passung zur Zielgruppe,
          App-Tauglichkeit und Sicherheits-Zuversicht. Daraus entsteht der
          EvidenzFit — bewusst als Leitplanke, nicht als Beweis.
        </p>
      </section>

      {/* Personalization */}
      <section className="bg-section">
        <h2>Personalisierung mit Augenmaß</h2>
        <p className="intro">
          Rückmeldungen fließen <strong>bayesianisch geglättet</strong> ein: Ohne
          Daten bleibt die persönliche Evidenz neutral, mit mehr Rückmeldungen
          zählt sie stärker. Bewertungen übertragen teilweise auf verwandte
          Übungen (gleiche Übungsfamilie) und ähnliche Situationen, statt nur auf
          exakt dieselbe Übung im exakt gleichen Zustand.
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
                <th>Evidenz</th>
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
                  <td className="num">{e.evidenceProfile.evidenceStrength}</td>
                  <td className="num">{e.contraindicationRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sources */}
      <section className="bg-section">
        <h2>Quellen</h2>
        <p className="intro">
          Zentrale Belege, auf die sich die Wirkprinzipien und das Evidenz-Profil
          stützen. Sie machen die Empfehlungen <em>plausibel</em>, nicht
          bewiesen.
        </p>
        <ul className="bg-sources">
          {SCIENTIFIC_SOURCES.map((s) => (
            <li key={s.id}>
              <div className="bg-source-head">
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.title}
                  </a>
                ) : (
                  <span>{s.title}</span>
                )}
              </div>
              <div className="bg-source-meta">
                {s.authors}
                {s.year ? ` · ${s.year}` : ''}
              </div>
              <p className="bg-source-relevance">{s.relevance}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
