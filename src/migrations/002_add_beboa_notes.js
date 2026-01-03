/**
 * Migration 002: Add beboa_notes column
 * Adds the beboa_notes column to users table for AI memory
 */

export const name = '002_add_beboa_notes';

export function up(db) {
    // Check if column exists first
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasColumn = tableInfo.some(col => col.name === 'beboa_notes');

    if (!hasColumn) {
        db.exec(`ALTER TABLE users ADD COLUMN beboa_notes TEXT DEFAULT NULL`);
    }
}

export default { name, up };
