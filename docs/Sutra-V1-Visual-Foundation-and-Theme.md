# Sūtra — V1 Visual Foundation & Theme

**Status:** Frozen V1 baseline  
**Purpose:** Shared visual foundation for Sūtra web and native clients

---

## 1. Goal

The V1 visual foundation is intentionally small.

The immediate goal is:

> **Make Sūtra coherent, usable, and visually consistent enough to ship.**

We are not attempting to build the final Sūtra visual identity yet.

More advanced visual work — bespoke illustrations, textures, typography refinement, custom components, motion language, and deeper brand identity — can happen after the product exists and the core flows are working.

---

# 2. Visual Direction

Sūtra's initial visual direction is inspired by the warm, vibrant visual character we like in Meetup's current design.

We are borrowing the **general palette direction**, not cloning Meetup's UI or design system.

### Personality

- Warm
- Human
- Energetic
- Clean
- Professional
- Friendly without becoming childish
- Modern without looking like generic AI/SaaS software

### V1 philosophy

```text
Warm neutral foundation
        +
Crimson/coral brand accent
        +
Restrained semantic colors
        +
Strong readability
        +
Proper light + dark mode
```

The actual UI should remain mostly neutral.

The brand color should provide personality rather than dominate every screen.

---

# 3. Client UI Stack

## Web

```text
Next.js
shadcn/ui
Tailwind CSS
```

The web theme should map naturally to shadcn's semantic CSS variables.

## Native

```text
React Native
Expo
HeroUI Native
Uniwind
```

HeroUI Native and Uniwind should consume the same conceptual Sūtra design tokens.

The implementation mechanisms may differ between web and native, but the visual decisions should remain aligned.

---

# 4. Design Token Principle

Components should consume **semantic tokens**, not raw hex values.

### Avoid

```tsx
className="bg-[#ED1C40]"
```

### Prefer

```tsx
className="bg-primary"
```

This allows the visual system to evolve later without requiring a large component rewrite.

The same principle applies to native components.

---

# 5. Core Color Palette

## Light Theme

| Token | Value | Purpose |
|---|---|---|
| `background` | `#FFFDFB` | Application canvas |
| `foreground` | `#211C1C` | Primary text |
| `card` | `#FFFFFF` | Elevated surfaces |
| `card-foreground` | `#211C1C` | Card text |
| `muted` | `#F5F0EF` | Subtle surfaces |
| `muted-foreground` | `#756B69` | Secondary text |
| `border` | `#E7DEDC` | Borders and dividers |
| `input` | `#E7DEDC` | Input borders |
| `primary` | `#ED1C40` | Sūtra brand accent |
| `primary-foreground` | `#FFFFFF` | Text on primary |
| `secondary` | `#F1E7E4` | Secondary controls |
| `secondary-foreground` | `#3A302E` | Secondary control text |
| `accent` | `#F8E8E9` | Hover/selected surfaces |
| `accent-foreground` | `#8F1830` | Accent text |
| `destructive` | `#C92A3A` | Destructive actions |
| `ring` | `#ED1C40` | Focus ring |

---

# 6. Dark Theme

Dark mode is a first-class V1 requirement.

It should not simply invert the light theme and should not use pure black.

| Token | Value | Purpose |
|---|---|---|
| `background` | `#171414` | Application canvas |
| `foreground` | `#F7F3F2` | Primary text |
| `card` | `#211D1D` | Elevated surfaces |
| `card-foreground` | `#F7F3F2` | Card text |
| `muted` | `#292424` | Subtle surfaces |
| `muted-foreground` | `#B8ADAA` | Secondary text |
| `border` | `#3A3332` | Borders and dividers |
| `input` | `#3A3332` | Input borders |
| `primary` | `#FF4D67` | Sūtra brand accent |
| `primary-foreground` | `#FFFFFF` | Text on primary |
| `secondary` | `#342C2B` | Secondary controls |
| `secondary-foreground` | `#F3EAE8` | Secondary control text |
| `accent` | `#43282D` | Hover/selected surfaces |
| `accent-foreground` | `#FFB8C1` | Accent text |
| `destructive` | `#FF6675` | Destructive actions |
| `ring` | `#FF6A7D` | Focus ring |

### Dark mode hierarchy

