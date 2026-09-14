export const schemaSql = `
  CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS garments (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    section_id TEXT,
    description TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    canonical_image TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    wear_count INTEGER NOT NULL DEFAULT 0,
    last_worn_at TEXT,
    archived_at TEXT,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS garment_images (
    id TEXT PRIMARY KEY NOT NULL,
    garment_id TEXT NOT NULL,
    image_path TEXT NOT NULL,
    image_type TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (garment_id) REFERENCES garments(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS wears (
    id TEXT PRIMARY KEY NOT NULL,
    garment_ids TEXT NOT NULL DEFAULT '[]',
    worn_at TEXT NOT NULL,
    note TEXT
  );
`;
