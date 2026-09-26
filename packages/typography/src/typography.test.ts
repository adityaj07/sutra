import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FONT_WEIGHTS,
  SUTRA_FONT_FAMILY,
  SUTRA_FONT_WEIGHTS,
  TYPOGRAPHY_ROLES,
  TYPOGRAPHY_ROLE_NAMES,
  typographyClassName,
} from "./index";

/**
 * The role values live once, in `src/index.ts`. Each platform projects them
 * into CSS `@theme` variables by hand (Tailwind/Uniwind and Next both need
 * static CSS). This test is what makes that projection safe: it fails the
 * build when a stylesheet and the tokens disagree, or when a role is missing
 * from either platform.
 */

const repoRoot = join(import.meta.dir, "../../..");

const stylesheets = {
  native: "apps/native/global.css",
  web: "packages/ui/src/styles/globals.css",
} as const;

function readStylesheet(platform: keyof typeof stylesheets): string {
  return readFileSync(join(repoRoot, stylesheets[platform]), "utf8");
}

/** Matches `--text-body: 16px;` and its `--line-height` / `--font-weight` modifiers. */
function cssValue(css: string, variable: string): string | undefined {
  const match = new RegExp(`--${variable}:\\s*([^;]+);`).exec(css);
  return match?.[1]?.trim();
}

const fontAssetDirs = {
  native: "apps/native/assets/fonts",
  web: "apps/web/src/fonts",
} as const;

describe("typography tokens", () => {
  test("only uses the four controlled weights", () => {
    const allowed = new Set<string>(Object.values(FONT_WEIGHTS));

    for (const [role, tokens] of Object.entries(TYPOGRAPHY_ROLES)) {
      expect(allowed, `${role} uses an off-scale weight`).toContain(
        tokens.fontWeight,
      );
    }
  });

  test("never sets line height equal to font size", () => {
    for (const [role, tokens] of Object.entries(TYPOGRAPHY_ROLES)) {
      expect(
        tokens.lineHeight,
        `${role} needs deliberate leading, not lineHeight === fontSize`,
      ).not.toBe(tokens.fontSize);
    }
  });

  test("keeps body text at a readable size", () => {
    expect(TYPOGRAPHY_ROLES.body.fontSize).toBeGreaterThanOrEqual(16);
    expect(
      TYPOGRAPHY_ROLES.body.lineHeight / TYPOGRAPHY_ROLES.body.fontSize,
    ).toBeGreaterThanOrEqual(1.4);
  });

  test("derives stable utility class names", () => {
    expect(typographyClassName("body")).toBe("text-body");
    expect(typographyClassName("heading1")).toBe("text-heading-1");
    expect(typographyClassName("bodyMedium")).toBe("text-body-medium");
  });
});

describe("platform projections", () => {
  for (const platform of Object.keys(
    stylesheets,
  ) as (keyof typeof stylesheets)[]) {
    describe(platform, () => {
      const css = readStylesheet(platform);
      const familyVariable =
        platform === "native" ? "font-urbanist" : "font-sans";

      test(`declares the Sūtra family (--${familyVariable})`, () => {
        const family = cssValue(css, familyVariable);
        expect(family).toBeDefined();
        expect(family).toContain(SUTRA_FONT_FAMILY);
      });

      test("declares every role with the same four values", () => {
        for (const role of TYPOGRAPHY_ROLE_NAMES) {
          const slug = typographyClassName(role).replace("text-", "");
          const { fontSize, lineHeight, letterSpacing, fontWeight } =
            TYPOGRAPHY_ROLES[role];

          expect(cssValue(css, `text-${slug}`), `${role} fontSize`).toBe(
            `${fontSize}px`,
          );
          expect(
            cssValue(css, `text-${slug}--line-height`),
            `${role} lineHeight`,
          ).toBe(`${lineHeight}px`);
          expect(
            cssValue(css, `text-${slug}--letter-spacing`),
            `${role} letterSpacing`,
          ).toBe(`${letterSpacing}px`);
          expect(
            cssValue(css, `text-${slug}--font-weight`),
            `${role} fontWeight`,
          ).toBe(String(fontWeight));
        }
      });
    });
  }

  test("the two projections agree with each other", () => {
    const native = readStylesheet("native");
    const web = readStylesheet("web");

    for (const role of TYPOGRAPHY_ROLE_NAMES) {
      const slug = typographyClassName(role).replace("text-", "");
      for (const modifier of [
        "",
        "--line-height",
        "--letter-spacing",
        "--font-weight",
      ]) {
        expect(
          cssValue(native, `text-${slug}${modifier}`),
          `${role}${modifier}`,
        ).toBe(cssValue(web, `text-${slug}${modifier}`));
      }
    }
  });
});

describe("font assets", () => {
  for (const platform of Object.keys(
    fontAssetDirs,
  ) as (keyof typeof fontAssetDirs)[]) {
    test(`${platform} bundles one file per weight`, () => {
      for (const face of Object.values(SUTRA_FONT_WEIGHTS)) {
        const path = join(repoRoot, fontAssetDirs[platform], `${face}.ttf`);
        const bytes = readFileSync(path);
        expect(bytes.byteLength, `${face}.ttf is empty`).toBeGreaterThan(0);
        // TrueType starts with 0x00010000, 'true', or 'OTTO'.
        const magic = bytes.subarray(0, 4).toString("latin1");
        expect(["\u0000\u0001\u0000\u0000", "true", "OTTO"]).toContain(magic);
      }
    });
  }
});