```text
Background
    #171414
       ↓
Surface
    #211D1D
       ↓
Muted
    #292424
       ↓
Border
    #3A3332
```

The warm charcoal hierarchy is intentional.

---

# 7. Brand Palette

The explicit Sūtra brand palette is intentionally small.

```text
Sūtra Crimson    #ED1C40
Sūtra Coral      #DA6464
Sūtra Walnut     #6B3E1D
```

These are inspired by the warm/crimson palette direction that motivated the visual exploration.

### Usage

`Sūtra Crimson` is the primary UI accent.

`Sūtra Coral` and `Sūtra Walnut` are available for future brand surfaces, illustrations, identity elements, and marketing.

They should not automatically become additional semantic UI colors.

---

# 8. Semantic Colors

Brand color and semantic meaning must remain separate.

In particular:

> **Sūtra's brand red must not mean error.**

## Success

```text
Light: #238636
Dark:  #4ADE80
```

## Warning

```text
Light: #B7791F
Dark:  #F6C453
```

## Error / Destructive

```text
Light: #C92A3A
Dark:  #FF6675
```

## Info

```text
Light: #2563EB
Dark:  #60A5FA
```

Semantic colors should be used only when the underlying meaning requires them.

---

# 9. Primary Color Usage

The primary crimson should be used deliberately.

Good uses:

- Primary CTAs
- Active navigation where appropriate
- Selected states
- Important interactive elements
- Focus indicators
- Mentions/attention where appropriate
- Links where appropriate
- Unread/attention indicators where appropriate

Avoid:

- Making every button red
- Making every icon red
- Large red backgrounds throughout the application
- Using primary red as an error state
- Turning the conversation interface into a red-heavy UI

The dominant visual experience should remain:

> **warm neutral + typography + spacing + restrained accent**

---

# 10. Message UI

The message interface should remain especially calm.

## Normal message

```text
background: transparent
```

## Hover

```text
background: muted
```

## Selected

```text
background: accent
```

## Mentioned

Use a subtle primary-tinted surface.

## Thread indicator

Use the primary/accent system without making the entire message visually loud.

The conversation should not look like a collection of cards.

---

# 11. Unread State

Unread state should use multiple subtle signals rather than excessive badges.

Possible combination:

```text
Small accent indicator
+
Slightly stronger typography
+
Subtle background
```

Counts should only be displayed when they are genuinely useful.

The goal is to make the workspace easy to scan without turning it into a wall of notification badges.

---

# 12. Space Identity Colors

Spaces may eventually have optional identity colors.

V1 can use a controlled secondary palette:

```text
Coral     #DA6464
Crimson   #ED1C40
Amber     #D99A2B
Olive     #7A8B45
Teal      #3A8C8C
Blue      #4C78A8
Purple    #79558F
```

These are identity accents rather than general-purpose UI colors.

Example:

```text
Engineering → Blue
Design      → Purple
Operations  → Olive
Acme        → Coral
```

Do not allow arbitrary user-selected colors to explode the design system in V1.

---

# 13. Surfaces

Sūtra should avoid the common SaaS pattern of putting every element inside a card.

Use surfaces intentionally:

```text
Canvas
    ↓
Section
    ↓
Surface
    ↓
Contextual elevation
```

Conversation timelines should primarily use open space rather than card containers.

Cards are appropriate for:

- settings sections
- billing summaries
- onboarding blocks
- compact information groups
- isolated actions

They should not become the default container for every message or navigation item.

---

# 14. Dark Mode Principles

Dark mode must be designed, not merely inverted.

Rules:

- Never use pure black as the default application canvas.
- Avoid pure white as the dominant text color.
- Preserve clear surface hierarchy.
- Keep borders visible but subtle.
- Reduce large areas of saturated color.
- Maintain readable muted text.
- Ensure focus states remain visible.
- Ensure semantic colors remain distinguishable.
- Test message readability for long sessions.

Dark mode is a V1 product requirement, not a later enhancement.

---

# 15. shadcn Compatibility

The web implementation should map directly to the standard shadcn semantic variable model.

Core variables:

```text
--background
--foreground

--card
--card-foreground

--popover
--popover-foreground

--primary
--primary-foreground

--secondary
--secondary-foreground

--muted
--muted-foreground

--accent
--accent-foreground

--destructive

--border
--input
--ring
```

