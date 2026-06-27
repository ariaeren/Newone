import Svg, { Defs, LinearGradient, Stop, Polygon, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from "react-native-svg";

type Props = {
  size?: number;
  glow?: boolean;
};

/**
 * GRYND brand mark — stylized lightning bolt / upward chevron with
 * cyan→purple analogous neon gradient. Use as an in-app logo at any scale.
 */
export default function GryndMark({ size = 56, glow = true }: Props) {
  const id = `grynd-grad-${size}`;
  const filterId = `grynd-glow-${size}`;
  const pts = "50,0 95,50 62,55 90,100 50,140 10,100 38,55 5,50";
  return (
    <Svg width={size} height={size * (140 / 100)} viewBox="0 0 100 140">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="140" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#00E5FF" />
          <Stop offset="1" stopColor="#B026FF" />
        </LinearGradient>
        {glow && (
          <Filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <FeGaussianBlur stdDeviation="3" result="blur" />
            <FeMerge>
              <FeMergeNode in="blur" />
              <FeMergeNode in="SourceGraphic" />
            </FeMerge>
          </Filter>
        )}
      </Defs>
      <Polygon
        points={pts}
        fill={`url(#${id})`}
        filter={glow ? `url(#${filterId})` : undefined}
      />
    </Svg>
  );
}
