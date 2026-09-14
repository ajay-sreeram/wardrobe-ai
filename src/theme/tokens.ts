export const colors = {
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
  shadowColor: '#283128',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.07,
  shadowRadius: 18,
  elevation: 2,
} as const;
