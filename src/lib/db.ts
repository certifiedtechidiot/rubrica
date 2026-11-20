import { Database } from 'bun:sqlite';
import { join } from 'path';

// Store the database file in the root of the project
const dbPath = join(process.cwd(), 'local.db');

export const db = new Database(dbPath, { create: true });

// Initialize tables if they don't exist
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,
    email TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    subject TEXT NOT NULL,
    rubric TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    classroom_id TEXT,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    overall_feedback TEXT,
    detailed_analysis TEXT,
    confirmed_strengths TEXT,
    watch_out_areas TEXT,
    raw_json_result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  );
`);

db.run(`
  CREATE TABLE IF NOT EXISTS student_profiles (
    student_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    active_weaknesses TEXT,
    stable_strengths TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
  );
`);
