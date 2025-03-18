declare module 'better-sqlite3' {
    // Type for SQL parameters
    type SqlParam = string | number | boolean | null | Buffer;

    // Result of a 'run' operation
    interface RunResult {
        lastInsertRowid: number;
        changes: number;
    }

    // Generic Statement interface tied to row type T
    interface Statement<T> {
        run(...params: SqlParam[]): RunResult;
        get(...params: SqlParam[]): T | undefined;
        all(...params: SqlParam[]): T[];
    }

    // Database class with typed methods
    export default class Database {
        constructor(filename: string, options?: { readonly?: boolean; fileMustExist?: boolean });
        prepare<T>(sql: string): Statement<T>;
        exec(sql: string): this;
        close(): void;
    }
}