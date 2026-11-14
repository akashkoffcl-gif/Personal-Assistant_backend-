# 08 — REDESIGN RECOMMENDATIONS & SYSTEM PROPOSAL

**Audit Date:** 2026-11-14  
**Product Strategy:** Transitioning NOVA to World-Class Enterprise AI Companion  

---

### 1. Recommended Visual & UX Direction: Direction A (Premium Dark Intelligence)

To establish NOVA as a peer to top-tier enterprise AI tools (Raycast, Linear, Apple Human Interface, Stripe), we recommend standardizing on **Direction A: Premium Dark Intelligence**:
- **Canvas:** Deep obsidian and slate (`#09060F`, `#120D1F`).
- **Elevated Surfaces:** Micro-bordered glass cards with luminous violet rim-lighting.
- **Brand Essence:** Mysterious, ambient, trustworthy, and razor-sharp.

---

### 2. Top 10 Redesign Priorities

| Priority | Dimension | Area of Intervention | Expected User Impact |
|---|---|---|---|
| **1** | Information Architecture | **Command Sidebar Realignment** | Consolidate 22 horizontal tabs into a 4-group collapsible left sidebar + `Cmd+K` command palette. Eliminates navigation crowding completely. |
| **2** | Visual Identity | **Unify Dark Palette Across All Screens** | Eliminate light-lavender / dark-assistant dissonance. Standardize all cards, modals, and workspaces on the Dark Intelligence design system. |
| **3** | AI Experience | **Ambient Ambient Companion HUD** | Make NOVA feel present at the top of the dashboard as a unified intelligent partner, rather than a hidden button in the bottom corner. |
| **4** | Usability / Bug | **Drawer Pointer-Events Fix** | Correct DOM backdrop cleanup to guarantee clicks never get intercepted after closing drawers or modals. |
| **5** | Avatar System | **Custom Avatar Asset Integration Engine** | Anchor the animation architecture to receive the user-supplied avatar image, wrapping it in an audio-reactive, luminous orbital aura. |
| **6** | Typography | **Standardize Geometric Enterprise Type** | Adopt `Geist` or `Inter` with strict weight rules and tabular figures (`tabular-nums`) for timers, metrics, and currency. |
| **7** | Micro-interactions | **Framer Motion Transition Scale** | Standardize page, drawer, and modal transitions to 200–300ms spring physics (`stiffness: 300, damping: 30`). |
| **8** | Mobile Ergonomics | **Bottom Sheet & Touch Target Hardening** | Enforce 44×44px minimum touch targets and transform squashed metric rows into smooth horizontal carousels. |
| **9** | Performance | **On-Demand Three.js GPU Rendering** | Throttle WebGL rendering during idle periods, saving battery and CPU cycles on mobile and laptops. |
| **10** | Accessibility | **WCAG 2.2 AA Focus & Contrast Certification** | Ensure all text meets 4.5:1 minimum contrast and all interactive elements feature visible, accessible focus rings. |
