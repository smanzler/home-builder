"use client";

import { Box, Grid, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

export function Editor() {
  return (
    <Canvas camera={{ position: [5, 5, 10] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Box args={[1, 1, 1]} />
      <OrbitControls />
      <Grid infiniteGrid side={THREE.DoubleSide} />
    </Canvas>
  );
}
