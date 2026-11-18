import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Clock from "lucide-react-native/icons/clock";
import Download from "lucide-react-native/icons/download";
import ExternalLink from "lucide-react-native/icons/external-link";
import FileIcon from "lucide-react-native/icons/file";
import FileSpreadsheet from "lucide-react-native/icons/file-spreadsheet";
import FileText from "lucide-react-native/icons/file-text";
import Files from "lucide-react-native/icons/files";
import Folder from "lucide-react-native/icons/folder";
import ImageIcon from "lucide-react-native/icons/image";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import {
  Button,
  Card,
  Empty,
  ErrorState,
  Loading,
  Notice,
  SearchField,
  dateLabel,
  withOpacity,
} from "../../components/ui";
import { Text } from "../../components/ui/Typography";
import { useAppearance, useTheme } from "../../components/ui/Appearance";
import { BusyIndicator } from "../../components/ui/BusyIndicator";
import { FilterChip } from "../../components/ui/FilterChip";
import { statusLabel } from "../../shared/statusLabels";
import { useAction } from "../../shared/useAction";
import { useFacts } from "../../shared/useFacts";
import { subscribeAppResume } from "../../shared/liveUpdates";
import { useAuth } from "../authentication";
import { openFileUrl } from "../../../platform/files";
import { useProjectDocumentManagement } from "./useProjectDocumentManagement";
import {
  fetchProjectFiles,
  openProjectFile,
} from "../../../core/web/app/features/project-files/services/projectFileService";
import type { ProjectFile } from "../../../core/web/app/features/project-files/types";

type FileCategory = "all" | "documents" | "images" | "ready";

type FileVisualMeta = {
  shortType: string;
  category: "documents" | "images" | "other";
  Icon: ComponentType<{ size?: number; color?: string }>;
  color: string;
  bg: string;
  border: string;
};

/** Formats byte counts into compact KB/MB labels without inflating small files. */
function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const kb = Math.ceil(bytes / 1024);
  if (kb < 1024) return `${kb} KB`;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
}

function fileExtension(name: string): string {
  const parts = name.trim().toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function fileVisualMeta(
  file: ProjectFile,
  palette: ReturnType<typeof useTheme>,
): FileVisualMeta {
  const mime = (file.mime_type || "").toLowerCase();
  const ext = fileExtension(file.file_name);

  if (file.state === "pending") {
    return {
      shortType: ext ? ext.toUpperCase() : "FILE",
      category: mime.startsWith("image/") ? "images" : "documents",
      Icon: Clock,
      color: palette.warning,
      bg: palette.warningSoft,
      border: withOpacity(palette.warning, 0.28),
    };
  }

  if (file.state === "removed") {
    return {
      shortType: ext ? ext.toUpperCase() : "FILE",
      category: "other",
      Icon: CircleAlert,
      color: palette.mutedLabel,
      bg: withOpacity(palette.mutedLabel, 0.14),
      border: withOpacity(palette.mutedLabel, 0.24),
    };
  }

  if (mime === "application/pdf" || ext === "pdf") {
    return {
      shortType: "PDF",
      category: "documents",
      Icon: FileText,
      color: palette.danger,
      bg: palette.dangerSoft,
      border: withOpacity(palette.danger, 0.24),
    };
  }

  if (
    mime.includes("spreadsheetml") ||
    mime.includes("excel") ||
    ext === "xlsx" ||
    ext === "xls"
  ) {
    return {
      shortType: "XLSX",
      category: "documents",
      Icon: FileSpreadsheet,
      color: palette.success,
      bg: palette.successSoft,
      border: withOpacity(palette.success, 0.24),
    };
  }

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg"].includes(ext)) {
    return {
      shortType: ext === "png" ? "PNG" : "JPEG",
      category: "images",
      Icon: ImageIcon,
      color: palette.review,
      bg: palette.reviewSoft,
      border: withOpacity(palette.review, 0.24),
    };
  }

  if (
    mime.includes("wordprocessingml") ||
    mime === "text/plain" ||
    ext === "docx" ||
    ext === "txt"
  ) {
    return {
      shortType: ext === "txt" ? "TXT" : "DOCX",
      category: "documents",
      Icon: FileText,
      color: palette.blue,
      bg: palette.blueSoft,
      border: withOpacity(palette.blue, 0.24),
    };
  }

  return {
    shortType: ext ? ext.toUpperCase().slice(0, 6) : "FILE",
    category: "other",
    Icon: FileIcon,
    color: palette.primary,
    bg: palette.primarySoft,
    border: withOpacity(palette.primary, 0.22),
  };
}

