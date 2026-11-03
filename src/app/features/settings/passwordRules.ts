export function passwordChangeError(
  current: string,
  next: string,
  confirmation: string,
) {
  if (!current) return "Enter your current password to continue.";
  if (next.length < 12 || next.length > 128)
    return "Your new password must be 12 to 128 characters.";
  if (next !== confirmation)
    return "New password and confirmation do not match.";
  return "";
}
