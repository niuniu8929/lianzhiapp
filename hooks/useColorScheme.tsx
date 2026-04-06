import { createContext, ReactNode, useContext } from 'react';
import { useColorScheme as useReactNativeColorScheme } from 'react-native';

const ColorSchemeContext = createContext<'light' | 'dark' | null | undefined>(null);

const ColorSchemeProvider = function ({ children }: { children?: ReactNode }) {
  // 直接使用系统颜色方案，不做任何额外处理
  const colorScheme = useReactNativeColorScheme();
  
  return (
    <ColorSchemeContext.Provider value={colorScheme}>
      {children}
    </ColorSchemeContext.Provider>
  );
};

function useColorScheme() {
  const colorScheme = useContext(ColorSchemeContext);
  return colorScheme;
}

export {
  ColorSchemeProvider,
  useColorScheme,
}
