import { expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, waitFor } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { StyleSheet, View } from "react-native";
import { AppearanceProvider } from "../Appearance";
import {
  AllocationBar,
  Card,
  DetailGroup,
  ErrorState,
  LabelValue,
  MetricPair,
  Notice,
  Screen,
  Status,
  type NoticeTone,
} from "../index";
import { beginOperation } from "../../../shared/operationActivity";
import { ViewLoadingState } from "../loading/ViewLoadingState";
import { colors, darkColors, withOpacity } from "../theme";

test("Card renders 20px surface with icon badge, tone pill, and supports flat subsections", async () => {
  const view = await render(
    <View>
      <Card
        title="Task funding"
        badge="FY 2026"
        badgeTone="success"
        icon={<View testID="card-icon" />}
      >
        <View testID="card-body" />
      </Card>
      <Card flat title="Subtask allocations" badge="2">
        <View testID="flat-body" />
      </Card>
    </View>,
  );

  const outerCard = view.getByTestId("card-body").parent;
  expect(outerCard).toHaveStyle({
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  });

  const iconChip = view.getByTestId("card-icon", {
    includeHiddenElements: true,
  }).parent;
  expect(iconChip).toHaveStyle({
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
  });

  expect(view.getByText("FY 2026").parent).toHaveStyle({
    backgroundColor: colors.successSoft,
  });

  const flatCard = view.getByTestId("flat-body").parent;
  expect(flatCard).toHaveStyle({
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
  });
});

test("Notice renders all six semantic tones with circular elevated icon badges in light and dark modes", async () => {
  const tones: {
    tone: NoticeTone;
    soft: string;
    darkSoft: string;
    accent: string;
    darkAccent: string;
  }[] = [
    {
      tone: "info",
      soft: colors.blueSoft,
      darkSoft: darkColors.blueSoft,
      accent: colors.blue,
      darkAccent: darkColors.blue,
    },
    {
      tone: "warning",
      soft: colors.warningSoft,
      darkSoft: darkColors.warningSoft,
      accent: colors.warning,
      darkAccent: darkColors.warning,
    },
    {
      tone: "danger",
      soft: colors.dangerSoft,
      darkSoft: darkColors.dangerSoft,
      accent: colors.danger,
      darkAccent: darkColors.danger,
    },
    {
      tone: "success",
      soft: colors.successSoft,
      darkSoft: darkColors.successSoft,
      accent: colors.success,
      darkAccent: darkColors.success,
    },
    {
      tone: "review",
      soft: colors.reviewSoft,
      darkSoft: darkColors.reviewSoft,
      accent: colors.review,
      darkAccent: darkColors.review,
    },
    {
      tone: "neutral",
      soft: colors.primarySoft,
      darkSoft: darkColors.primarySoft,
      accent: colors.primary,
      darkAccent: darkColors.primary,
    },
  ];

  const lightView = await render(
    <View>
      {tones.map(({ tone }) => (
        <Notice
          key={tone}
          tone={tone}
          title={`Title ${tone}`}
          icon={<View testID={`notice-icon-${tone}`} />}
        >
          Body {tone}
        </Notice>
      ))}
      <ErrorState error={new Error("Failed to load")} />
    </View>,
  );

  for (const { tone, soft, accent } of tones) {
    const badge = lightView.getByTestId(`notice-icon-${tone}`, {
      includeHiddenElements: true,
    }).parent;
    expect(badge).toHaveStyle({
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#ffffff",
      borderColor: withOpacity(accent, 0.22),
    });
    expect(badge?.parent).toHaveStyle({
      borderRadius: 18,
      backgroundColor: soft,
      borderColor: withOpacity(accent, 0.2),
    });
    expect(lightView.getByText(`Title ${tone}`)).toHaveStyle({ color: accent });
  }

  await AsyncStorage.setItem("eflow.appearance", "dark");
  try {
    const darkView = await render(
      <AppearanceProvider>
        <View>
          {tones.map(({ tone }) => (
            <Notice
              key={tone}
              tone={tone}
              icon={<View testID={`dark-notice-icon-${tone}`} />}
            >
              Dark {tone}
            </Notice>
          ))}
        </View>
      </AppearanceProvider>,
    );

    await waitFor(() => {
      for (const { tone, darkSoft, darkAccent } of tones) {
        const badge = darkView.getByTestId(`dark-notice-icon-${tone}`, {
          includeHiddenElements: true,
        }).parent;
        expect(badge).toHaveStyle({
          backgroundColor: withOpacity(darkAccent, 0.18),
          borderColor: withOpacity(darkAccent, 0.32),
        });
        expect(badge?.parent).toHaveStyle({
          backgroundColor: darkSoft,
        });
      }
    });
  } finally {
    await AsyncStorage.removeItem("eflow.appearance");
  }
});

