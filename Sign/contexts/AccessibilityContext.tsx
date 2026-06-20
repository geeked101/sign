// src/contexts/AccessibilityContext.tsx

import React, { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
export interface AccessibilitySettings {
  fontSize: "small" | "medium" | "large";
  highContrast: boolean;
  soundEnabled: boolean;
  motionReduced: boolean;
}
interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (settings: Partial<AccessibilitySettings>) => void;
}

const AccessibilityContext = createContext<
  AccessibilityContextType | undefined
>(undefined);

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error(
      "useAccessibility must be used within AccessibilityProvider"
    );
  }
  return context;
};

interface AccessibilityProviderProps {
  children: ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({
  children,
}) => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    fontSize: "medium",
    highContrast: false,
    soundEnabled: true,
    motionReduced: false,
  });

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <AccessibilityContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AccessibilityContext.Provider>
  );
};
