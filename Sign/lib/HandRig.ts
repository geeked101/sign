import * as THREE from 'three';

// MediaPipe hand landmark indices (21 landmarks per hand):
// 0: wrist
// 1-4: thumb (MCP, ... , TIP) — we use [1, 2, 3, 4] = [MCP, PIP, DIP, TIP]
// 5-8: index (MCP, PIP, DIP, TIP)
// 9-12: middle (MCP, PIP, DIP, TIP)
// 13-16: ring (MCP, PIP, DIP, TIP)
// 17-20: pinky (MCP, PIP, DIP, TIP)

// Mixamo finger bone naming convention:
// LeftHandThumb1, LeftHandThumb2, LeftHandThumb3
// LeftHandIndex1, LeftHandIndex2, LeftHandIndex3
// LeftHandMiddle1, LeftHandMiddle2, LeftHandMiddle3
// LeftHandRing1, LeftHandRing2, LeftHandRing3
// LeftHandPinky1, LeftHandPinky2, LeftHandPinky3
// (Right-hand equivalents use "Right" prefix)

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// Finger definition: 4 landmarks per finger [MCP, PIP, DIP, TIP] and corresponding Mixamo bone names
const FINGERS: {
  name: string;
  landmarks: [number, number, number, number]; // MCP, PIP, DIP, TIP
  leftBones: [string, string, string];
  rightBones: [string, string, string];
}[] = [
  {
    name: 'thumb',
    landmarks: [1, 2, 3, 4],
    leftBones: ['LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3'],
    rightBones: ['RightHandThumb1', 'RightHandThumb2', 'RightHandThumb3'],
  },
  {
    name: 'index',
    landmarks: [5, 6, 7, 8],
    leftBones: ['LeftHandIndex1', 'LeftHandIndex2', 'LeftHandIndex3'],
    rightBones: ['RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3'],
  },
  {
    name: 'middle',
    landmarks: [9, 10, 11, 12],
    leftBones: ['LeftHandMiddle1', 'LeftHandMiddle2', 'LeftHandMiddle3'],
    rightBones: ['RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3'],
  },
  {
    name: 'ring',
    landmarks: [13, 14, 15, 16],
    leftBones: ['LeftHandRing1', 'LeftHandRing2', 'LeftHandRing3'],
    rightBones: ['RightHandRing1', 'RightHandRing2', 'RightHandRing3'],
  },
  {
    name: 'pinky',
    landmarks: [17, 18, 19, 20],
    leftBones: ['LeftHandPinky1', 'LeftHandPinky2', 'LeftHandPinky3'],
    rightBones: ['RightHandPinky1', 'RightHandPinky2', 'RightHandPinky3'],
  },
];

// Bone-local axes extracted from bind-pose matrix (bone.matrix)
interface BoneLocalAxes {
  flexAxis: THREE.Vector3;   // local X = flexion axis
  spreadAxis: THREE.Vector3; // local Y = abduction axis
}
const _boneAxesCache = new Map<string, BoneLocalAxes>();

function getOrCreateBoneAxes(bone: THREE.Bone): BoneLocalAxes {
  if (_boneAxesCache.has(bone.name)) return _boneAxesCache.get(bone.name)!;
  const m = bone.matrix;
  const flexAxis = new THREE.Vector3(m.elements[0], m.elements[1], m.elements[2]).normalize();
  const spreadAxis = new THREE.Vector3(m.elements[4], m.elements[5], m.elements[6]).normalize();
  const axes = { flexAxis, spreadAxis };
  _boneAxesCache.set(bone.name, axes);
  return axes;
}

/**
 * P1+P2: Persistent scratch objects for hand rigging.
 * All vector math in the finger loop reuses these — zero allocations per frame.
 */
const _scratch = {
  // Segment vectors
  seg0: new THREE.Vector3(),
  seg1: new THREE.Vector3(),
  seg2: new THREE.Vector3(),
  palmDir: new THREE.Vector3(),
  // Palm coordinate frame
  palmRight: new THREE.Vector3(),
  palmForward: new THREE.Vector3(),
  palmNormal: new THREE.Vector3(),
  palmUp: new THREE.Vector3(),
  // Spread projection
  fingerProj: new THREE.Vector3(),
  // Quaternion reuse
  slerpTarget: new THREE.Quaternion(),
  // Temp for cross products
  tmp: new THREE.Vector3(),
};

/**
 * Apply hand articulation to a Mixamo-rigged skeleton from MediaPipe hand landmarks.
 *
 * @param skeleton - The THREE.Skeleton from the loaded GLTF model
 * @param leftHand - Array of 21 MediaPipe landmarks for the left hand (empty = skip)
 * @param rightHand - Array of 21 MediaPipe landmarks for the right hand (empty = skip)
 * @param delta - Optional frame delta time for delta-aware blending
 */
