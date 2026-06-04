import type { Mechanism, PracticeFamily } from '../domain/types';

/**
 * A single scientific source. Kept deliberately lightweight: enough to show a
 * transparent "where does this come from" list in the background tab and to
 * link practices/mechanisms to plausible evidence. This is *plausibility*, not
 * proof — wording in the UI must never claim a practice is clinically proven or
 * "optimal".
 */
export interface ScientificSource {
  id: string;
  /** Short topic tag, e.g. 'slow_breathing'. */
  topic: string;
  title: string;
  authors: string;
  year: number;
  /** Public link (review, meta-analysis or primary study). */
  url: string;
  /** One-sentence German summary of why this source is relevant here. */
  relevance: string;
  /** Where in the algorithm this informs decisions (families/mechanisms). */
  usedFor: Array<PracticeFamily | Mechanism | string>;
}

export const SCIENTIFIC_SOURCES: ScientificSource[] = [
  {
    id: 'shao_2024_slow_breathing',
    topic: 'slow_breathing',
    title:
      'The effect of slow-paced breathing on cardiovascular and emotion functions: A meta-analysis and systematic review',
    authors: 'Shao et al.',
    year: 2024,
    url: 'https://link.springer.com/article/10.1007/s12671-023-02294-2',
    relevance:
      'Langsames Atmen (~6 Atemzüge/Minute) ist mit erhöhter parasympathischer Aktivität und geringerer Anspannung assoziiert – Grundlage für die beruhigenden Atemübungen.',
    usedFor: ['slow_breathing', 'parasympathetic_activation'],
  },
  {
    id: 'fincham_2023_breathwork',
    topic: 'breathwork',
    title:
      'Effect of breathwork on stress and mental health: A meta-analysis of randomised-controlled trials',
    authors: 'Fincham et al.',
    year: 2023,
    url: 'https://www.nature.com/articles/s41598-022-27247-y',
    relevance:
      'Atemübungen zeigen über mehrere randomisierte Studien hinweg kleine bis moderate Effekte auf Stress und Stimmung – stützt Atemarbeit als niedrigschwellige Selbsthilfe.',
    usedFor: ['slow_breathing', 'activation_breathing', 'parasympathetic_activation'],
  },
  {
    id: 'binda_2022_meditation_safety',
    topic: 'meditation_safety',
    title:
      'Unpleasant meditation-related experiences in regular meditators: prevalence, predictors, and conceptual considerations',
    authors: 'Binda et al.',
    year: 2022,
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9024164/',
    relevance:
      'Meditation kann auch unangenehme Erfahrungen auslösen, besonders bei intensiven oder tiefen Praktiken – begründet die Sicherheitsfilter und die behutsame Dosierung.',
    usedFor: ['body_scan', 'self_compassion', 'interoceptive_awareness', 'safety'],
  },
  {
    id: 'ferrari_2019_self_compassion',
    topic: 'self_compassion',
    title:
      'Self-compassion interventions and psychosocial outcomes: a meta-analysis of RCTs',
    authors: 'Ferrari et al.',
    year: 2019,
    url: 'https://link.springer.com/article/10.1007/s12671-019-01134-6',
    relevance:
      'Selbstmitgefühl-Interventionen verbessern über randomisierte Studien hinweg u. a. Stimmung und Selbstberuhigung – Grundlage für selbstfürsorgliche Übungen bei Schwere und Traurigkeit.',
    usedFor: ['self_compassion'],
  },
  {
    id: 'personalization_digital_mh',
    topic: 'personalization',
    title:
      'TODO: add peer-reviewed source for personalization in digital mental health',
    authors: 'TODO',
    year: 0,
    url: '',
    relevance:
      'Platzhalter: Beleg dafür, dass an Zustand und Rückmeldung angepasste Empfehlungen in digitalen Mental-Health-Anwendungen wirksamer sind als statische. Quelle noch zu verifizieren.',
    usedFor: ['personalization'],
  },
];

export const SCIENTIFIC_SOURCES_BY_ID: Record<string, ScientificSource> =
  Object.fromEntries(SCIENTIFIC_SOURCES.map((s) => [s.id, s]));
