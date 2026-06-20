import React, { useEffect, useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useGraph } from '@react-three/fiber';
import { OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { ThreeMpPose } from '../lib/RPMThreeMpPose';
import { applyHandRig } from '../lib/HandRig';

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

function ModelLoader() {
  const { progress, errors } = useProgress();
  if (errors.length > 0) {
    console.error('Model loading errors:', errors);
  }
  return null;
}

function AvatarModel({ signData, isPlaying, speed, onSignComplete, onReady, modelUri }: Props & { modelUri: string }) {
  const { scene } = useGLTF(modelUri) as any;
  useGraph(scene);

  const poseHelper = useMemo(() => new ThreeMpPose(), []);
  const progressRef = useRef(0);
  const lastSignRef = useRef<SignData | null>(null);

  // Transition blending state (P0: smooth sign-to-sign transitions)
  const isTransitioningRef = useRef(false);
  const transitionProgressRef = useRef(0);
  const lastPoseRef = useRef<Frame | null>(null);

  // Reusable vector to avoid per-frame allocations
  const _offsetVec = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  // Extract skeleton from the loaded scene
  const skeleton = useMemo<THREE.Skeleton | null>(() => {
    let foundSkeleton: THREE.Skeleton | null = null;
    scene.traverse((child: any) => {
      if (child.isSkinnedMesh && child.skeleton) {
        foundSkeleton = child.skeleton;
      }
    });
    if (!foundSkeleton) {
      console.error('ModelAvatar3D: No skeleton found in loaded GLTF scene');
    }
    return foundSkeleton;
  }, [scene]);

  // Notify ready once skeleton is confirmed
  useEffect(() => {
    if (skeleton) {
      console.log('[AvatarModel] skeleton found, bones:', (skeleton as THREE.Skeleton).bones?.length);
      onReady?.();
    }
  }, [skeleton, onReady]);

  useFrame((state, delta) => {
    if (!skeleton) return;

    // Shrug animation when playing but no sign data
    if (isPlaying && (!signData || !signData.frames || signData.frames.length === 0)) {
      progressRef.current += delta;
      if (progressRef.current >= 1.5) {
        onSignComplete?.();
        progressRef.current = 0;
      }
      return;
    }

    if (!signData || !isPlaying || !signData.frames || signData.frames.length === 0) return;

    // Detect sign change -> start transition blend
    if (lastSignRef.current !== signData) {
      // If we have a previous sign's final pose, blend from it
      if (lastSignRef.current !== null && lastPoseRef.current) {
        isTransitioningRef.current = true;
        transitionProgressRef.current = 0;
      }
      progressRef.current = 0;
      lastSignRef.current = signData;
    }

    let currentFrame: Frame;
    let nextFrame: Frame;
    let alpha: number;

    // P0: Transition blending between signs (~333ms)
    if (isTransitioningRef.current) {
      transitionProgressRef.current += delta * 3; // ~333ms blend
      if (transitionProgressRef.current >= 1) {
        isTransitioningRef.current = false;
      }

      currentFrame = lastPoseRef.current || signData.frames[0];
      nextFrame = signData.frames[0];
      alpha = Math.min(transitionProgressRef.current, 1);
    } else {
      // Normal animation playback
      const frameIncrement = delta * (signData.fps * speed);
      progressRef.current += frameIncrement;

      const framesCount = signData.frames.length;
      const currentTotalIndex = Math.floor(progressRef.current);

      if (currentTotalIndex >= framesCount - 1) {
        // Save final pose for next sign transition
        lastPoseRef.current = signData.frames[framesCount - 1];
        onSignComplete?.();
        progressRef.current = 0;
      }

      const frameIndex = currentTotalIndex % framesCount;
      const nextFrameIndex = (frameIndex + 1) % framesCount;
      alpha = progressRef.current % 1;

      currentFrame = signData.frames[frameIndex];
      nextFrame = signData.frames[nextFrameIndex];
    }

    // Fallback: if current frame is missing body data, use the last known good frame
    if (!currentFrame || !currentFrame.body || currentFrame.body.length === 0) {
      if (lastPoseRef.current && lastPoseRef.current.body && lastPoseRef.current.body.length > 0) {
        currentFrame = lastPoseRef.current;
      } else {
        const firstValid = signData.frames.find(f => f.body && f.body.length > 0);
        if (firstValid) currentFrame = firstValid;
        else return;
      }
    }

    // If next frame is missing, hold the current frame to prevent snapping
    if (!nextFrame || !nextFrame.body || nextFrame.body.length === 0) {
      nextFrame = currentFrame;
    }

    // P1: Fixed frame interpolation — lerp from current to next (not prev to next)
    const lerpLandmark = (a: Landmark, b: Landmark, t: number): Landmark => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    });

    // Save current raw frame as last pose for transitions
    if (!isTransitioningRef.current) {
      lastPoseRef.current = currentFrame;
    }

    const interpolatedBody: Landmark[] = currentFrame.body.map((lm, i) => {
      const next = nextFrame.body?.[i] || lm;
      return lerpLandmark(lm, next, alpha);
    });

    // Apply the interpolated body landmarks to the helper
    poseHelper.updateMpLandmarks(interpolatedBody);

    // Transform landmarks to 3D world space
    poseHelper.transformToWorld(state.camera as any, 2.0, _offsetVec);

    // Add Mixamo specific joints
    poseHelper.add3dJointsForMixamo();

    // P1: Apply rig with frame-rate-independent smoothing
    poseHelper.rigSolverForMixamo(skeleton, delta);

    // P0: Apply hand rig per-hand (each hand independently, not both-or-nothing)
    const hasLeft = currentFrame.left_hand?.length > 0;
    const hasRight = currentFrame.right_hand?.length > 0;

    if (hasLeft || hasRight) {
      const interpLeft = hasLeft
        ? currentFrame.left_hand.map((lm, i) => {
            const next = nextFrame.left_hand?.[i] || lm;
            return lerpLandmark(lm, next, alpha);
          })
      : [];
      const interpRight = hasRight
        ? currentFrame.right_hand.map((lm, i) => {
            const next = nextFrame.right_hand?.[i] || lm;
            return lerpLandmark(lm, next, alpha);
          })
      : [];

      // Pass empty arrays for missing hands — applyHandRig handles them gracefully
      applyHandRig(skeleton, interpLeft, interpRight, delta);
    }
  });

  return (
    <primitive object={scene} scale={[1.8, 1.8, 1.8]} position={[0, -1.5, 0]} />
  );
}

