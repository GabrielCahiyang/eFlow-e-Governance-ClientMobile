# eFlow Task and Subtask rules

Use this table to check Web and Mobile against the shared workflow. The visibility and explicit-start backend changes take effect after their follow-up migrations are applied.

| Area | Rule for Web and Mobile |
| --- | --- |
| Task visibility | Use existing project, workspace and Task read permissions. Planning projects stay in authorized draft views. |
| Subtask visibility | Everyone who can view the parent Task can see its Subtasks immediately after creation, including nested and future-dated Subtasks. This applies while the parent is **To do**. |
| Action buttons | Use current server capabilities for each record. Viewers without a work appointment can read the Subtask. Show work actions only when the user’s appointment and the work state allow them. Keep management and review permissions separate. |
| Task in **To do** | For scheduled Office Tasks, the appointed **Task Lead** sees **Start work** on the planned start date in the workspace calendar. An Office Task returned for changes uses **Resume work**. Personal root Tasks currently have no planned-date fields and use their existing Lead-only Start work action. |
| Subtask waiting for parent | The Subtask stays visible. Its Lead, contributors, and the parent Task Lead see the waiting notice. After the parent starts, the appointed **Subtask Lead** must start the Subtask on its planned start date. Ancestor and dependency rules apply. |
| Missed start and overdue work | A missed planned start requires an authorized date change before the work can start. Once started, work can still receive authorized progress and completion after its due date. |
| Office Task creation dates | Start and due default to the project start and end. Both dates must fall within the project range, and due must be on or after start. The dated creation command validates both dates atomically. |
| Adding Subtasks | After a confirmed save, close the editor and refresh the list automatically for any authorized creator, including a Head. |
| Longer Subtask lists | Show four rows inline. At five or more, **See all** opens a scrollable list with every authorized row. |
| Subtask dates | Default the start to the parent Task start, or the later applicable ancestor start for nested work. Start and due must fit within the parent schedule, and due must be on or after the Subtask start. Apply these limits in the picker and in the database. |
| Progress and evidence | Progress is available after the Task or Subtask starts. A Task contributor submits to the Task Lead. A Subtask contributor submits to the nearest eligible Lead. Pending changes and evidence stay on the proposal until approval. |
| Completion labels | **Mark as complete** is the Lead's completion action where the Lead can complete or initiate final Task review. **Submit for review** is used for contributors and for a separate Subtask Lead whose completion goes to the parent Task Lead. |
| Task completion | Preserve independent final Task review, no self-review, and the applicable descendant completion checks. |
| My Work and Inbox | My Work lists actual assignments. The project Task view lists all readable Subtasks. Deferred assignment notices are released at Subtask start. |
| Funding | The appointed Project Lead allocates funding to Tasks. The appointed Task Lead distributes approved Task funds to Subtasks. Existing finance permissions and balance checks apply. |

Web integration should render all Subtasks returned by the authorized tree, including **To do** and future-dated rows, and use the server capability flags to decide which controls appear. Review any Web query or client filter that still uses start or activation as a condition for showing a Subtask.
