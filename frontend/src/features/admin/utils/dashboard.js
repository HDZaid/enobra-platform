import { apiRequest } from '../../../services/apiClient.js';
import { canAccessAdminSection, readAdminCollection } from './adminData.js';

const endpoints = { news: 'news/', messages: 'inquiries/', projects: 'projects/', properties: 'properties/' };
export const dashboardSections = { news: 'news', messages: 'inbox', projects: 'projects', properties: 'properties' };

export async function loadDashboardCounts(user, token) {
  const entries = Object.entries(endpoints).filter(([key]) => canAccessAdminSection(user, dashboardSections[key]));
  const results = await Promise.allSettled(entries.map(async ([, endpoint]) =>
    readAdminCollection(await apiRequest(`${endpoint}?page=1&page_size=1`, { token })).count));
  const counts = {};
  let unavailable = false;
  entries.forEach(([key], index) => {
    counts[key] = results[index].status === 'fulfilled' ? results[index].value : null;
    if (counts[key] === null) unavailable = true;
  });
  return { counts, unavailable };
}
