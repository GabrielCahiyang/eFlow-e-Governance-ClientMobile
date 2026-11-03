import { Text, TextInput } from "./Typography";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Switch,
  type TextInputProps,
} from "react-native";
import { Pressable, View } from "./Primitives";
import DateTimePicker from "@react-native-community/datetimepicker";
import Check from "lucide-react-native/icons/check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import Search from "lucide-react-native/icons/search";
import { Sheet } from "./Sheet";
import { colors, dateLabel } from "./theme";
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#829499"
        {...props}
        style={[s.input, props.multiline && s.multiline, props.style]}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
export interface Option {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}
export function Choice({
  label,
  value,
  onChange,
  options,
  placeholder = "Choose…",
  disabled,
  multiple = false,
}: {
  label: string;
  value: string | string[];
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const selected = Array.isArray(value) ? value : [value];
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        style={[s.choice, disabled && { opacity: 0.45 }]}
        onPress={() => setOpen(true)}
      >
        <Text style={s.choiceText}>
          {options
            .filter((o) => selected.includes(o.value))
            .map((o) => o.label)
            .join(", ") || placeholder}
        </Text>
        <ChevronDown size={18} color={colors.muted} />
      </Pressable>
      <Sheet
        open={open}
        title={label}
        onClose={() => {
          setOpen(false);
          setSearch("");
        }}
      >
        <Field label="Search options" value={search} onChangeText={setSearch} />
        {options
          .filter((o) =>
            (o.label + " " + o.description)
              .toLowerCase()
              .includes(search.toLowerCase()),
          )
          .map((option) => (
            <Pressable
              key={option.value}
              accessibilityRole={multiple ? "checkbox" : "radio"}
              aria-checked={selected.includes(option.value)}
              accessibilityState={{
                checked: selected.includes(option.value),
                disabled: !!option.disabled,
              }}
              accessibilityLabel={option.label}
              disabled={option.disabled}
              style={[s.option, selected.includes(option.value) && s.selected]}
              onPress={() => {
                onChange(
                  multiple
                    ? selected.includes(option.value)
                      ? selected.filter((v) => v !== option.value)
                      : [...selected, option.value]
                    : option.value,
                );
                if (!multiple) {
                  setOpen(false);
                  setSearch("");
                }
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.label}>{option.label}</Text>
                {!!option.description && (
                  <Text style={s.help}>{option.description}</Text>
                )}
              </View>
              {!!selected.includes(option.value) && (
                <Check size={19} color={colors.primary} />
              )}
            </Pressable>
          ))}
      </Sheet>
    </View>
  );
}
export function DateField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(value + "T12:00:00") : new Date();
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      {Platform.OS === "web" ? (
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD"
          style={s.input}
        />
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            disabled={disabled}
            style={s.choice}
            onPress={() => setOpen(true)}
          >
            <Text style={s.choiceText}>
              {value ? dateLabel(parsed.getTime()) : "Set date"}
            </Text>
            <ChevronDown size={17} color={colors.muted} />
          </Pressable>
          {!!open && (
            <DateTimePicker
              value={Number.isFinite(parsed.getTime()) ? parsed : new Date()}
              mode="date"
              onChange={(event, date) => {
                setOpen(Platform.OS === "ios" && event.type !== "dismissed");
                if (date)
                  onChange(
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
                  );
              }}
            />
          )}
          {!!(open && Platform.OS === "ios") && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpen(false)}
            >
              <Text style={s.label}>Done</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={s.toggle}>
      <Text style={[s.label, { flex: 1 }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.primary }}
      />
    </View>
  );
}
export const SearchField = ({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
}) => (
  <View style={s.search}>
    <Search size={18} color={colors.muted} />
    <TextInput
      accessibilityLabel={placeholder}
      placeholder={placeholder}
      value={value}
      onChangeText={onChange}
      style={{ flex: 1, color: colors.text, minHeight: 44 }}
    />
  </View>
);
const s = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 14, fontWeight: "500", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
    minHeight: 46,
    color: colors.text,
    fontSize: 15,
    backgroundColor: colors.surface,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  error: { fontSize: 12, color: colors.danger },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 13,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  choiceText: { flex: 1, color: colors.text, fontSize: 14 },
  option: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selected: { backgroundColor: colors.primarySoft, borderRadius: 8 },
  help: { fontSize: 12, color: colors.muted, marginTop: 4 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
  },
});
