const STATUS_PRIORITY: Record<string, number> = {
  active: 10,
  welcome_pending: 20,
  profile_update_pending: 30,
  followup_pending: 40,
  group_closed: 100,
  contact_lost: 100
};

export function shouldUpdateConversationStatus(currentStatus?: string | null, nextStatus?: string | null) {
  if (!nextStatus) return false;
  if (!currentStatus) return true;

  const currentPriority = STATUS_PRIORITY[currentStatus] ?? 0;
  const nextPriority = STATUS_PRIORITY[nextStatus] ?? 0;

  return nextPriority >= currentPriority;
}
