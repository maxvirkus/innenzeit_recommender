import type {
  Exercise,
  MoodId,
  MoodProfile,
  TimeOfDay,
  UserSettings,
} from './types';

export interface SafetyDecision {
  allowed: boolean;
  reason?: string;
}

export interface SafetyContext {
  profile: MoodProfile;
  selectedMoodIds: MoodId[];
  timeOfDay: TimeOfDay;
  userSettings: UserSettings;
}

/**
 * Hard safety filter. Returns whether a practice may be recommended at all.
 * These rules are absolute filters and run before any scoring.
 */
export function isAllowedBySafetyRules(
  exercise: Exercise,
  ctx: SafetyContext,
): SafetyDecision {
  const { profile, selectedMoodIds, timeOfDay, userSettings } = ctx;

  const highStress = profile.stress >= 1.2 || selectedMoodIds.includes('stressed');
  const lowStability = profile.stability <= -1.5;
  const breathBeginner = userSettings.breathworkExperience === 'none';
  const isEvening = timeOfDay === 'evening';

  // --- Legacy hard exclusions (kept for stable behaviour) ---
  if (highStress) {
    if (exercise.id === 'power_breath')
      return { allowed: false, reason: 'Stress hoch: Power Breath ausgeschlossen' };
    if (exercise.id === 'goal_visualization')
      return {
        allowed: false,
        reason: 'Stress hoch: Zielvisualisierung ausgeschlossen',
      };
  }
  if (profile.energy <= -1.2 && profile.stress >= 1) {
    if (exercise.id === 'power_breath')
      return {
        allowed: false,
        reason: 'Müde und gestresst: Power Breath ausgeschlossen',
      };
    if (exercise.id === 'goal_visualization')
      return {
        allowed: false,
        reason: 'Müde und gestresst: Zielvisualisierung ausgeschlossen',
      };
  }
  if (profile.heaviness >= 1.5 && profile.valence <= -1) {
    if (exercise.id === 'power_breath')
      return {
        allowed: false,
        reason: 'Schwere und Traurigkeit: Power Breath ausgeschlossen',
      };
    if (exercise.id === 'goal_visualization')
      return {
        allowed: false,
        reason: 'Schwere und Traurigkeit: Zielvisualisierung ausgeschlossen',
      };
  }

  // --- Rapid breathing ---
  if (exercise.breathTechnique === 'rapid_breathing') {
    if (highStress)
      return { allowed: false, reason: 'Rapid Breathing bei Stress ausgeschlossen' };
    if (lowStability)
      return {
        allowed: false,
        reason: 'Rapid Breathing bei niedriger Stabilität ausgeschlossen',
      };
    if (breathBeginner)
      return {
        allowed: false,
        reason: 'Rapid Breathing für Anfänger:innen ausgeschlossen',
      };
    if (isEvening)
      return { allowed: false, reason: 'Rapid Breathing am Abend ausgeschlossen' };
  }

  // --- Breath hold ---
  if (exercise.breathTechnique === 'breath_hold') {
    if (highStress)
      return { allowed: false, reason: 'Breathhold bei Stress ausgeschlossen' };
    if (lowStability)
      return {
        allowed: false,
        reason: 'Breathhold bei niedriger Stabilität ausgeschlossen',
      };
    if (breathBeginner)
      return {
        allowed: false,
        reason: 'Breathhold für Anfänger:innen ausgeschlossen',
      };
  }

  // --- General net: risky practices at very low stability ---
  // self_compassion is intentionally exempt so emotional processing stays
  // available even at low stability.
  if (
    lowStability &&
    exercise.contraindicationRisk >= 2 &&
    exercise.id !== 'self_compassion'
  )
    return {
      allowed: false,
      reason: 'Sehr niedrige Stabilität: riskante Übung ausgeschlossen',
    };

  // --- Evening: no strong activation ---
  if (isEvening && exercise.id === 'power_breath')
    return { allowed: false, reason: 'Abend: Power Breath ausgeschlossen' };

  // --- Deep-practice gating ---
  // Deep practices are only unlocked when the user explicitly chose the
  // `intense` intensity *and* the current profile is stable. self_compassion is
  // intentionally exempt so emotional processing stays available even at low
  // stability.
  if (exercise.depthCategory === 'deep' && exercise.id !== 'self_compassion') {
    const stableProfile =
      profile.stability > -1 && profile.stress < 1.2 && profile.heaviness < 1.5;
    const allowed =
      userSettings.practiceIntensity === 'intense' && stableProfile;
    if (!allowed)
      return {
        allowed: false,
        reason: 'Tiefenpraxis nur bei Intensität „intensiv“ und stabilem Befinden',
      };
  }

  return { allowed: true };
}
