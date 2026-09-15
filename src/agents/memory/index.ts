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
    writeMemoryFile('USER.md', `${existing.trimEnd()}\n${garmentLine}\n${factLines.join('\n')}${factLines.length ? '\n' : ''}`);
    await appendRecentNow(`Added ${memory.garmentName} to ${memory.sectionName}. User said: “${memory.userMessage}”`);
  });
}

export function rememberConversation(userMessage: string, assistantMessage: string) {
  return serializeWrite(() => appendRecentNow(`User: “${userMessage}” Assistant: “${assistantMessage}”`));
}

export async function readMemoryContext() {
  await pendingWrite;
  const [user, recent] = await Promise.all([readMemoryFile('USER.md'), readMemoryFile('RECENT.md')]);
  return `${user.slice(-6000)}\n\n${recent.slice(-6000)}`.trim();
}
