import React, { useState, useEffect } from 'react';
import { Text } from 'react-native';
import { WithSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

export default function StickFigureAvatarWeb(props: any) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <Text style={{ color: '#00f5a0' }}>Loading Avatar...</Text>;
  }

  return (
    <WithSkiaWeb
      getComponent={() => import('./StickFigureAvatarCore')}
      fallback={<Text style={{ color: '#00f5a0' }}>Loading Avatar...</Text>}
      {...props}
    />
  );
}
