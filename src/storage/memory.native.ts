import { Directory, File, Paths } from 'expo-file-system';

const initialUserMemory = `# User memory\n\nLong-term preferences and the user's own wardrobe terminology belong here.\n`;
const initialRecentMemory = `# Recent activity\n\nCompressed, recent wardrobe and conversation activity belongs here.\n`;

function memoryFile(name: 'USER.md' | 'RECENT.md') {
  return new File(new Directory(Paths.document, 'memory'), name);
}

export function initializeMemoryFiles() {
  const memoryDirectory = new Directory(Paths.document, 'memory');
  memoryDirectory.create({ idempotent: true, intermediates: true });

  const files = [
    { name: 'USER.md', contents: initialUserMemory },
    { name: 'RECENT.md', contents: initialRecentMemory },
  ];

  for (const item of files) {
    const file = new File(memoryDirectory, item.name);
    if (!file.exists) {
      file.create({ intermediates: true });
      file.write(item.contents);
    }
  }
}

export async function readMemoryFile(name: 'USER.md' | 'RECENT.md') {
  const file = memoryFile(name);
  return file.exists ? file.text() : '';
}

export function writeMemoryFile(name: 'USER.md' | 'RECENT.md', contents: string) {
  const file = memoryFile(name);
  if (!file.exists) file.create({ intermediates: true });
  file.write(contents);
}
