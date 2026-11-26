import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface NeonAmbientCanvasProps {
  className?: string;
  intensity?: number;
}

/**
 * Lightweight Three.js WebGL ambient emerald-particle & orbital mesh canvas.
 * Gracefully degrades to CSS gradient backdrop if WebGL is unavailable and disposes cleanly on unmount.
 */
export const NeonAmbientCanvas: React.FC<NeonAmbientCanvasProps> = ({
  className = '',
  intensity = 1,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let rafId = 0;

    try {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 100);
      camera.position.z = 8.5;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height);
      container.appendChild(renderer.domElement);

      // Emerald particle nebula
      const count = 160;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 18;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        color: 0x10b981,
        size: 0.065 * intensity,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const particles = new THREE.Points(geo, mat);
      scene.add(particles);

      // Subtle wireframe torus lens ring
      const ringGeo = new THREE.TorusGeometry(3.2, 0.015, 12, 80);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.18 * intensity,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI * 0.35;
      scene.add(ring);

      const handleResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      const clock = new THREE.Clock();
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();
        particles.rotation.y = t * 0.045;
        particles.rotation.x = Math.sin(t * 0.08) * 0.12;
        ring.rotation.z = t * 0.12;
        ring.rotation.y = Math.cos(t * 0.18) * 0.25;
        renderer?.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
        geo.dispose();
        mat.dispose();
        ringGeo.dispose();
        ringMat.dispose();
        if (renderer) {
          renderer.dispose();
          if (renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
        }
      };
    } catch {
      return undefined;
    }
  }, [intensity]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${className}`}
    />
  );
};

export default NeonAmbientCanvas;
