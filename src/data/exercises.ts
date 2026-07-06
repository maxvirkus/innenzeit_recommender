import type { Exercise } from '../domain/types.js';

/**
 * Exercise catalogue. Each practice carries:
 *  - `family` + `mechanisms`: what kind of practice it is and how it is assumed
 *    to work (the recommender scores by mechanism fit, not by hard-wiring).
 *  - `evidenceProfile`: multi-facet plausibility (replaces the old single
 *    `sciencePrior`). Framed as plausibility leitplanken, not proof.
 *  - `intensity` / `emotionalDepth`: drive the soft safety multiplier.
 *  - `targets`: intended nudge per mood dimension, used by the
 *    profile-improvement fit.
 */
export const EXERCISES: Exercise[] = [
  {
    id: 'five_four_three_two_one',
    title: '5-4-3-2-1',
    description: 'Eine kurze Grounding-Übung über die Sinne.',
    durationMinutes: 3,
    stateGoals: ['grounding', 'stress_reduction'],
    longTermGoals: ['calm', 'stress_resilience'],
    family: 'grounding',
    mechanisms: ['sensory_grounding', 'attentional_anchoring'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 3,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 0,
    emotionalDepth: 0,
    depthCategory: 'basic',
    targets: { valence: 0, energy: 0, stress: -2, heaviness: -1, stability: 2 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 25,
        text: 'Komm in eine bequeme Haltung und lass die Schultern locker sinken. Wir gehen gleich mit der Aufmerksamkeit durch deine fünf Sinne und kommen so ganz im Hier und Jetzt an.',
      },
      {
        durationSeconds: 30,
        text: 'Schau dich in Ruhe um und finde fünf Dinge, die du sehen kannst. Nimm jedes einzeln wahr – eine Farbe, eine Form, ein Lichtreflex. Lass deinen Blick ohne Eile von einem zum nächsten wandern.',
      },
      {
        durationSeconds: 30,
        text: 'Richte deine Aufmerksamkeit jetzt auf das Hören. Nimm vier Geräusche wahr – vielleicht etwas Nahes und etwas Fernes, ein leises Summen, deinen eigenen Atem. Lausche jedem einen Moment nach.',
      },
      {
        durationSeconds: 30,
        text: 'Spüre nun drei Dinge, die du fühlen kannst. Den Kontakt deiner Füße zum Boden, die Kleidung auf der Haut, die Temperatur der Luft. Bleib bei jeder Empfindung kurz und neugierig.',
      },
      {
        durationSeconds: 25,
        text: 'Nimm zwei Dinge wahr, die du riechen kannst. Vielleicht ist es sehr fein oder kaum greifbar – das ist völlig in Ordnung. Atme einmal bewusst durch die Nase ein und bemerke, was da ist.',
      },
      {
        durationSeconds: 20,
        text: 'Und schließlich eine Sache, die du schmecken kannst. Vielleicht der Nachgeschmack von etwas, oder einfach der Geschmack in deinem Mund in diesem Moment.',
      },
      {
        durationSeconds: 20,
        text: 'Spüre zum Abschluss, wie du jetzt hier sitzt – wacher, geerdeter, mehr im gegenwärtigen Moment. Nimm dir noch einen ruhigen Atemzug, bevor du weitergehst.',
      },
    ],
  },
  {
    id: 'physiological_sigh',
    title: 'Physiological Sigh',
    description: 'Eine kurze Atemtechnik zur schnellen Regulation.',
    durationMinutes: 2,
    stateGoals: ['stress_reduction', 'grounding'],
    longTermGoals: ['calm', 'stress_resilience'],
    family: 'slow_breathing',
    mechanisms: ['parasympathetic_activation', 'attentional_anchoring'],
    evidenceProfile: {
      evidenceStrength: 3,
      mechanismFit: 3,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 1,
    emotionalDepth: 0,
    depthCategory: 'basic',
    targets: { valence: 0, energy: -1, stress: -3, heaviness: 0, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 20,
        text: 'Setz oder leg dich bequem hin und lass die Schultern sinken. Wir nutzen gleich einen doppelten Einatemzug, gefolgt von einem langen Ausatmen – das beruhigt den Körper besonders schnell.',
      },
      {
        durationSeconds: 30,
        text: 'Atme durch die Nase ein – und wenn die Lunge fast voll ist, setze noch einen kurzen zweiten Atemzug obendrauf. Atme dann langsam und vollständig durch den Mund aus, als würdest du sanft seufzen.',
      },
      {
        durationSeconds: 30,
        text: 'Noch einmal: durch die Nase einatmen, kurz nachziehen, und dann lang durch den Mund ausatmen. Lass das Ausatmen wirklich zu Ende kommen, ohne zu drücken.',
      },
      {
        durationSeconds: 25,
        text: 'Weiter in deinem Tempo: doppelt einatmen, lang ausatmen. Merke, wie sich mit jedem Ausatmen ein bisschen mehr Anspannung löst und der Körper ruhiger wird.',
      },
      {
        durationSeconds: 15,
        text: 'Lass den Atem jetzt wieder von allein fließen und spüre einen Moment nach, wie sich dein Zustand verändert hat.',
      },
    ],
  },
  {
    id: 'four_six_breathing',
    title: '4/6 Atmung',
    description: 'Einatmen auf 4, ausatmen auf 6. Sanft beruhigend.',
    durationMinutes: 4,
    stateGoals: ['stress_reduction', 'evening_regulation', 'grounding'],
    longTermGoals: ['calm', 'stress_resilience', 'sleep'],
    family: 'slow_breathing',
    mechanisms: ['parasympathetic_activation', 'attentional_anchoring'],
    evidenceProfile: {
      evidenceStrength: 3,
      mechanismFit: 3,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 1,
    emotionalDepth: 0,
    depthCategory: 'basic',
    targets: { valence: 0, energy: -1, stress: -2, heaviness: 0, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 25,
        text: 'Komm in eine bequeme, aufrechte Haltung und lass die Augen sanft schließen oder den Blick weich werden. Wir atmen gleich auf vier ein und auf sechs wieder aus – das längere Ausatmen wirkt beruhigend.',
      },
      {
        durationSeconds: 45,
        text: 'Atme ruhig durch die Nase ein und zähle dabei innerlich bis vier. Und dann atme langsam aus, während du bis sechs zählst. Ohne Anstrengung, in einem angenehmen Fluss.',
      },
      {
        durationSeconds: 50,
        text: 'Weiter so: einatmen – zwei – drei – vier. Und ausatmen – zwei – drei – vier – fünf – sechs. Lass den Rhythmus gleichmäßig und weich werden.',
      },
      {
        durationSeconds: 50,
        text: 'Bleib bei diesem Takt. Wenn Gedanken auftauchen, ist das völlig normal – kehre einfach freundlich zum Zählen deines Atems zurück.',
      },
      {
        durationSeconds: 45,
        text: 'Spüre, wie das lange Ausatmen deinen Körper mehr und mehr herunterfährt. Jeder Ausatemzug darf ein Stück Anspannung mitnehmen.',
      },
      {
        durationSeconds: 25,
        text: 'Lass den Atem nun wieder frei fließen und ruhe einen Moment in der entstandenen Ruhe, bevor du die Übung beendest.',
      },
    ],
  },
  {
    id: 'box_breathing',
    title: 'Box Breathing',
    description: 'Eine strukturierte Atemübung für Ruhe und Fokus.',
    durationMinutes: 4,
    stateGoals: ['focus', 'stress_reduction'],
    longTermGoals: ['focus', 'stress_resilience', 'calm'],
    family: 'slow_breathing',
    mechanisms: ['attentional_anchoring', 'parasympathetic_activation'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 2,
      populationFit: 2,
      appSuitability: 2,
      safetyConfidence: 2,
    },
    contraindicationRisk: 1,
    intensity: 2,
    emotionalDepth: 0,
    depthCategory: 'moderate',
    targets: { valence: 0, energy: 0, stress: -1, heaviness: 0, stability: 1 },
    breathTechnique: 'breath_hold',
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz dich aufrecht und bequem hin. Bei dieser Übung atmen wir in einem gleichmäßigen Quadrat: einatmen, halten, ausatmen, halten – jeweils gleich lang. Zähle innerlich ruhig bis vier für jede Phase.',
      },
      {
        durationSeconds: 50,
        text: 'Atme durch die Nase ein – zwei – drei – vier. Halte den Atem sanft – zwei – drei – vier. Atme aus – zwei – drei – vier. Und halte wieder – zwei – drei – vier.',
      },
      {
        durationSeconds: 50,
        text: 'Weiter in diesem Quadrat. Halte den Atem nur locker, ohne Druck oder Anstrengung. Wenn vier zu lang ist, wähle eine kürzere Zählung, die sich angenehm anfühlt.',
      },
      {
        durationSeconds: 50,
        text: 'Einatmen, halten, ausatmen, halten – finde deinen gleichmäßigen Rhythmus. Spüre, wie diese Struktur den Geist ordnet und den Fokus bündelt.',
      },
      {
        durationSeconds: 60,
        text: 'Lass den Atem jetzt wieder natürlich werden. Bleib noch einen Moment sitzen und bemerke die ruhige, klare Wachheit, die zurückbleibt.',
      },
    ],
  },
  {
    id: 'coherent_breathing',
    title: 'Kohärentes Atmen',
    description: 'Gleichmäßiges Atmen zur Stabilisierung und Integration.',
    durationMinutes: 5,
    stateGoals: ['positive_integration', 'evening_regulation'],
    longTermGoals: ['calm', 'stress_resilience', 'sleep'],
    family: 'slow_breathing',
    mechanisms: ['parasympathetic_activation', 'interoceptive_awareness'],
    evidenceProfile: {
      evidenceStrength: 3,
      mechanismFit: 3,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 1,
    emotionalDepth: 1,
    depthCategory: 'moderate',
    targets: { valence: 1, energy: 0, stress: -1, heaviness: -1, stability: 2 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Komm in eine bequeme Haltung und lass die Augen weich werden. Wir atmen gleich gleichmäßig und rund – etwa gleich lang ein wie aus – und lassen so Atmung und Nervensystem in einen ruhigen, kohärenten Takt kommen.',
      },
      {
        durationSeconds: 60,
        text: 'Atme sanft durch die Nase ein, ungefähr fünf Sekunden lang. Und atme genauso lang wieder aus. Kein Halten dazwischen – nur ein weiches, gleichmäßiges Wellen von Ein und Aus.',
      },
      {
        durationSeconds: 60,
        text: 'Bleib in diesem ruhigen Rhythmus, etwa fünf Sekunden ein, fünf Sekunden aus. Stell dir vielleicht eine langsam steigende und sinkende Welle vor, die deinen Atem trägt.',
      },
      {
        durationSeconds: 60,
        text: 'Spüre, wie sich mit jedem gleichmäßigen Zyklus eine sanfte innere Balance einstellt. Herz und Atem finden zusammen. Falls du abschweifst, kehre einfach ruhig zur Welle zurück.',
      },
      {
        durationSeconds: 60,
        text: 'Halte den Rhythmus noch einen Moment und lass dann den Atem frei fließen. Nimm die weiche, ausgeglichene Ruhe wahr, bevor du die Übung beendest.',
      },
      {
        durationSeconds: 30,
        text: 'Ruhe zum Abschluss noch einen Atemzug lang in diesem stabilen, integrierten Zustand und komm dann in deinem Tempo zurück.',
      },
    ],
  },
  {
    id: 'power_breath',
    title: 'Power Breath',
    description: 'Eine aktivierende Atemübung für mehr Energie.',
    durationMinutes: 3,
    stateGoals: ['gentle_activation', 'focus'],
    longTermGoals: ['energy', 'focus'],
    family: 'activation_breathing',
    mechanisms: ['behavioral_activation'],
    evidenceProfile: {
      evidenceStrength: 1,
      mechanismFit: 2,
      populationFit: 1,
      appSuitability: 1,
      safetyConfidence: 1,
    },
    contraindicationRisk: 3,
    intensity: 3,
    emotionalDepth: 0,
    depthCategory: 'moderate',
    targets: { valence: 1, energy: 3, stress: 1, heaviness: -1, stability: -1 },
    breathTechnique: 'rapid_breathing',
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz dich aufrecht und stabil hin. Diese Atmung ist aktivierend und darf Energie wecken. Wenn dir schwindelig wird, halte einfach an und atme normal weiter – höre immer auf deinen Körper.',
      },
      {
        durationSeconds: 40,
        text: 'Wir beginnen mit kräftigeren Atemzügen: atme zügig durch die Nase ein und lass durch den Mund wieder locker los. Ein – aus, ein – aus, in einem belebenden, gleichmäßigen Tempo.',
      },
      {
        durationSeconds: 40,
        text: 'Bleib in diesem aktivierenden Rhythmus. Spüre, wie mehr Frische in Brust und Kopf kommt, wie der Körper wacher wird. Bleib dabei aufrecht und präsent.',
      },
      {
        durationSeconds: 40,
        text: 'Halte die kräftige Atmung noch einen Moment und spüre die aufsteigende Energie. Wenn es genug ist, darfst du jederzeit sanfter werden.',
      },
      {
        durationSeconds: 30,
        text: 'Lass die Atmung nun bewusst ruhiger werden und kehre zu einem normalen, entspannten Atem zurück. Spüre nach, wie wach und belebt du dich jetzt fühlst.',
      },
    ],
  },
  {
    id: 'body_scan',
    title: 'Body Scan',
    description: 'Eine ruhige Körperwahrnehmungsübung.',
    durationMinutes: 6,
    stateGoals: ['emotional_support', 'evening_regulation', 'grounding'],
    longTermGoals: ['emotional_processing', 'calm', 'sleep'],
    family: 'body_scan',
    mechanisms: ['interoceptive_awareness', 'attentional_anchoring'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 2,
      populationFit: 2,
      appSuitability: 2,
      safetyConfidence: 2,
    },
    contraindicationRisk: 1,
    intensity: 0,
    emotionalDepth: 2,
    depthCategory: 'moderate',
    targets: { valence: 1, energy: -1, stress: -1, heaviness: -2, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Leg dich bequem hin oder setz dich entspannt. Schließ die Augen, wenn es sich gut anfühlt. Wir wandern gleich langsam mit der Aufmerksamkeit durch den Körper – ohne etwas ändern zu müssen, einfach wahrnehmend.',
      },
      {
        durationSeconds: 55,
        text: 'Beginne bei deinen Füßen. Spüre die Zehen, die Fußsohlen, die Fersen. Nimm wahr, was da ist – Wärme, Kribbeln, Druck oder auch nichts Bestimmtes. Lass die Füße dann ganz los.',
      },
      {
        durationSeconds: 55,
        text: 'Wandere hinauf in Unterschenkel und Knie, in die Oberschenkel. Spüre das Gewicht der Beine, wie sie auf der Unterlage ruhen. Mit jedem Ausatmen dürfen sie schwerer und entspannter werden.',
      },
      {
        durationSeconds: 55,
        text: 'Richte die Aufmerksamkeit auf Becken, Bauch und unteren Rücken. Spüre, wie sich der Bauch mit dem Atem hebt und senkt. Lass diesen ganzen Bereich weich werden.',
      },
      {
        durationSeconds: 55,
        text: 'Wandere weiter in Brustkorb und oberen Rücken, in die Schultern. Lass die Schultern von den Ohren wegsinken. Spüre den ruhigen Rhythmus deines Atems im Brustraum.',
      },
      {
        durationSeconds: 55,
        text: 'Nimm nun Arme und Hände wahr, bis in die Fingerspitzen. Und dann Nacken, Gesicht und Kopf – lass Stirn, Augen und Kiefer locker werden. Der ganze Kopf darf sich entspannen.',
      },
      {
        durationSeconds: 55,
        text: 'Spüre zum Schluss den ganzen Körper als Ganzes, ruhend und atmend. Bleib noch einen Moment in dieser gesammelten Ruhe, bevor du dich sanft wieder bewegst.',
      },
    ],
  },
  {
    id: 'self_compassion',
    title: 'Selbstmitgefühl',
    description: 'Eine Übung, um schwierige Gefühle freundlich wahrzunehmen.',
    durationMinutes: 5,
    stateGoals: ['emotional_support'],
    longTermGoals: ['self_compassion', 'emotional_processing'],
    family: 'self_compassion',
    mechanisms: ['self_compassion', 'interoceptive_awareness'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 3,
      populationFit: 2,
      appSuitability: 2,
      safetyConfidence: 2,
    },
    contraindicationRisk: 1,
    intensity: 1,
    emotionalDepth: 2,
    depthCategory: 'deep',
    targets: { valence: 2, energy: 0, stress: -1, heaviness: -2, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Komm in eine bequeme Haltung und atme ein paar Mal ruhig durch. Diese Übung lädt dich ein, dir mit Freundlichkeit zu begegnen – besonders dann, wenn gerade etwas schwer ist.',
      },
      {
        durationSeconds: 60,
        text: 'Spüre nach innen: Ist da gerade etwas Schwieriges, ein Druck, eine Sorge, ein unangenehmes Gefühl? Du musst es nicht wegmachen. Erkenne einfach an: Ja, das ist gerade da, und es tut weh.',
      },
      {
        durationSeconds: 60,
        text: 'Erinnere dich sanft: Schwere Momente gehören zum Menschsein dazu. Du bist damit nicht allein – so vielen Menschen geht es manchmal ähnlich. Das verbindet dich mit anderen, statt dich abzutrennen.',
      },
      {
        durationSeconds: 60,
        text: 'Leg vielleicht eine Hand auf die Brust oder den Bauch und sprich innerlich freundlich mit dir, so wie mit einem guten Freund: „Möge ich in diesem Moment gut zu mir sein. Möge ich mir die Freundlichkeit geben, die ich brauche.“',
      },
      {
        durationSeconds: 60,
        text: 'Bleib noch einen Moment bei dieser warmen, zugewandten Haltung dir selbst gegenüber. Spüre, ob sich etwas – und sei es nur ein wenig – weicher anfühlt.',
      },
      {
        durationSeconds: 30,
        text: 'Nimm zum Abschluss einen ruhigen Atemzug und trag diese Freundlichkeit mit dir, wenn du die Übung langsam beendest.',
      },
    ],
  },
  {
    id: 'goal_visualization',
    title: 'Zielvisualisierung',
    description: 'Eine leichte Visualisierung für Ausrichtung und Motivation.',
    durationMinutes: 5,
    stateGoals: ['focus', 'positive_integration'],
    longTermGoals: ['focus', 'energy'],
    family: 'visualization',
    mechanisms: ['cognitive_reappraisal', 'positive_affect_broadening'],
    evidenceProfile: {
      evidenceStrength: 1,
      mechanismFit: 2,
      populationFit: 2,
      appSuitability: 2,
      safetyConfidence: 3,
    },
    contraindicationRisk: 1,
    intensity: 1,
    emotionalDepth: 1,
    depthCategory: 'moderate',
    targets: { valence: 2, energy: 1, stress: 0, heaviness: -1, stability: 0 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz dich bequem hin und atme ein paar Mal ruhig durch. Wir richten uns gleich innerlich auf etwas aus, das dir wichtig ist – ein Ziel, eine Absicht, ein Bild davon, wie du sein möchtest.',
      },
      {
        durationSeconds: 60,
        text: 'Lass ein Ziel oder eine Absicht auftauchen, die dir gerade am Herzen liegt. Es muss nicht groß sein. Halte es als klares Bild vor deinem inneren Auge und lass es lebendig werden.',
      },
      {
        durationSeconds: 60,
        text: 'Stell dir vor, dieses Ziel wäre bereits erreicht. Wie fühlt sich das an? Was siehst du, was hörst du, wie hältst du dich? Male dir die Szene in warmen, konkreten Details aus.',
      },
      {
        durationSeconds: 60,
        text: 'Spüre die positive Kraft, die von diesem Bild ausgeht – die Motivation, die Klarheit, die Vorfreude. Lass dieses Gefühl deinen Körper füllen und dich innerlich ausrichten.',
      },
      {
        durationSeconds: 60,
        text: 'Frage dich sanft: Was wäre ein kleiner, nächster Schritt in diese Richtung? Lass eine Antwort auftauchen, ohne sie zu erzwingen, und nimm sie freundlich an.',
      },
      {
        durationSeconds: 30,
        text: 'Atme noch einmal tief durch und nimm die Ausrichtung und Motivation mit, wenn du die Übung beendest und die Augen wieder öffnest.',
      },
    ],
  },
  {
    id: 'activating_breath',
    title: 'Aktivierende Atmung',
    description:
      'Sanft belebende Atmung mit etwas längerer Einatmung – weckt die Aufmerksamkeit, ohne zu überfordern.',
    durationMinutes: 4,
    stateGoals: ['gentle_activation', 'focus'],
    longTermGoals: ['energy', 'focus'],
    family: 'activation_breathing',
    mechanisms: ['behavioral_activation', 'attentional_anchoring'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 2,
      populationFit: 2,
      appSuitability: 3,
      safetyConfidence: 2,
    },
    contraindicationRisk: 1,
    intensity: 2,
    emotionalDepth: 0,
    depthCategory: 'basic',
    targets: { valence: 1, energy: 2, stress: 0, heaviness: 0, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz dich aufrecht und wach hin, die Füße fest am Boden. Diese Atmung weckt sanft deine Aufmerksamkeit, ohne zu überfordern. Wir betonen das Einatmen ein wenig, um Frische in den Körper zu bringen.',
      },
      {
        durationSeconds: 50,
        text: 'Atme etwas länger und bewusster durch die Nase ein, als würdest du frische Morgenluft aufnehmen. Und lass dann locker und ohne Anstrengung wieder ausatmen. Ein langes Ein, ein leichtes Aus.',
      },
      {
        durationSeconds: 50,
        text: 'Weiter so: mit dem Einatmen holst du Energie und Wachheit herein, mit dem Ausatmen bleibst du entspannt. Spüre, wie es im Brustraum und im Kopf allmählich klarer wird.',
      },
      {
        durationSeconds: 50,
        text: 'Stell dir beim Einatmen vielleicht vor, wie helle, belebende Energie in dich einströmt und sich im ganzen Körper verteilt. Bleib aufrecht und präsent bei jedem Atemzug.',
      },
      {
        durationSeconds: 60,
        text: 'Lass die Atmung nun wieder natürlich werden und spüre nach: eine wache, freundliche Präsenz, mehr Energie als zuvor, aber ruhig und geerdet. Komm in deinem Tempo zurück.',
      },
    ],
  },
  {
    id: 'energy_meditation',
    title: 'Energie-Meditation',
    description:
      'Eine kurze, wache Meditation, die über die Körperwahrnehmung sanft Energie und Präsenz aufbaut.',
    durationMinutes: 5,
    stateGoals: ['gentle_activation', 'grounding'],
    longTermGoals: ['energy', 'calm'],
    family: 'attention_focus',
    mechanisms: ['behavioral_activation', 'interoceptive_awareness'],
    evidenceProfile: {
      evidenceStrength: 1,
      mechanismFit: 2,
      populationFit: 2,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 1,
    emotionalDepth: 1,
    depthCategory: 'basic',
    targets: { valence: 1, energy: 1, stress: 0, heaviness: -1, stability: 2 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz dich bequem und aufrecht hin und schließ sanft die Augen. Diese kurze, wache Meditation baut über die Körperwahrnehmung ganz behutsam Energie und Präsenz auf.',
      },
      {
        durationSeconds: 60,
        text: 'Spüre zunächst deinen Kontakt zum Boden und zum Sitz – stabil und getragen. Nimm ein paar ruhige Atemzüge und lass dich ganz hier ankommen, wach und aufmerksam zugleich.',
      },
      {
        durationSeconds: 60,
        text: 'Lenke die Aufmerksamkeit in deine Körpermitte, in Bauch und Brust. Stell dir vor, dort glimmt eine ruhige, warme Energie – mit jedem Atemzug wird sie ein wenig heller und lebendiger.',
      },
      {
        durationSeconds: 60,
        text: 'Lass diese wache Energie sich langsam ausbreiten: in die Arme, in die Beine, bis in Hände und Füße. Spüre, wie der ganze Körper präsenter und belebter wird, ohne Hektik.',
      },
      {
        durationSeconds: 60,
        text: 'Ruhe noch einen Moment in dieser klaren, wachen Präsenz. Spüre, dass du zugleich energiegeladen und ruhig sein kannst, und komm dann sanft zurück.',
      },
      {
        durationSeconds: 30,
        text: 'Öffne die Augen, wenn du bereit bist, und nimm diese wache, geerdete Energie mit in das, was als Nächstes kommt.',
      },
    ],
  },
  {
    id: 'gratitude_reflection',
    timeAffinity: 'evening',
    title: 'Dankbarkeits-Reflexion',
    description:
      'Eine kurze Reflexion über drei Dinge, die heute gut waren.',
    durationMinutes: 4,
    stateGoals: ['positive_integration', 'emotional_support'],
    longTermGoals: ['self_compassion', 'emotional_processing', 'calm'],
    family: 'gratitude',
    mechanisms: ['positive_affect_broadening'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 2,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 0,
    emotionalDepth: 1,
    depthCategory: 'basic',
    targets: { valence: 2, energy: 0, stress: 0, heaviness: -1, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz dich bequem hin und atme ein paar Mal ruhig durch. Wir lassen gleich den Blick sanft auf das Gute im Heute fallen – auf drei Dinge, die heute schön oder hilfreich waren, ganz gleich wie klein.',
      },
      {
        durationSeconds: 60,
        text: 'Lass ein erstes Ding auftauchen, für das du heute dankbar sein kannst. Vielleicht ein Moment der Ruhe, eine nette Begegnung, ein guter Schluck Kaffee. Ruf es dir bildhaft in Erinnerung und spüre, was es in dir auslöst.',
      },
      {
        durationSeconds: 60,
        text: 'Nun ein zweites. Etwas, das dir heute gut getan hat oder das dich unterstützt hat. Verweile einen Moment dabei und lass das warme Gefühl der Dankbarkeit sich ausbreiten.',
      },
      {
        durationSeconds: 60,
        text: 'Und ein drittes. Vielleicht etwas an dir selbst, das du heute gut gemacht hast, oder etwas, das einfach da war und dich getragen hat. Nimm es bewusst wahr und würdige es.',
      },
      {
        durationSeconds: 30,
        text: 'Spüre zum Abschluss die Wärme, die durch das Erinnern an diese guten Dinge entstanden ist, und nimm sie mit, wenn du die Übung beendest.',
      },
    ],
  },
  {
    id: 'breath_counting',
    title: 'Atem zählen',
    description:
      'Den Atem ruhig mitzählen – bündelt die Aufmerksamkeit, ohne zusätzlich zu aktivieren.',
    durationMinutes: 4,
    stateGoals: ['focus', 'evening_regulation'],
    longTermGoals: ['focus', 'calm'],
    family: 'attention_focus',
    mechanisms: ['attentional_anchoring'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 3,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 0,
    emotionalDepth: 0,
    depthCategory: 'basic',
    targets: { valence: 0, energy: 0, stress: -1, heaviness: 0, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz dich bequem und aufrecht hin und lass die Augen sanft schließen. Wir zählen gleich ruhig den Atem mit – das bündelt die Aufmerksamkeit, ohne zusätzlich aufzuputschen.',
      },
      {
        durationSeconds: 50,
        text: 'Atme ganz natürlich, ohne etwas zu verändern. Zähle beim Ausatmen innerlich „eins“. Beim nächsten Ausatmen „zwei“, dann „drei“, und so weiter bis „zehn“.',
      },
      {
        durationSeconds: 50,
        text: 'Wenn du bei zehn angekommen bist, beginne wieder bei eins. Der Atem darf dabei ganz von allein fließen – du zählst nur mit, ruhig und gelassen.',
      },
      {
        durationSeconds: 50,
        text: 'Wenn du merkst, dass die Gedanken abschweifen oder du die Zahl verloren hast, ist das völlig normal. Beginne einfach freundlich wieder bei eins. Genau das ist die Übung.',
      },
      {
        durationSeconds: 60,
        text: 'Lass das Zählen nun los und ruhe noch einen Moment im ruhigen Atem. Spüre die gesammelte, klare Aufmerksamkeit, bevor du die Übung beendest.',
      },
    ],
  },
  {
    id: 'hand_on_heart',
    title: 'Hand aufs Herz',
    description:
      'Eine Hand auf die Brust legen und warm mit sich sprechen – gibt emotionalen Halt über Körperkontakt.',
    durationMinutes: 4,
    stateGoals: ['emotional_support', 'grounding'],
    longTermGoals: ['self_compassion', 'calm'],
    family: 'self_compassion',
    mechanisms: ['self_compassion', 'interoceptive_awareness'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 3,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 0,
    emotionalDepth: 2,
    depthCategory: 'basic',
    targets: { valence: 1, energy: 0, stress: -1, heaviness: -1, stability: 2 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz oder leg dich bequem hin. Leg eine Hand sanft auf die Mitte deiner Brust und spüre den ruhigen Kontakt. Diese Berührung gibt Halt und signalisiert dem Körper Sicherheit.',
      },
      {
        durationSeconds: 50,
        text: 'Spüre die Wärme und das leichte Gewicht deiner Hand auf der Brust. Vielleicht bemerkst du deinen Herzschlag oder das Heben und Senken beim Atmen. Bleib einfach freundlich bei dieser Empfindung.',
      },
      {
        durationSeconds: 50,
        text: 'Sprich nun innerlich warm mit dir, so wie mit jemandem, den du gern hast: „Ich bin hier. Es ist okay, dass ich mich gerade so fühle. Ich darf gut zu mir sein.“',
      },
      {
        durationSeconds: 50,
        text: 'Lass mit jedem Ausatmen ein wenig mehr Anspannung los. Die Hand auf dem Herzen bleibt als ruhiger Anker, der dir Halt gibt. Nimm dir alle Zeit, die du brauchst.',
      },
      {
        durationSeconds: 60,
        text: 'Spüre zum Abschluss nach, wie sich dieser warme Kontakt anfühlt. Wenn du magst, lass die Hand noch einen Moment liegen, bevor du sie sanft löst und die Übung beendest.',
      },
    ],
  },
  {
    id: 'grounding_breath',
    title: 'Erdungsatmung',
    description:
      'Ruhige Atmung verbunden mit dem Spüren des Bodenkontakts – beruhigt und erdet zugleich.',
    durationMinutes: 4,
    stateGoals: ['grounding', 'stress_reduction', 'evening_regulation'],
    longTermGoals: ['calm', 'stress_resilience'],
    family: 'slow_breathing',
    mechanisms: ['parasympathetic_activation', 'sensory_grounding'],
    evidenceProfile: {
      evidenceStrength: 3,
      mechanismFit: 3,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 1,
    emotionalDepth: 0,
    depthCategory: 'basic',
    targets: { valence: 0, energy: -1, stress: -2, heaviness: -1, stability: 2 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz dich aufrecht und bequem hin und spüre deine Füße auf dem Boden. Wir verbinden gleich ruhiges Atmen mit dem Gefühl von festem Bodenkontakt – das beruhigt und erdet zugleich.',
      },
      {
        durationSeconds: 50,
        text: 'Spüre bewusst, wie deine Füße den Boden berühren und wie dein Sitz dich trägt. Nimm wahr, dass du sicher gehalten wirst – der Boden ist stabil unter dir und trägt dein ganzes Gewicht.',
      },
      {
        durationSeconds: 50,
        text: 'Atme nun ruhig durch die Nase ein und lang wieder aus. Stell dir beim Ausatmen vor, wie sich Anspannung nach unten löst, durch die Beine, in den Boden hinein.',
      },
      {
        durationSeconds: 50,
        text: 'Mit jedem Atemzug etwas mehr Erdung: einatmen und Stabilität spüren, ausatmen und schwerer, ruhiger werden. Du bist verbunden – oben der ruhige Atem, unten der feste Boden.',
      },
      {
        durationSeconds: 60,
        text: 'Lass den Atem wieder frei fließen und bleib noch einen Moment mit dem Gefühl von Halt und Erdung. Nimm diese Stabilität mit, wenn du die Übung sanft beendest.',
      },
    ],
  },
  {
    id: 'emotion_body_location',
    title: 'Emotion im Körper lokalisieren',
    description:
      'Ein Gefühl im Körper wahrnehmen und benennen, ohne es sofort verändern zu müssen.',
    durationMinutes: 5,
    stateGoals: ['emotional_support'],
    longTermGoals: ['emotional_processing', 'self_compassion'],
    family: 'body_scan',
    mechanisms: ['interoceptive_awareness', 'self_compassion'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 2,
      populationFit: 2,
      appSuitability: 2,
      safetyConfidence: 2,
    },
    contraindicationRisk: 1,
    intensity: 1,
    emotionalDepth: 2,
    depthCategory: 'moderate',
    targets: { valence: 1, energy: 0, stress: -1, heaviness: -2, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Setz oder leg dich bequem hin und schließ sanft die Augen. Wir nehmen gleich ein Gefühl im Körper wahr und benennen es – ganz ohne es sofort verändern zu müssen.',
      },
      {
        durationSeconds: 60,
        text: 'Spüre einen Moment nach innen. Ist da gerade eine Emotion oder Stimmung? Vielleicht Unruhe, Schwere, Anspannung, Traurigkeit – oder auch etwas Angenehmes. Was auch immer da ist, es darf da sein.',
      },
      {
        durationSeconds: 60,
        text: 'Frage dich freundlich: Wo im Körper spüre ich dieses Gefühl am deutlichsten? Vielleicht in der Brust, im Bauch, im Hals, in den Schultern. Lass deine Aufmerksamkeit sanft dorthin wandern.',
      },
      {
        durationSeconds: 60,
        text: 'Nimm die Empfindung genauer wahr, ohne sie wegzumachen. Ist sie eng oder weit, warm oder kühl, ruhig oder in Bewegung? Du kannst ihr innerlich einen Namen geben: „Das hier ist Anspannung“ oder „Das hier ist Traurigkeit“.',
      },
      {
        durationSeconds: 60,
        text: 'Bleib mit freundlicher, offener Aufmerksamkeit bei dieser Stelle. Atme dorthin und lass das Gefühl einfach da sein, so wie es ist. Allein das Wahrnehmen und Benennen darf schon entlasten.',
      },
      {
        durationSeconds: 30,
        text: 'Löse dich zum Abschluss sanft von der Beobachtung, nimm einen ruhigen Atemzug und komm in deinem Tempo zurück.',
      },
    ],
  },
  {
    id: 'loving_kindness',
    title: 'Liebevolle Güte (Metta)',
    description:
      'Wohlwollende Wünsche zuerst für dich, dann für andere – für mehr Wärme und Verbundenheit.',
    durationMinutes: 5,
    stateGoals: ['positive_integration'],
    longTermGoals: ['self_compassion', 'emotional_processing'],
    family: 'self_compassion',
    mechanisms: ['self_compassion', 'positive_affect_broadening'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 3,
      populationFit: 2,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 0,
    emotionalDepth: 2,
    depthCategory: 'moderate',
    targets: { valence: 2, energy: 0, stress: -1, heaviness: -1, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Komm in eine bequeme, aufrechte Haltung und lass die Augen sanft schließen. Wir richten gleich freundliche, gute Wünsche zuerst an dich selbst und dann nach und nach an andere.',
      },
      {
        durationSeconds: 55,
        text: 'Spüre einen Moment zu dir selbst. Wiederhole innerlich in deinem eigenen Tempo: „Möge ich sicher sein. Möge ich gesund sein. Möge ich zufrieden sein. Möge ich leicht durch diesen Tag gehen.“ Lass die Worte wirken, ohne etwas erzwingen zu müssen.',
      },
      {
        durationSeconds: 55,
        text: 'Denk nun an einen Menschen, den du gern hast. Stell ihn dir vor und wünsche ihm dasselbe: „Mögest du sicher sein. Mögest du gesund sein. Mögest du zufrieden sein.“ Spüre die Wärme, die dabei entsteht.',
      },
      {
        durationSeconds: 55,
        text: 'Denk jetzt an eine Person, die du kaum kennst – jemanden, dem du im Alltag begegnest. Auch ihr schickst du still deine guten Wünsche: „Mögest du sicher sein. Mögest du zufrieden sein.“',
      },
      {
        durationSeconds: 55,
        text: 'Weite die guten Wünsche schließlich aus – auf alle Menschen um dich herum, auf alle Wesen: „Mögen alle sicher sein. Mögen alle zufrieden sein.“ Lass dieses weite, wohlwollende Gefühl da sein.',
      },
      {
        durationSeconds: 50,
        text: 'Kehr zum Abschluss sanft zu dir zurück. Spüre nach, wie sich diese Wünsche anfühlen, nimm einen ruhigen Atemzug und öffne in deinem Tempo wieder die Augen.',
      },
    ],
  },
  {
    id: 'savoring',
    title: 'Genussmoment',
    description:
      'Einen angenehmen Moment bewusst auskosten und verankern, um Positives zu vertiefen.',
    durationMinutes: 3,
    stateGoals: ['positive_integration'],
    longTermGoals: ['calm', 'stress_resilience'],
    family: 'gratitude',
    mechanisms: ['positive_affect_broadening', 'attentional_anchoring'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 2,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 0,
    emotionalDepth: 1,
    depthCategory: 'basic',
    targets: { valence: 2, energy: 0, stress: -1, heaviness: -1, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 25,
        text: 'Setz dich bequem hin und lass die Schultern sinken. Wir kosten gleich einen angenehmen Moment ganz bewusst aus – das verstärkt positive Gefühle und macht sie greifbarer.',
      },
      {
        durationSeconds: 40,
        text: 'Ruf dir einen schönen Moment aus der letzten Zeit ins Gedächtnis. Etwas Kleines genügt – ein gutes Gespräch, ein Sonnenstrahl, ein Schluck von etwas Warmem. Lass das Bild vor deinem inneren Auge auftauchen.',
      },
      {
        durationSeconds: 40,
        text: 'Tauch in die Einzelheiten ein. Was hast du gesehen, gehört, gespürt? Nimm die Farben, Geräusche und Empfindungen wahr, als wärst du wieder mittendrin. Lass den Moment lebendig werden.',
      },
      {
        durationSeconds: 45,
        text: 'Bemerke, wie sich dieses Angenehme jetzt im Körper anfühlt – vielleicht ein Lächeln, eine Weite in der Brust, eine ruhige Wärme. Bleib bewusst dabei und lass das gute Gefühl sich ausbreiten.',
      },
      {
        durationSeconds: 30,
        text: 'Nimm zum Abschluss einen ruhigen Atemzug und das Wissen mit, dass du solche Momente jederzeit wieder hervorholen kannst. Komm sanft zurück in den Raum.',
      },
    ],
  },
  {
    id: 'morning_activation',
    timeAffinity: 'morning',
    title: 'Morgen-Aktivierung',
    description:
      'Atem und sanftes Dehnen, um wach und mit klarem Kopf in den Tag zu starten.',
    durationMinutes: 4,
    stateGoals: ['gentle_activation', 'focus'],
    longTermGoals: ['energy', 'focus'],
    family: 'activation_breathing',
    mechanisms: ['behavioral_activation', 'attentional_anchoring'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 2,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 2,
    emotionalDepth: 0,
    depthCategory: 'basic',
    targets: { valence: 1, energy: 2, stress: 0, heaviness: 0, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 30,
        text: 'Stell dich locker hin oder setz dich aufrecht. Wir bringen jetzt mit Atem und sanfter Bewegung Schwung in den Körper, um wach und klar in den Tag zu starten.',
      },
      {
        durationSeconds: 45,
        text: 'Streck dich beim Einatmen weit nach oben, als wolltest du die Decke berühren, und lass die Arme beim Ausatmen locker sinken. Wiederhole das ein paar Mal in deinem Tempo und spüre, wie der Körper aufwacht.',
      },
      {
        durationSeconds: 45,
        text: 'Roll nun langsam die Schultern nach hinten und lass den Nacken sanft von einer Seite zur anderen wandern. Atme dabei ruhig weiter und löse, was noch schwer oder steif ist.',
      },
      {
        durationSeconds: 45,
        text: 'Atme jetzt bewusst tiefer: kräftig durch die Nase ein, sodass sich der Brustkorb weitet, und lebendig durch den Mund aus. Ein paar solcher Atemzüge bringen frische Energie und Wachheit.',
      },
      {
        durationSeconds: 45,
        text: 'Spür einen Moment, wie der Körper jetzt wacher und präsenter ist. Setz dir innerlich eine einfache, freundliche Absicht für den Tag – etwas, das dir wichtig ist.',
      },
      {
        durationSeconds: 30,
        text: 'Lass den Atem wieder ruhig fließen, spüre die neue Wachheit und geh mit einem klaren, offenen Gefühl in deinen Tag.',
      },
    ],
  },
  {
    id: 'walking_grounding',
    environment: 'space_to_move',
    title: 'Gehende Erdung',
    description:
      'Erden über die Sinne in Bewegung – Grounding mit sanfter Aktivierung.',
    durationMinutes: 4,
    stateGoals: ['grounding', 'gentle_activation'],
    longTermGoals: ['calm', 'energy'],
    family: 'grounding',
    mechanisms: ['sensory_grounding', 'behavioral_activation'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 2,
      populationFit: 3,
      appSuitability: 2,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 1,
    emotionalDepth: 0,
    depthCategory: 'basic',
    targets: { valence: 1, energy: 1, stress: -1, heaviness: -1, stability: 2 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 25,
        text: 'Steh bequem auf und finde einen Platz, an dem du ein paar Schritte gehen kannst – drinnen oder draußen. Wir erden dich gleich über die Sinne, während du dich langsam bewegst.',
      },
      {
        durationSeconds: 40,
        text: 'Beginne, sehr langsam zu gehen. Spüre bei jedem Schritt bewusst, wie dein Fuß den Boden berührt – zuerst die Ferse, dann der ganze Fuß, dann das sanfte Abrollen. Lass dir für jeden Schritt Zeit.',
      },
      {
        durationSeconds: 45,
        text: 'Nimm jetzt wahr, was du siehst. Lass deinen Blick ruhig über Formen und Farben um dich herum wandern, ohne etwas festzuhalten. Einfach schauen, während du weitergehst.',
      },
      {
        durationSeconds: 45,
        text: 'Richte deine Aufmerksamkeit auf das Hören. Welche Geräusche sind da – nah und fern? Und spüre die Luft auf deiner Haut, die Temperatur, vielleicht einen leichten Luftzug.',
      },
      {
        durationSeconds: 45,
        text: 'Verbinde nun Atem und Schritte: Atme über zwei, drei Schritte ein und über ebenso viele wieder aus. Spüre, wie Bewegung und Atem dich ruhig und zugleich wach machen.',
      },
      {
        durationSeconds: 40,
        text: 'Komm langsam zum Stehen. Spüre den festen Kontakt beider Füße zum Boden, nimm einen ruhigen Atemzug und bemerke, wie geerdet und präsent du jetzt bist.',
      },
    ],
  },
  {
    id: 'progressive_relaxation',
    title: 'Progressive Muskelentspannung',
    description:
      'Muskelgruppen kurz anspannen und bewusst loslassen – körperlich tief entspannen.',
    durationMinutes: 6,
    stateGoals: ['stress_reduction', 'evening_regulation', 'grounding'],
    longTermGoals: ['calm', 'stress_resilience', 'sleep'],
    family: 'body_scan',
    mechanisms: ['parasympathetic_activation', 'interoceptive_awareness'],
    evidenceProfile: {
      evidenceStrength: 3,
      mechanismFit: 3,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 1,
    emotionalDepth: 1,
    depthCategory: 'basic',
    targets: { valence: 1, energy: -1, stress: -2, heaviness: -1, stability: 2 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 40,
        text: 'Leg oder setz dich bequem hin und lass die Augen sanft schließen. Wir spannen gleich der Reihe nach einzelne Muskelgruppen kurz an und lassen sie dann bewusst wieder los – das entspannt den Körper tief.',
      },
      {
        durationSeconds: 55,
        text: 'Beginne mit den Händen und Armen. Balle beim Einatmen die Fäuste und spanne die Arme für ein paar Sekunden fest an. Und beim Ausatmen: alles loslassen. Spüre den Unterschied zwischen Anspannung und Lösung.',
      },
      {
        durationSeconds: 55,
        text: 'Nun das Gesicht. Zieh die Stirn kurz zusammen, kneif die Augen zu und spann den Kiefer an. Halte kurz – und dann löse alles, lass das Gesicht ganz weich werden.',
      },
      {
        durationSeconds: 55,
        text: 'Zieh jetzt die Schultern zu den Ohren hoch und spanne den Nacken an. Halte einen Moment die Spannung – und lass die Schultern dann schwer nach unten sinken. Spüre die Wärme, die sich ausbreitet.',
      },
      {
        durationSeconds: 55,
        text: 'Spanne nun sanft Bauch und Rücken an, als würdest du dich leicht aufrichten. Halte kurz – und lass beim Ausatmen wieder ganz los. Der Rumpf wird weich und ruhig.',
      },
      {
        durationSeconds: 55,
        text: 'Zum Schluss die Beine und Füße. Streck die Beine leicht, zieh die Zehen an und spanne alles an. Halte einen Moment – und dann lösen, komplett loslassen. Die Beine werden schwer und ruhig.',
      },
      {
        durationSeconds: 45,
        text: 'Spüre jetzt den ganzen Körper als Ganzes – gelöst, schwer, ruhig. Bleib noch einen Moment in dieser Entspannung, nimm einen ruhigen Atemzug und komm dann sanft zurück.',
      },
    ],
  },
  {
    id: 'sleep_body_scan',
    timeAffinity: 'evening',
    title: 'Einschlaf-Bodyscan',
    description:
      'Eine ruhige Reise durch den Körper zum Loslassen und Einschlafen.',
    durationMinutes: 7,
    stateGoals: ['evening_regulation'],
    longTermGoals: ['sleep', 'calm'],
    family: 'body_scan',
    mechanisms: ['interoceptive_awareness', 'parasympathetic_activation'],
    evidenceProfile: {
      evidenceStrength: 3,
      mechanismFit: 3,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 0,
    emotionalDepth: 1,
    depthCategory: 'basic',
    targets: { valence: 1, energy: -2, stress: -2, heaviness: 0, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 40,
        text: 'Leg dich bequem hin, so wie du schlafen möchtest, und lass die Augen sanft schließen. Wir gehen jetzt langsam mit der Aufmerksamkeit durch den Körper und lassen mit jedem Abschnitt mehr los.',
      },
      {
        durationSeconds: 60,
        text: 'Beginne bei den Füßen. Spüre sie einfach, so wie sie daliegen – schwer, warm, ruhig. Mit jedem Ausatmen darfst du sie ein bisschen mehr sinken und loslassen. Es gibt nichts zu tun außer wahrzunehmen.',
      },
      {
        durationSeconds: 60,
        text: 'Lass die Aufmerksamkeit langsam in die Beine wandern – Waden, Knie, Oberschenkel. Spüre ihr Gewicht und wie sie schwerer werden. Alles darf weich und ruhig sein.',
      },
      {
        durationSeconds: 60,
        text: 'Wandere weiter in Becken, Bauch und Rücken. Spüre, wie der Atem den Bauch sanft hebt und senkt, ganz von allein. Mit jedem Ausatmen sinkt der Rumpf tiefer in die Unterlage.',
      },
      {
        durationSeconds: 60,
        text: 'Lass nun die Brust, die Schultern und die Arme los. Fühle, wie die Schultern nach unten schmelzen und die Arme schwer werden. Nichts musst du halten – alles darf ruhen.',
      },
      {
        durationSeconds: 60,
        text: 'Bring die Aufmerksamkeit sanft zu Hals, Gesicht und Kopf. Lass den Kiefer locker, die Stirn glatt, die Augen ruhig. Der ganze Kopf wird weich und schwer.',
      },
      {
        durationSeconds: 40,
        text: 'Spüre jetzt den ganzen Körper, ruhig und schwer, getragen von der Unterlage. Es gibt nichts mehr zu tun.',
      },
      {
        durationSeconds: 40,
        text: 'Lass den Atem ganz von allein fließen und erlaube dir, mit jedem Ausatmen tiefer loszulassen – bereit, sanft in den Schlaf zu gleiten.',
      },
    ],
  },
  {
    id: 'rain_emotions',
    title: 'RAIN – mit schwierigen Gefühlen',
    description:
      'Ein vierschrittiger, mitfühlender Weg durch ein belastendes Gefühl: erkennen, zulassen, erforschen, nähren.',
    durationMinutes: 6,
    stateGoals: ['emotional_support'],
    longTermGoals: ['emotional_processing', 'self_compassion', 'deep_experience'],
    family: 'self_compassion',
    mechanisms: ['self_compassion', 'cognitive_reappraisal', 'interoceptive_awareness'],
    evidenceProfile: {
      evidenceStrength: 3,
      mechanismFit: 3,
      populationFit: 2,
      appSuitability: 2,
      safetyConfidence: 3,
    },
    contraindicationRisk: 1,
    intensity: 1,
    emotionalDepth: 2,
    depthCategory: 'moderate',
    targets: { valence: 1, energy: 0, stress: -1, heaviness: -2, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 40,
        text: 'Setz oder leg dich bequem hin und schließ sanft die Augen. Wir gehen gleich in vier ruhigen Schritten mitfühlend durch ein belastendes Gefühl – erkennen, zulassen, erforschen und nähren.',
      },
      {
        durationSeconds: 70,
        text: 'Erkennen: Spüre nach innen und benenne freundlich, was gerade da ist. Vielleicht Traurigkeit, Angst, Ärger oder Unruhe. Du musst nichts ändern – sag dir nur still: „Das hier ist gerade da.“',
      },
      {
        durationSeconds: 70,
        text: 'Zulassen: Erlaube dem Gefühl, da zu sein, ohne es wegzudrücken oder festzuhalten. Du kannst innerlich sagen: „Es darf da sein.“ Auch wenn es unangenehm ist – du machst gerade Platz dafür, und das ist genug.',
      },
      {
        durationSeconds: 70,
        text: 'Erforschen: Wende dich dem Gefühl mit sanfter Neugier zu. Wo im Körper spürst du es? Wie fühlt es sich an – eng, schwer, warm, in Bewegung? Was braucht dieser Teil von dir vielleicht gerade am meisten?',
      },
      {
        durationSeconds: 70,
        text: 'Nähren: Schick diesem Teil von dir etwas Freundliches – so wie zu einem guten Freund. Vielleicht eine Hand auf die Brust und die Worte: „Es ist okay. Ich bin da. Das darf gerade schwer sein.“ Lass diese Fürsorge wirken.',
      },
      {
        durationSeconds: 40,
        text: 'Lass das Gefühl zum Abschluss einfach da sein, so wie es ist, und dich selbst mit ihm. Nimm einen ruhigen Atemzug, spüre nach und komm in deinem Tempo zurück.',
      },
    ],
  },
  {
    id: 'mindful_ritual',
    title: 'Achtsames Ritual',
    description:
      'Einen Alltagsmoment wie Tee oder Kaffee bewusst und mit allen Sinnen erleben.',
    durationMinutes: 3,
    stateGoals: ['grounding', 'positive_integration'],
    longTermGoals: ['calm'],
    family: 'grounding',
    mechanisms: ['sensory_grounding', 'positive_affect_broadening'],
    evidenceProfile: {
      evidenceStrength: 2,
      mechanismFit: 2,
      populationFit: 3,
      appSuitability: 3,
      safetyConfidence: 3,
    },
    contraindicationRisk: 0,
    intensity: 0,
    emotionalDepth: 0,
    depthCategory: 'basic',
    targets: { valence: 1, energy: 0, stress: -1, heaviness: -1, stability: 1 },
    breathTechnique: null,
    instructions: [
      {
        durationSeconds: 25,
        text: 'Nimm dir einen alltäglichen Moment vor – eine Tasse Tee oder Kaffee, ein Glas Wasser, einen Bissen von etwas. Wir erleben ihn gleich ganz bewusst, mit allen Sinnen.',
      },
      {
        durationSeconds: 40,
        text: 'Halte einen Moment inne, bevor du beginnst. Betrachte, was vor dir ist – die Farbe, die Form, den aufsteigenden Dampf oder das Licht darauf. Nimm es wahr, als sähst du es zum ersten Mal.',
      },
      {
        durationSeconds: 40,
        text: 'Spüre die Wärme oder Kühle in deinen Händen, das Gewicht, die Oberfläche. Nimm den Geruch wahr und atme ihn ruhig ein. Lass dir dafür bewusst Zeit.',
      },
      {
        durationSeconds: 45,
        text: 'Und nun der erste bewusste Schluck oder Bissen. Bleib ganz beim Geschmack, bei der Temperatur, bei der Empfindung im Mund. Kein Eile – einfach genießen und wahrnehmen, was da ist.',
      },
      {
        durationSeconds: 30,
        text: 'Spüre zum Abschluss die Ruhe dieses kurzen Rituals nach. Nimm einen ruhigen Atemzug und die Erinnerung mit, dass schon ein Alltagsmoment dich erden und erfreuen kann.',
      },
    ],
  },
];

export const EXERCISES_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((e) => [e.id, e]),
);
