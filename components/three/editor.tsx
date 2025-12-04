"use client";

import { Box, Grid, OrbitControls, Sphere } from "@react-three/drei";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useState, useRef } from "react";

function GroundPlane({
  onPlaceBox,
}: {
  onPlaceBox: (position: [number, number, number]) => void;
}) {
  const { camera, raycaster, gl, scene } = useThree();
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: any) => {
    pointerDownRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handlePointerUp = (event: any) => {
    if (!pointerDownRef.current) return;

    // Check if it was a drag (movement > 5 pixels)
    const dx = event.clientX - pointerDownRef.current.x;
    const dy = event.clientY - pointerDownRef.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 5) {
      pointerDownRef.current = null;
      return; // It was a drag, don't place
    }

    // Check if a box was clicked
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children, true);

    // Check if any intersection is with a box (not the ground plane or preview box)
    const hitBox = intersects.find((intersect) => {
      const obj = intersect.object as THREE.Mesh;
      // Exclude preview box and ground plane
      return (
        obj.type === "Mesh" &&
        obj.geometry?.type === "BoxGeometry" &&
        obj !== event.object &&
        !(obj.material as any)?.transparent // Exclude transparent preview box
      );
    });

    if (hitBox) {
      // A box was clicked, don't place a new one
      pointerDownRef.current = null;
      return;
    }

    // No box was clicked, place the box
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);

    if (intersectionPoint) {
      // Snap to grid (0.5 unit increments)
      const snappedX = Math.round(intersectionPoint.x * 2) / 2;
      const snappedZ = Math.round(intersectionPoint.z * 2) / 2;
      onPlaceBox([snappedX, 0.5, snappedZ]);
    }

    pointerDownRef.current = null;
  };

  return (
    <mesh
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.001, 0]}
      receiveShadow
    >
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#f4f4f4" />
    </mesh>
  );
}

function ConstrainedOrbitControls({
  controlsRef,
}: {
  controlsRef: React.RefObject<any>;
}) {
  useFrame(() => {
    if (controlsRef.current) {
      // Always lock the target's Y position to ground level
      controlsRef.current.target.y = 0;
      controlsRef.current.update();
    }
  });

  return <OrbitControls ref={controlsRef} screenSpacePanning={false} />;
}

function CameraTargetIndicator({
  controlsRef,
}: {
  controlsRef: React.RefObject<any>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (controlsRef.current && groupRef.current) {
      const targetVec = controlsRef.current.target;
      groupRef.current.position.set(targetVec.x, targetVec.y, targetVec.z);
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere args={[0.1, 16, 16]}>
        <meshBasicMaterial color="yellow" />
      </Sphere>
    </group>
  );
}

function PreviewBox({ pointerPos }: { pointerPos: { x: number; y: number } }) {
  const { camera, raycaster, gl } = useThree();
  const boxRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!boxRef.current) return;

    // Don't show preview if pointer is at origin (not initialized)
    if (pointerPos.x === 0 && pointerPos.y === 0) {
      boxRef.current.visible = false;
      return;
    }

    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2();

    mouse.x = ((pointerPos.x - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((pointerPos.y - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectionPoint);

    if (intersectionPoint) {
      // Snap to grid (0.5 unit increments)
      const snappedX = Math.round(intersectionPoint.x * 2) / 2;
      const snappedZ = Math.round(intersectionPoint.z * 2) / 2;
      boxRef.current.position.set(snappedX, 0.5, snappedZ);
      boxRef.current.visible = true;
    } else {
      boxRef.current.visible = false;
    }
  });

  return (
    <mesh ref={boxRef} visible={false} raycast={() => null}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="blue"
        transparent
        opacity={0.3}
        wireframe={false}
      />
    </mesh>
  );
}

export function Editor() {
  const [boxes, setBoxes] = useState<Array<[number, number, number]>>([]);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const controlsRef = useRef<any>(null);

  const handlePlaceBox = (position: [number, number, number]) => {
    setBoxes((prev) => [...prev, position]);
  };

  return (
    <Canvas
      shadows
      camera={{ position: [5, 5, 10] }}
      onPointerMove={(e) => {
        setPointerPos({ x: e.clientX, y: e.clientY });
      }}
    >
      <ambientLight intensity={0.1} />
      <directionalLight position={[5, 10, 5]} intensity={2} />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />

      <ConstrainedOrbitControls controlsRef={controlsRef} />
      <CameraTargetIndicator controlsRef={controlsRef} />
      <Grid infiniteGrid side={THREE.DoubleSide} />
      <GroundPlane onPlaceBox={handlePlaceBox} />
      <PreviewBox pointerPos={pointerPos} />
      {boxes.map((position, i) => (
        <Box key={i} position={position}>
          <meshStandardMaterial color="blue" />
        </Box>
      ))}
    </Canvas>
  );
}
