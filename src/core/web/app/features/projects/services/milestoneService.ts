import { supabase } from '../../../../lib/supabase';
import { recordAudit } from '../../../services/auditService';
import { rowToMilestone } from './projectMappers';
import type { Milestone, MilestoneStatus } from './types';

export async function fetchMilestones(projectId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return (data || []).map(rowToMilestone);
}

export function subscribeToMilestones(projectId: string, callback: (m: Milestone[]) => void): () => void {
  const load = () => fetchMilestones(projectId).then(callback);
  load();
  const channelId = `milestones-${projectId}-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones', filter: `project_id=eq.${projectId}` }, () => load())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function createMilestone(projectId: string, title: string, dueDate?: string | null): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Milestone title is required.');
  const existing = await fetchMilestones(projectId);
  const { error } = await supabase.from('milestones').insert({
    project_id: projectId,
    title: trimmed,
    due_date: dueDate || null,
    sort_order: existing.length,
  });
  if (error) throw error;
  await recordAudit({ entityType: 'milestone', entityId: projectId, action: 'milestone.created', afterData: { title: trimmed } });
}

export async function setMilestoneManualStatus(
  id: string,
  manualStatus: MilestoneStatus | null,
  note?: string,
): Promise<void> {
  const { error } = await supabase
    .from('milestones')
    .update({
      manual_status: manualStatus === 'auto' ? null : manualStatus,
      status: manualStatus && manualStatus !== 'auto' ? manualStatus : 'auto',
      manual_note: note || null,
    })
    .eq('id', id);
  if (error) throw error;
  await recordAudit({ entityType: 'milestone', entityId: id, action: 'milestone.status_override', afterData: { manualStatus, note } });
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) throw error;
  await recordAudit({ entityType: 'milestone', entityId: id, action: 'milestone.deleted' });
}

export async function updateMilestone(
  id: string,
  changes: { title?: string; description?: string; dueDate?: string | null; sortOrder?: number },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.title !== undefined) {
    const title = changes.title.trim();
    if (!title) throw new Error('Milestone title is required.');
    row.title = title;
  }
  if (changes.description !== undefined) row.description = changes.description.trim();
  if (changes.dueDate !== undefined) row.due_date = changes.dueDate || null;
  if (changes.sortOrder !== undefined) row.sort_order = changes.sortOrder;
  const { error } = await supabase.from('milestones').update(row).eq('id', id);
  if (error) throw error;
  await recordAudit({ entityType: 'milestone', entityId: id, action: 'milestone.updated', afterData: changes });
}

export async function reorderMilestones(projectId: string, orderedIds: string[]): Promise<void> {
  const existing = await fetchMilestones(projectId);
  if (existing.length !== orderedIds.length || orderedIds.some((id) => !existing.some((milestone) => milestone.id === id))) {
    throw new Error('Every project milestone must be included once.');
  }
  const results = await Promise.all(orderedIds.map((id, sortOrder) => supabase.from('milestones').update({ sort_order: sortOrder }).eq('id', id).eq('project_id', projectId)));
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
  await recordAudit({ entityType: 'project', entityId: projectId, action: 'project.milestones_reordered', afterData: { orderedIds } });
}

// ─── Derived milestone status from its tasks ─────────────────────
// A milestone's effective status is calculated from its tasks unless a manual
// override is set. Callers pass the tasks already scoped to the milestone.
export function deriveMilestoneStatus(
  milestone: Milestone,
  tasks: { status: string; deadline?: string; dueDate?: string }[],
): { status: MilestoneStatus; source: 'manual' | 'auto' } {
  if (milestone.manualStatus) return { status: milestone.manualStatus, source: 'manual' };
  if (tasks.length === 0) return { status: 'not_started', source: 'auto' };

  const done = tasks.filter((t) => t.status === 'completed').length;
  if (done === tasks.length) return { status: 'completed', source: 'auto' };

  const now = Date.now();
  const overdue = tasks.some((t) => {
    const dl = t.deadline || t.dueDate;
    return dl && t.status !== 'completed' && new Date(dl).getTime() < now;
  });
  if (overdue) return { status: 'at_risk', source: 'auto' };

  const started = tasks.some((t) => t.status !== 'pending_assignment' && t.status !== 'todo');
  return { status: started ? 'in_progress' : 'not_started', source: 'auto' };
}
