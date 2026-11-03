type ReviewDecisionError = {
  code?: string | null;
  message: string;
};

/** Turns a missing live review RPC into a useful, actionable UI error. */
export const getReviewDecisionErrorMessage = (error: ReviewDecisionError): string => {
  if (
    error.code === "PGRST202" ||
    /could not find (the )?function.*decide_task_review/i.test(error.message)
  ) {
    return "The review-decision service is not installed in Supabase yet. Apply the latest eFlow database migration, then try again.";
  }

  return error.message;
};
