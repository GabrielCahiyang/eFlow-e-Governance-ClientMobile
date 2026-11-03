import { useState } from "react";
import {Pressable,View} from '../../components/ui/Primitives';
import {
  Button,
  Card,
  DataTable,
  LabelValue,
  Sheet,
  colors,
  dateLabel,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import type { Navigate } from "../../shared/routes";
import type { DepartmentReportRow } from "../../../core/web/app/features/reports/types";
export function ReportRows({
  rows,
  navigate,
}: {
  rows: DepartmentReportRow[];
  navigate: Navigate;
}) {
  const [selected, setSelected] = useState<DepartmentReportRow>();
  return (
    <>
      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        empty="No records match these filters."
        columns={[
          {
            id: "work",
            title: "Work item",
            width: 280,
            render: (row) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelected(row)}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontWeight: "600",
                    lineHeight: 21,
                  }}
                >
                  {row.title}
                </Text>
                <Text style={{ fontSize: 12, color: colors.muted }}>
                  {row.parent}
                </Text>
              </Pressable>
            ),
          },
          {
            id: "person",
            title: "Person / role",
            width: 190,
            render: (row) => (
              <>
                <Text>{row.person}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>
                  {row.role}
                </Text>
              </>
            ),
          },
          {
            id: "project",
            title: "Project",
            width: 210,
            render: (row) => <Text>{row.project}</Text>,
          },
          {
            id: "status",
            title: "Status / priority",
            width: 150,
            render: (row) => (
              <>
                <Text>{row.status}</Text>
                <Text style={{ color: colors.muted }}>{row.priority}</Text>
              </>
            ),
          },
          {
            id: "metric",
            title: "Progress / signal",
            width: 220,
            render: (row) => (
              <>
                <Text>
                  {typeof row.progress === "number" ? `${row.progress}%` : "—"}
                </Text>
                <Text style={{ color: colors.muted }}>{row.metric}</Text>
              </>
            ),
          },
          {
            id: "date",
            title: "Event / due date",
            width: 170,
            render: (row) => (
              <>
                <Text>{dateLabel(row.eventAt)}</Text>
                <Text style={{ color: colors.muted }}>
                  Due {dateLabel(row.dueAt)}
                </Text>
              </>
            ),
          },
          {
            id: "detail",
            title: "Detail",
            width: 300,
            render: (row) => (
              <Text style={{ lineHeight: 21 }}>{row.detail}</Text>
            ),
          },
        ]}
      />
      <Sheet
        open={!!selected}
        title={selected?.title || "Report record"}
        onClose={() => setSelected(undefined)}
        presentation="inspector"
      >
        {!!selected && (
          <>
            <LabelValue label="Parent / transition" value={selected.parent} />
            <LabelValue label="Person" value={selected.person} />
            <LabelValue label="Role" value={selected.role} />
            <LabelValue label="Project" value={selected.project} />
            <LabelValue label="Status" value={selected.status} />
            <LabelValue label="Signal" value={selected.metric} />
            <Text selectable style={{ lineHeight: 24 }}>
              {selected.detail}
            </Text>
            {!!selected.assignedReviewer && (
              <LabelValue
                label="Assigned reviewer"
                value={selected.assignedReviewer}
              />
            )}
            {!!selected.decisionAuthor && (
              <LabelValue
                label="Decision author"
                value={selected.decisionAuthor}
              />
            )}
            {!!(selected.taskId || selected.projectId) && (
              <Button
                onPress={() => {
                  const row = selected;
                  setSelected(undefined);
                  navigate(
                    row.taskId
                      ? {
                          name: "task",
                          id: row.taskId,
                          projectId: row.projectId,
                        }
                      : { name: "project", id: row.projectId },
                  );
                }}
              >
                Open work record
              </Button>
            )}
          </>
        )}
      </Sheet>
    </>
  );
}
