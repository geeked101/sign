import React, { useEffect, useRef } from 'react';
import { Canvas, Circle, Line, Group, Paint } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, withRepeat } from 'react-native-reanimated';

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 400;

const GREEN = '#00f5a0';
const RED = '#ff4757';

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

interface Frame {
  frame: number;
  timestamp_ms: number;
  body: Landmark[];
  left_hand: Landmark[];
  right_hand: Landmark[];
}

interface SignData {
  sign: string;
  fps: number;
  total_frames: number;
  frames: Frame[];
}

interface Props {
  signData: SignData | null;
  isPlaying: boolean;
  speed: number; // 0.5 = slow, 1 = normal, 2 = fast
}

// MediaPipe body landmark indices
const BODY_CONNECTIONS = [
  [11, 12], // shoulders
  [11, 13], // left shoulder to elbow
  [13, 15], // left elbow to wrist
  [12, 14], // right shoulder to elbow
  [14, 16], // right elbow to wrist
  [11, 23], // left shoulder to hip
  [12, 24], // right shoulder to hip
  [23, 24], // hips
  [23, 25], // left hip to knee
  [25, 27], // left knee to ankle
  [24, 26], // right hip to knee
  [26, 28], // right knee to ankle
];

// Hand connections (21 landmarks per hand)
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],     // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],     // index
  [0, 9], [9, 10], [10, 11], [11, 12], // middle
  [0, 13], [13, 14], [14, 15], [15, 16], // ring
  [0, 17], [17, 18], [18, 19], [19, 20], // pinky
  [5, 9], [9, 13], [13, 17],           // palm
];

function scaleLandmark(l: Landmark, width: number, height: number) {
  return {
    x: l.x * width,
    y: l.y * height,
  };
}

export default function StickFigureAvatar({ signData, isPlaying, speed }: Props) {
  const frameIndex = useRef(0);
  const [currentFrame, setCurrentFrame] = React.useState<Frame | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!signData || !isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    frameIndex.current = 0;
    const fps = signData.fps * speed;
    const interval = 1000 / fps;

    intervalRef.current = setInterval(() => {
      if (frameIndex.current >= signData.frames.length) {
        frameIndex.current = 0; // loop
      }
      setCurrentFrame(signData.frames[frameIndex.current]);
      frameIndex.current++;
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [signData, isPlaying, speed]);

  // Set first frame on load
  useEffect(() => {
    if (signData && signData.frames.length > 0) {
      setCurrentFrame(signData.frames[0]);
    }
  }, [signData]);

  const body = currentFrame?.body || [];
  const leftHand = currentFrame?.left_hand || [];
  const rightHand = currentFrame?.right_hand || [];

  const renderBodyConnections = () => {
    return BODY_CONNECTIONS.map(([a, b], i) => {
      if (!body[a] || !body[b]) return null;
      const p1 = scaleLandmark(body[a], CANVAS_WIDTH, CANVAS_HEIGHT);
      const p2 = scaleLandmark(body[b], CANVAS_WIDTH, CANVAS_HEIGHT);
      return (
        <Line
          key={`body-${i}`}
          p1={{ x: p1.x, y: p1.y }}
          p2={{ x: p2.x, y: p2.y }}
          color={GREEN}
          style="stroke"
          strokeWidth={3}
        />
      );
    });
  };

  const renderHandConnections = (hand: Landmark[], color: string) => {
    return HAND_CONNECTIONS.map(([a, b], i) => {
      if (!hand[a] || !hand[b]) return null;
      const p1 = scaleLandmark(hand[a], CANVAS_WIDTH, CANVAS_HEIGHT);
      const p2 = scaleLandmark(hand[b], CANVAS_WIDTH, CANVAS_HEIGHT);
      return (
        <Line
          key={`hand-${i}`}
          p1={{ x: p1.x, y: p1.y }}
          p2={{ x: p2.x, y: p2.y }}
          color={color}
          style="stroke"
          strokeWidth={2}
        />
      );
    });
  };

  const renderLandmarkDots = (landmarks: Landmark[], color: string) => {
    return landmarks.map((l, i) => {
      const p = scaleLandmark(l, CANVAS_WIDTH, CANVAS_HEIGHT);
      return (
        <Circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r={3}
          color={color}
        />
      );
    });
  };

  const renderHead = () => {
    if (!body[0]) return null;
    const nose = scaleLandmark(body[0], CANVAS_WIDTH, CANVAS_HEIGHT);
    return (
      <Circle
        cx={nose.x}
        cy={nose.y - 30}
        r={28}
        color="transparent"
        style="stroke"
        strokeWidth={3}
      />
    );
  };

  return (
    <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: '#0a0a0a' }}>
      {renderHead()}
      {renderBodyConnections()}
      {renderHandConnections(leftHand, '#00f5a0')}
      {renderHandConnections(rightHand, '#00f5a0')}
      {renderLandmarkDots(body, RED)}
      {renderLandmarkDots(leftHand, RED)}
      {renderLandmarkDots(rightHand, RED)}
    </Canvas>
  );
}