export default function ModelAvatar3D(props: Props) {
  const [modelUri, setModelUri] = useState('');

  useEffect(() => {
    // On web, require('./file.glb') returns the bundled URL directly.
    try {
      const resolved: any = require('../assets/models/female.glb');
      const uri = typeof resolved === 'string'
        ? resolved
        : (resolved?.uri || resolved?.default?.uri || resolved?.default || '');
      console.log('[ModelAvatar3D] web model uri:', uri);
      if (uri && typeof uri === 'string') {
        setModelUri(uri);
        props.onReady?.();
      } else {
        console.error('[ERROR] [ModelAvatar3D] could not resolve model URI from require:', resolved);
      }
    } catch (err) {
      console.error('[ERROR] [ModelAvatar3D] require failed:', err);
    }
  }, []);

  if (!modelUri) {
    console.log('[ModelAvatar3D] waiting for modelUri...');
    return null;
  }
  console.log('[ModelAvatar3D] rendering Canvas with uri:', modelUri);

  return (
    <Canvas
      camera={{ position: [0, 0.2, 1.8], fov: 45 }}
      style={{ width: '100%', height: '100%', backgroundColor: '#0a0a0a' }}
      onCreated={() => props.onReady?.()}
    >
      {/* Robust offline lighting — no CDN dependency */}
      <hemisphereLight args={['#b1e1ff', '#b97a20', 1.2]} />
      <directionalLight position={[3, 5, 2]} intensity={1.8} />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} />
      <ambientLight intensity={0.4} />

      <Suspense fallback={null}>
        <ModelLoader />
        <AvatarModel {...props} modelUri={modelUri} />
      </Suspense>
      <OrbitControls enablePan={false} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={Math.PI / 4} />
    </Canvas>
  );
}
