// Friendly labels for activity_log.action values.
export function actionLabel(action: string): string {
  const map: Record<string, string> = {
    login: "Signed in",
    submit_attendance: "Submitted attendance",
    raise_flag: "Raised a flag",
    create_class: "Created a class",
    create_teacher: "Added a teacher",
  };
  return map[action] ?? action.replace(/_/g, " ");
}
