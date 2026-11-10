import Svg, { Path } from "react-native-svg";
import type { PrimaryTab } from "../../shared/routes";

// Solid companions to the outline navigation icons, with transparent details.
const glyphs: Record<PrimaryTab, string> = {
  home: "M2.5 10a2.5 2.5 0 0 1 .9-1.9l7-5.9a2.5 2.5 0 0 1 3.2 0l7 5.9a2.5 2.5 0 0 1 .9 1.9v9a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 19zM12 12.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
  work: "M7 2a1 1 0 0 1 1 1v2h8V3a1 1 0 1 1 2 0v2h1a2.5 2.5 0 0 1 2.5 2.5v12A2.5 2.5 0 0 1 19 22H5a2.5 2.5 0 0 1-2.5-2.5v-12A2.5 2.5 0 0 1 5 5h1V3a1 1 0 0 1 1-1zm2 10.5-1.4 1.4 3.2 3.2 5.7-5.7-1.4-1.4-4.3 4.3z",
  projects:
    "M2 6a2.5 2.5 0 0 1 2.5-2.5h4a2 2 0 0 1 1.6.8l1.3 1.7h8A2.6 2.6 0 0 1 22 8.6v10.9a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 19.5zm5 5v6.5h2V11zm4 0v4.5h2V11zm4 0v7.5h2V11z",
  inbox:
    "M12 2.5c-3.6 0-6.5 2.9-6.5 6.5v2.3c0 2.2-.8 3.8-2.1 5.4-.5.6 0 1.8 1 1.8h15.2c1 0 1.5-1.2 1-1.8-1.3-1.6-2.1-3.2-2.1-5.4V9c0-3.6-2.9-6.5-6.5-6.5zm-2.4 17.4h4.8a2.4 2.4 0 0 1-4.8 0z",
  accounting:
    "M4 4h13.5a2 2 0 0 1 2 2v1H5a1 1 0 0 0 0 2h15a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7a3 3 0 0 1 2-3zm13.5 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z",
  more: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-4.5 8.75a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm4.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5zm4.5 0a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z",
};

export function SelectedTabIcon({
  tab,
  color,
}: {
  tab: PrimaryTab;
  color: string;
}) {
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24">
      <Path d={glyphs[tab]} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
