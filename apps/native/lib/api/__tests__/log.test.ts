import {
  afterEach,
  describe,
  expect,
  spyOn,
  test,
  type ConsoleMock,
} from "bun:test";
import { logger, type LogFields } from "@/lib/log";

// NOTE: no module mocks. `@/lib/env` reads the Varlock proxy (which throws
// outside the Expo runtime) and falls back to `process.env`, so NODE_ENV below
// is what the logger actually resolves.

type ConsoleMethod = "debug" | "info" | "warn" | "error";

const spies: ConsoleMock[] = [];

function captureConsole(): Record<ConsoleMethod, string[]> {
  const captured: Record<ConsoleMethod, string[]> = {
    debug: [],
    info: [],
    warn: [],
    error: [],
  };

  for (const method of Object.keys(captured) as ConsoleMethod[]) {
    const spy = spyOn(console, method).mockImplementation(
      (...args: unknown[]) => {
        captured[method].push(args.map(String).join(" "));
      },
    );
    spies.push(spy);
  }

  return captured;
}

/** `process.env` is typed as always-present; tests need to remove a key. */
const mutableEnv = process.env as Record<string, string | undefined>;

const originalNodeEnv = mutableEnv.NODE_ENV;

function setNodeEnv(value: string | undefined): void {
  if (value === undefined) {
    delete mutableEnv.NODE_ENV;
  } else {
    mutableEnv.NODE_ENV = value;
  }
}

afterEach(() => {
  while (spies.length > 0) {
    spies.pop()?.mockRestore();
  }
  setNodeEnv(originalNodeEnv);
});

describe("logger — development (NODE_ENV unset)", () => {
  test("emits every level", () => {
    setNodeEnv(undefined);
    const out = captureConsole();

    logger.debug("api", "request.started");
    logger.info("api", "request.completed");
    logger.warn("api", "response.invalid");
    logger.error("session", "bootstrap.failed");

    expect(out.debug).toEqual(["[api] debug request.started"]);
    expect(out.info).toEqual(["[api] info request.completed"]);
    expect(out.warn).toEqual(["[api] warn response.invalid"]);
    expect(out.error).toEqual(["[session] error bootstrap.failed"]);
  });

  test("emits debug/info in an explicit test environment", () => {
    setNodeEnv("test");
    const out = captureConsole();

    logger.debug("api", "request.started");

    expect(out.debug.length).toBe(1);
  });
});

describe("logger — production", () => {
  test("suppresses debug/info but keeps warn/error", () => {
    setNodeEnv("production");
    const out = captureConsole();

    logger.debug("api", "request.started");
    logger.info("api", "request.completed");
    logger.warn("api", "response.invalid");
    logger.error("session", "bootstrap.failed");

    expect(out.debug).toEqual([]);
    expect(out.info).toEqual([]);
    expect(out.warn).toEqual(["[api] warn response.invalid"]);
    expect(out.error).toEqual(["[session] error bootstrap.failed"]);
  });
});

describe("logger — structured fields", () => {
  test("renders supported fields in a deterministic order", () => {
    setNodeEnv("test");
    const out = captureConsole();

    logger.debug("api", "request.completed", {
      method: "GET",
      path: "/v1/auth/me",
      status: 401,
      durationMs: 812,
      requestId: "abc",
      outcome: "http-error",
      code: "unauthorized",
      count: 2,
    });

    expect(out.debug).toEqual([
      "[api] debug request.completed method=GET path=/v1/auth/me status=401 " +
        "durationMs=812 requestId=abc outcome=http-error code=unauthorized count=2",
    ]);
  });

  test("omits absent fields and keeps a stable field order", () => {
    setNodeEnv("test");
    const out = captureConsole();

    logger.warn("api", "response.invalid", {
      path: "/v1/auth/me",
      method: "POST",
    });

    // Declaration order (method, path, …), not caller order.
    expect(out.warn).toEqual([
      "[api] warn response.invalid method=POST path=/v1/auth/me",
    ]);
  });

  test("drops unknown keys and non-primitive values at runtime", () => {
    setNodeEnv("test");
    const out = captureConsole();

    // Bypasses the compile-time boundary on purpose: the sink must still be
    // incapable of emitting a token, header map, or body.
    const smuggled = {
      method: "GET",
      path: "/v1/auth/me",
      authorization: "Bearer secret-token",
      body: { refreshToken: "R1" },
      cause: new Error("boom"),
      accessToken: "A1",
    };
    logger.error("api", "leak.attempt", smuggled as unknown as LogFields);

    expect(out.error).toEqual([
      "[api] error leak.attempt method=GET path=/v1/auth/me",
    ]);
  });

  test("refuses unsafe field types at compile time", () => {
    setNodeEnv("test");
    captureConsole();

    // @ts-expect-error `body` is not a safe field.
    logger.debug("api", "request.started", { body: { refreshToken: "R1" } });
    // @ts-expect-error `status` is a number, not a string.
    logger.debug("api", "request.started", { status: "200" });
    // @ts-expect-error `ApiError` is not a primitive field value.
    logger.error("api", "request.failed", { error: new Error("boom") });

    expect(true).toBe(true);
  });
});
