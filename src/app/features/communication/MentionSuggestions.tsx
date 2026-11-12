import { Pressable, ScrollView } from "react-native";
import { Text } from "../../components/ui/Typography";
import { useTheme } from "../../components/ui/Appearance";
import type { ChatPerson } from "./services";

export function MentionSuggestions({
  query,
  people,
  actor,
  group,
  onSelect,
}: {
  query: string;
  people: ChatPerson[];
  actor: string;
  group: boolean;
  onSelect: (label: string, id?: string) => void;
}) {
  const palette = useTheme();
  const term = query.toLocaleLowerCase();
  const matches = people
    .filter(
      (person) =>
        person.id !== actor &&
        !!person.name &&
        [person.name, person.nickname].some((name) =>
          name?.toLocaleLowerCase().includes(term),
        ),
    )
    .slice(0, 8);
  const everyone = group && "everyone".startsWith(term);
  if (!matches.length && !everyone) return null;
  return (
    <ScrollView
      keyboardShouldPersistTaps="always"
      style={{
        maxHeight: 160,
        borderRadius: 12,
        backgroundColor: palette.glassSurface,
      }}
    >
      {everyone && (
        <Pressable
          accessibilityRole="button"
          onPress={() => onSelect("@everyone")}
          style={{ padding: 12, minHeight: 44 }}
        >
          <Text style={{ fontWeight: "700" }}>@everyone</Text>
        </Pressable>
      )}
      {matches.map((person) => (
        <Pressable
          key={person.id}
          accessibilityRole="button"
          accessibilityLabel={`Mention ${person.name}`}
          style={{ padding: 12, minHeight: 44 }}
          onPress={() => onSelect("@" + person.name, person.id)}
        >
          <Text>
            {person.nickname
              ? `${person.nickname} · ${person.name}`
              : person.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
