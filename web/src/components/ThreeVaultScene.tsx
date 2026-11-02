'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const ThreeVaultScene: React.FC<{ className?: string }> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Dimensions
    let width = container.clientWidth || 400;
    let height = container.clientHeight || 400;

    // Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 11);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Central Metallic Nucleus (Hardware Vault)
    const coreGeo = new THREE.OctahedronGeometry(1.6, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x141418,
      metalness: 0.95,
      roughness: 0.15,
      wireframe: false,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    rootGroup.add(coreMesh);

    // 2. Polyhedral Wireframe Shield (Hardware Enclave boundary)
    const latticeGeo = new THREE.IcosahedronGeometry(2.3, 1);
    const latticeMat = new THREE.MeshBasicMaterial({
      color: 0x3f3f46,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    rootGroup.add(latticeMesh);

    // 3. Inner Biometric Ring (secp256r1 RIP-7212 Curve)
    const ring1Geo = new THREE.TorusGeometry(3.2, 0.035, 16, 100);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0xff4500,
      emissive: 0xff4500,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1,
    });
    const ring1Mesh = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1Mesh.rotation.x = Math.PI / 3;
    ring1Mesh.rotation.y = Math.PI / 8;
    rootGroup.add(ring1Mesh);

    // 4. Outer USDG Liquidity Ring (Paxos Global Dollar Belt)
    const ring2Geo = new THREE.TorusGeometry(4.0, 0.04, 16, 100);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.7,
      metalness: 0.8,
      roughness: 0.2,
    });
    const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2Mesh.rotation.x = -Math.PI / 4;
    ring2Mesh.rotation.z = Math.PI / 6;
    rootGroup.add(ring2Mesh);

    // 5. Orbital Session Key Nodes
    const nodeGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const nodes: THREE.Mesh[] = [];
    const nodeCount = 5;

    for (let i = 0; i < nodeCount; i++) {
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      rootGroup.add(node);
      nodes.push(node);
    }

    // 6. Ambient Floating Cryptographic Particles
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      const radius = 3.5 + Math.random() * 4.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x8e8e98,
      size: 0.055,
      transparent: true,
      opacity: 0.6,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particleSystem);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(5, 8, 7);
    scene.add(dirLight);

    const orangeLight = new THREE.PointLight(0xff4500, 3.5, 14);
    orangeLight.position.set(-4, -4, 2);
    scene.add(orangeLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 3.0, 14);
    emeraldLight.position.set(4, 4, 3);
    scene.add(emeraldLight);

    // Mouse Parallax & Smooth Lerp
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x * 0.45;
      mouseY = y * 0.45;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse follow
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      rootGroup.rotation.y = targetX + elapsedTime * 0.12;
      rootGroup.rotation.x = -targetY + Math.sin(elapsedTime * 0.5) * 0.08;

      // Independent rotations for internal components
      coreMesh.rotation.y += 0.015;
      coreMesh.rotation.x += 0.008;

      latticeMesh.rotation.y -= 0.005;
      latticeMesh.rotation.z += 0.006;

      ring1Mesh.rotation.z += 0.02;
      ring2Mesh.rotation.z -= 0.015;

      // Update Session Key orbital nodes
      nodes.forEach((node, idx) => {
        const offset = (idx * Math.PI * 2) / nodeCount;
        const currentAngle = elapsedTime * 0.6 + offset;
        node.position.set(
          Math.cos(currentAngle) * 3.2,
          Math.sin(currentAngle) * 3.2 * Math.cos(ring1Mesh.rotation.x),
          Math.sin(currentAngle) * 3.2 * Math.sin(ring1Mesh.rotation.x)
        );
      });

      // Particle system slow cosmic drift
      particleSystem.rotation.y = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);

      // Cleanup WebGL resources
      coreGeo.dispose();
      coreMat.dispose();
      latticeGeo.dispose();
      latticeMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const triggerSecurityPulse = () => {
    setPulseActive(true);
    setTimeout(() => setPulseActive(false), 800);
  };

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={triggerSecurityPulse}
      className={`relative w-full h-[380px] md:h-[460px] flex items-center justify-center cursor-pointer select-none overflow-hidden rounded-2xl ${className}`}
      title="Click to trigger Hardware Security Pulse"
    >
      {/* 3D Telemetry HUD Pill */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141418]/80 border border-white/[0.08] backdrop-blur-md text-[11px] font-mono text-[#8e8e98] pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-[#ff4500] animate-pulse" />
        <span>RIP-7212 ENCLAVE • RUST WASM</span>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#141418]/80 border border-white/[0.08] backdrop-blur-md text-[11px] font-mono text-emerald-400 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span>USDG GLOBAL DOLLAR</span>
      </div>

      {/* Security Pulse Flash Overlay */}
      {pulseActive && (
        <div className="absolute inset-0 z-20 pointer-events-none rounded-2xl border-2 border-[#ff4500] bg-[#ff4500]/10 animate-ping duration-700" />
      )}

      {/* Interactive Hint */}
      <div className="absolute bottom-4 z-10 text-[11px] font-mono text-[#8e8e98] bg-[#09090b]/80 px-3 py-1 rounded-md border border-white/[0.06] backdrop-blur-sm pointer-events-none transition-opacity duration-300">
        {isHovered ? '⚡ Interactive 3D Enclave • Rotate with Cursor' : '3D Stylus Vault • Click to Pulse'}
      </div>
    </div>
  );
};