function matchesCategory(
  file: ProjectFile,
  category: FileCategory,
  palette: ReturnType<typeof useTheme>,
): boolean {
  if (category === "all") return true;
  if (category === "ready") return file.state === "ready";
  return fileVisualMeta(file, palette).category === category;
}

/** Displays authorized project or task attachments using Card v2, circular MIME badges, and hero metrics. */
export type ProjectFilesProps = {
  projectId: string;
  taskId?: string;
  contextTitle?: string;
  eyebrow?: string;
  scopeNote?: string;
  embedded?: boolean;
  readOnly?: boolean;
  onManage?: () => void;
};

export function ProjectFiles(props: ProjectFilesProps) {
  const { profile } = useAuth();
  return (
    <ProjectFilesContent
      key={`${profile?.id}:${props.projectId}:${props.taskId || ""}`}
      {...props}
    />
  );
}

function ProjectFilesContent({
  projectId,
  taskId,
  contextTitle,
  eyebrow,
  scopeNote,
  embedded = false,
  readOnly = true,
}: ProjectFilesProps) {
  const { profile } = useAuth();
  const palette = useTheme();
  const { isDark } = useAppearance();
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.35 || width < 340;
  const facts = useFacts(
    `files:${profile?.id}:${projectId}:${taskId}`,
    () => fetchProjectFiles(projectId, taskId),
    !!profile?.id,
  );
  const action = useAction();
  const [openingId, setOpeningId] = useState<string>();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FileCategory>("all");

  const management = useProjectDocumentManagement({
    actor: profile?.id,
    project: projectId,
    task: taskId,
    snapshot: facts.data,
    unavailable: facts.loading || !!facts.error,
    readOnly,
    refresh: facts.refresh,
  });
  useEffect(
    () =>
      subscribeAppResume(
        () => {
          if (!management.busy) void facts.refresh();
        },
        { staleAfterMs: 0 },
      ),
    [management.busy, facts.refresh],
  );
  const files = useMemo(() => {
    const available = facts.data?.files ?? [];
    return taskId
      ? available.filter((file) => file.linked === true)
      : available;
  }, [facts.data, taskId]);

  const summary = useMemo(() => {
    let readyCount = 0;
    let pendingCount = 0;
    let removedCount = 0;
    let readyBytes = 0;
    let docCount = 0;
    let imageCount = 0;

    for (const file of files) {
      if (file.state === "ready") {
        readyCount += 1;
        readyBytes += Math.max(0, file.file_size || 0);
      } else if (file.state === "pending") {
        pendingCount += 1;
      } else {
        removedCount += 1;
      }

      const meta = fileVisualMeta(file, palette);
      if (meta.category === "documents") docCount += 1;
      else if (meta.category === "images") imageCount += 1;
    }

    return {
      readyCount,
      pendingCount,
      removedCount,
      readyBytes,
      docCount,
      imageCount,
    };
  }, [files, palette]);

  const filteredFiles = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return files.filter((file) => {
      if (!matchesCategory(file, category, palette)) return false;
      if (!needle) return true;
      return (
        file.file_name.toLowerCase().includes(needle) ||
        file.uploader_name.toLowerCase().includes(needle)
      );
    });
  }, [files, query, category, palette]);

  if (!profile?.id)
    return (
      <Empty
        kind="files"
        title="Files unavailable"
        description="Sign in to view project documents."
      />
    );
  if (facts.error)
    return (
      <ErrorState error={facts.error} retry={() => void facts.refresh()} />
    );
  if (!facts.data) return <Loading label="Loading files" layout="files" />;

  const heroColors: readonly [string, string] = isDark
    ? ["#162452", "#223570"]
    : ["#00004f", "#0a1f7a"];

  const countLabel = `${files.length} ${files.length === 1 ? "file" : "files"}`;
  const readinessBadge =
    summary.pendingCount > 0
      ? `${summary.readyCount} ready · ${summary.pendingCount} pending`
      : summary.removedCount > 0
        ? `${summary.readyCount} ready · ${summary.removedCount} removed`
        : countLabel;
  const readinessTone = summary.pendingCount > 0 ? "warning" : "neutral";
  const showFiltering = files.length > 3;

  return (
    <View style={s.root}>
      {!embedded && (
        <View
          style={[
            s.heroCard,
            {
              backgroundColor: heroColors[0],
              borderColor: "rgba(148,186,255,0.24)",
            },
          ]}
        >
          <LinearGradient
            colors={heroColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroTop}>
            <View style={s.heroLead}>
              <Text style={s.heroEyebrow}>
                {eyebrow || (taskId ? "Task attachments" : "Project files")}
              </Text>
              <Text style={s.heroTitle}>
                {contextTitle || (taskId ? "Task library" : "Project library")}
              </Text>
            </View>
            <View
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={s.heroIconCircle}
            >
              <Files size={22} color="#ffffff" />
            </View>
          </View>

          <View
            style={[s.podsRow, { flexDirection: stacked ? "column" : "row" }]}
          >
            <View
              accessible
              accessibilityLabel={`Library count: ${countLabel}`}
              style={[s.pod, !stacked && s.podFlex]}
            >
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={s.podCircle}
              >
                <Folder size={18} color="#ffffff" />
              </View>
              <View style={s.podText}>
                <Text style={s.podLabel}>LIBRARY</Text>
                <Text style={s.podValue}>{countLabel}</Text>
              </View>
            </View>

            <View
              accessible
              accessibilityLabel={`Ready size: ${formatFileSize(summary.readyBytes)}`}
              style={[s.pod, !stacked && s.podFlex]}
            >
              <View
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={s.podCircle}
              >
                <Download size={18} color="#ffffff" />
              </View>
              <View style={s.podText}>
                <Text style={s.podLabel}>READY SIZE</Text>
                <Text style={s.podValue}>
                  {formatFileSize(summary.readyBytes)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <Text style={{ color: palette.mutedLabel, fontSize: 13 }}>
        Shared reference files for this project, separate from formal task
        submission evidence.
      </Text>
      {management.header}
      {!!scopeNote && <Notice tone="info">{scopeNote}</Notice>}

      {!files.length ? (
        <Card style={s.emptyCard}>
          <Empty
            kind="files"
            compact
            title="No files attached yet"
            description={
              taskId
                ? "Library files linked to this task will appear here for viewing."
                : "Library files added to this project will appear here for viewing."
            }
          />
        </Card>
      ) : (
        <>
          {showFiltering && (
            <View style={s.filterWrap}>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Search files or uploader…"
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.chipsRow}
              >
                <FilterChip
                  label="All"
                  count={files.length}
                  selected={category === "all"}
                  onPress={() => setCategory("all")}
                />
                <FilterChip
                  label="Documents"
                  count={summary.docCount}
                  selected={category === "documents"}
                  onPress={() => setCategory("documents")}
                />
                <FilterChip
                  label="Images"
                  count={summary.imageCount}
                  selected={category === "images"}
                  onPress={() => setCategory("images")}
                />
                <FilterChip
                  label="Ready"
                  count={summary.readyCount}
                  selected={category === "ready"}
                  onPress={() => setCategory("ready")}
                />
              </ScrollView>
            </View>
          )}

          {!filteredFiles.length ? (
            <Card>
              <Empty
                kind="search"
                compact
                title="No matching files"
                description="Try another file name, uploader, or category filter."
                action={
                  <Button
                    variant="outline"
                    compact
                    icon={<RotateCcw size={16} color={palette.primary} />}
                    onPress={() => {
                      setQuery("");
                      setCategory("all");
                    }}
                  >
                    Reset filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <Card
              title="Attached files"
              badge={readinessBadge}
              badgeTone={readinessTone}
              icon={<Folder size={16} color={palette.primary} />}
              flat={embedded}
            >
              <View
                style={[
                  s.insetGroup,
                  {
                    backgroundColor: isDark ? "#0f1733" : palette.background,
                    borderColor: palette.border,
                  },
                ]}
              >
                {filteredFiles.map((file, index) => {
                  const meta = fileVisualMeta(file, palette);
                  const TypeIcon = meta.Icon;
                  const isReady = file.state === "ready";
                  const isOpening = openingId === file.id && action.busy;
                  const typePillText = isReady
                    ? `${meta.shortType} · ${formatFileSize(file.file_size)}`
                    : meta.shortType;
                  const a11yLabel = `${file.file_name}, ${typePillText}, ${isReady ? "Ready" : statusLabel(file.state)}, ${file.uploader_name}`;

                  return (
                    <View key={file.id}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={a11yLabel}
                        accessibilityHint={isReady ? "Opens file" : undefined}
                        accessibilityState={{
                          disabled: !isReady || action.busy,
                        }}
                        disabled={!isReady || action.busy}
                        onPress={() => {
                          setOpeningId(file.id);
                          void action
                            .run(async () => {
                              if (
                                !(await openFileUrl(() =>
                                  openProjectFile(file),
                                ))
                              )
                                throw new Error(
                                  "Allow the browser to open this file, then try again.",
                                );
                            })
                            .finally(() => {
                              setOpeningId((current) =>
                                current === file.id ? undefined : current,
                              );
                            });
                        }}
                        style={({ pressed }) => [
                          s.fileRow,
                          {
                            backgroundColor: pressed
                              ? palette.primarySoft
                              : "transparent",
                            borderBottomWidth:
                              index === filteredFiles.length - 1
                                ? 0
                                : StyleSheet.hairlineWidth,
                            borderBottomColor: palette.border,
                          },
                        ]}
                      >
                        <View
                          accessible={false}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          style={[
                            s.fileCircle,
                            {
                              backgroundColor: meta.bg,
                              borderColor: meta.border,
                            },
                          ]}
                        >
                          <TypeIcon size={18} color={meta.color} />
                        </View>

                        <View style={s.fileBody}>
                          <Text style={[s.fileName, { color: palette.text }]}>
                            {file.file_name}
                          </Text>

                          <View style={s.badgesRow}>
                            <View
                              style={[
                                s.typePill,
                                {
                                  backgroundColor: palette.surface,
                                  borderColor: palette.border,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  s.typePillText,
                                  { color: palette.mutedLabel },
                                ]}
                              >
                                {typePillText}
                              </Text>
                            </View>

                            {!isReady && (
                              <View
                                style={[
                                  s.statePill,
                                  {
                                    backgroundColor:
                                      file.state === "pending"
                                        ? palette.warningSoft
                                        : withOpacity(palette.mutedLabel, 0.14),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    s.statePillText,
                                    {
                                      color:
                                        file.state === "pending"
                                          ? palette.warning
                                          : palette.mutedLabel,
                                    },
                                  ]}
                                >
                                  {file.state === "pending"
                                    ? "Pending upload"
                                    : statusLabel(file.state)}
                                </Text>
                              </View>
                            )}
                          </View>

                          <Text
                            style={[s.fileMeta, { color: palette.mutedLabel }]}
                          >
                            {file.uploader_name} · {dateLabel(file.created_at)}
                          </Text>
                        </View>

                        <View
                          accessible={false}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          style={[
                            s.openCircle,
                            {
                              backgroundColor: palette.surface,
                              borderColor: palette.border,
                              opacity: isReady ? 1 : 0.45,
                            },
                          ]}
                        >
                          {isOpening ? (
                            <BusyIndicator size={15} color={palette.primary} />
                          ) : isReady ? (
                            <ExternalLink size={15} color={palette.primary} />
                          ) : (
                            <Clock size={15} color={palette.mutedLabel} />
                          )}
                        </View>
                      </Pressable>
                      <View style={{ paddingHorizontal: 12 }}>
                        {management.rowActions(file)}
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          )}
        </>
      )}

      {!!action.error && <ErrorState context="action" error={action.error} />}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    gap: 12,
  },
  heroCard: {
    borderRadius: 22,
    padding: 16,
    gap: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroLead: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  heroEyebrow: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.78)",
  },
  heroTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  podsRow: {
    gap: 10,
  },
  pod: {
    minWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  podFlex: {
    flex: 1,
  },
  podCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  podText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  podLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.75)",
  },
  podValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: "#ffffff",
  },
  emptyCard: {
    paddingVertical: 18,
  },
  filterWrap: {
    gap: 10,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  insetGroup: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  fileRow: {
    minHeight: 60,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  fileCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  fileName: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  typePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typePillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  statePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statePillText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  fileMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  openCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
