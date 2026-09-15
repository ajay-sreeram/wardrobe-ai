import { z } from 'zod';

import { readMemoryFile, writeMemoryFile } from '@/storage/memory';

export const memoryAgentScope = {
  files: ['USER.md', 'RECENT.md'],
  canMutateWardrobe: false,
} as const;

const garmentMemorySchema = z.object({
  garmentId: z.string().min(1),
  garmentName: z.string().min(1),
  sectionName: z.string().min(1),
  userMessage: z.string(),
  memoryFacts: z.array(z.string().min(1)).max(4),
});

let pendingWrite: Promise<void> = Promise.resolve();

function clean(text: string, maxLength = 320) {
  return text.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalized(text: string) {
  return clean(text).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function writeUserEntries(entries: string[]) {
  writeMemoryFile('USER.md', `# User memory\n\n${entries.slice(-200).join('\n')}${entries.length ? '\n' : ''}`);
}

async function appendRecentNow(entry: string) {
  const existing = await readMemoryFile('RECENT.md');
  const entries = existing.split('\n').filter((line) => line.startsWith('- '));
  const next = [...entries, `- ${new Date().toISOString()}: ${clean(entry)}`].slice(-30);
  writeMemoryFile('RECENT.md', `# Recent activity\n\n${next.join('\n')}\n`);
}

function serializeWrite(operation: () => Promise<void>) {
  pendingWrite = pendingWrite.then(operation, operation);
  return pendingWrite;
}

export function rememberGarmentAddition(input: z.input<typeof garmentMemorySchema>) {
  return serializeWrite(async () => {
    const memory = garmentMemorySchema.parse(input);
    const existing = await readMemoryFile('USER.md');
    const newFacts = memory.memoryFacts
      .map(clean)
      .filter((fact) => fact && !existing.toLocaleLowerCase().includes(fact.toLocaleLowerCase()));
    const garmentLine = `- ${memory.garmentName} (${memory.sectionName}; id: ${memory.garmentId})`;
    const factLines = newFacts.map((fact) => `- ${fact} [garment: ${memory.garmentName}]`);
    const entries = existing.split('\n').filter((line) => line.startsWith('- '));
    writeUserEntries([...entries, garmentLine, ...factLines]);
    await appendRecentNow(`Added ${memory.garmentName} to ${memory.sectionName}. User said: “${memory.userMessage}”`);
  });
}

export function rememberConversation(userMessage: string, assistantMessage: string) {
  return serializeWrite(() => appendRecentNow(`User: “${userMessage}” Assistant: “${assistantMessage}”`));
}

export function rememberWear(garmentNames: string[], wornAt: string, note: string) {
  return serializeWrite(() => appendRecentNow(`Logged ${garmentNames.join(' + ')} for ${wornAt}${note ? ` (${clean(note, 160)})` : ''}.`));
}

export function rememberWearCorrection(garmentNames: string[], wornAt: string, note: string) {
  return serializeWrite(() => appendRecentNow(`Corrected Timeline entry to ${garmentNames.join(' + ')} for ${wornAt}${note ? ` (${clean(note, 160)})` : ''}. SQLite Timeline is canonical.`));
}

export function rememberWearDeletion(wornAt: string) {
  return serializeWrite(() => appendRecentNow(`Deleted an incorrect Timeline entry for ${wornAt}. SQLite Timeline is canonical.`));
}

export function rememberWardrobeChange(summary: string) {
  return serializeWrite(() => appendRecentNow(`${clean(summary)} SQLite wardrobe and Timeline are canonical.`));
}

export function rememberExplicitWardrobeFacts(facts: string[]) {
  return serializeWrite(async () => {
    if (!facts.length) return;
    const existing = await readMemoryFile('USER.md');
    const additions = facts.map((fact) => clean(fact))
      .filter((fact) => fact && !existing.toLocaleLowerCase().includes(fact.toLocaleLowerCase()))
      .map((fact) => `- ${fact}`);
    if (additions.length) {
      const entries = existing.split('\n').filter((line) => line.startsWith('- '));
      writeUserEntries([...entries, ...additions]);
    }
  });
}

export function forgetExplicitWardrobeFacts(facts: string[]) {
  return serializeWrite(async () => {
    if (!facts.length) return;
    const targets = facts.map(normalized).filter(Boolean);
    const existing = await readMemoryFile('USER.md');
    const entries = existing.split('\n').filter((line) => line.startsWith('- '));
    const kept = entries.filter((line) => {
      const entry = normalized(line.slice(2));
      return !targets.some((target) => entry === target || entry.startsWith(`${target} garment `));
    });
    if (kept.length !== entries.length) writeUserEntries(kept);
  });
}

export function rememberExistingGarmentReference({ garmentId, garmentName, userMessage, memoryFacts }: { garmentId: string; garmentName: string; userMessage: string; memoryFacts: string[] }) {
  return serializeWrite(async () => {
    const existing = await readMemoryFile('USER.md');
    const newFacts = memoryFacts.map(clean)
      .filter((fact) => fact && !existing.toLocaleLowerCase().includes(fact.toLocaleLowerCase()));
    const garmentLine = existing.includes(`id: ${garmentId}`) ? '' : `- ${garmentName} (id: ${garmentId})\n`;
    const factLines = newFacts.map((fact) => `- ${fact} [garment: ${garmentName}]`);
    const entries = existing.split('\n').filter((line) => line.startsWith('- '));
    writeUserEntries([...entries, ...(garmentLine ? [garmentLine.trimEnd()] : []), ...factLines]);
    await appendRecentNow(`Matched the latest observation to existing garment ${garmentName}. User said: “${userMessage}”`);
  });
}

export async function readMemoryContext() {
  await pendingWrite;
  const [user, recent] = await Promise.all([readMemoryFile('USER.md'), readMemoryFile('RECENT.md')]);
  return `${user}\n\n${recent}`.trim();
}
