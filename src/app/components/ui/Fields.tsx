import { Text, TextInput } from "./Typography";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Switch,
  useWindowDimensions,
  type TextInputProps,
} from "react-native";
import { Pressable, View } from "./Primitives";
import DateTimePicker from "@react-native-community/datetimepicker";
import Check from "lucide-react-native/icons/check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import Search from "lucide-react-native/icons/search";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import X from "lucide-react-native/icons/x";
import { Sheet } from "./Sheet";
import { Button } from "./Button";
import { useAppearance, useTheme } from "./Appearance";
import { isRawEntityId } from "../../shared/entityId";
import { colors, dateLabel } from "./theme";
import { userErrorMessage } from "../../shared/userMessages";
export function Field({
  label,
  error,
  required,
  ...props
}: TextInputProps & { label: string; error?: string; required?: boolean }) {
  const palette = useTheme();
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={required ? "Required" : undefined}
        placeholderTextColor={palette.mutedLabel}
        selectionColor={palette.blue}
        {...props}
        style={[s.input, props.multiline && s.multiline, props.style]}
      />
      {!!error && (
        <Text accessibilityRole="alert" style={s.error}>
          {userErrorMessage(error, "action")}
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
  required,
  searchable = true,
  error,
  confirmSelection = false,
  confirmationLabel = "Confirm selection",
}: {
  label: string;
  value: string | string[];
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  required?: boolean;
  searchable?: boolean;
  error?: string;
  confirmSelection?: boolean;
  confirmationLabel?: string;
}) {
  const palette = useTheme();
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState("");
  const [selectionDraft, setSelectionDraft] = useState<string[]>();
  const currentSelection = Array.isArray(value) ? value : value ? [value] : [];
  const selected =
    confirmSelection && open
      ? (selectionDraft ?? currentSelection)
      : currentSelection;
  const close = () => {
    setOpen(false);
    setSearch("");
    setSelectionDraft(undefined);
  };
  const showSearch = searchable;
  const visibleDescription = (description?: string) =>
    description && !isRawEntityId(description) ? description : undefined;
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={required ? "Required" : undefined}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        style={[s.choice, disabled && { opacity: 0.45 }]}
        onPress={() => {
          setSelectionDraft([...currentSelection]);
          setOpen(true);
        }}
      >
        <Text style={s.choiceText}>
          {options
            .filter((o) => selected.includes(o.value))
            .map((o) => o.label)
            .join(", ") || placeholder}
        </Text>
        <ChevronDown size={18} color={palette.muted} />
      </Pressable>
      {!!error && !open && (
        <Text accessibilityRole="alert" style={s.error}>
          {userErrorMessage(error, "action")}
        </Text>
      )}
      <Sheet
        open={open}
        title={label}
        onClose={close}
        description={
          confirmSelection
            ? "Confirm to apply your selection to the form. Save the form to save your changes."
            : undefined
        }
        footer={
          confirmSelection ? (
            <>
              <Button
                disabled={disabled || (required && !selected.length)}
                icon={<Check size={16} color={palette.onPrimary} />}
                onPress={() => {
                  onChange(multiple ? selected : (selected[0] ?? ""));
                  close();
                }}
              >
                {confirmationLabel}
              </Button>
              <Button
                variant="ghost"
                icon={<X size={16} color={palette.primary} />}
                onPress={close}
              >
                Cancel selection
              </Button>
            </>
          ) : undefined
        }
      >
        {showSearch && (
          <Field
            label="Search options"
            value={search}
            onChangeText={setSearch}
          />
        )}
        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {userErrorMessage(error, "action")}
          </Text>
        )}
        {options
          .filter((o) => {
            const query = search.trim().toLowerCase();
            if (!showSearch || !query) return true;
            const desc = visibleDescription(o.description) ?? "";
            return (o.label + " " + desc).toLowerCase().includes(query);
          })
          .map((option) => {
            const description = visibleDescription(option.description);
            return (
              <Pressable
                key={option.value}
                accessibilityRole={multiple ? "checkbox" : "radio"}
                aria-checked={selected.includes(option.value)}
                accessibilityState={{
                  checked: selected.includes(option.value),
                  disabled: !!option.disabled || !!disabled,
                }}
                accessibilityLabel={option.label}
                disabled={option.disabled || disabled}
                style={[
                  s.option,
                  selected.includes(option.value) && s.selected,
                  option.disabled && s.optionDisabled,
                ]}
                onPress={() => {
                  const next = multiple
                    ? selected.includes(option.value)
                      ? selected.filter((v) => v !== option.value)
                      : [...selected, option.value]
                    : [option.value];
                  if (confirmSelection) setSelectionDraft(next);
                  else {
                    onChange(multiple ? next : option.value);
                    if (!multiple) close();
                  }
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>{option.label}</Text>
                  {!!description && <Text style={s.help}>{description}</Text>}
                </View>
                {!!selected.includes(option.value) && (
                  <Check size={19} color={palette.primary} />
                )}
              </Pressable>
            );
          })}
      </Sheet>
    </View>
  );
}
export function DateField({
  label,
  value,
  onChange,
  disabled,
  min,
  max,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  min?: string;
  max?: string;
  required?: boolean;
}) {
  const palette = useTheme();
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(value + "T12:00:00") : new Date();
  const minimumDate = min ? new Date(min + "T12:00:00") : undefined;
  const maximumDate =
    max && (!min || max >= min) ? new Date(max + "T12:00:00") : undefined;
  let pickerDate = Number.isFinite(parsed.getTime()) ? parsed : new Date();
  if (minimumDate && pickerDate < minimumDate) pickerDate = minimumDate;
  if (maximumDate && pickerDate > maximumDate) pickerDate = maximumDate;
  return (
    <View style={s.field}>
      <Text style={s.label}>
        {label}
        {required ? " *" : ""}
      </Text>
      {Platform.OS === "web" ? (
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={required ? "Required" : undefined}
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          placeholder="YYYY-MM-DD"
          style={s.input}
        />
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={required ? "Required" : undefined}
            disabled={disabled}
            style={s.choice}
            onPress={() => setOpen(true)}
          >
            <Text style={s.choiceText}>
              {value ? dateLabel(parsed.getTime()) : "Set date"}
            </Text>
            <ChevronDown size={17} color={palette.muted} />
          </Pressable>
          {!!open && (
            <DateTimePicker
              value={pickerDate}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
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
              <Text style={s.label}>Confirm date</Text>
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
  const palette = useTheme();
  return (
    <View style={s.toggle}>
      <Text style={[s.label, { flex: 1 }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: palette.primary }}
      />
    </View>
  );
}
export type SearchFilterTrigger = {
  label: string;
  active?: boolean;
  count?: number;
  accessibilityLabel?: string;
  onPress: () => void;
};

export const SearchField = ({
  value,
  onChange,
  placeholder = "Search…",
  onFocus,
  onBlur,
  accessibilityLabel,
  filterTrigger,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  onFocus?: TextInputProps["onFocus"];
  onBlur?: TextInputProps["onBlur"];
  accessibilityLabel?: string;
  filterTrigger?: SearchFilterTrigger;
}) => {
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const [focused, setFocused] = useState(false);
  const stackedFilter = Boolean(filterTrigger && fontScale > 1.45);
  const badgeBg = isDark ? "rgba(8, 20, 47, 0.24)" : "rgba(255, 255, 255, 0.24)";

  const renderFilterPill = (trigger: SearchFilterTrigger) => {
    const active = !!trigger.active;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={trigger.accessibilityLabel || trigger.label}
        accessibilityState={{ selected: active }}
        onPress={trigger.onPress}
        hitSlop={4}
        style={({ pressed }) => [
          s.searchFilterBtn,
          {
            backgroundColor: active
              ? palette.primary
              : pressed
                ? palette.primarySoft
                : palette.background,
            borderColor: active ? palette.primary : palette.border,
          },
          stackedFilter && { alignSelf: "flex-start" as const },
        ]}
      >
        <SlidersHorizontal
          size={14}
          color={active ? palette.onPrimary : palette.primary}
        />
        <Text
          numberOfLines={1}
          style={[
            s.searchFilterText,
            { color: active ? palette.onPrimary : palette.text },
          ]}
        >
          {trigger.label}
        </Text>
        {!!trigger.count && trigger.count > 0 && (
          <View
            style={[
              s.searchFilterCount,
              {
                backgroundColor: active ? badgeBg : palette.primary,
              },
            ]}
          >
            <Text
              style={[
                s.searchFilterCountText,
                { color: palette.onPrimary },
              ]}
            >
              {trigger.count > 99 ? "99+" : trigger.count}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 8 }}>
      <View
        style={[
          s.search,
          {
            backgroundColor: palette.surface,
            borderColor: focused ? palette.primary : palette.border,
            paddingRight: filterTrigger && !stackedFilter ? 6 : 10,
          },
        ]}
      >
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            s.searchLeadIcon,
            { backgroundColor: focused ? palette.primarySoft : "transparent" },
          ]}
        >
          <Search
            size={17}
            color={focused ? palette.primary : palette.mutedLabel}
          />
        </View>
        <TextInput
          accessibilityLabel={accessibilityLabel || placeholder}
          placeholder={placeholder}
          placeholderTextColor={palette.mutedLabel}
          selectionColor={palette.blue}
          value={value}
          onChangeText={onChange}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[s.searchInput, { color: palette.text }]}
        />
        {value.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search text"
            onPress={() => onChange("")}
            hitSlop={6}
            style={({ pressed }) => [
              s.searchClearBtn,
              {
                backgroundColor: pressed
                  ? palette.primarySoft
                  : isDark
                    ? palette.primarySoft
                    : palette.background,
                borderColor: palette.border,
              },
            ]}
          >
            <X size={13} color={palette.muted} />
          </Pressable>
        )}
        {filterTrigger && !stackedFilter && (
          <>
            <View
              importantForAccessibility="no"
              style={[s.searchSep, { backgroundColor: palette.border }]}
            />
            {renderFilterPill(filterTrigger)}
          </>
        )}
      </View>
      {filterTrigger && stackedFilter && renderFilterPill(filterTrigger)}
    </View>
  );
};
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
  optionDisabled: { opacity: 0.45 },
  help: { fontSize: 12, color: colors.muted, marginTop: 4 },
  toggle: { flexDirection: "row", alignItems: "center", gap: 12 },
  search: {
    borderWidth: 1.5,
    borderRadius: 24,
    minHeight: 48,
    paddingLeft: 10,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchLeadIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    minWidth: 72,
    minHeight: 40,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: "500",
  },
  searchClearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  searchSep: {
    width: 1,
    height: 22,
    flexShrink: 0,
  },
  searchFilterBtn: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    maxWidth: 190,
  },
  searchFilterText: {
    fontSize: 12.5,
    fontWeight: "700",
    flexShrink: 1,
  },
  searchFilterCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  searchFilterCountText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
