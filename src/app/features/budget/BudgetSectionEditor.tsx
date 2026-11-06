import { DateField } from "../../components/ui";
import {
  accountReleaseSchedule,
  pendingReleaseAmount,
} from "../../../core/web/app/features/budget/selectors/budgetReleaseSchedule";
import { useState } from "react";
import { View } from "../../components/ui/Primitives";
import {
  colors,
  Button,
  Card,
  Choice,
  Field,
  LabelValue,
  Notice,
  Row,
  peso,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import type { BudgetSection } from "../../../core/web/app/features/budget/types";
import {
  addSectionChild,
  removeSectionTree,
  sectionTotal,
} from "../../../core/web/app/features/budget/selectors/budgetSections";
import { confirmAction } from "../../shared/confirm";
export function BudgetSectionEditor({
  sections,
  onChange,
  disabled,
}: {
  sections: BudgetSection[];
  onChange: (rows: BudgetSection[]) => void;
  disabled: boolean;
}) {
  const [collapsed, setCollapsed] = useState(new Set<string>()),
    [parentNotice, setParentNotice] = useState("");
  const patch = (id: string, value: Partial<BudgetSection>) =>
    onChange(sections.map((s) => (s.id === id ? { ...s, ...value } : s)));
  const order = (id: string, shift: number) => {
    const item = sections.find((s) => s.id === id)!;
    const siblings = sections
      .filter((s) => !s.retired && s.parentId === item.parentId)
      .sort((a, b) => a.position - b.position);
    const index = siblings.findIndex((s) => s.id === id),
      target = siblings[index + shift];
    if (!target) return;
    const ids = siblings.map((s) => s.id);
    [ids[index], ids[index + shift]] = [ids[index + shift], ids[index]];
    onChange(
      sections.map((s) =>
        ids.includes(s.id) ? { ...s, position: ids.indexOf(s.id) } : s,
      ),
    );
  };
  const descendants = (id: string) => {
    const seen = new Set([id]);
    let size = 0;
    while (seen.size !== size) {
      size = seen.size;
      sections.forEach((s) => {
        if (s.parentId && seen.has(s.parentId)) seen.add(s.id);
      });
    }
    return seen;
  };
  const render = (parentId?: string, depth = 0): React.ReactNode =>
    sections
      .filter((s) => !s.retired && s.parentId === parentId)
      .sort((a, b) => a.position - b.position)
      .map((section) => {
        const children = sections.some(
            (s) => !s.retired && s.parentId === section.id,
          ),
          excluded = descendants(section.id);
        return (
          <View
            key={section.id}
            style={{
              gap: 12,
              marginLeft: depth ? 12 : 0,
              borderLeftWidth: depth ? 2 : 0,
              borderColor: colors.border,
              paddingLeft: depth ? 10 : 0,
            }}
          >
            <Card title={section.name || "New budget account"}>
              <Field
                label="Section / account name"
                value={section.name}
                onChangeText={(name) => patch(section.id, { name })}
                editable={!disabled}
              />
              <Row>
                <Button
                  variant="ghost"
                  onPress={() =>
                    setCollapsed((old) => {
                      const next = new Set(old);
                      next.has(section.id)
                        ? next.delete(section.id)
                        : next.add(section.id);
                      return next;
                    })
                  }
                >
                  {collapsed.has(section.id)
                    ? "Expand section"
                    : "Collapse section"}
                </Button>
                {!disabled && (
                  <>
                    <Button
                      variant="outline"
                      onPress={() =>
                        onChange(addSectionChild(sections, section.id))
                      }
                    >
                      Add child
                    </Button>
                    <Button
                      variant="ghost"
                      onPress={() => order(section.id, -1)}
                    >
                      Move up
                    </Button>
                    <Button
                      variant="ghost"
                      onPress={() => order(section.id, 1)}
                    >
                      Move down
                    </Button>
                  </>
                )}
              </Row>
              {!collapsed.has(section.id) && (
                <>
                  <Field
                    label="Account code"
                    value={section.accountCode || ""}
                    onChangeText={(accountCode) =>
                      patch(section.id, { accountCode })
                    }
                    editable={!disabled}
                  />
                  <Choice
                    label="Parent section"
                    value={section.parentId || ""}
                    disabled={disabled}
                    options={[
                      { value: "", label: "Top level" },
                      ...sections
                        .filter((s) => !s.retired && !excluded.has(s.id))
                        .map((s) => ({
                          value: s.id,
                          label: s.name || "Unnamed section",
                        })),
                    ]}
                    onChange={(parent: string) => {
                      setParentNotice("");
                      const target = sections.find((s) => s.id === parent);
                      if (
                        target &&
                        !sections.some(
                          (s) => !s.retired && s.parentId === parent,
                        ) &&
                        (target.amount || target.heldAmount)
                      ) {
                        setParentNotice(
                          "This parent already holds funding. Add a child account first so its funding is preserved before moving another section under it.",
                        );
                        return;
                      }
                      patch(section.id, {
                        parentId: parent || undefined,
                        position: sections.filter(
                          (s) => s.parentId === (parent || undefined),
                        ).length,
                      });
                    }}
                  />
                  {children ? (
                    <LabelValue
                      label="Subtotal from children"
                      value={peso(sectionTotal(sections, section.id))}
                    />
                  ) : (
                    <>
                      <Field
                        label="Budget amount"
                        keyboardType="decimal-pad"
                        value={String(section.amount)}
                        onChangeText={(amount) =>
                          patch(section.id, { amount: Number(amount) })
                        }
                        editable={!disabled}
                      />
                      {accountReleaseSchedule(section).map((release, index) => {
                        const rows = accountReleaseSchedule(section);
                        const setRows = (next: typeof rows) =>
                          patch(section.id, {
                            releaseSchedule: next,
                            heldAmount: pendingReleaseAmount(next),
                          });
                        const change = (value: Partial<typeof release>) =>
                          setRows(
                            rows.map((r, i) =>
                              i === index ? { ...r, ...value } : r,
                            ),
                          );
                        const frozen =
                          disabled || release.status === "confirmed";
                        return (
                          <Card
                            key={release.id}
                            title={
                              release.status === "confirmed"
                                ? "Confirmed release"
                                : "Planned release"
                            }
                          >
                            <DateField
                              label="Release date"
                              value={release.date}
                              disabled={frozen}
                              onChange={(date) => change({ date })}
                            />
                            <Field
                              label="Release amount"
                              value={String(release.amount || "")}
                              editable={!frozen}
                              keyboardType="decimal-pad"
                              onChangeText={(amount) =>
                                change({ amount: Number(amount) })
                              }
                            />
                            {!frozen && (
                              <Button
                                variant="ghost"
                                onPress={() =>
                                  setRows(rows.filter((_, i) => i !== index))
                                }
                              >
                                Remove release
                              </Button>
                            )}
                          </Card>
                        );
                      })}
                      {!disabled && (
                        <Button
                          variant="outline"
                          onPress={() =>
                            patch(section.id, {
                              releaseSchedule: [
                                ...accountReleaseSchedule(section),
                                {
                                  id: crypto.randomUUID(),
                                  date: "",
                                  amount: 0,
                                  status: "pending",
                                },
                              ],
                            })
                          }
                        >
                          Add scheduled release
                        </Button>
                      )}
                    </>
                  )}
                  {!disabled && (
                    <Button
                      variant="danger"
                      onPress={() =>
                        void confirmAction(
                          "Remove budget account?",
                          "This removes its children from the draft. Committed historical sources remain protected when saving.",
                          "Remove account",
                          true,
                        ).then((yes) => {
                          if (yes)
                            onChange(removeSectionTree(sections, section.id));
                        })
                      }
                    >
                      Remove account
                    </Button>
                  )}
                </>
              )}
            </Card>
            {!collapsed.has(section.id) && render(section.id, depth + 1)}
          </View>
        );
      });
  return (
    <View style={{ gap: 12 }}>
      <Notice>
        Use sections for quarters or programs and child accounts for detailed
        funding. Parent totals come from their children once.
      </Notice>
      {!!parentNotice && <Notice>{parentNotice}</Notice>}
      {render()}
      {!disabled && (
        <Button
          variant="outline"
          onPress={() => onChange(addSectionChild(sections))}
        >
          Add top-level section
        </Button>
      )}
      <Text>Draft total: {peso(sectionTotal(sections))}</Text>
    </View>
  );
}
