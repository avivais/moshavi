import Database from 'better-sqlite3';

class DatabaseManager {
    private static instance: Database;

    private constructor() {
        // Private constructor to prevent direct instantiation
    }

    public static getInstance(): Database {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new Database('./moshavi.db');
        }
        return DatabaseManager.instance;
    }
}

export default DatabaseManager.getInstance();