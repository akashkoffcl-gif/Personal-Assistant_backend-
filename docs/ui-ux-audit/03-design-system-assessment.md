# 03 — DESIGN SYSTEM & TOKEN ASSESSMENT

**Audit Date:** 2026-11-14  
**Scope:** Design Tokens, Typography, Color Palette, and Atomic Components  

---

### 1. Color Palette & Contrast Audit

The current palette in `tailwind.config.ts` declares five competing color namespaces (`app`, `lavender`, `palette`, `primary`, `assistant`).

#### Contrast Findings (WCAG 2.2 AA Compliance):
- **Card Muted Text (`#74738A` on `#FFFFFF`):** Contrast ratio of **4.6:1** (Barely passes AA 4.5:1, fails AAA).
- **Subtle Borders (`#E5E2F5` on `#EAE9FF`):** Contrast ratio of **1.1:1** (Severely low boundary perception; users struggle to distinguish card edges under bright light).
- **Primary Lavender Accent (`#8B45F5` on `#FFFFFF`):** Contrast ratio of **4.8:1** (Passes AA for standard text, but fails for small metadata tags).

---

### 2. Typography Hierarchy Assessment

- **Font Family:** System font fallback stack (`ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`).
- **Deficiencies:**
  - Lacks a distinctive typographic voice. Enterprise products of this caliber (Linear, Raycast, Apple) leverage modern geometric or humanist typefaces (e.g., `Inter`, `Geist`, or `SF Pro Display`).
  - Font weights jump erratically between `font-semibold (600)` and `font-bold (700)` with insufficient usage of `font-medium (500)`.
  - Monospace typography for dates, times, and financial amounts is not utilized, causing jitter during live timer countdowns.

---

### 3. Proposed Unified Design Token Architecture

```css
/* Core Semantic Design Tokens for Direction A (Premium Dark Intelligence) */
:root {
  /* Surfaces */
  --nova-bg-canvas: #09060F;
  --nova-bg-surface: #120D1F;
  --nova-bg-elevated: #1B142D;
  --nova-bg-glass: rgba(27, 20, 45, 0.72);

  /* Borders & Dividers */
  --nova-border-subtle: rgba(139, 92, 246, 0.12);
  --nova-border-prominent: rgba(139, 92, 246, 0.28);
  --nova-border-active: #8B5CF6;

  /* Typography */
  --nova-text-primary: #F8FAFC;
  --nova-text-secondary: #94A3B8;
  --nova-text-muted: #64748B;
  --nova-text-accent: #A78BFA;

  /* Brand Accents */
  --nova-primary: #8B5CF6;
  --nova-primary-glow: rgba(139, 92, 246, 0.35);
  --nova-accent-cyan: #06B6D4;
  --nova-accent-emerald: #10B981;
  --nova-accent-rose: #F43F5E;
  --nova-accent-amber: #F59E0B;
}
```