Additional Sūtra-specific tokens may be introduced only when a real UI requirement justifies them.

---

# 16. HeroUI Native + Uniwind Compatibility

The native implementation should preserve the same semantic concepts:

```text
background
foreground
surface
muted
border
primary
secondary
accent
destructive
success
warning
info
```

HeroUI Native components should receive theme values through the native theming mechanism rather than scattering literal colors throughout screens.

Uniwind should provide the utility/styling layer used by the application.

The goal is:

```text
                 Sūtra visual tokens
                         │
                ┌────────┴────────┐
                │                 │
               Web              Native
                │                 │
            shadcn/ui       HeroUI Native
                │                 │
           Tailwind CSS         Uniwind
```

---

# 17. Typography — V1

Typography is intentionally not being deeply designed yet.

V1 requirements:

- Highly readable
- Clear hierarchy
- Consistent sizing
- Strong contrast
- Comfortable message reading
- Same general typographic personality across web and native

Keep the type scale small.

Conceptual levels:

```text
Display
Heading
Body
Body Small
Label
Caption
```

A future visual pass can replace the font and refine the scale without changing product structure.

---

# 18. Spacing — V1

Use a consistent spacing scale rather than arbitrary values.

The exact scale can follow the existing Tailwind / Uniwind conventions wherever possible.

The important rule is:

> Prefer existing framework spacing tokens over one-off pixel values.

This keeps web and native implementation predictable.

---

# 19. Radius — V1

Use moderate rounding.

Sūtra should not look like a collection of oversized pill-shaped components.

Guideline:

```text
Small controls       → small radius
Inputs/buttons       → moderate radius
Cards/dialogs        → moderate-large radius
Avatars              → full
Tags/badges          → full where appropriate
```

Avoid excessive `rounded-full` usage outside genuinely circular/pill elements.

---

# 20. Borders and Shadows

V1 should prefer:

> **borders + spacing + surface contrast**

over heavy shadows.

Shadows should be reserved for surfaces that genuinely need elevation:

- dialogs
- popovers
- menus
- temporary overlays
- floating contextual controls

Most application surfaces should not appear to float.

---

# 21. Illustration / Texture

These are deliberately deferred.

Future Sūtra visual work may explore:

- hand-drawn illustrations
- subtle grain/paper texture
- custom empty states
- distinctive onboarding artwork
- bespoke brand graphics
- richer motion

For V1:

> Do not block implementation on these.

The application must already feel coherent without them.

---

# 22. Interaction States

Core components should account for:

```text
Default
Hover
Pressed
Focus
Selected
Disabled
Loading
Error
```

Interactive components should not rely solely on color to communicate state.

Focus states must remain visible for keyboard users.

Native interactions should account for:

```text
Pressed
Long pressed
Disabled
Loading
Focused where applicable
```

---

# 23. Accessibility

The visual foundation must support:

- sufficient text contrast
- visible focus
- semantic states
- accessible labels
- keyboard navigation on web
- touch-friendly targets on native
- no critical meaning communicated only by color

The design system should make the accessible behavior the default rather than an additional pass.

---

# 24. Responsive Consistency

The same semantic color tokens apply across:

```text
Web desktop
Web tablet
Native Android
Dark mode
Light mode
```

Responsive behavior may change layout, density, and navigation, but should not change the product's visual language.

---

# 25. V1 Visual Scope

### Locked now

- Warm neutral foundation
- Meetup-inspired crimson/coral direction
- Light theme
- Proper dark theme
- Semantic color tokens
- Brand vs semantic color separation
- shadcn-compatible web tokens
- HeroUI Native + Uniwind-compatible native tokens
- restrained use of brand color
- consistent spacing/radius principles
- border-first elevation philosophy

### Deferred

- Final brand identity
- Custom typography exploration
- Hand-drawn illustration system
- Texture/grain system
- Bespoke iconography
- Advanced motion language
- Highly customized component library
- Marketing-site visual identity
- Final polish pass

---

# 26. Guiding Rule

For V1:

> **Make Sūtra exist before trying to make Sūtra perfect.**

The visual foundation should be good enough that every screen feels like the same product.

Once the complete communication loop works end-to-end, we can deliberately invest in making the UI exceptional.
