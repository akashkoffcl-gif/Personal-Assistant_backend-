'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { AvatarState } from './types';

interface AIAvatarModelProps {
  state: AvatarState;
  audioVolume?: number; // 0 to 1
  size?: number; // pixel width/height (e.g. 110)
  onClick?: () => void;
  className?: string;
  themeStyle?: 'cosmic' | 'crystal' | 'cyber';
}

export const AIAvatarModel: React.FC<AIAvatarModelProps> = ({
  state,
  audioVolume = 0,
  size = 110,
  onClick,
  className = '',
  themeStyle = 'crystal',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webGLError, setWebGLError] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check reduced motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(media.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, []);

  // Three.js 3D Avatar Rendering
  useEffect(() => {
    if (prefersReducedMotion || webGLError || !mountRef.current) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let animId: number = 0;
    let isDisposed = false;

    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0, 4.2);

      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(size, size);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      // Clear container and mount
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);

      // --- Lighting ---
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xeae9ff, 1.8);
      dirLight.position.set(2, 4, 3);
      scene.add(dirLight);

      const purplePointLight = new THREE.PointLight(0x8b45f5, 2.5, 6);
      purplePointLight.position.set(0, 0, 1.8);
      scene.add(purplePointLight);

      // --- Avatar Group ---
      const avatarGroup = new THREE.Group();
      scene.add(avatarGroup);

      // 1. Head (Glossy Lavender Sphere)
      const headGeom = new THREE.SphereGeometry(1.0, 32, 32);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0x8b45f5,
        roughness: 0.22,
        metalness: 0.65,
        emissive: 0x2d1266,
        emissiveIntensity: 0.25,
      });
      const head = new THREE.Mesh(headGeom, headMat);
      avatarGroup.add(head);

      // 2. Visor Screen (Dark Curved Glass)
      const visorGeom = new THREE.CylinderGeometry(0.78, 0.78, 0.44, 32, 1, false, Math.PI * 0.25, Math.PI * 0.5);
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0x121024,
        roughness: 0.05,
        metalness: 0.9,
      });
      const visor = new THREE.Mesh(visorGeom, visorMat);
      visor.rotation.y = -Math.PI * 0.5;
      visor.position.set(0, 0.05, 0.52);
      avatarGroup.add(visor);

      // 3. Glowing Eyes (Left & Right)
      const eyeGeom = new THREE.SphereGeometry(0.09, 16, 16);
      const eyeMat = new THREE.MeshBasicMaterial({
        color: 0x5eead4, // Cyan glow
      });
      const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
      leftEye.position.set(-0.28, 0.08, 0.98);
      avatarGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
      rightEye.position.set(0.28, 0.08, 0.98);
      avatarGroup.add(rightEye);

      // 4. Glowing Mouth (Viseme for speech)
      const mouthGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.03, 16);
      const mouthMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
      const mouth = new THREE.Mesh(mouthGeom, mouthMat);
      mouth.rotation.x = Math.PI * 0.5;
      mouth.position.set(0, -0.16, 0.97);
      avatarGroup.add(mouth);

      // 5. Outer Gyroscope Rings (Dual Celestial Rings)
      const ringGeom = new THREE.TorusGeometry(1.36, 0.032, 16, 64);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xa78bfa,
        emissive: 0x8b45f5,
        emissiveIntensity: 0.65,
        roughness: 0.25,
        metalness: 0.85,
      });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI * 0.42;
      avatarGroup.add(ring);

      const innerRingGeom = new THREE.TorusGeometry(1.18, 0.02, 16, 64);
      const innerRingMat = new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.9,
      });
      const innerRing = new THREE.Mesh(innerRingGeom, innerRingMat);
      innerRing.rotation.y = Math.PI * 0.35;
      avatarGroup.add(innerRing);

      // 6. Ambient Particle Halo
      const particleCount = 36;
      const particleGeom = new THREE.BufferGeometry();
      const posArray = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount * 3; i += 3) {
        const theta = Math.random() * Math.PI * 2;
        const rad = 1.35 + Math.random() * 0.55;
        posArray[i] = Math.cos(theta) * rad;
        posArray[i + 1] = (Math.random() - 0.5) * 1.3;
        posArray[i + 2] = Math.sin(theta) * rad;
      }
      particleGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particleMat = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xd8b4fe,
        transparent: true,
        opacity: 0.85,
      });
      const particleSystem = new THREE.Points(particleGeom, particleMat);
      avatarGroup.add(particleSystem);

      // --- Animation Loop State (Using THREE.Timer to eliminate Clock deprecation) ---
      const timer = new THREE.Timer();
      let lastBlink = 0;
      let isBlinking = false;
      let targetRotY = 0;
      let targetRotX = 0;

      // Mouse tracking
      const handleMouseMove = (e: MouseEvent) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = -(e.clientY / window.innerHeight) * 2 + 1;
        targetRotY = nx * 0.35;
        targetRotX = -ny * 0.25;
      };
      window.addEventListener('mousemove', handleMouseMove);

      const animate = (timestamp?: number) => {
        if (isDisposed) return;
        animId = requestAnimationFrame(animate);

        timer.update(timestamp);
        const elapsedTime = timer.getElapsed();

        // 1. Smooth Head Orientation (lerp toward pointer or behavior)
        avatarGroup.rotation.y += (targetRotY - avatarGroup.rotation.y) * 0.08;
        avatarGroup.rotation.x += (targetRotX - avatarGroup.rotation.x) * 0.08;

        // 2. Floating & Breathing Motion
        const floatSpeed = state === 'listening' ? 3.5 : state === 'thinking' ? 4.0 : 2.0;
        const floatAmp = state === 'speaking' ? 0.08 : 0.05;
        avatarGroup.position.y = Math.sin(elapsedTime * floatSpeed) * floatAmp;

        // 3. Ring Rotation
        ring.rotation.z += state === 'executing' ? 0.08 : state === 'thinking' ? 0.04 : 0.015;
        innerRing.rotation.x += state === 'executing' ? 0.06 : state === 'thinking' ? 0.03 : -0.012;
        particleSystem.rotation.y += 0.008;

        // 4. Natural Blinking logic (every 3.5-5s)
        if (elapsedTime - lastBlink > 3.8) {
          isBlinking = true;
          lastBlink = elapsedTime;
        }
        if (isBlinking) {
          leftEye.scale.y = 0.1;
          rightEye.scale.y = 0.1;
          if (elapsedTime - lastBlink > 0.14) {
            isBlinking = false;
            leftEye.scale.y = 1.0;
            rightEye.scale.y = 1.0;
          }
        }

        // 5. State-specific visual reactions
        if (state === 'idle') {
          eyeMat.color.setHex(0x5eead4); // Calm cyan
          headMat.color.setHex(0x8b45f5);
          mouth.scale.set(1.0, 1.0, 1.0);
        } else if (state === 'listening') {
          eyeMat.color.setHex(0x38bdf8); // Sky blue attentive
          headMat.color.setHex(0x7c3aed);
          avatarGroup.position.z = 0.2; // lean forward slightly
          leftEye.scale.set(1.2, 1.2, 1.2);
          rightEye.scale.set(1.2, 1.2, 1.2);
        } else if (state === 'thinking') {
          eyeMat.color.setHex(0xa855f7); // Violet thinking
          headMat.color.setHex(0x6935c8);
          avatarGroup.rotation.z = Math.sin(elapsedTime * 3) * 0.12; // head tilt
        } else if (state === 'speaking') {
          eyeMat.color.setHex(0x34d399); // Emerald friendly
          headMat.color.setHex(0x8b45f5);
          // Audio-reactive mouth opening & viseme pulsation
          const mouthOpen = 0.2 + (audioVolume > 0 ? audioVolume * 1.8 : Math.abs(Math.sin(elapsedTime * 12)) * 0.8);
          mouth.scale.set(1.0 + mouthOpen * 0.5, mouthOpen, 1.0);
        } else if (state === 'executing') {
          eyeMat.color.setHex(0x3b82f6); // Cobalt executing
          headMat.color.setHex(0x2563eb);
          ring.scale.setScalar(1.0 + Math.sin(elapsedTime * 8) * 0.08);
        } else if (state === 'success') {
          eyeMat.color.setHex(0x10b981); // Emerald success
          headMat.color.setHex(0x059669);
          avatarGroup.position.y += Math.abs(Math.sin(elapsedTime * 6)) * 0.12; // joyful bounce
        } else if (state === 'error') {
          eyeMat.color.setHex(0xf43f5e); // Rose red error
          headMat.color.setHex(0xbe123c);
          avatarGroup.position.x = Math.sin(elapsedTime * 20) * 0.04; // alert shake
        }

        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };

      animate();

      return () => {
        isDisposed = true;
        cancelAnimationFrame(animId);
        window.removeEventListener('mousemove', handleMouseMove);
        if (renderer && renderer.domElement && mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
          renderer.dispose();
        }
        headGeom.dispose();
        headMat.dispose();
        visorGeom.dispose();
        visorMat.dispose();
        eyeGeom.dispose();
        eyeMat.dispose();
        mouthGeom.dispose();
        mouthMat.dispose();
        ringGeom.dispose();
        ringMat.dispose();
        innerRingGeom.dispose();
        innerRingMat.dispose();
        particleGeom.dispose();
        particleMat.dispose();
      };
    } catch (err) {
      console.warn('WebGL initialization failed, falling back to 2D Canvas avatar:', err);
      setWebGLError(true);
    }
  }, [state, audioVolume, size, webGLError, prefersReducedMotion]);

  // 2D Canvas Fallback (active if WebGL fails or prefers-reduced-motion)
  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center select-none cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`AI Companion Avatar (${state})`}
    >
      {/* Three.js Canvas Container */}
      {!webGLError && !prefersReducedMotion ? (
        <div ref={mountRef} className="w-full h-full" />
      ) : (
        /* Lightweight 2D Canvas / SVG Fallback */
        <div className="relative w-full h-full rounded-full flex items-center justify-center bg-gradient-to-tr from-[#6935C8] to-[#8B45F5] shadow-lg border-2 border-white/40">
          <div className="w-4/5 h-4/5 rounded-full bg-[#1A1830] flex flex-col items-center justify-center relative overflow-hidden">
            {/* Eyes */}
            <div className="flex items-center gap-3 mb-1">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  state === 'speaking' || state === 'success'
                    ? 'bg-[#34D399] shadow-[0_0_8px_#34D399]'
                    : state === 'error'
                    ? 'bg-[#F43F5E] shadow-[0_0_8px_#F43F5E]'
                    : state === 'thinking'
                    ? 'bg-[#C084FC] shadow-[0_0_8px_#C084FC]'
                    : 'bg-[#5EEAD4] shadow-[0_0_8px_#5EEAD4]'
                }`}
              />
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  state === 'speaking' || state === 'success'
                    ? 'bg-[#34D399] shadow-[0_0_8px_#34D399]'
                    : state === 'error'
                    ? 'bg-[#F43F5E] shadow-[0_0_8px_#F43F5E]'
                    : state === 'thinking'
                    ? 'bg-[#C084FC] shadow-[0_0_8px_#C084FC]'
                    : 'bg-[#5EEAD4] shadow-[0_0_8px_#5EEAD4]'
                }`}
              />
            </div>
            {/* Mouth */}
            <div
              className={`h-1 rounded-full transition-all duration-200 ${
                state === 'speaking'
                  ? 'w-4 bg-[#34D399] animate-pulse h-2'
                  : state === 'success'
                  ? 'w-3 bg-[#34D399]'
                  : state === 'error'
                  ? 'w-3 bg-[#F43F5E]'
                  : 'w-2 bg-[#5EEAD4]'
              }`}
            />
          </div>
        </div>
      )}

      {/* Floating State Aura Pill */}
      <div
        className={`absolute -bottom-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-md transition-all duration-300 ${
          state === 'idle'
            ? 'bg-[#8B45F5]'
            : state === 'listening'
            ? 'bg-[#0284C7] animate-pulse'
            : state === 'thinking'
            ? 'bg-[#7C3AED] animate-pulse'
            : state === 'speaking'
            ? 'bg-[#10B981]'
            : state === 'executing'
            ? 'bg-[#2563EB]'
            : state === 'success'
            ? 'bg-[#059669]'
            : 'bg-[#E11D48]'
        }`}
      >
        {state}
      </div>
    </div>
  );
};

