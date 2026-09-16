export const lightColors = {
  background: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceMuted: '#ECE9E1',
  garmentCanvas: '#F2F0EA',
  garmentCanvasMuted: '#E8E7E2',
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

export type ThemeColors = { [Key in keyof typeof lightColors]: string };

export const darkColors: ThemeColors = {
  background: '#111411',
  surface: '#1B201C',
  surfaceMuted: '#272D28',
  garmentCanvas: '#474D48',
  garmentCanvasMuted: '#343A35',
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
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 18,
  elevation: 2,
} as const;
