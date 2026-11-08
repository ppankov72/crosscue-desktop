import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { healthCheck, getConfigStatus } from '../../shared/myFeedConnector.ts';

// Phase E — Admin: MYFEED integration status for Control Room.
// Shows API health, linked users count, recent errors.
// Never exposes API secret or private profile content.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Configuration status (no secret values)
    const configStatus = getConfigStatus();

    // Linked users count
    const linkedLinks = await base44.asServiceRole.entities.MyFeedLink.filter({ status: 'linked' }, '-created_date', 500);
    const pendingLinks = await base44.asServiceRole.entities.MyFeedLink.filter({ status: 'pending' }, '-created_date', 500);
    const errorLinks = await base44.asServiceRole.entities.MyFeedLink.filter({ status: 'error' }, '-created_date', 100);

    // Health check (best effort — don't block on timeout)
    let apiHealth = 'unknown';
    try {
      const health = await healthCheck();
      apiHealth = health.ok ? 'connected' : 'degraded';
    } catch {
      apiHealth = 'unavailable';
    }

    // Recent errors (last 5)
    const recentErrors = errorLinks.slice(0, 5).map(l => ({
      user_email: l.user_email || '',
      error: l.last_error || '',
      timestamp: l.last_sync_at || l.created_date || ''
    }));

    return Response.json({
      configStatus,
      apiHealth,
      linkedCount: linkedLinks.length,
      pendingCount: pendingLinks.length,
      errorCount: errorLinks.length,
      recentErrors,
      lastSuccessfulRequest: linkedLinks[0]?.last_sync_at || ''
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}