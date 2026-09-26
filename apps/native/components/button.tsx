import { Button as HeroButton } from "heroui-native";
import type { ReactNode } from "react";
import { typographyClassName } from "@sutra/typography";

/**
 * Sūtra's button. A thin wrapper over HeroUI Native's `Button` that only
 * applies the Sūtra `button` typography role to string labels — HeroUI renders
 * bare strings through its own `Button.Label`, which would otherwise fall back
 * to the platform typeface and its own size scale.
 *
 * Everything else (variants, sizes, press feedback, accessibility) is
 * HeroUI's. Non-string children (icons, custom nodes) pass straight through.
 */

const labelClassName = `font-sans ${typographyClassName("button")}`;

export type ButtonProps = React.ComponentProps<typeof HeroButton>;

export function Button({ children, ...props }: ButtonProps) {
  const isPlainText =
    typeof children === "string" || typeof children === "number";

  return (
    <HeroButton {...props}>
      {isPlainText ? (
        <HeroButton.Label className={labelClassName}>
          {children as ReactNode}
        </HeroButton.Label>
      ) : (
        children
      )}
    </HeroButton>
  );
}
