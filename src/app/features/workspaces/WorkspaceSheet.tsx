import { useEffect, useRef, useState } from "react";
import { ScrollView, View, Pressable } from "react-native";
import BottomSheet, {
  type BottomSheetMethods,
} from "@expo/ui/community/bottom-sheet";
import Building from "lucide-react-native/icons/building-complex";
import User from "lucide-react-native/icons/user-round";
import X from "lucide-react-native/icons/x";
import { Empty, ErrorState, Loading, SearchField } from "../../components/ui";
import { FavoriteStar } from "../../components/ui/FavoriteStar";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import type { Workspace } from "../../../core/web/app/features/workspaces/types";

const workspaceSnapPoints = ["70%", "100%"];

export function WorkspaceSheet({
  open,
  mode,
  workspaces,
  favorites,
  selectedId,
  loading,
  error,
  onRetry,
  onToggleFavorite,
  onSelect,
  onClose,
}: {
  open: boolean;
  mode: "all" | "favorites";
  workspaces: Workspace[];
  favorites: Set<string>;
  selectedId?: string;
  loading: boolean;
  error?: Error;
  onRetry: () => void;
  onToggleFavorite: (id: string) => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const palette = useTheme();
  const sheet = useRef<BottomSheetMethods>(null);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (open) {
      setQuery("");
    }
  }, [open, mode]);
  // Keep list order stable while starring, including unfavorited entries.
  const items = workspaces.filter(
    (item) =>
      item.state === "active" &&
      item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <BottomSheet
      ref={sheet}
      index={open ? 0 : -1}
      onClose={onClose}
      snapPoints={workspaceSnapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: palette.surface }}
    >
      <View
        accessibilityViewIsModal
        style={{ flex: 1, backgroundColor: palette.surface }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            minHeight: 64,
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => {
              if (sheet.current) sheet.current.close();
              else onClose();
            }}
            style={{
              width: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={24} color={palette.mutedLabel} />
          </Pressable>
          <Text
            accessibilityRole="header"
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 19,
              fontWeight: "700",
              color: palette.text,
            }}
          >
            {mode === "favorites" ? "Add a favorite" : "Workspaces"}
          </Text>
          <View style={{ width: 48 }} />
        </View>
        <View style={{ padding: 16, gap: 18 }}>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search workspaces"
            onFocus={() => sheet.current?.expand()}
          />
          <Text
            style={{
              color: palette.mutedLabel,
              fontSize: 13,
              fontWeight: "500",
            }}
          >
            Your workspaces
          </Text>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 32,
          }}
        >
          {error ? (
            <ErrorState error={error} retry={onRetry} />
          ) : loading ? (
            <Loading layout="navigation" label="Loading workspaces" />
          ) : !items.length ? (
            <Empty
              compact
              kind="workspace"
              title={
                query.trim()
                  ? "No matching workspaces"
                  : "No workspaces available"
              }
              description={
                query.trim() ? "Try another workspace name." : undefined
              }
            />
          ) : (
            items.map((item) => {
              const Icon = item.kind === "office" ? Building : User;
              const content = (
                <>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: palette.border,
                      backgroundColor: palette.primarySoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={24} color={palette.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        color: palette.text,
                      }}
                    >
                      {item.name}
                    </Text>
                    <Text style={{ fontSize: 13, color: palette.mutedLabel }}>
                      {item.kind === "office"
                        ? "Office workspace"
                        : "Personal workspace"}
                      {selectedId === item.id ? " · Current" : ""}
                    </Text>
                  </View>
                </>
              );
              const rowStyle = {
                flex: 1,
                flexDirection: "row" as const,
                alignItems: "center" as const,
                minHeight: 84,
                gap: 14,
                paddingVertical: 14,
                paddingRight: 8,
              };
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {mode === "favorites" ? (
                    <View style={rowStyle}>{content}</View>
                  ) : (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityLabel={item.name}
                      accessibilityState={{
                        checked: selectedId === item.id,
                      }}
                      onPress={() => onSelect(item.id)}
                      style={rowStyle}
                    >
                      {content}
                    </Pressable>
                  )}
                  <FavoriteStar
                    checked={favorites.has(item.id)}
                    label={`Favorite workspace ${item.name}`}
                    onToggle={() => onToggleFavorite(item.id)}
                  />
                </View>
              );
            })
          )}
          {!loading && !error && !items.length && (
            <Text style={{ padding: 16, color: palette.mutedLabel }}>
              {query
                ? "No workspaces match your search."
                : "No workspaces are available right now."}
            </Text>
          )}
        </ScrollView>
      </View>
    </BottomSheet>
  );
}
