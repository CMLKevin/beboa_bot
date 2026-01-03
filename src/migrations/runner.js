/**
 * Database Migration Runner
 * Tracks and applies database migrations in order
 */

/**
 * Initialize the migrations table if it doesn't exist
 * @param {Database} db - better-sqlite3 database instance
 */
export function initMigrationsTable(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

/**
 * Get list of applied migrations
 * @param {Database} db - better-sqlite3 database instance
 * @returns {string[]} Array of applied migration names
 */
export function getAppliedMigrations(db) {
    const stmt = db.prepare('SELECT name FROM _migrations ORDER BY id');
    return stmt.all().map(row => row.name);
}

/**
 * Mark a migration as applied
 * @param {Database} db - better-sqlite3 database instance
 * @param {string} name - Migration name
 */
export function markMigrationApplied(db, name) {
    const stmt = db.prepare('INSERT INTO _migrations (name) VALUES (?)');
    stmt.run(name);
}

/**
 * Run all pending migrations
 * @param {Database} db - better-sqlite3 database instance
 * @param {Array<{name: string, up: function}>} migrations - Array of migration objects
 * @returns {string[]} Array of newly applied migration names
 */
export function runMigrations(db, migrations) {
    initMigrationsTable(db);

    const applied = new Set(getAppliedMigrations(db));
    const pending = migrations.filter(m => !applied.has(m.name));
    const newlyApplied = [];

    for (const migration of pending) {
        console.log(`[MIGRATIONS] Running: ${migration.name}`);

        try {
            // Run migration in a transaction
            db.transaction(() => {
                migration.up(db);
                markMigrationApplied(db, migration.name);
            })();

            newlyApplied.push(migration.name);
            console.log(`[MIGRATIONS] Completed: ${migration.name}`);
        } catch (error) {
            console.error(`[MIGRATIONS] Failed: ${migration.name}`, error);
            throw error;
        }
    }

    if (newlyApplied.length === 0) {
        console.log('[MIGRATIONS] Database is up to date');
    } else {
        console.log(`[MIGRATIONS] Applied ${newlyApplied.length} migration(s)`);
    }

    return newlyApplied;
}

export default { initMigrationsTable, getAppliedMigrations, markMigrationApplied, runMigrations };
