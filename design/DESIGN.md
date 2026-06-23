---
name: Obsidian Signal
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d1c5ad'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#9a9079'
  outline-variant: '#4d4633'
  surface-tint: '#eec224'
  primary: '#ffd341'
  on-primary: '#3c2f00'
  primary-container: '#e2b714'
  on-primary-container: '#5c4900'
  inverse-primary: '#735c00'
  secondary: '#c8c6c5'
  on-secondary: '#303030'
  secondary-container: '#474746'
  on-secondary-container: '#b6b5b4'
  tertiary: '#b7dbff'
  on-tertiary: '#003351'
  tertiary-container: '#79c2ff'
  on-tertiary-container: '#004f7a'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe087'
  primary-fixed-dim: '#eec224'
  on-primary-fixed: '#231a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#cde5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d32'
  on-tertiary-fixed-variant: '#004b74'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
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
    letterSpacing: -0.01em
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
    fontFamily: Space Mono
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Space Mono
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.2'
  label-sm:
    fontFamily: Space Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.2'
  code:
    fontFamily: Space Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

This design system is a high-utility, technical framework designed for data-intensive environments and developer-centric interfaces. The brand personality is precise, authoritative, and focused. By adopting a "Deep Mode" aesthetic, the system minimizes ocular strain during long-term interaction while maintaining a sharp, high-contrast visual hierarchy.

The design style is a hybrid of **Minimalism** and **Technical Brutalism**. It leverages heavy whitespace (via "dark space"), monospaced typography for structural clarity, and a singular high-chroma accent color to drive user intent. The result is an interface that feels like a sophisticated terminal—utilitarian yet refined.

## Colors

The palette is anchored by **Deep Charcoal (#121212)**, providing a void-like foundation that eliminates edge distractions. The primary accent is **Mustard Yellow (#e2b714)**, used exclusively for primary actions, active states, and critical information.

- **Background:** #121212 (The base canvas).
- **Surface:** #1e1e1e (Used for cards and elevated containers).
- **Primary:** #e2b714 (High-visibility action color).
- **Secondary:** #2a2a2a (Subtle UI elements and inactive states).
- **Text Primary:** #f5f5f5 (Maximum legibility for content).
- **Text Secondary:** #a0a0a0 (De-emphasized labels and metadata).
- **Border:** #333333 (Low-contrast structural definition).

## Typography

The design system utilizes **Space Mono** across all hierarchies to reinforce its technical and precise nature. The monospaced character widths ensure vertical alignment in data-heavy layouts.

- **Headlines:** Set with tight tracking and bold weights to create a "blocky," structural feel.
- **Body:** Open line heights (1.6) are essential to prevent monospaced text from feeling cluttered in long-form reading.
- **Labels:** Small caps or all-caps are preferred for UI labels to differentiate them from dynamic content.
- **Scaling:** For mobile, large headlines scale down aggressively to maintain the "grid" integrity without causing excessive horizontal scrolling or awkward line breaks.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop and a **Fluid Grid** on mobile. Elements are strictly aligned to an 8px square grid to maintain the technical aesthetic.

- **Desktop:** 12-column grid, max-width 1280px, 24px gutters. Content is centered with generous 64px outer margins.
- **Tablet:** 8-column grid, 24px gutters, 32px margins.
- **Mobile:** 4-column grid, 16px gutters, 16px margins.
- **Rhythm:** Vertical rhythm is maintained through the `md` (24px) spacing unit, used between related functional blocks.

## Elevation & Depth

In this dark-mode system, depth is conveyed through **Tonal Layers** and **Low-Contrast Outlines** rather than traditional shadows. Shadows are largely avoided to maintain the "flat" brutalist aesthetic.

- **Level 0 (Background):** #121212.
- **Level 1 (Cards/Inputs):** #1e1e1e. Use a 1px solid border (#333333) to define the edge.
- **Level 2 (Modals/Popovers):** #252525. Use a slightly brighter border (#444444) and a subtle 10% opacity black shadow to lift it from Level 1.
- **Interactions:** Hover states are indicated by shifting the border color to the Primary Mustard (#e2b714) rather than increasing elevation.

## Shapes

The shape language is strictly **Sharp (0px)**. This reinforces the architectural and technical narrative of the design system. 

- All buttons, input fields, cards, and containers must have 90-degree corners.
- Exception: Circular icons or avatars are permitted only when using standard third-party assets, though square avatars are preferred for consistency.
- Focus rings: 2px solid offset stroke using the Primary Mustard color.

## Components

### Buttons
- **Primary:** Background #e2b714, Text #121212, Bold weight. No border.
- **Secondary:** Background transparent, Text #f5f5f5, 1px solid border #333333.
- **Ghost:** Background transparent, Text #a0a0a0. Primary color text on hover.

### Input Fields
- **Default:** Background #1e1e1e, 1px solid border #333333, Text #f5f5f5.
- **Focus:** 1px solid border #e2b714. Label moves above the field in Label-SM style.

### Chips & Tags
- Rectangular with 1px border. For active filters, use a Mustard background with dark text. For inactive, use #2a2a2a background.

### Cards
- No shadows. Background #1e1e1e with a #333333 border. Headers within cards should have a bottom border of #333333 to separate them from the body content.

### Checkboxes & Radios
- Square containers only. When checked, the inner fill is #e2b714. 

### Data Tables
- Header row uses #1e1e1e background with Uppercase Label-MD text. Rows are separated by 1px solid #333333 lines. No zebra striping; use hover row highlights (#252525) instead.