---
name: Ranq Narrative
colors:
  surface: '#fcf9ee'
  surface-dim: '#dddacf'
  surface-bright: '#fcf9ee'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f4e8'
  surface-container: '#f1eee3'
  surface-container-high: '#ebe8dd'
  surface-container-highest: '#e5e2d8'
  on-surface: '#1c1c15'
  on-surface-variant: '#4e4634'
  inverse-surface: '#313129'
  inverse-on-surface: '#f4f1e6'
  outline: '#807662'
  outline-variant: '#d2c5ae'
  surface-tint: '#775a00'
  primary: '#775a00'
  on-primary: '#ffffff'
  primary-container: '#d9a81f'
  on-primary-container: '#553f00'
  inverse-primary: '#f3bf38'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#646464'
  tertiary: '#1a5fa8'
  on-tertiary: '#ffffff'
  tertiary-container: '#79b1ff'
  on-tertiary-container: '#00437d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdf9a'
  primary-fixed-dim: '#f3bf38'
  on-primary-fixed: '#251a00'
  on-primary-fixed-variant: '#5a4300'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#d4e3ff'
  tertiary-fixed-dim: '#a5c8ff'
  on-tertiary-fixed: '#001c3a'
  on-tertiary-fixed-variant: '#004785'
  background: '#fcf9ee'
  on-background: '#1c1c15'
  surface-variant: '#e5e2d8'
  paper-bg: '#F1EEE3'
  mustard-accent: '#D9A81F'
  ink-black: '#000000'
  border-muted: rgba(0,0,0,0.1)
typography:
  headline-xl:
    fontFamily: Space Mono
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Mono
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-lg-mobile:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Mono
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.3'
  body-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Courier Prime
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  code:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.5'
spacing:
  unit: 8px
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  nav-height: 64px
---

## Brand & Style

The design system is built on a "Digital Typewriter" aesthetic—a fusion of utilitarian brutalism and warm minimalism. It targets developers and intellectuals who value clarity over decoration. The brand personality is honest, raw, and high-functioning, intentionally avoiding the "over-designed" look of modern SaaS in favor of a low-fidelity, document-centric experience.

The design style is **Minimalist-Brutalist**. It utilizes a warm, parchment-like background to reduce eye strain and provide a tactile, paper-like quality. Visual interest is generated through rigid structural lines, significant negative space, and a single, high-impact accent color. Every element serves a functional purpose, with no unnecessary shadows or gradients.

## Colors

The palette is intentionally restricted to three core tones to maintain a focused, editorial feel. 

- **Primary (Mustard Yellow):** Used exclusively for high-priority actions, active states in the navigation, and critical brand highlights. It provides a sharp contrast against the background without the aggression of pure red or orange.
- **Neutral (Paper):** The off-white/beige base creates a "living document" feel. It is used for all backgrounds and surface areas.
- **Ink Black:** Used for all text, iconography, and structural borders to ensure maximum legibility and a stark, typewriter-ink appearance.

## Typography

Typography is the primary driver of the design system. A strictly monospaced hierarchy is used to reinforce the technical and brutalist nature of the product.

- **Headlines:** Use **Space Mono** for a geometric, futuristic punch. Larger sizes should have tighter letter spacing to maintain a cohesive visual block.
- **Body:** Use **JetBrains Mono** for its exceptional legibility and modern technical feel. It balances the "old world" typewriter aesthetic with "new world" developer tools.
- **Labels:** Use **Courier Prime** for small metadata or labels to evoke a classic terminal or typewriter output.

All text should be treated as "ink on paper"—stick to pure black on the off-white background. Avoid using gray text for hierarchy; use font weight and size instead.

## Layout & Spacing

This design system uses a **fixed-fluid hybrid grid** centered on a 12-column system. 

1.  **Vertical Rhythm:** Built on an 8px base unit. All margins and paddings must be multiples of 8.
2.  **Structural Borders:** Layout sections are separated by 1px solid black borders rather than shadows.
3.  **The Persistent Nav:** A unique trait of this system is the persistent navigation bar (often positioned at the bottom), which acts as a structural anchor. It should span the full width of the viewport or the container.
4.  **Desktop:** Max content width of 1200px with generous side margins to create a "columnar" document feel.
5.  **Mobile:** 16px margins with a focus on vertical stacking and full-width interactive elements.

## Elevation & Depth

This system is strictly **Flat**. There are no shadows, blurs, or gradients. 

- **Depth via Layering:** Visual hierarchy is achieved through "Stacked Paper" effects. If a modal or overlay is needed, it should have a 2px solid black border and a solid background color, appearing as a physical sheet laid over the content.
- **Active States:** Instead of a shadow, an active or focused element may "fill" with the Mustard Yellow accent or gain a thicker 3px border.
- **The "Pressed" Effect:** For buttons, a simple 2px offset (moving the element down and right by 2px) can be used to simulate a physical mechanical key press.

## Shapes

The shape language is **Sharp**. 

- **Hard Edges:** All buttons, cards, input fields, and containers must have a 0px border radius. This reinforces the brutalist, architectural feel and aligns with the monospaced typography grid.
- **Strokes:** Use 1px black strokes for standard containers and 2px black strokes for primary interactive elements.

## Components

- **Buttons:** Rectangular with a 1px or 2px black border. Primary buttons use the Mustard Yellow (#D9A81F) background with black text. Secondary buttons have a transparent background with black text and border. Hover states should simply invert the colors or thicken the border.
- **Input Fields:** Flat boxes with a 1px black bottom border or full border. Use the monospace body font for placeholder and input text.
- **Navigation Bar:** A persistent, high-contrast bar. Active links are highlighted with a Mustard Yellow block background. It should feel like a fixed toolbar on a drafting table.
- **Cards:** Simple 1px bordered containers with no shadow. Use generous internal padding (32px+) to give content room to breathe.
- **Chips/Tags:** Small rectangular boxes with 1px borders. No rounded corners. Used for categorizing technical data.
- **Checkboxes/Radios:** Square (0px radius) boxes. When checked, they should be filled with a solid black "X" or a solid black square, maintaining the typewriter aesthetic.
- **Lists:** Unordered lists should use a simple dash `-` or a square bullet to match the monospace character set.