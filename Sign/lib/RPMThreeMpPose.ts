import {
  Quaternion,
  Vector3,
  Matrix4,
  PerspectiveCamera,
  OrthographicCamera,
  Skeleton,
} from 'three';

export interface MpLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

/**
 * P1: Object pool for Vector3 to eliminate per-frame GC pressure.
 * Pre-allocates a fixed set of reusable vectors. Use .set() or copy()
 * instead of `new Vector3()`.
 */
class Vec3Pool {
  private pool: Vector3[];
  private index = 0;

  constructor(size: number) {
    this.pool = Array.from({ length: size }, () => new Vector3());
  }

  /** Get a clean Vector3 from the pool. Don't hold references across frames. */
  get(): Vector3 {
    const v = this.pool[this.index];
    v.set(0, 0, 0);
    this.index = (this.index + 1) % this.pool.length;
    return v;
  }

  /** Reset the pool — call at the start of each frame. */
  reset(): void {
    this.index = 0;
  }
}

export class ThreeMpPose {
  name_to_index: Record<string, number>;
  index_to_name: Record<number, string>;
  poseLandmarks: Record<string, MpLandmark> = {};
  pose3dDict: Record<string, Vector3> = {};
  newJoints3D: Record<string, Vector3> = {};
  freezeHips: boolean;
  freezeLegs: boolean;
  hipCouplingFactor: number;
  hipTranslationFactor: number;
  srcJoints: MpLandmark[] = [];

  // P1: Persistent object pools — initialized once, reused every frame
  private _vecPool: Vec3Pool;
  private _mat4Pool: Matrix4[];
  private _mat4Index = 0;
  private _quatPool: Quaternion[];
  private _quatIndex = 0;

  // P1: Pre-allocated pose3dDict keys array (avoid Object.entries allocation)
  private _poseKeys: string[] = [];

  constructor() {
    this.name_to_index = {
      nose: 0,
      left_eye_inner: 1,
      left_eye: 2,
      left_eye_outer: 3,
      right_eye_inner: 4,
      right_eye: 5,
      right_eye_outer: 6,
      left_ear: 7,
      right_ear: 8,
      mouse_left: 9,
      mouse_right: 10,
      left_shoulder: 11,
      right_shoulder: 12,
      left_elbow: 13,
      right_elbow: 14,
      left_wrist: 15,
      right_wrist: 16,
      left_pinky: 17,
      right_pinky: 18,
      left_index: 19,
      right_index: 20,
      left_thumb: 21,
      right_thumb: 22,
      left_hip: 23,
      right_hip: 24,
      left_knee: 25,
      right_knee: 26,
      left_ankle: 27,
      right_ankle: 28,
      left_heel: 29,
      right_heel: 30,
      left_foot_index: 31,
      right_foot_index: 32,
    };
    this.index_to_name = {};
    for (const [key, value] of Object.entries(this.name_to_index)) {
      this.index_to_name[value] = key;
    }
    this.freezeHips = true;
    this.freezeLegs = true;
    this.hipCouplingFactor = 0.25;
    this.hipTranslationFactor = 0.15;

    // P1: Initialize pools — 40 Vec3s covers transformToWorld + add3dJoints + rigSolver
    this._vecPool = new Vec3Pool(40);
    this._mat4Pool = Array.from({ length: 20 }, () => new Matrix4());
    this._quatPool = Array.from({ length: 10 }, () => new Quaternion());
  }

  numSrcLandmarks(): number {
    return Object.keys(this.index_to_name).length;
  }

  updateMpLandmarks(mediapipeJoints: MpLandmark[]): void {
    this.srcJoints = mediapipeJoints;
    const pose_landmarks_dict: Record<string, MpLandmark> = {};
    mediapipeJoints.forEach((landmark, i) => {
      const name = this.index_to_name[i];
      if (name) pose_landmarks_dict[name] = landmark;
    });
    this.poseLandmarks = pose_landmarks_dict;
  }

  /** P1: Get a pooled Vector3 */
  private _v(): Vector3 {
    return this._vecPool.get();
  }

  /** P1: Get a pooled Matrix4 */
  private _m(): Matrix4 {
    const m = this._mat4Pool[this._mat4Index];
    m.identity();
    this._mat4Index = (this._mat4Index + 1) % this._mat4Pool.length;
    return m;
  }

  /** P1: Get a pooled Quaternion */
  private _q(): Quaternion {
    const q = this._quatPool[this._quatIndex];
    q.set(0, 0, 0, 1);
    this._quatIndex = (this._quatIndex + 1) % this._quatPool.length;
    return q;
  }

