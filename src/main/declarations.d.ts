declare module 'sql.js' {
  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface Database {
    exec(sql: string): QueryExecResult[];
    run(sql: string, params?: any[]): void;
    export(): Uint8Array;
    close(): void;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  function initSqlJs(config?: any): Promise<SqlJsStatic>;
  export default initSqlJs;
  export { Database, SqlJsStatic, QueryExecResult };
}

declare module 'appium-ios-device' {
  export class Usbmux {
    listDevices(): Promise<string[]>;
    connectLockdown(udid: string): Promise<{
      getValue(opts: { key: string }): Promise<any>;
    }>;
  }

  export namespace services {
    function startHouseArrestService(
      udid: string,
      opts: { bundleId: string; command: string }
    ): Promise<{
      pullFile(remotePath: string): Promise<Buffer>;
      pushFile(data: Buffer, remotePath: string): Promise<void>;
      close(): void;
    }>;
  }
}
