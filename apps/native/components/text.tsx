import { Text as RNText, type TextProps } from "react-native";
import {
  typographyClassName,
  type TypographyRoleName,
} from "@sutra/typography";

/**
 * The one text primitive.
 *
 * `variant` selects a semantic typography role from `@sutra/typography`
 * (projected into Uniwind classes in `global.css`), so screens never name a
 * font, size, weight, or line height. Colour still comes from the colour
 * tokens via `className` (`text-foreground`, `text-muted`, …).
 *
 * `font-sans` comes from the same token layer, which is what guarantees the
 * Sūtra family even though React Native has no inherited font family.
 *
 * Accessibility: font scaling stays on (`allowFontScaling` defaults to true in
 * React Native and is not overridden here). A role that must not scale is a
 * deliberate, local decision made at the call site with a comment — never a
 * global default.
 */
export interface SūtraTextProps extends TextProps {
  variant?: TypographyRoleName;
}

export function Text({
  variant = "body",
  className,
  ...props
}: SūtraTextProps) {
  return (
    <RNText
      className={["font-sans", typographyClassName(variant), className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