test("DetailGroup skips falsy children, draws hairline dividers between rows, and LabelValue stacks at 200% font scale", async () => {
  const showThird = false;
  const view = await render(
    <DetailGroup>
      <LabelValue label="Allocated" value="₱920.00" />
      {showThird && <LabelValue label="Hidden" value="₱0.00" />}
      <LabelValue label="Actual spent" value="₱540.00" tone="success" />
    </DetailGroup>,
  );

  expect(view.queryByText("Hidden")).toBeNull();
  expect(view.getByText("₱540.00")).toHaveStyle({
    color: colors.success,
    fontVariant: ["tabular-nums"],
  });

  const firstRow = view.getByText("Allocated").parent?.parent;
  const secondRow = view.getByText("Actual spent").parent?.parent;
  expect(firstRow).not.toHaveStyle({
    borderTopWidth: StyleSheet.hairlineWidth,
  });
  expect(secondRow).toHaveStyle({
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  });

  const spy = jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
    width: 390,
    height: 844,
    scale: 3,
    fontScale: 2,
  });
  try {
    const scaled = await render(
      <LabelValue label="Pending release" value="₱120.00" tone="warning" />,
    );
    const val = scaled.getByText("₱120.00");
    expect(val).toHaveStyle({
      textAlign: "left",
      color: colors.warning,
    });
    expect(val.parent).toHaveStyle({
      alignItems: "flex-start",
    });
  } finally {
    spy.mockRestore();
  }
});

test("MetricPair applies frosted glass styling, stacks under narrow/large scale, and AllocationBar clamps percentage", async () => {
  const view = await render(
    <View>
      <MetricPair
        items={[
          {
            label: "Approved budget",
            value: "₱10,100.00",
            icon: <View testID="metric-neutral" />,
          },
          {
            label: "Available",
            value: "₱9,180.00",
            tone: "success",
            icon: <View testID="metric-success" />,
          },
        ]}
      />
      <AllocationBar
        label="Allocation progress"
        summary="120% · ₱1,200.00"
        percent={120}
      />
    </View>,
  );

  const neutralBadge = view.getByTestId("metric-neutral", {
    includeHiddenElements: true,
  }).parent;
  expect(neutralBadge).toHaveStyle({
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
  });
  expect(neutralBadge?.parent).toHaveStyle({
    backgroundColor: colors.glassSurface,
    borderColor: colors.glassEdge,
    borderRadius: 20,
  });

  const successBadge = view.getByTestId("metric-success", {
    includeHiddenElements: true,
  }).parent;
  expect(successBadge?.parent).toHaveStyle({
    backgroundColor: colors.successSoft,
  });
  expect(view.getByText("₱9,180.00")).toHaveStyle({ color: colors.success });

  const progress = view.getByRole("progressbar", { name: "Allocation progress" });
  expect(progress.props.accessibilityValue).toEqual({
    min: 0,
    max: 100,
    now: 100,
  });

  await AsyncStorage.setItem("eflow.appearance", "dark");
  const spy = jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({
    width: 320,
    height: 700,
    scale: 2,
    fontScale: 1,
  });
  try {
    const darkCompact = await render(
      <AppearanceProvider>
        <MetricPair
          items={[
            {
              label: "Authorized",
              value: "₱50,000.00",
              icon: <View testID="dark-metric" />,
            },
            { label: "Unallocated", value: "₱5,000.00", tone: "success" },
          ]}
        />
      </AppearanceProvider>,
    );

    await waitFor(() => {
      const tile = darkCompact.getByTestId("dark-metric", {
        includeHiddenElements: true,
      }).parent?.parent;
      expect(tile).toHaveStyle({
        backgroundColor: "#1a274d",
        borderColor: darkColors.border,
      });
      expect(tile?.parent).toHaveStyle({
        flexDirection: "column",
      });
    });
  } finally {
    spy.mockRestore();
    await AsyncStorage.removeItem("eflow.appearance");
  }
});

test("ViewLoadingState summary skeleton matches card chrome cleanly with no buttons", async () => {
  const view = await render(
    <ViewLoadingState layout="summary" label="Loading funding" rows={3} />,
  );

  expect(view.getByTestId("skeleton-summary")).toBeOnTheScreen();
  expect(view.getByRole("progressbar", { name: "Loading funding" })).toHaveProp(
    "accessibilityState",
    { busy: true },
  );
  expect(view.queryAllByRole("button")).toEqual([]);
});

test("Status pill and ErrorState use uniform borders without crescent borderLeftWidth", async () => {
  const view = await render(
    <View>
      <Status value="pending" domain="finance" variant="pill" />
      <Status value="approved" domain="finance" variant="monday" />
      <ErrorState error="Request failed" retry={() => {}} />
    </View>,
  );

  for (const label of ["Status: Requested", "Status: Authorized"]) {
    const style = StyleSheet.flatten(view.getByLabelText(label).props.style);
    expect(style.borderRadius).toBe(999);
    expect(style.borderWidth).toBe(1);
    expect(style.borderLeftWidth).toBeUndefined();
  }

  const errorCard = view.getByText("Request failed").parent?.parent?.parent;
  const errorStyle = StyleSheet.flatten(errorCard?.props.style);
  expect(errorStyle.borderWidth).toBe(1);
  expect(errorStyle.borderRadius).toBe(18);
  expect(errorStyle.borderLeftWidth).toBeUndefined();
});

test("Screen shows OperationStatus as a floating bottom pill rather than above the page header", async () => {
  const end = beginOperation("update");
  try {
    const view = await render(
      <Screen title="Office Analytics">
        <View />
      </Screen>,
    );
    const floating = view.getByTestId("operation-status-floating");
    expect(floating).toHaveStyle({ position: "absolute" });
    expect(view.getByText("Updating…")).toBeOnTheScreen();
  } finally {
    act(() => {
      end();
    });
  }
});