export function applyHandRig(
  skeleton: THREE.Skeleton,
  leftHand: Landmark[],
  rightHand: Landmark[],
  delta?: number
): void {
  // P0: Each hand is processed independently — missing hands are simply skipped
  const handLandmarks: { landmarks: Landmark[]; bones: string[][]; side: 'left' | 'right' }[] = [];

  if (leftHand.length > 0 && leftHand[0]) {
    handLandmarks.push({ landmarks: leftHand, bones: FINGERS.map((f) => f.leftBones), side: 'left' });
  }
  if (rightHand.length > 0 && rightHand[0]) {
    handLandmarks.push({ landmarks: rightHand, bones: FINGERS.map((f) => f.rightBones), side: 'right' });
  }

  if (handLandmarks.length === 0) return;

  // P2: Delta-aware blending factor
  const handFactor = delta != null ? 1 - Math.exp(-10 * delta) : 0.7;

  // P1+P2: Reuse scratch vectors across all fingers
  const {
    seg0, seg1, seg2, palmDir,
    palmRight, palmForward, palmNormal, palmUp,
    fingerProj, slerpTarget, tmp,
  } = _scratch;

  for (const hand of handLandmarks) {
    const lm = hand.landmarks;
    const wrist = lm[0];

    // --- Build palm coordinate system ---
    const indexMCP = lm[5];
    const pinkyMCP = lm[17];
    const middleMCP = lm[9];

    if (wrist && indexMCP && pinkyMCP && middleMCP) {
      // palmRight = normalize(pinkyMCP - indexMCP)
      palmRight.set(
        pinkyMCP.x - indexMCP.x,
        pinkyMCP.y - indexMCP.y,
        pinkyMCP.z - indexMCP.z
      ).normalize();

      // palmForward = normalize(middleMCP - wrist)
      palmForward.set(
        middleMCP.x - wrist.x,
        middleMCP.y - wrist.y,
        middleMCP.z - wrist.z
      ).normalize();

      // palmNormal = normalize(cross(palmRight, palmForward))
      palmNormal.crossVectors(palmRight, palmForward).normalize();

      // palmUp = cross(palmNormal, palmRight)
      palmUp.crossVectors(palmNormal, palmRight);
    }

    for (let f = 0; f < FINGERS.length; f++) {
      const finger = FINGERS[f];
      const [mcpIdx, pipIdx, dipIdx, tipIdx] = finger.landmarks;
      const mcp = lm[mcpIdx];
      const pip = lm[pipIdx];
      const dip = lm[dipIdx];
      const tip = lm[tipIdx];

      if (!mcp || !pip || !dip || !tip) continue;

      // --- Compute 3 segments ---
      // seg0 = normalize(PIP - MCP)
      seg0.set(pip.x - mcp.x, pip.y - mcp.y, pip.z - mcp.z);
      const seg0Len = seg0.length();
      if (seg0Len < 0.001) continue;
      seg0.normalize();

      // seg1 = normalize(DIP - PIP)
      seg1.set(dip.x - pip.x, dip.y - pip.y, dip.z - pip.z);
      const seg1Len = seg1.length();
      if (seg1Len < 0.001) continue;
      seg1.normalize();

      // seg2 = normalize(TIP - DIP)
      seg2.set(tip.x - dip.x, tip.y - dip.y, tip.z - dip.z);
      const seg2Len = seg2.length();
      if (seg2Len < 0.001) continue;
      seg2.normalize();

      // palmDir = normalize(MCP - Wrist)
      palmDir.set(mcp.x - wrist.x, mcp.y - wrist.y, mcp.z - wrist.z);
      const palmDirLen = palmDir.length();
      if (palmDirLen < 0.001) continue;
      palmDir.normalize();

      // --- Compute 3 independent curl values ---
      // curl0: angle between seg0 and palmDir (MCP joint flexion)
      const dot0 = THREE.MathUtils.clamp(seg0.dot(palmDir), -1, 1);
      const curl0 = THREE.MathUtils.clamp(Math.acos(dot0) / (0.6 * Math.PI), 0, 1);

      // curl1: angle between seg0 and seg1 (PIP joint flexion)
      const dot1 = THREE.MathUtils.clamp(seg0.dot(seg1), -1, 1);
      const curl1 = THREE.MathUtils.clamp(Math.acos(dot1) / (0.6 * Math.PI), 0, 1);

      // curl2: angle between seg1 and seg2 (DIP joint flexion)
      const dot2 = THREE.MathUtils.clamp(seg1.dot(seg2), -1, 1);
      const curl2 = THREE.MathUtils.clamp(Math.acos(dot2) / (0.6 * Math.PI), 0, 1);

      const curls = [curl0, curl1, curl2];

      // --- Apply curl per bone around bone-local flex axis ---
      const bones = hand.bones[f];
      for (let b = 0; b < bones.length; b++) {
        const bone = skeleton.getBoneByName(bones[b]);
        if (!bone) continue;

        const curlAngle = curls[b] * 0.6 * Math.PI;
        const axes = getOrCreateBoneAxes(bone);

        slerpTarget.setFromAxisAngle(axes.flexAxis, curlAngle);
        bone.quaternion.slerp(slerpTarget, handFactor);
      }

      // --- Finger spread for ALL fingers ---
      // fingerDir = normalize(PIP - MCP) — seg0 already holds this
      // Project seg0 onto palm plane
      const normalDot = seg0.dot(palmNormal);
      fingerProj.set(
        seg0.x - palmNormal.x * normalDot,
        seg0.y - palmNormal.y * normalDot,
        seg0.z - palmNormal.z * normalDot
      );
      const projLen = fingerProj.length();
      if (projLen < 0.001) continue;
      fingerProj.normalize();

      // spreadAngle = atan2(dot(fingerProj, palmRight), dot(fingerProj, palmForward))
      const spreadAngle = Math.atan2(fingerProj.dot(palmRight), fingerProj.dot(palmForward));
      const spreadNorm = THREE.MathUtils.clamp(spreadAngle / (Math.PI / 12), -1, 1);

      // Apply spread rotation around bone-local spread axis on the first bone
      const firstBone = skeleton.getBoneByName(bones[0]);
      if (firstBone) {
        const axes = getOrCreateBoneAxes(firstBone);
        const spreadRotAngle = spreadNorm * 0.4;
        slerpTarget.setFromAxisAngle(axes.spreadAxis, spreadRotAngle);
        firstBone.quaternion.slerp(slerpTarget, handFactor);
      }
    }
  }
}
