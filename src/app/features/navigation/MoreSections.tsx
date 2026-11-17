import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Building2 from "lucide-react-native/icons/building";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import Sun from "lucide-react-native/icons/sun";
import { Card, type CardBadgeTone } from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import {
  useAppearance,
  useTheme,
  type AppearancePreference,
} from "../../components/ui/Appearance";
import { withOpacity, type ThemeColors } from "../../components/ui/theme";
import { activationRoleLabel } from "../../../core/web/app/features/account-activation/selectors";
import type { MoreDestination, MoreTone } from "./moreDestinations";

const themeModes: readonly { value: AppearancePreference; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function toneColors(tone: MoreTone, palette: ThemeColors) {
  switch (tone) {
    case "blue":
      return { bg: palette.blueSoft, fg: palette.blue };
    case "green":
      return { bg: palette.successSoft, fg: palette.success };
    case "warning":
      return { bg: palette.warningSoft, fg: palette.warning };
    case "review":
      return { bg: palette.reviewSoft, fg: palette.review };
    case "navy":
    default:
      return { bg: palette.primarySoft, fg: palette.primary };
  }
}

function actorInitials(fullName?: string | null, email?: string | null) {
  const parts = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  if (parts[0]) return parts[0][0].toUpperCase();
  const handle = email?.trim()[0];
  return handle ? handle.toUpperCase() : "?";
}

function roleDisplay(role?: string | null) {
  if (!role) return "Member";
  if (role === "head") return "Office Head";
  return activationRoleLabel(role);
}

/**
 * Compact Navy account & Office context hero at the top of More, linking directly to Profile.
 */
export function MoreIdentityHero({
  fullName,
  email,
  role,
  officeName,
  avatarUrl,
  onOpenProfile,
}: {
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  officeName: string;
  avatarUrl?: string | null;
  onOpenProfile: () => void;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.35;

  const displayName = fullName?.trim() || "eFlow Account";
  const initials = actorInitials(fullName, email);

  return (
    <LinearGradient
      colors={[palette.heroStart, palette.heroEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        s.heroCard,
        {
          borderColor: isDark
            ? withOpacity(palette.primary, 0.28)
            : "rgba(148, 186, 255, 0.26)",
        },
      ]}
    >
      <View style={[s.heroTop, stacked && s.heroTopStacked]}>
        <View style={s.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatarImage} />
          ) : (
            <Text style={s.avatarInitials}>{initials}</Text>
          )}
        </View>
        <View style={s.heroUser}>
          <Text
            numberOfLines={stacked ? 2 : 1}
            style={s.heroName}
          >
            {displayName}
          </Text>
          {!!email && (
            <Text
              numberOfLines={1}
              style={s.heroEmail}
            >
              {email}
            </Text>
          )}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          accessibilityHint="Opens Account details and Professional Profile"
          onPress={onOpenProfile}
          hitSlop={6}
          style={({ pressed }) => [
            s.heroOpenPill,
            {
              backgroundColor: pressed
                ? "rgba(255, 255, 255, 0.26)"
                : "rgba(255, 255, 255, 0.16)",
            },
          ]}
        >
          <Text style={s.heroOpenLabel}>Profile</Text>
          <ChevronRight size={14} color="#ffffff" />
        </Pressable>
      </View>

      <View style={s.heroContextBar}>
        <View style={[s.heroChip, s.heroRoleChip]}>
          <ShieldCheck size={13} color="#ffffff" />
          <Text style={s.heroChipText}>{roleDisplay(role)}</Text>
        </View>
        <View style={s.heroChip}>
          <Building2 size={13} color="#eef4ff" />
          <Text style={s.heroChipText}>{officeName}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

/**
 * Grouped section card wrapping a flush inset list container matching the redesigned visual language.
 */
export function MoreSectionCard({
  title,
  icon,
  badge,
  badgeTone = "neutral",
  children,
}: {
  title: string;
  icon: ReactNode;
  badge?: string;
  badgeTone?: CardBadgeTone;
  children: ReactNode;
}) {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const insetBg = isDark ? withOpacity(palette.background, 0.72) : "#f7f9fd";

  return (
    <Card title={title} icon={icon} badge={badge} badgeTone={badgeTone}>
      <View
        style={[
          s.insetList,
          {
            backgroundColor: insetBg,
            borderColor: palette.border,
          },
        ]}
      >
        {children}
      </View>
    </Card>
  );
}

/**
 * Interactive row inside a More inset list, supporting semantic icon badge, live pill, and hairline divider.
 */
export function MoreDestinationRow({
  item,
  pill,
  pillTone,
  pillTestID,
  subtitleOverride,
  divider = true,
  onPress,
}: {
  item: MoreDestination;
  pill?: string;
  pillTone?: MoreTone;
  pillTestID?: string;
  subtitleOverride?: string;
  divider?: boolean;
  onPress: () => void;
}) {
  const palette = useTheme();
  const { fontScale } = useWindowDimensions();
  const iconSpec = toneColors(item.tone, palette);
  const badgeSpec = pillTone ? toneColors(pillTone, palette) : iconSpec;
  const activePill = pill ?? item.pill;
  const sub = subtitleOverride ?? item.subtitle;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      accessibilityHint={activePill ? `${activePill}. ${sub}` : sub}
      onPress={onPress}
      style={({ pressed }) => [
        s.insetRow,
        divider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.border,
        },
        pressed && { backgroundColor: palette.primarySoft },
      ]}
    >
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[s.rowIconBadge, { backgroundColor: iconSpec.bg }]}
      >
        <item.Icon size={17} color={iconSpec.fg} />
      </View>
      <View style={s.rowMain}>
        <View style={s.rowTitleLine}>
          <Text style={[s.rowTitle, { color: palette.text }]}>
            {item.label}
          </Text>
          {!!activePill && (
            <View
              testID={pillTestID}
              style={[s.rowPill, { backgroundColor: badgeSpec.bg }]}
            >
              <Text style={[s.rowPillText, { color: badgeSpec.fg }]}>
                {activePill}
              </Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={fontScale > 1.35 ? 3 : 2}
          style={[s.rowSub, { color: palette.mutedLabel }]}
        >
          {sub}
        </Text>
      </View>
      <ChevronRight size={17} color={palette.mutedLabel} />
    </Pressable>
  );
}

/**
 * Direct inline theme selector inside the Account & preferences list (System / Light / Dark).
 */
export function MoreAppearanceRow({
  preference,
  onSelect,
}: {
  preference: AppearancePreference;
  onSelect: (next: AppearancePreference) => void;
}) {
  const palette = useTheme();
  const { fontScale } = useWindowDimensions();
  const iconSpec = toneColors("review", palette);
  const stacked = fontScale > 1.35;

  return (
    <View style={s.appearanceWrap}>
      <View style={s.appearanceHead}>
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[s.rowIconBadge, { backgroundColor: iconSpec.bg }]}
        >
          <Sun size={17} color={iconSpec.fg} />
        </View>
        <View style={s.rowMain}>
          <Text style={[s.rowTitle, { color: palette.text }]}>Appearance</Text>
          <Text style={[s.rowSub, { color: palette.mutedLabel }]}>
            Switch theme directly without leaving More
          </Text>
        </View>
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Color theme"
        style={[
          s.segTrack,
          stacked && s.segTrackStacked,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        {themeModes.map((option) => {
          const selected = preference === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} theme`}
              accessibilityState={{ checked: selected }}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                s.segOption,
                stacked && s.segOptionStacked,
                selected && { backgroundColor: palette.primary },
                !selected && pressed && { backgroundColor: palette.primarySoft },
              ]}
            >
              <Text
                style={[
                  s.segLabel,
                  { color: selected ? palette.onPrimary : palette.mutedLabel },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  heroCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroTopStacked: {
    flexWrap: "wrap",
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.34)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitials: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroUser: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  heroName: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "700",
    color: "#ffffff",
  },
  heroEmail: {
    fontSize: 12.5,
    lineHeight: 16,
    color: "rgba(235, 242, 255, 0.8)",
  },
  heroOpenPill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.24)",
    flexShrink: 0,
  },
  heroOpenLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  heroContextBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.18)",
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  heroRoleChip: {
    backgroundColor: "rgba(148, 186, 255, 0.24)",
  },
  heroChipText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#eef4ff",
  },
  insetList: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  insetRow: {
    minHeight: 58,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  rowIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  rowTitle: {
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: "600",
  },
  rowSub: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  rowPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    flexShrink: 0,
  },
  rowPillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  appearanceWrap: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 10,
  },
  appearanceHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  segTrack: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  segTrackStacked: {
    flexWrap: "wrap",
  },
  segOption: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  segOptionStacked: {
    minWidth: 88,
  },
  segLabel: {
    fontSize: 12.5,
    fontWeight: "700",
  },
});
