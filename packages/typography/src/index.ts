/**
 * Sūtra typography tokens — the single source of truth for type across web and
 * native.
 *
 * Layers:
 *
 *   semantic role  →  size / line height / letter spacing / weight
 *      ↓
 *   platform projection (CSS variables)
 *      ↓
 *   Urbanist
 *
 * The roles here are the vocabulary; each platform projects them into its own
 * token format (`@theme` in `apps/native/global.css` and
 * `packages/ui/src/styles/globals.css`). The projection is hand-written but
 * verified by `src/typography.test.ts`, so the three cannot drift silently.
 *
 * Colour is deliberately absent: roles describe type only, and foreground
 * colour stays in the colour-token system. That is what keeps the same role
 * meaningful in light and dark mode.
 *
 * Replacing the typeface means editing `SUTRA_FONT_FAMILY` here, the `@theme`
 * family variables in both stylesheets, the font-loading configuration, and the
 * font assets. No component refers to a font family or a numeric size.
 */

/** The one Sūtra typeface. Swap this (plus assets + loaders) to rebrand. */
export const SUTRA_FONT_FAMILY = "Urbanist";

/**
 * Controlled weight scale. Components never invent a weight; a role picks one
 * of these four.
 */
export const FONT_WEIGHTS = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export type FontWeightName = keyof typeof FONT_WEIGHTS;

/** One semantic role: everything needed to render a piece of text. */
export interface TypographyRole {
  /** px — the same number on both platforms. */
  readonly fontSize: number;
  /**
   * px — deliberately chosen per role, never equal to `fontSize`. Body copy
   * gets generous leading for comfortable reading; compact UI (button, overline)
   * stays tight.
   */
  readonly lineHeight: number;
  /** px — negative for large display type, positive for small caps-ish roles. */
  readonly letterSpacing: number;
  readonly fontWeight: (typeof FONT_WEIGHTS)[FontWeightName];
}

/**
 * The semantic scale. Kept small on purpose: every role earns its place.
 *
 * | Role        | Weight | Use                                        |
 * | ----------- | ------ | ------------------------------------------ |
 * | `display`   | bold   | Product/marketing statements                |
 * | `heading1`  | bold   | Page-level heading                          |
 * | `heading2`  | bold   | Major section heading                       |
 * | `heading3`  | semi   | Subsection heading                          |
 * | `title`     | semi   | Screen titles, channel & workspace names    |
 * | `body`      | regular| Primary content, message text               |
 * | `bodyMedium`| medium | Emphasised body, list rows                  |
 * | `bodySmall` | regular| Secondary content, message metadata         |
 * | `label`     | medium | Form labels and field text                  |
 * | `button`    | semi   | Interactive actions                         |
 * | `caption`   | regular| Timestamps and supporting detail            |
 * | `overline`  | semi   | Small categorical labels (uppercase)        |
 */
export const TYPOGRAPHY_ROLES = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    fontWeight: FONT_WEIGHTS.bold,
  },
  heading1: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.4,
    fontWeight: FONT_WEIGHTS.bold,
  },
  heading2: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
    fontWeight: FONT_WEIGHTS.bold,
  },
  heading3: {
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    fontWeight: FONT_WEIGHTS.regular,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    fontWeight: FONT_WEIGHTS.medium,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    fontWeight: FONT_WEIGHTS.regular,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: FONT_WEIGHTS.medium,
  },
  button: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.1,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
    fontWeight: FONT_WEIGHTS.regular,
  },
  overline: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.8,
    fontWeight: FONT_WEIGHTS.semibold,
  },
} as const satisfies Record<string, TypographyRole>;

export type TypographyRoleName = keyof typeof TYPOGRAPHY_ROLES;

/** Every role name, for iteration and validation. */
export const TYPOGRAPHY_ROLE_NAMES = Object.keys(
  TYPOGRAPHY_ROLES,
) as TypographyRoleName[];

/**
 * Font files bundled per platform. The `expo-font` config plugin
 * (`apps/native/app.json`) and `next/font/local` (`apps/web`) both register
 * exactly these four faces, which is what makes a single family name resolve
 * the right weight on Android, iOS, and the web.
 */
export const SUTRA_FONT_WEIGHTS = {
  400: "Urbanist-Regular",
  500: "Urbanist-Medium",
  600: "Urbanist-SemiBold",
  700: "Urbanist-Bold",
} as const satisfies Record<string, string>;

/** The role's tokens, unchanged. */
export function typographyRole(role: TypographyRoleName): TypographyRole {
  return TYPOGRAPHY_ROLES[role];
}

/**
 * Text style for a role, in React Native units (`letterSpacing` is unitless in
 * RN). Use where a `Text` cannot take a className — e.g. platform-native text
 * hosts such as `@expo/ui`.
 *
 * The weight stays a literal type so the result is assignable to strict style
 * props (RN `TextStyle`, `@expo/ui` `UniversalTextStyle`) without a cast.
 */
export function typographyStyle(
  role: TypographyRoleName,
): { fontFamily: string } & TypographyRole {
  const { fontSize, lineHeight, letterSpacing, fontWeight } =
    TYPOGRAPHY_ROLES[role];
  return {
    fontFamily: SUTRA_FONT_FAMILY,
    fontSize,
    lineHeight,
    letterSpacing,
    fontWeight,
  };
}

/**
 * Utility class a role projects to on Tailwind/Uniwind (`body` →
 * `text-body`, `heading1` → `text-heading-1`). Deriving it keeps the class
 * name and the token name from drifting apart.
 */
export function typographyClassName(role: TypographyRoleName): string {
  return `text-${role.replace(/([a-z])([A-Z0-9])/g, "$1-$2").toLowerCase()}`;
}