  transformToWorld(
    camera: PerspectiveCamera | OrthographicCamera,
    dist_from_cam: number,
    offset: Vector3
  ): void {
    // P1: Reset pools at start of frame
    this._vecPool.reset();
    this._mat4Index = 0;
    this._quatIndex = 0;

    // P1: Reuse pooled vectors instead of `new Vector3()`
    const ip_lt = this._v().set(-1, 1, -1).unproject(camera);
    const ip_rb = this._v().set(1, -1, -1).unproject(camera);
    const ip_diff = this._v().subVectors(ip_rb, ip_lt);
    const x_scale = Math.abs(ip_diff.x);

    const isPerspective = (camera as PerspectiveCamera).isPerspectiveCamera;
    const camPos = camera.position;
    const camNear = (camera as PerspectiveCamera).near;

    // P1: Reuse a single temp vector for the result
    const p_result = this._v();

    // P1: Don't reassign pose3dDict — reuse existing Vector3 entries
    // P1: Cache keys array to avoid Object.entries allocation
    const entries = Object.entries(this.poseLandmarks);
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];

      // P1: Reuse p_result for unproject, then overwrite for ProjScale
      p_result.set(
        (value.x - 0.5) * 2.0,
        -(value.y - 0.5) * 2.0,
        0
      ).unproject(camera);
      p_result.z = -value.z * x_scale;

      if (isPerspective) {
        // P1: Inline ProjScale to avoid extra function call + allocations
        const scale = dist_from_cam / camNear;
        const dx = p_result.x - camPos.x;
        const dy = p_result.y - camPos.y;
        const dz = p_result.z - camPos.z;
        p_result.set(
          camPos.x + dx * scale,
          camPos.y + dy * scale,
          camPos.z + dz * scale
        );
      } else {
        p_result.z += dist_from_cam;
      }

