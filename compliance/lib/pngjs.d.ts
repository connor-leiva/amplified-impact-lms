// pngjs ships no types, and parity:admin-r2 uses three members of it. Declared here rather than by
// adding @types/pngjs, so R2-0 adds exactly the two dependencies it needs (D-160).
declare module 'pngjs' {
  export class PNG {
    constructor(options?: { width?: number; height?: number });
    width: number;
    height: number;
    data: Buffer;
    static sync: { read(buffer: Buffer): PNG; write(png: PNG): Buffer };
    static bitblt(src: PNG, dst: PNG, srcX: number, srcY: number, width: number, height: number, deltaX: number, deltaY: number): void;
  }
}
