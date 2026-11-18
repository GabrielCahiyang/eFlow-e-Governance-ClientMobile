// Reviewed native adaptation, applied by adapt-native-subtask-work-update.mjs.
// Imports and uploadFile resolve in the generated subtaskWorkflowService module.
export class SubtaskWorkUpdateRejectedError extends MutationRejectedError {}

/** Only this direct transactional RPC's returned rejection codes prove rollback. */
export async function saveSubtaskWorkUpdate(input: {
    subtaskId: string;
    state: 'in_progress' | 'stuck';
    blocker?: string;
    note?: string;
    nextStep?: string;
    attachment?: File | null;
}): Promise<void> {
    const issue = attachmentError(input.attachment ? [input.attachment] : [], { maxCount: 1 });
    if (issue)
        throw new SubtaskWorkUpdateRejectedError(issue, '22023');
    if ((input.note?.length || 0) > 3000 || (input.blocker?.length || 0) > 3000 || (input.nextStep?.length || 0) > 300)
        throw new SubtaskWorkUpdateRejectedError('Work update exceeds its text limit.', '22023');
    if (input.state === 'stuck' && !input.blocker?.trim())
        throw new SubtaskWorkUpdateRejectedError('Tell your lead what is blocking you.', '22023');

    let uploaded: SubtaskSubmissionAttachment | undefined;
    // Even an interrupted upload cannot have sent the work-update RPC yet.
    try {
        if (input.attachment)
            uploaded = await uploadFile(input.subtaskId, 'progress', input.attachment);
    } catch (error) {
        const failure = error as { message?: string; code?: string } | null;
        throw new SubtaskWorkUpdateRejectedError(
            failure?.message || 'Evidence upload failed.', failure?.code || 'UPLOAD_FAILED',
        );
    }

    // Thrown exceptions bypass cleanup: the RPC may already have committed.
    const { error } = await supabase.rpc('save_subtask_work_update', {
        p_subtask_id: input.subtaskId,
        p_state: input.state,
        p_blocker: input.blocker?.trim() || null,
        p_note: input.note?.trim() || null,
        p_next_step: input.nextStep?.trim() || null,
        p_attachment_path: uploaded?.filePath || null,
        p_attachment_name: uploaded?.fileName || null,
    });
    if (!error) return;
    const code = error.code || '';
    if (/^(?:22|23)[A-Z0-9]{3}$/.test(code) ||
        ['42501', '40001', 'P0001', '40P01', '55P03', 'PGRST202'].includes(code)) {
        const rejected = new SubtaskWorkUpdateRejectedError(error.message, code);
        if (uploaded) {
            try {
                await supabase.storage.from('task-attachments').remove([uploaded.filePath]);
            } catch {
                // Cleanup is best effort; never replace the original rejection.
            }
        }
        throw rejected;
    }
    // Preserve structured diagnostics without claiming an unknown result rolled back.
    throw Object.assign(new Error(error.message), error);
}
