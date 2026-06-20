import React from 'react';
import { Text, View } from 'react-native';
import StickFigureAvatar2D from './StickFigureAvatarCore';
import ModelAvatar3D from './ModelAvatar3D.native';

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

  return rendererProp ?? envRenderer ?? '3d';
}

export default function StickFigureAvatar(props: AvatarProps) {
  const { signData, isPlaying, speed, onSignComplete } = props;
  const configured = getConfiguredRenderer(props.renderer);
  const shouldTry3D = configured === '3d' || configured === 'auto';

  const [use3D, setUse3D] = React.useState(shouldTry3D);
  const [ready3D, setReady3D] = React.useState(false);
  const [errored3D, setErrored3D] = React.useState(false);

  React.useEffect(() => {
    setUse3D(shouldTry3D);
    setReady3D(false);
    setErrored3D(false);
  }, [shouldTry3D, signData]);

  React.useEffect(() => {
    if (!use3D || ready3D || errored3D) return;
    const t = setTimeout(() => setUse3D(false), 1500);
    return () => clearTimeout(t);
  }, [use3D, ready3D, errored3D]);

  // 2D fallback commented out — use Skia StickFigureAvatar2D here if needed
  // if (!use3D) {
  //   return <StickFigureAvatar2D signData={signData} isPlaying={isPlaying} speed={speed} onSignComplete={onSignComplete} />;
  // }

  return (
    <View style={{ flex: 1, width: '100%', height: '100%' }}>
      {!ready3D && !errored3D && (
        <Text style={{ color: '#00f5a0', padding: 8, fontSize: 12 }}>
          Initializing 3D…
        </Text>
      )}
      {errored3D && (
        <Text style={{ color: '#ff4757', padding: 8, fontSize: 12 }}>
          [ERROR] 3D avatar failed to initialize — see console for details
        </Text>
      )}
      <AvatarErrorBoundary
        onError={(err) => {
          console.error('[StickFigureAvatar] 3D renderer error:', err);
          setErrored3D(true);
          // Keep use3D true so we show the error message instead of blank space
          // setUse3D(false);
        }}
      >
        <ModelAvatar3D
          signData={signData}
          isPlaying={isPlaying}
          speed={speed}
          onSignComplete={onSignComplete}
          onReady={() => {
            console.log('[StickFigureAvatar] 3D model avatar ready');
            setReady3D(true);
          }}
        />
      </AvatarErrorBoundary>
    </View>
  );
}
