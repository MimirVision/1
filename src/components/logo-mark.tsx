import Svg, { Path, Polyline } from 'react-native-svg';

/** The Lifted mark: a shield with two rising chevrons (same artwork as the app icon). */
export function LogoMark({ size = 24, color = '#5B3DF5', fill = '#FFFFFF' }: { size?: number; color?: string; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="200 160 624 730">
      <Path
        d="M512 176 C606 230 706 252 800 260 L800 520 C800 700 676 812 512 872 C348 812 224 700 224 520 L224 260 C318 252 418 230 512 176 Z"
        fill={fill}
      />
      <Polyline points="382,644 512,520 642,644" fill="none" stroke={color} strokeWidth={74} strokeLinecap="round" strokeLinejoin="round" />
      <Polyline
        points="382,486 512,362 642,486"
        fill="none"
        stroke={color}
        strokeOpacity={0.45}
        strokeWidth={74}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
