import { supabase } from '../../../../lib/supabase';
import { recordAudit } from '../../../services/auditService';
import type { ProjectMember } from './types';

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId);
  if (error) return [];
  return (data || []).map((r) => ({
    projectId: r.project_id as string,
    userId: r.user_id as string,
    role: (r.role as ProjectMember['role']) || 'member',
  }));
}

export async function addProjectMember(projectId: string, userId: string, role: ProjectMember['role'] = 'member'): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .upsert({ project_id: projectId, user_id: userId, role }, { onConflict: 'project_id,user_id' });
  if (error) throw error;
  await recordAudit({ entityType: 'project', entityId: projectId, action: 'project.member_added', afterData: { userId, role } });
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
  if (error) throw error;
  await recordAudit({ entityType: 'project', entityId: projectId, action: 'project.member_removed', beforeData: { userId } });
}

export async function updateProjectMemberRole(projectId: string, userId: string, role: ProjectMember['role']): Promise<void> {
  const { data: before, error: readError } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single();
  if (readError) throw readError;

  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId);
  if (error) throw error;

  await recordAudit({
    entityType: 'project',
    entityId: projectId,
    action: 'project.member_role_changed',
    beforeData: { userId, role: before?.role },
    afterData: { userId, role },
  });
}

// ─── Milestones ──────────────────────────────────────────────────
