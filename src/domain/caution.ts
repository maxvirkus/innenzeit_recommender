import type { Exercise } from './types.js';

/**
 * Returns a short German safety note when a practice is physically intense,
 * uses an activating breath technique, or carries elevated contraindication
 * risk. The note is shown as a disclaimer where the practice is suggested and
 * before it is started. Returns `null` for gentle, low-risk practices so the UI
 * stays calm and only warns when it actually matters.
 */
export function describeCaution(exercise: Exercise): string | null {
  const reasons: string[] = [];

  if (exercise.breathTechnique === 'rapid_breathing')
    reasons.push('nutzt eine aktivierende, schnellere Atmung');
  else if (exercise.breathTechnique === 'breath_hold')
    reasons.push('enthält bewusste Atempausen');

  if (exercise.intensity >= 3) reasons.push('ist körperlich fordernd');

  if (exercise.contraindicationRisk >= 2)
    reasons.push('passt nicht in jede Verfassung');

  if (reasons.length === 0) return null;

  return `Hinweis: Diese Übung ${reasons.join(
    ' und ',
  )}. Geh behutsam vor, höre auf deinen Körper und pausiere bei Schwindel oder Unwohlsein.`;
}
