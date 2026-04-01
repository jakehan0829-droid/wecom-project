import { getDashboardOverviewService } from '../service/dashboard.service.js';

export async function getWecomDashboardMetrics() {
  return getDashboardOverviewService();
}
