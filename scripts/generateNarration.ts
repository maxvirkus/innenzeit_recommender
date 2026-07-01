/**
 * Pre-generates narration audio for every exercise using the official
 * ElevenLabs SDK and writes the result to `src/data/narration.ts` (audio path +
 * per-line timestamps) plus the MP3 files under `public/audio/`.
 *
 * Run with: `npm run generate:audio`
 *
 * Requires a `.env` file (see `.env.example`) with:
 *   ELEVENLABS_API_KEY   – your ElevenLabs API key (secret; never committed)
 *   ELEVENLABS_VOICE_ID  – the voice to use (from the ElevenLabs voice library)
 *   ELEVENLABS_MODEL_ID  – optional, defaults to `eleven_multilingual_v2`
 *
 * The line timing comes from ElevenLabs' character-level alignment, so the
 * lyrics-style scrolling in the app stays perfectly in sync with the voice.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { ElevenLabsClient, type ElevenLabs } from '@elevenlabs/elevenlabs-js';
import { EXERCISES } from '../src/data/exercises';
import { NARRATION } from '../src/data/narration';
import type { Narration, NarrationLine, NarrationWord } from '../src/domain/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const AUDIO_DIR = resolve(ROOT, 'public/audio');
const OUT_FILE = resolve(ROOT, 'src/data/narration.ts');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID ?? 'eleven_multilingual_v2';

if (!API_KEY || !VOICE_ID) {
  console.error(
    'Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID. Add them to .env (see .env.example).',
  );
  process.exit(1);
}

const elevenlabs = new ElevenLabsClient({ apiKey: API_KEY });

/** Prints the voices available to this account so the right id can be copied. */
async function listVoices() {
  const res = await elevenlabs.voices.search({ pageSize: 100 });
  console.log('Available voices (name — voice_id — labels):\n');
  for (const v of res.voices) {
    const labels = v.labels
      ? Object.values(v.labels).filter(Boolean).join(', ')
      : '';
    console.log(`  ${v.name}  —  ${v.voiceId}${labels ? `  —  ${labels}` : ''}`);
  }
  console.log('\nCopy the voice_id you want into ELEVENLABS_VOICE_ID in .env.');
}

/** Splits an instruction block into individual sentences ("lines"). */
function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["“”»]?/g);
  const trimmed = (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
  return trimmed.length > 0 ? trimmed : [text.trim()];
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Maps each line to its audio interval using the character-level alignment.
 * The lines are joined with single spaces to form the request text, so a
 * running character offset lines up 1:1 with the alignment arrays. Each line
 * also gets per-word timings for karaoke-style highlighting.
 */
function mapLineTimings(
  lineTexts: string[],
  alignment: ElevenLabs.CharacterAlignmentResponseModel,
): { lines: NarrationLine[]; durationSeconds: number } {
  const starts = alignment.characterStartTimesSeconds;
  const ends = alignment.characterEndTimesSeconds;
  const lastEnd = ends[ends.length - 1] ?? 0;
  const lines: NarrationLine[] = [];
  let charOffset = 0;

  lineTexts.forEach((text, i) => {
    const startChar = charOffset;
    const endChar = charOffset + text.length - 1;
    const startSeconds = starts[startChar] ?? starts[starts.length - 1] ?? 0;
    const endSeconds = ends[endChar] ?? lastEnd ?? startSeconds;
    lines.push({
      text,
      startSeconds: round(startSeconds),
      endSeconds: round(endSeconds),
      words: mapWordTimings(text, charOffset, starts, ends, lastEnd),
    });
    // + 1 for the single space separator between lines.
    charOffset += text.length + (i < lineTexts.length - 1 ? 1 : 0);
  });

  const durationSeconds = round(lastEnd);
  return { lines, durationSeconds };
}

/**
 * Splits a line into words and maps each to its audio interval, using the
 * absolute character offset of the line within the full request text.
 */
function mapWordTimings(
  lineText: string,
  lineCharOffset: number,
  starts: number[],
  ends: number[],
  lastEnd: number,
): NarrationWord[] {
  const words: NarrationWord[] = [];
  const wordRegex = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = wordRegex.exec(lineText)) !== null) {
    const startChar = lineCharOffset + match.index;
    const endChar = startChar + match[0].length - 1;
    const startSeconds = starts[startChar] ?? starts[starts.length - 1] ?? 0;
    const endSeconds = ends[endChar] ?? lastEnd ?? startSeconds;
    words.push({
      text: match[0],
      startSeconds: round(startSeconds),
      endSeconds: round(endSeconds),
    });
  }
  return words;
}

