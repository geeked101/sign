import React from 'react';
import { Text, View } from 'react-native';
import StickFigureAvatar2D from './StickFigureAvatar';
import ModelAvatar3D from './ModelAvatar3D';

type AvatarRendererMode = 'realtime' | 'baked' | 'auto';

type AvatarProps = {
  signData: any;
  isPlaying: boolean;
  speed: number;
  onSignComplete?: () => void;
  mode?: AvatarRendererMode;
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

function getConfiguredMode(modeProp?: AvatarRendererMode): AvatarRendererMode {
  const env = (process.env.EXPO_PUBLIC_AVATAR_MODE || '').toLowerCase();
  const envMode: AvatarRendererMode | undefined =
    env === 'realtime' || env === 'baked' || env === 'auto'
      ? (env as AvatarRendererMode)
      : undefined;

  return modeProp ?? envMode ?? 'realtime';
}

/**
 * Top-level avatar component that renders the 3D humanoid by default.
 * Falls back to the 2D Skia stick figure only if 3D fails to initialize.
 */
export default function AvatarRenderer(props: AvatarProps) {
  const { signData, isPlaying, speed, onSignComplete } = props;
  // Mode is reserved for future baked-animation support
  const _configured = getConfiguredMode(props.mode);
  void _configured;

  const [use3D, setUse3D] = React.useState(true);
  const [ready3D, setReady3D] = React.useState(false);
  const [errored3D, setErrored3D] = React.useState(false);

  // Reset 3D state when sign data changes
  React.useEffect(() => {
    setUse3D(true);
    setReady3D(false);
    setErrored3D(false);
  }, [signData]);

  // Timeout: if 3D doesn't report ready in 10s, fall back to 2D
  React.useEffect(() => {
    if (!use3D || ready3D || errored3D) return;
    console.log('[AvatarRenderer] waiting for 3D ready...');
    const t = setTimeout(() => {
      console.log('[AvatarRenderer] TIMEOUT - falling back to 2D');
      setUse3D(false);
    }, 10000);
    return () => clearTimeout(t);
  }, [use3D, ready3D, errored3D]);

  React.useEffect(() => {
    console.log('[AvatarRenderer] state:', { use3D, ready3D, errored3D, hasSignData: !!signData });
  });

  // 2D fallback
  if (!use3D) {
    return (
      <View style={{ flex: 1, width: '100%', height: '100%' }}>
        <StickFigureAvatar2D
          signData={signData}
          isPlaying={isPlaying}
          speed={speed}
          onSignComplete={onSignComplete}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, width: '100%', height: '100%' }}>
      {!ready3D && !errored3D && (
        <Text style={{ color: '#00f5a0', padding: 8, fontSize: 12 }}>
          Loading 3D Avatar…
        </Text>
      )}
      <AvatarErrorBoundary
        onError={() => {
          setErrored3D(true);
          setUse3D(false);
        }}
      >
        <ModelAvatar3D
          signData={signData}
          isPlaying={isPlaying}
          speed={speed}
          onSignComplete={onSignComplete}
          onReady={() => {
            setReady3D(true);
          }}
        />
      </AvatarErrorBoundary>
    </View>
  );
}
