/**
 * Exports the exercise catalogue + pre-generated narration for the Flutter app
 * (`Innenzeitmockup/innenzeit_app`):
 *
 *  - `lib/data/practices.dart` — the 24 exercises as Dart `Practice` objects
 *    (title, description, duration, mapped category/intensity, timed
 *    instruction steps).
 *  - `assets/data/narration.json` — line/word timestamps per exercise, used by
 *    the player for lyrics-style sync with the bundled MP3s.
 *
 * Run from the repo root:  npx tsx scripts/exportFlutter.ts
 * Re-run after changing exercise texts or regenerating audio.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXERCISES } from '../src/data/exercises';
import { NARRATION } from '../src/data/narration';
import type { Exercise, PracticeFamily, StateGoal } from '../src/domain/types';

const FLUTTER_APP = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../Innenzeitmockup/innenzeit_app',
);

/** Recommender practice family → Flutter `PracticeCategory` enum value. */
const FAMILY_TO_CATEGORY: Record<PracticeFamily, string> = {
  slow_breathing: 'breath',
  activation_breathing: 'breath',
  grounding: 'grounding',
  attention_focus: 'meditation',
  self_compassion: 'meditation',
  body_scan: 'bodyScan',
  gratitude: 'journaling',
  visualization: 'visualization',
};

/** Short German benefit tags derived from the exercise's state goals. */
const STATE_GOAL_BENEFIT: Record<StateGoal, string> = {
  grounding: 'Erdet dich',
  stress_reduction: 'Reduziert Stress',
  gentle_activation: 'Aktiviert sanft',
  focus: 'Fördert Fokus',
  emotional_support: 'Unterstützt emotional',
  positive_integration: 'Stärkt Positives',
  evening_regulation: 'Beruhigt am Abend',
};

function intensityName(e: Exercise): string {
  if (e.intensity >= 3) return 'tief';
  if (e.intensity === 2) return 'moderat';
  return 'sanft';
}

/** Escapes a string for a single-quoted Dart literal. */
function dart(s: string): string {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$')}'`;
}

function practiceDart(e: Exercise): string {
  const benefits = e.stateGoals.map((g) => dart(STATE_GOAL_BENEFIT[g]));
  const steps = e.instructions
    .map(
      (s) =>
        `      InstructionStep(\n        durationSeconds: ${s.durationSeconds},\n        text:\n            ${dart(s.text)},\n      ),`,
    )
    .join('\n');
  return `  Practice(
    id: ${dart(e.id)},
    title: ${dart(e.title)},
    category: PracticeCategory.${FAMILY_TO_CATEGORY[e.family]},
    durationMinutes: ${e.durationMinutes},
    intensity: Intensity.${intensityName(e)},
    description: ${dart(e.description)},
    benefits: [${benefits.join(', ')}],
    audioAvailable: true,
    instructions: [
${steps}
    ],
  ),`;
}

const header = `// GENERATED — nicht von Hand bearbeiten.
// Quelle: innenzeit_recommender (src/data/exercises.ts).
// Neu erzeugen mit:  npx tsx scripts/exportFlutter.ts  (im Recommender-Repo).

import 'models.dart';

/// Die 24 Übungen des Innenzeit-Recommenders, mit zeitlich bemessenen
/// Anleitungsschritten. Passende Voice-Over liegen in \`assets/audio/<id>.mp3\`,
/// die Zeilen-/Wort-Zeitmarken in \`assets/data/narration.json\`.
const List<Practice> practices = [
`;

const dartFile = header + EXERCISES.map(practiceDart).join('\n') + '\n];\n';
const dartPath = resolve(FLUTTER_APP, 'lib/data/practices.dart');
writeFileSync(dartPath, dartFile);
console.log(`wrote ${dartPath} (${EXERCISES.length} practices)`);

// Narration JSON: keep only what the player needs, timestamps at ms precision.
const r = (n: number) => Math.round(n * 1000) / 1000;
const narrationOut: Record<string, unknown> = {};
for (const [id, n] of Object.entries(NARRATION)) {
  narrationOut[id] = {
    durationSeconds: r(n.durationSeconds),
    lines: n.lines.map((l) => ({
      text: l.text,
      start: r(l.startSeconds),
      end: r(l.endSeconds),
      words: (l.words ?? []).map((w) => ({
        text: w.text,
        start: r(w.startSeconds),
        end: r(w.endSeconds),
      })),
    })),
  };
}
const jsonPath = resolve(FLUTTER_APP, 'assets/data/narration.json');
mkdirSync(dirname(jsonPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(narrationOut));
console.log(
  `wrote ${jsonPath} (${Object.keys(narrationOut).length} narrations)`,
);
