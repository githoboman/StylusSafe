if (typeof FileReader === 'undefined') {
  global.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        const base64 = Buffer.from(buf).toString('base64');
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
        if (this.onloadend) this.onloadend();
      });
    }
  };
}

import * as THREE from '../web/node_modules/three/build/three.module.js';
import { GLTFExporter } from '../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scene = new THREE.Scene();
scene.name = 'StylusSafeEnclaveVault';

// 1. Inner Enclave Nucleus (Hardware Vault Core)
const coreGeo = new THREE.OctahedronGeometry(1.6, 0);
const coreMat = new THREE.MeshStandardMaterial({
  color: 0x141418,
  metalness: 0.92,
  roughness: 0.18,
  wireframe: false,
});
const coreMesh = new THREE.Mesh(coreGeo, coreMat);
coreMesh.name = 'VaultCore';
scene.add(coreMesh);

// 2. Outer Protective Lattice (RIP-7212 Hardware Shield)
const latticeGeo = new THREE.IcosahedronGeometry(2.4, 1);
const latticeMat = new THREE.MeshStandardMaterial({
  color: 0x27272a,
  metalness: 0.85,
  roughness: 0.25,
  wireframe: true,
});
const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
latticeMesh.name = 'ProtectiveLattice';
scene.add(latticeMesh);

// 3. Inner Biometric Orbital Ring (secp256r1 RIP-7212)
const ring1Geo = new THREE.TorusGeometry(3.3, 0.04, 24, 100);
const ring1Mat = new THREE.MeshStandardMaterial({
  color: 0xff4500,
  emissive: 0xff4500,
  emissiveIntensity: 0.6,
  metalness: 0.8,
  roughness: 0.2,
});
const ring1Mesh = new THREE.Mesh(ring1Geo, ring1Mat);
ring1Mesh.name = 'RIP7212_OrbitalRing';
ring1Mesh.rotation.x = Math.PI / 3;
scene.add(ring1Mesh);

// 4. Outer USDG Liquidity Belt (Paxos Global Dollar Ring)
const ring2Geo = new THREE.TorusGeometry(4.2, 0.05, 24, 100);
const ring2Mat = new THREE.MeshStandardMaterial({
  color: 0x10b981,
  emissive: 0x10b981,
  emissiveIntensity: 0.5,
  metalness: 0.7,
  roughness: 0.3,
});
const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
ring2Mesh.name = 'USDG_LiquidityBelt';
ring2Mesh.rotation.x = -Math.PI / 4;
ring2Mesh.rotation.y = Math.PI / 6;
scene.add(ring2Mesh);

// 5. Orbital Session Key Nodes
const nodeGeo = new THREE.SphereGeometry(0.18, 16, 16);
const nodeMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffffff,
  emissiveIntensity: 0.8,
  metalness: 0.5,
  roughness: 0.1,
});

const nodeCount = 4;
for (let i = 0; i < nodeCount; i++) {
  const angle = (i * Math.PI * 2) / nodeCount;
  const node = new THREE.Mesh(nodeGeo, nodeMat);
  node.name = `SessionKeyNode_${i + 1}`;
  node.position.set(Math.cos(angle) * 3.3, Math.sin(angle) * 3.3 * Math.cos(Math.PI / 3), Math.sin(angle) * 3.3 * Math.sin(Math.PI / 3));
  scene.add(node);
}

// Ensure output directory exists
const outDir = path.resolve(__dirname, '../web/public/models');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const gltfPath = path.join(outDir, 'stylus_vault.gltf');
const glbPath = path.join(outDir, 'stylus_vault.glb');

const exporter = new GLTFExporter();

// 1. Export standard GLTF (JSON + Embedded)
exporter.parse(
  scene,
  (gltf) => {
    fs.writeFileSync(gltfPath, JSON.stringify(gltf, null, 2));
    console.log(`Successfully generated Blender-compatible 3D GLTF model at: ${gltfPath} (${(fs.statSync(gltfPath).size / 1024).toFixed(1)} KB)`);
  },
  (error) => {
    console.error('Error exporting GLTF:', error);
  },
  { binary: false }
);

// 2. Export compact GLB (Binary)
exporter.parse(
  scene,
  (glb) => {
    fs.writeFileSync(glbPath, Buffer.from(glb));
    console.log(`Successfully generated Blender-compatible 3D GLB model at: ${glbPath} (${(fs.statSync(glbPath).size / 1024).toFixed(1)} KB)`);
  },
  (error) => {
    console.error('Error exporting GLB:', error);
  },
  { binary: true }
);
