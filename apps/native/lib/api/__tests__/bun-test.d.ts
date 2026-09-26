/**
 * Minimal ambient types for `bun:test` so `tsc --noEmit` covers test files
 * without adding a `@types/bun` dependency. The real implementations come
 * from the bun runtime (`bun test`). Keep in sync only with what tests use.
 */
declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void): void;
  export interface ConsoleMock {
    mockImplementation(impl: (...args: unknown[]) => void): ConsoleMock;
    mockRestore(): void;
  }
  export function spyOn(
    target: Console,
    method: "debug" | "info" | "warn" | "error",
  ): ConsoleMock;
  export const expect: {
    (received: unknown): {
      toBe(expected: unknown): void;
      toEqual(expected: unknown): void;
      toBeNull(): void;
      toBeInstanceOf(expected: unknown): void;
      resolves: {
        toBe(expected: unknown): Promise<void>;
        toEqual(expected: unknown): Promise<void>;
      };
    };
  };
}

declare const Bun: {
  sleep(ms: number): Promise<void>;
  write(
    path: string | URL,
    data: string | ArrayBuffer | Uint8Array,
  ): Promise<number>;
};
