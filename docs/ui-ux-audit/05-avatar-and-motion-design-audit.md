# 05 — NOVA AVATAR AND MOTION DESIGN AUDIT

**Audit Date:** 2026-11-14  
**Scope:** Three.js 3D Avatar Rendering, Audio Waveforms, and Custom Motion States  

---

### 1. Existing Avatar Architecture Inspection

- **Component:** `apps/web/src/components/AIAssistant/AIAvatarModel.tsx`
- **Rendering Technology:** Native WebGL via **Three.js** (`PerspectiveCamera`, `PointLight`, `DirectionalLight`).
- **3D Geometry Model:**
  - Head: Procedural `SphereGeometry` with metallic purple material (`roughness: 0.22`, `metalness: 0.65`, `emissive: 0x2d1266`).
  - Visor: Dark curved `CylinderGeometry` screen simulating a robotic helmet.
  - Floating Orbs / Halo: Secondary animated geometry rings.
- **Audio Reactivity:** Connects to `audioVolume` (0.0 to 1.0) adjusting scale and point-light intensity.
- **Deficiencies:**
  - Procedural robotic sphere feels generic; it resembles a template 3D sphere rather than a distinctive, recognizable personal companion.
  - Three.js loop runs at unconstrained FPS on some browsers, consuming excessive battery on laptops.

---

### 2. Custom Avatar Integration Strategy (Handling User-Supplied Asset)

> [!IMPORTANT]
> The user will supply a custom NOVA avatar image separately. In strict accordance with directives:
> - We will **not invent a replacement avatar or stock 3D character**.
> - When the user supplies the avatar asset, we will anchor all animation around that exact visual identity.

#### Recommended Animation Architecture for Supplied Asset:
1. **Interactive Layered Composition (SVG / Canvas / WebGL Hybrid):**
   - The user-supplied asset serves as the primary visual foreground.
   - We introduce a hardware-accelerated ambient backdrop:
     - **Fluid Chromatic Ring / Aura:** Luminous violet & cyan orbital rings breathing behind the avatar.
     - **Audio-Reactive Particle Dispersal:** Micro-particles pulsing outward in sync with speech synthesis audio frequencies.
     - **Subtle Parallax / Gyro Tilt:** Follows mouse cursor or device orientation (within $\pm 6^\circ$).

---

### 3. Eleven Custom State Motion Specifications

| State | Visual Appearance | Motion & Animation Behavior | Duration / Loop | Easing |
|---|---|---|---|---|
| **1. IDLE** | Calm, gentle breathing glow | Subtle 2% scale pulse; ambient background gradient slow orbit. | 3.2s Loop | `easeInOutSine` |
| **2. WAKE** | Flash of luminous violet light | Instant snap to attention; rings align forward; scale expands by 8%. | 350ms (Once) | `backOut(1.4)` |
| **3. LISTENING** | Soft cyan & violet waveform | Dynamic audio-reactive breathing; ripples expand outward with microphone volume. | Real-time | Linear audio map |
| **4. THINKING** | Orbiting dual photon particles | Ambient halo spins clockwise; light pulses through core. | 1.8s Loop | `easeInOutCubic` |
| **5. REASONING** | Multi-node neural trace glow | Discrete geometric pulses highlighting logical step evaluation. | 1.2s Loop | `easeInOutQuart` |
| **6. SPEAKING** | Synchronized voice waveform | Subtle jaw/core harmonic pulse matching TTS audio frequencies. | Audio bound | Real-time |
| **7. EXECUTING** | Rapid clockwise energy ring | Accelerating rotation with directional particle streaks. | 800ms Loop | `linear` |
| **8. AWAITING_APPROVAL** | Soft amber breathing warning | Gentle pulsing amber glow waiting for user button click. | 2.0s Loop | `easeInOut` |
| **9. SUCCESS** | Radiant emerald bloom | 360-degree outward energy wave; snap to gentle resting scale. | 500ms (Once) | `easeOutQuint` |
| **10. ERROR** | Muted crimson deflection shake | Horizontal micro-jitter (2px $\times$ 3 cycles); dim glow recovery. | 350ms (Once) | `cubic-bezier(.36,.07,.19,.97)` |
| **11. SLEEP / STANDBY** | Low-opacity dimmed silhouette | Deep rhythmic breath at 15% opacity; ambient particles dormant. | 5.0s Loop | `easeInOutQuad` |
