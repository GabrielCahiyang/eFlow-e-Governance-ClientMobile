import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import LogOut from "lucide-react-native/icons/log-out";
import X from "lucide-react-native/icons/x";
import { Button } from "../../components/ui/Button";
import { Sheet } from "../../components/ui/Sheet";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import { space } from "../../components/ui/theme";
import type { MoreDestination } from "./moreDestinations";

const columns = 4;

/**
 * More: a 4 by 2 grid of extra destinations. Picking one pins it into the
 * bottom bar; the last cell signs out.
 */
export function MoreSheet({
  open,
  destinations,
  pinnedId,
  signingOut,
  onPick,
  onSignOut,
  onClose,
}: {
  open: boolean;
  destinations: MoreDestination[];
  pinnedId?: string;
  signingOut: boolean;
  onPick: (destination: MoreDestination) => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const palette = useTheme();
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);
  const cells: (MoreDestination | "sign-out")[] = [
    ...destinations,
    "sign-out",
  ];
  return (
    <Sheet
      title={confirming ? "Sign out?" : "More"}
      description={
        confirming
          ? "You will need to sign in again to use eFlow on this device."
          : "Pick a destination to add it to your bar."
      }
      open={open}
      onClose={onClose}
      busy={signingOut}
      maxWidth={520}
    >
      {confirming ? (
        <View style={{ gap: space.md }}>
          <View style={{ flexDirection: "row", gap: space.sm }}>
            <Button
              variant="outline"
              disabled={signingOut}
              icon={<X size={16} color={palette.primary} />}
              style={{ flex: 1 }}
              onPress={() => setConfirming(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              busy={signingOut}
              icon={<LogOut size={16} color={palette.onDanger} />}
              style={{ flex: 1 }}
              onPress={onSignOut}
            >
              Sign out
            </Button>
          </View>
        </View>
      ) : (
      <View
        accessibilityRole="list"
        style={{ flexDirection: "row", flexWrap: "wrap", rowGap: space.md }}
      >
        {cells.map((cell) => {
          const signOut = cell === "sign-out";
          const label = signOut ? "Sign out" : cell.label;
          const Icon = signOut ? LogOut : cell.Icon;
          const pinned = !signOut && cell.id === pinnedId;
          return (
            <View
              key={signOut ? "sign-out" : cell.id}
              style={{ width: `${100 / columns}%`, alignItems: "center" }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint={
                  signOut
                    ? "Signs you out of eFlow on this device."
                    : pinned
                      ? "Already in your bar. Opens it."
                      : "Adds it to your bar and opens it."
                }
                accessibilityState={{
                  selected: pinned,
                  busy: signOut && signingOut,
                  disabled: signOut && signingOut,
                }}
                disabled={signOut && signingOut}
                onPress={() => (signOut ? setConfirming(true) : onPick(cell))}
                style={({ pressed }) => ({
                  width: "100%",
                  alignItems: "center",
                  gap: 6,
                  paddingVertical: space.xs,
                  opacity: pressed ? 0.7 : signOut && signingOut ? 0.5 : 1,
                })}
              >
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: pinned ? 2 : 1,
                    borderColor: pinned ? palette.primary : palette.border,
                    backgroundColor: signOut
                      ? palette.dangerSoft
                      : pinned
                        ? palette.primarySoft
                        : palette.surface,
                  }}
                >
                  <Icon
                    size={22}
                    color={signOut ? palette.danger : palette.primary}
                  />
                </View>
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 12,
                    lineHeight: 15,
                    textAlign: "center",
                    color: signOut ? palette.danger : palette.text,
                    fontWeight: pinned ? "700" : "500",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      )}
    </Sheet>
  );
}