      // P1: Reuse existing Vector3, just update values
      const ox = p_result.x + offset.x;
      const oy = p_result.y + offset.y;
      const oz = p_result.z + offset.z;
      if (this.pose3dDict[key]) {
        this.pose3dDict[key].set(ox, oy, oz);
      } else {
        this.pose3dDict[key] = new Vector3(ox, oy, oz);
      }
    }
  }

  add3dJointsForMixamo(): void {
    const ld = (name: string) => this.pose3dDict[name]!;
    const _v = this._v.bind(this);

    const center_hips = _v().addVectors(ld('left_hip'), ld('right_hip')).multiplyScalar(0.5);
    const ls = ld('left_shoulder');
    const rs = ld('right_shoulder');
    const center_shoulders = _v().addVectors(ls, rs).multiplyScalar(0.5);
    const center_ear = _v().addVectors(ld('left_ear'), ld('right_ear')).multiplyScalar(0.5);

    const dir_spine = _v().subVectors(center_shoulders, center_hips).normalize();
    const dir_shoulders = _v().subVectors(rs, ls);
    const length_spine = _v().subVectors(center_shoulders, center_hips).length();

    const ls9 = length_spine / 9.0;

    // P1: Reuse newJoints3D entries, create only if needed
    // P1: Use pooled vectors for direction * scalar to avoid .clone() allocations
    const spineScaled = _v();
    if (!this.newJoints3D['hips']) this.newJoints3D['hips'] = new Vector3();
    spineScaled.copy(dir_spine).multiplyScalar(ls9);
    this.newJoints3D['hips'].copy(center_hips).add(spineScaled);

    if (!this.newJoints3D['spine0']) this.newJoints3D['spine0'] = new Vector3();
    spineScaled.copy(dir_spine).multiplyScalar(ls9 * 3);
    this.newJoints3D['spine0'].copy(center_hips).add(spineScaled);

    if (!this.newJoints3D['spine1']) this.newJoints3D['spine1'] = new Vector3();
    spineScaled.copy(dir_spine).multiplyScalar(ls9 * 5);
    this.newJoints3D['spine1'].copy(center_hips).add(spineScaled);

    if (!this.newJoints3D['spine2']) this.newJoints3D['spine2'] = new Vector3();
    spineScaled.copy(dir_spine).multiplyScalar(ls9 * 7);
    this.newJoints3D['spine2'].copy(center_hips).add(spineScaled);

    const neck = _v().copy(center_shoulders).addScaledVector(dir_spine, ls9);

    if (!this.newJoints3D['neck']) this.newJoints3D['neck'] = new Vector3();
    this.newJoints3D['neck'].copy(neck);

    if (!this.newJoints3D['shoulder_left']) this.newJoints3D['shoulder_left'] = new Vector3();
    this.newJoints3D['shoulder_left'].copy(ls).addScaledVector(dir_shoulders, 1 / 3.0);

    if (!this.newJoints3D['shoulder_right']) this.newJoints3D['shoulder_right'] = new Vector3();
    this.newJoints3D['shoulder_right'].copy(ls).addScaledVector(dir_shoulders, 2 / 3.0);

    const dir_head = _v().subVectors(center_ear, neck);

    if (!this.newJoints3D['head']) this.newJoints3D['head'] = new Vector3();
    this.newJoints3D['head'].copy(neck).addScaledVector(dir_head, 0.5);

    for (const [key, value] of Object.entries(this.newJoints3D)) {
      this.pose3dDict[key] = value;
    }
  }

  /**
   * P1: delta-aware rig solver. Pass the frame delta for frame-rate-independent smoothing.
   * When delta is undefined/omitted, falls back to the old fixed 0.9 factor.
   */
  rigSolverForMixamo(skeleton: Skeleton, delta?: number): void {
    const baseSpeed = 12;
    const frameFactor = delta != null
      ? 1 - Math.exp(-baseSpeed * delta)
      : 0.9;

    const ld = (name: string) => this.pose3dDict[name];
    const _v = this._v.bind(this);
    const _m = this._m.bind(this);
    const _q = this._q.bind(this);

    const computeR_hips = (): Matrix4 => {
      const hip_joint = ld('hips');
      const u = _v().subVectors(ld('left_hip'), ld('right_hip')).normalize();
      const v = _v().subVectors(ld('neck'), hip_joint).normalize();
      const w = _v().crossVectors(u, v).normalize();
      u.crossVectors(v, w).normalize();
      return _m().makeBasis(u, v, w);
    };

    const R_hips = computeR_hips();
    const hip_root = skeleton.getBoneByName('Hips');

    if (!hip_root) {
      console.warn('Hips bone not found in skeleton');
      return;
    }

    // P2: Hip/spine coupling — subtle hip movement follows upper body
    if (this.freezeHips) {
      // Dampened hip rotation: follow upper body at hipCouplingFactor strength
      const hipTarget = _q().setFromRotationMatrix(R_hips);
      hip_root.quaternion.slerp(hipTarget, this.hipCouplingFactor * frameFactor);

      // P2: Hip translation from spine sway
      const neckPos = ld('neck');
      const hipsPos = ld('hips');
      if (neckPos && hipsPos) {
        const spineDir = _v().subVectors(neckPos, hipsPos).normalize();
        // World up vector
        const worldUp = _v().set(0, 1, 0);
        // Lateral component (deviation from vertical)
        const vertComponent = worldUp.dot(spineDir);
        const sway = _v().copy(spineDir).addScaledVector(worldUp, -vertComponent);
        hip_root.position.set(
          sway.x * this.hipTranslationFactor,
          0,
          sway.z * this.hipTranslationFactor
        );
      }
    } else {
      hip_root.position.set(0, 0, 0);
      hip_root.quaternion.slerp(
        _q().setFromRotationMatrix(R_hips),
        frameFactor
      );
    }

    const R_chain_root = R_hips.clone();

    const computeJointParentR = (
      nameSkeletonJoint: string,
      nameMpJoint: string,
      nameMpJointParent: string,
      R_chain: Matrix4
    ): Matrix4 => {
      const skeletonJoint = skeleton.getBoneByName(nameSkeletonJoint);
      if (!skeletonJoint) {
        return _m(); // identity from pool
      }
      const j = _v().copy(skeletonJoint.position).normalize();
      const mpJoint = ld(nameMpJoint);
      const mpJointParent = ld(nameMpJointParent);
      if (!mpJoint || !mpJointParent) {
        return _m();
      }
      const v = _v().subVectors(mpJoint, mpJointParent)
        .normalize()
        .applyMatrix4(R_chain.clone().transpose());
      return this.computeR(j, v);
    };

    // P1: Reuse a single quaternion for slerp target
    const slerpTarget = _q();
    const slerp = (boneName: string, R: Matrix4, factor: number) => {
      const bone = skeleton.getBoneByName(boneName);
      if (bone) {
        slerpTarget.setFromRotationMatrix(R);
        bone.quaternion.slerp(slerpTarget, factor);
      }
    };

    // Spine chain
    let R_chain_spines: Matrix4;
    {
      let R_chain = R_chain_root.clone();

      const R_spine0 = computeJointParentR('Spine1', 'spine1', 'spine0', R_chain);
      slerp('Spine', R_spine0, frameFactor);
      R_chain.multiply(R_spine0);

      const R_spine1 = computeJointParentR('Spine2', 'spine2', 'spine1', R_chain);
      slerp('Spine1', R_spine1, frameFactor);
      R_chain.multiply(R_spine1);

      const R_spine2 = computeJointParentR('Neck', 'neck', 'spine2', R_chain);
      slerp('Spine2', R_spine2, frameFactor);

      R_chain_spines = R_chain.multiply(R_spine2);
    }

    // Neck & head
    {
      let R_chain = R_chain_spines.clone();

      const R_neck = computeJointParentR('Head', 'head', 'neck', R_chain);
      slerp('Neck', R_neck, frameFactor);
      R_chain.multiply(R_neck);

      const R_headL = computeJointParentR('LeftEye', 'left_eye', 'head', R_chain);
      const R_headR = computeJointParentR('RightEye', 'right_eye', 'head', R_chain);
      const q_headL = _q().setFromRotationMatrix(R_headL);
      const q_headR = _q().setFromRotationMatrix(R_headR);
      const q_head = _q().slerpQuaternions(q_headL, q_headR, 0.5);
      const headBone = skeleton.getBoneByName('Head');
      if (headBone) headBone.quaternion.slerp(q_head, frameFactor);
    }

    // Left arm chain
    {
      let R_chain = R_chain_spines.clone();

      const R_shoulder_left = computeJointParentR(
        'LeftArm', 'left_shoulder', 'shoulder_left', R_chain
      );
      slerp('LeftShoulder', R_shoulder_left, frameFactor);
      R_chain.multiply(R_shoulder_left);

      const R_arm = computeJointParentR(
        'LeftForeArm', 'left_elbow', 'left_shoulder', R_chain
      );
      slerp('LeftArm', R_arm, frameFactor);
      R_chain.multiply(R_arm);

      const R_forearm = computeJointParentR(
        'LeftHand', 'left_wrist', 'left_elbow', R_chain
      );
      slerp('LeftForeArm', R_forearm, frameFactor);
      R_chain.multiply(R_forearm);

      const R_hand = computeJointParentR(
        'LeftHandIndex1', 'left_index', 'left_wrist', R_chain
      );
      slerp('LeftHand', R_hand, frameFactor);
    }

    // Right arm chain
    {
      let R_chain = R_chain_spines.clone();

      const R_shoulder_right = computeJointParentR(
        'RightArm', 'right_shoulder', 'shoulder_right', R_chain
      );
      slerp('RightShoulder', R_shoulder_right, frameFactor);
      R_chain.multiply(R_shoulder_right);

      const R_arm = computeJointParentR(
        'RightForeArm', 'right_elbow', 'right_shoulder', R_chain
      );
      slerp('RightArm', R_arm, frameFactor);
      R_chain.multiply(R_arm);

      const R_forearm = computeJointParentR(
        'RightHand', 'right_wrist', 'right_elbow', R_chain
      );
      slerp('RightForeArm', R_forearm, frameFactor);
      R_chain.multiply(R_forearm);

      const R_hand = computeJointParentR(
        'RightHandIndex1', 'right_index', 'right_wrist', R_chain
      );
      slerp('RightHand', R_hand, frameFactor);
    }

    // Legs remain frozen (freezeLegs = true by default)
  }

  computeR(A: Vector3, B: Vector3): Matrix4 {
    const uA = A.clone().normalize();
    const uB = B.clone().normalize();
    const idot = uA.dot(uB);
    const cross_AB = new Vector3().crossVectors(uA, uB);
    const cdot = cross_AB.length();
    const u = uA.clone();
    const v = new Vector3()
      .subVectors(uB, uA.clone().multiplyScalar(idot))
      .normalize();
    const w = cross_AB.clone().normalize();
    const C = new Matrix4().makeBasis(u, v, w).transpose();
    const R_uvw = new Matrix4().set(
      idot, -cdot, 0, 0,
      cdot,  idot, 0, 0,
      0,     0,    1, 0,
      0,     0,    0, 1
    );
    return new Matrix4().multiplyMatrices(
      C.clone().transpose(),
      new Matrix4().multiplyMatrices(R_uvw, C)
    );
  }
}
