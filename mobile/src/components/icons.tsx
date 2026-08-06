import Svg, { Path } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

/**
 * Tracés exportés tels quels depuis le Figma. La couleur est passée en prop
 * plutôt que codée en dur, pour suivre le thème clair/sombre.
 */

/** Étagère avec un « + » — créer un groupe. */
export function CreateGroupIcon({ color, size = 33 }: Readonly<IconProps>) {
  return (
    <Svg width={size} height={size * (28.5 / 33)} viewBox="0 0 33 28.5">
      <Path
        d="M25.5 28.5V24H21V21H25.5V16.5H28.5V21H33V24H28.5V28.5H25.5V28.5M1.5 24V15H0V12L1.5 4.5H24L25.5 12V15H24V19.5H21V15H15V24H1.5V24M4.5 21H12V15H4.5V21V21M3.075 12V12H22.425V12H3.075V12M1.5 3V0H24V3H1.5V3M3.075 12H22.425L21.525 7.5H3.975L3.075 12V12"
        fill={color}
      />
    </Svg>
  );
}

/** Personnes avec un « + » — rejoindre un groupe. */
export function JoinGroupIcon({ color, size = 36 }: Readonly<IconProps>) {
  return (
    <Svg width={size} height={size * (24 / 36)} viewBox="0 0 36 24">
      <Path
        d="M18.75 11.925C19.475 11.125 20.0313 10.2125 20.4188 9.1875C20.8063 8.1625 21 7.1 21 6C21 4.9 20.8063 3.8375 20.4188 2.8125C20.0313 1.7875 19.475 0.875 18.75 0.075V0.075V0.075C20.25 0.275 21.5 0.9375 22.5 2.0625C23.5 3.1875 24 4.5 24 6C24 7.5 23.5 8.8125 22.5 9.9375C21.5 11.0625 20.25 11.725 18.75 11.925V11.925V11.925V11.925M27 24V19.5C27 18.6 26.8 17.7437 26.4 16.9312C26 16.1187 25.475 15.4 24.825 14.775C26.1 15.225 27.2812 15.8062 28.3687 16.5187C29.4562 17.2312 30 18.225 30 19.5V24H27V24M30 13.5V10.5H27V7.5H30V4.5H33V7.5H36V10.5H33V13.5H30M9 11.925C7.35 11.925 6 11.4 4.95 10.35C3.9 9.3 3.375 7.95 3.375 6.3C3.375 4.65 3.9 3.3 4.95 2.25C6 1.2 7.35 0.675 9 0.675C10.65 0.675 12 1.2 13.05 2.25C14.1 3.3 14.625 4.65 14.625 6.3C14.625 7.95 14.1 9.3 13.05 10.35C12 11.4 10.65 11.925 9 11.925M0 24V20.4C0 19.5 0.225 18.675 0.675 17.925C1.125 17.175 1.75 16.6 2.55 16.2C4.05 15.45 5.5 14.8875 6.9 14.5125C8.3 14.1375 9.75 13.95 11.25 13.95C12.75 13.95 14.2 14.1375 15.6 14.5125C17 14.8875 18.45 15.45 19.95 16.2C20.75 16.6 21.375 17.175 21.825 17.925C22.275 18.675 22.5 19.5 22.5 20.4V24H0V24"
        fill={color}
      />
    </Svg>
  );
}

/** Flèche fine de la ligne « ACTION: … ». */
export function ArrowRightIcon({ color, size = 8 }: Readonly<IconProps>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Path
        d="M6.0875 4.5H0V3.5H6.0875L3.2875 0.7L4 0L8 4L4 8L3.2875 7.3L6.0875 4.5V4.5"
        fill={color}
      />
    </Svg>
  );
}
