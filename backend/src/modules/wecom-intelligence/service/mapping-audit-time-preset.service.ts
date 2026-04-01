export function applyMappingAuditTimePreset(query: Record<string, unknown>, values: unknown[], conditions: string[]) {
  if (typeof query.timePreset !== 'string' || !query.timePreset.trim()) return;

  const preset = query.timePreset.trim();
  const now = new Date();
  let startTime: Date | null = null;
  let endTime: Date | null = null;

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  if (preset === '24h') {
    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (preset === '7d') {
    startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (preset === 'today') {
    startTime = startOfToday;
  } else if (preset === 'yesterday') {
    endTime = new Date(startOfToday.getTime() - 1);
    startTime = new Date(startOfToday);
    startTime.setDate(startTime.getDate() - 1);
  } else if (preset === 'this_week') {
    startTime = new Date(startOfToday);
    const day = startTime.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startTime.setDate(startTime.getDate() - diff);
  }

  if (startTime) {
    values.push(startTime.toISOString());
    conditions.push(`created_at >= $${values.length}`);
  }

  if (endTime) {
    values.push(endTime.toISOString());
    conditions.push(`created_at <= $${values.length}`);
  }
}
