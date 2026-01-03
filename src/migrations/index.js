/**
 * Database Migrations Index
 * Add new migrations here in order
 */

import migration001 from './001_initial_schema.js';
import migration002 from './002_add_beboa_notes.js';
import migration003 from './003_add_chat_history.js';

// Migrations must be in order - add new migrations at the end
export const migrations = [
    migration001,
    migration002,
    migration003,
];

export default migrations;
