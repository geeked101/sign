import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import StickFigureAvatar3D from './StickFigureAvatar3D';

type AvatarRenderer = '2d' | '3d' | 'auto';

type AvatarProps = {
  signData: any;
  isPlaying: boolean;
  speed: number;
  onSignComplete?: () => void;
  renderer?: AvatarRenderer;
};

class AvatarErrorBoundary extends React.Component<
  { onError: (e: unknown) => void; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function getConfiguredRenderer(rendererProp?: AvatarRenderer): AvatarRenderer {
  const env = (process.env.EXPO_PUBLIC_AVATAR_RENDERER || '').toLowerCase();
  const envRenderer: AvatarRenderer | undefined =
    env === '2d' || env === '3d' || env === 'auto' ? (env as AvatarRenderer) : undefined;

  // On web we default to 3D because Skia 2D isn't guaranteed.
  return rendererProp ?? envRenderer ?? '3d';
}

export default function StickFigureAvatar(props: AvatarProps) {
  const { signData, isPlaying, speed, onSignComplete } = props;
  const [isMounted, setIsMounted] = useState(false);
  const configured = getConfiguredRenderer(props.renderer);
  const requested2D = configured === '2d';

  const [ready3D, setReady3D] = useState(false);
  const [use3D, setUse3D] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    setReady3D(false);
    setUse3D(true);
  }, [isMounted, signData]);

  useEffect(() => {
    if (!isMounted) return;
    if (!use3D || ready3D) return;
    const t = setTimeout(() => setUse3D(false), 1500);
    return () => clearTimeout(t);
  }, [isMounted, use3D, ready3D]);

  if (!isMounted) {
    return <Text style={{ color: '#00f5a0' }}>Loading 3D Scene...</Text>;
  }

  if (!use3D) {
    return (
      <Text style={{ color: '#ff4757' }}>
        3D renderer failed to initialize on web.
      </Text>
    );
  }

  return (
    <View style={{ flex: 1, width: '100%', height: '100%' }}>
      {requested2D && (
        <Text style={{ color: '#ff4757', padding: 8, fontSize: 12 }}>
          2D (Skia) renderer is not enabled on web; using 3D.
        </Text>
      )}
      {!ready3D && (
        <Text style={{ color: '#00f5a0', padding: 8, fontSize: 12 }}>
          Initializing 3D…
        </Text>
      )}
      <AvatarErrorBoundary onError={() => setUse3D(false)}>
        <StickFigureAvatar3D
          signData={signData}
          isPlaying={isPlaying}
          speed={speed}
          onSignComplete={onSignComplete}
          onReady={() => setReady3D(true)}
        />
      </AvatarErrorBoundary>
    </View>
  );
}
