import { DynamicColorIOS, Platform, type ColorValue } from 'react-native';

export const lightColors = {
  background: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceMuted: '#ECE9E1',
  ink: '#1E211E',
  inkMuted: '#6B706A',
  line: '#DEDCD5',
  moss: '#526458',
  mossSoft: '#DDE5DE',
  clay: '#A96547',
  claySoft: '#F1DFD6',
  gold: '#A98A4C',
  danger: '#A2463B',
} as const;

export const darkColors = {
  background: '#111411',
  surface: '#1B201C',
  surfaceMuted: '#272D28',
  ink: '#F3F1EA',
  inkMuted: '#ADB4AD',
  line: '#353C36',
  moss: '#AEC0B0',
  mossSoft: '#26362B',
  clay: '#E09A77',
  claySoft: '#412D25',
  gold: '#D8B971',
  danger: '#F08A7B',
} as const;

function adaptiveColor(light: string, dark: string): ColorValue {
  return Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : light;
}

export const colors = Object.fromEntries(
  Object.keys(lightColors).map((key) => [
    key,
    adaptiveColor(lightColors[key as keyof typeof lightColors], darkColors[key as keyof typeof darkColors]),
  ]),
) as Record<keyof typeof lightColors, ColorValue>;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 26,
  pill: 999,
} as const;

export const shadow = {
  shadowColor: adaptiveColor('#283128', '#000000'),
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 18,
  elevation: 2,
} as const;