async function main() {
  if (process.argv.includes('--list-voices')) {
    await listVoices();
    return;
  }

  await mkdir(AUDIO_DIR, { recursive: true });

  // Decide which exercises to (re-)generate. By default all are generated, but
  // `--missing` limits it to exercises without an existing narration entry and
  // `--only a,b,c` limits it to an explicit id list. Existing entries are kept
  // and merged, so a partial run never drops previously generated narration.
  const onlyArg = process.argv.find((a) => a.startsWith('--only'));
  const onlyIds = onlyArg
    ? (onlyArg.split('=')[1] ?? process.argv[process.argv.indexOf(onlyArg) + 1] ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : null;
  const missingOnly = process.argv.includes('--missing');

  let targets = EXERCISES;
  if (onlyIds && onlyIds.length > 0) {
    const known = new Set(EXERCISES.map((e) => e.id));
    const unknown = onlyIds.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      console.error(`Unknown exercise id(s): ${unknown.join(', ')}`);
      process.exit(1);
    }
    targets = EXERCISES.filter((e) => onlyIds.includes(e.id));
  } else if (missingOnly) {
    targets = EXERCISES.filter((e) => !NARRATION[e.id]);
  }

  if (targets.length === 0) {
    console.log('Nothing to generate — every requested exercise already has narration.');
    return;
  }

  // Start from the existing narration so untouched entries are preserved.
  const result: Record<string, Narration> = { ...NARRATION };
  const generatedIds: string[] = [];

  for (const exercise of targets) {
    const lineTexts = exercise.instructions.flatMap((step) =>
      splitSentences(step.text),
    );
    const text = lineTexts.join(' ');
    process.stdout.write(`Generating narration for "${exercise.id}"… `);

    try {
      const res = await elevenlabs.textToSpeech.convertWithTimestamps(VOICE_ID, {
        text,
        modelId: MODEL_ID,
        outputFormat: 'mp3_44100_128',
      });
      const alignment = res.alignment ?? res.normalizedAlignment;
      if (!alignment) throw new Error('No alignment returned');

      const audioPath = resolve(AUDIO_DIR, `${exercise.id}.mp3`);
      await writeFile(audioPath, Buffer.from(res.audioBase64, 'base64'));

      const { lines, durationSeconds } = mapLineTimings(lineTexts, alignment);
      result[exercise.id] = {
        audioUrl: `/audio/${exercise.id}.mp3`,
        durationSeconds,
        lines,
      };
      generatedIds.push(exercise.id);
      console.log(`ok (${durationSeconds}s, ${lines.length} lines)`);
    } catch (err) {
      console.error(`failed: ${(err as Error).message}`);
    }
  }

  if (generatedIds.length === 0) {
    console.error(
      '\nNo narration was generated — leaving src/data/narration.ts untouched.\n' +
        'Check ELEVENLABS_VOICE_ID (an `invalid_uid` error means the voice id is wrong).\n' +
        'List your available voices with: npm run generate:audio -- --list-voices',
    );
    process.exit(1);
  }

  const header = `import type { Narration } from '../domain/types';

/**
 * Pre-generated narration (audio + timed lines), keyed by exercise id.
 *
 * GENERATED by \`npm run generate:audio\` (see \`scripts/generateNarration.ts\`).
 * Do not edit by hand — re-run the script to refresh it after changing texts.
 */
export const NARRATION: Record<string, Narration> = `;
  await writeFile(OUT_FILE, `${header}${JSON.stringify(result, null, 2)};\n`);

  console.log(
    `\nGenerated ${generatedIds.length} (${generatedIds.join(', ')}); ` +
      `wrote ${Object.keys(result).length}/${EXERCISES.length} entries to src/data/narration.ts`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
