import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { Line, Sphere } from '@react-three/drei/native';
import * as THREE from 'three';
import { View } from 'react-native';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface Frame {
  body: Landmark[];
  left_hand: Landmark[];
  right_hand: Landmark[];
}

interface SignData {
  fps: number;
  frames: Frame[];
}

interface Props {
  signData: SignData | null;
  isPlaying: boolean;
  speed: number;
  onSignComplete?: () => void;
  onReady?: () => void;
}

const BODY_CONNECTIONS = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24]];
const HAND_CONNECTIONS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20]];

const WHITE = '#ffffff';
const BLACK = '#111111';
const NEON = '#00f5a0';

function ChibiPandaAvatar({ signData, isPlaying, speed, onSignComplete }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);
  
  const bodyLinesRefs = useRef<any[]>([]);
  const leftHandLinesRefs = useRef<any[]>([]);
  const rightHandLinesRefs = useRef<any[]>([]);

  // Performance helpers
  const v1 = useMemo(() => new THREE.Vector3(), []);
  const v2 = useMemo(() => new THREE.Vector3(), []);
  const vTmp1 = useMemo(() => new THREE.Vector3(), []);
  const vTmp2 = useMemo(() => new THREE.Vector3(), []);

  const setVec = (v: THREE.Vector3, l: Landmark) => {
    v.set((l.x - 0.5) * 4, (0.5 - l.y) * 4, -l.z * 4);
  };

  const progressRef = useRef(0);
  const lastSignRef = useRef<SignData | null>(null);
  
  // Transition/Blending Ref (avoid React re-render)
  const isTransitioningRef = useRef(false);
  const transitionProgressRef = useRef(0);
  const lastPoseRef = useRef<Frame | null>(null);

  useFrame((state, delta) => {
    if (!groupRef.current) {
      console.warn('[StickFigureAvatar3D.native] groupRef not initialized');
      return;
    }
    // ACCOUNTABILITY: If we are 'playing' but have no data, perform a 'shrug' animation
    if (isPlaying && (!signData || !signData.frames || signData.frames.length === 0)) {
      const time = state.clock.elapsedTime;
      const shrugY = Math.sin(time * 2) * 0.05; 
      const handRaise = Math.max(0, Math.sin(time * 2)) * 0.2;

      progressRef.current += delta;
      if (progressRef.current >= 1.5) {
        if (onSignComplete) onSignComplete();
        progressRef.current = 0;
      }

      if (headRef.current) {
        headRef.current.position.set(0, 1.2 + shrugY, 0);
        headRef.current.visible = true;
      }
      
      const lHandLine = leftHandLinesRefs.current[0];
      const rHandLine = rightHandLinesRefs.current[0];
      if (lHandLine) {
        v1.set(-0.5, 0.5, 0.5);
        v2.set(-0.8, 0.7 + handRaise, 0.8);
        lHandLine.setPoints([v1, v2]);
        lHandLine.visible = true;
      }
      if (rHandLine) {
        v1.set(0.5, 0.5, 0.5);
        v2.set(0.8, 0.7 + handRaise, 0.8);
        rHandLine.setPoints([v1, v2]);
        rHandLine.visible = true;
      }
      return;
    }

    if (!signData || !isPlaying || !groupRef.current || !signData.frames || signData.frames.length === 0) return;

    if (lastSignRef.current !== signData) {
      if (lastSignRef.current !== null) {
        isTransitioningRef.current = true;
        transitionProgressRef.current = 0;
      }
      progressRef.current = 0;
      lastSignRef.current = signData;
    }

    let currentFrame: Frame;
    let nextFrame: Frame;
    let alpha: number;

    if (isTransitioningRef.current) {
      transitionProgressRef.current += delta * 3;
      if (transitionProgressRef.current >= 1) {
        isTransitioningRef.current = false;
      }
      
      currentFrame = lastPoseRef.current || signData.frames[0];
      nextFrame = signData.frames[0];
      alpha = Math.min(transitionProgressRef.current, 1);
    } else {
      const frameIncrement = delta * (signData.fps * speed);
      progressRef.current += frameIncrement;

      const framesCount = signData.frames.length;
      const currentTotalIndex = Math.floor(progressRef.current);
      
      if (currentTotalIndex >= framesCount - 1) {
        lastPoseRef.current = signData.frames[framesCount - 1];
        if (onSignComplete) onSignComplete();
        progressRef.current = 0;
      }

      const frameIndex = currentTotalIndex % framesCount;
      const nextFrameIndex = (frameIndex + 1) % framesCount;
      alpha = progressRef.current % 1;

      currentFrame = signData.frames[frameIndex];
      nextFrame = signData.frames[nextFrameIndex];
    }

    if (!currentFrame || !nextFrame) return;

    const updateLine = (lineRef: any, landmarks: Landmark[], nextLandmarks: Landmark[], a: number, b: number) => {
      if (!lineRef) return;
      const l1 = landmarks?.[a];
      const l2 = landmarks?.[b];
      const n1 = nextLandmarks?.[a];
      const n2 = nextLandmarks?.[b];

      if (l1 && l2 && n1 && n2) {
        setVec(v1, l1);
        setVec(v2, n1);
        vTmp1.lerpVectors(v1, v2, alpha);

        setVec(v1, l2);
        setVec(v2, n2);
        vTmp2.lerpVectors(v1, v2, alpha);

        const geom = lineRef.geometry ?? lineRef;
        if (geom && typeof geom.setPositions === 'function') {
          geom.setPositions([vTmp1.x, vTmp1.y, vTmp1.z, vTmp2.x, vTmp2.y, vTmp2.z]);
        }
        lineRef.visible = true;
      } else {
        lineRef.visible = false;
      }
    };

    BODY_CONNECTIONS.forEach(([a, b], i) => updateLine(bodyLinesRefs.current[i], currentFrame.body, nextFrame.body, a, b));
    HAND_CONNECTIONS.forEach(([a, b], i) => {
      updateLine(leftHandLinesRefs.current[i], currentFrame.left_hand, nextFrame.left_hand, a, b);
      updateLine(rightHandLinesRefs.current[i], currentFrame.right_hand, nextFrame.right_hand, a, b);
    });

    const h1 = currentFrame.body?.[0];
    const h2 = nextFrame.body?.[0];
    if (h1 && h2 && headRef.current) {
      setVec(v1, h1);
      setVec(v2, h2);
      vTmp1.lerpVectors(v1, v2, alpha);
      headRef.current.position.copy(vTmp1);
      headRef.current.visible = true;
      if (leftEarRef.current) leftEarRef.current.position.set(vTmp1.x - 0.25, vTmp1.y + 0.3, vTmp1.z);
      if (rightEarRef.current) rightEarRef.current.position.set(vTmp1.x + 0.25, vTmp1.y + 0.3, vTmp1.z);
    }
  });

  return (
    <group ref={groupRef}>
      <Sphere ref={leftEarRef} args={[0.12, 16, 16]}><meshStandardMaterial color={BLACK} /></Sphere>
      <Sphere ref={rightEarRef} args={[0.12, 16, 16]}><meshStandardMaterial color={BLACK} /></Sphere>
      <Sphere ref={headRef} args={[0.35, 32, 32]}><meshStandardMaterial color={WHITE} roughness={0.3} /></Sphere>
      {BODY_CONNECTIONS.map((_, i) => (
        <Line 
          key={`b-${i}`} 
          ref={el => { bodyLinesRefs.current[i] = el; }} 
          points={[[0,0,0], [0,0,0]]} 
          color={WHITE} 
          lineWidth={10} 
        />
      ))}
      {HAND_CONNECTIONS.map((_, i) => (
        <group key={`h-grp-${i}`}>
          <Line 
            ref={el => { leftHandLinesRefs.current[i] = el; }} 
            points={[[0,0,0], [0,0,0]]} 
            color={NEON} 
            lineWidth={3} 
          />
          <Line 
            ref={el => { rightHandLinesRefs.current[i] = el; }} 
            points={[[0,0,0], [0,0,0]]} 
            color={NEON} 
            lineWidth={3} 
          />
        </group>
      ))}
    </group>
  );
}

export default function StickFigureAvatar3D(props: Props) {
  return (
    <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: '#0a0a0a' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 5], fov: 45 }}
        onCreated={() => {
          console.log('[StickFigureAvatar3D.native] Canvas created');
          props.onReady?.();
        }}
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
        <ChibiPandaAvatar {...props} />
      </Canvas>
    </View>
  );
}
