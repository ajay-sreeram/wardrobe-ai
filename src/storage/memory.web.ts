const initialUserMemory = `# User memory\n\nLong-term preferences and the user's own wardrobe terminology belong here.\n`;
const initialRecentMemory = `# Recent activity\n\nCompressed, recent wardrobe and conversation activity belongs here.\n`;

function key(name: 'USER.md' | 'RECENT.md') {
  return `wardrobe-memory:${name}`;
}

export function initializeMemoryFiles() {
  if (typeof localStorage === 'undefined') return;
  if (!localStorage.getItem(key('USER.md'))) localStorage.setItem(key('USER.md'), initialUserMemory);
  if (!localStorage.getItem(key('RECENT.md'))) localStorage.setItem(key('RECENT.md'), initialRecentMemory);
}

export async function readMemoryFile(name: 'USER.md' | 'RECENT.md') {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(key(name)) ?? '';
}

export function writeMemoryFile(name: 'USER.md' | 'RECENT.md', contents: string) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(key(name), contents);
}
