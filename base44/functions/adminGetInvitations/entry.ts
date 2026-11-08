import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasPermission } from '../../shared/rbac.ts';

// Admin: List invitations and guest testers.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!hasPermission(user, 'users.view')) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const invitations = await base44.asServiceRole.entities.Invitation.list('-created_date', 200);
    const guestTesters = await base44.asServiceRole.entities.GuestTester.list('-created_date', 200);

    return Response.json({
      invitations: invitations.map((i: any) => ({
        id: i.id,
        email: i.email,
        invitation_type: i.invitation_type,
        role_to_assign: i.role_to_assign,
        entitlement_to_grant: i.entitlement_to_grant,
        created_by_email: i.created_by_email || '',
        created_at: i.created_at,
        expires_at: i.expires_at,
        accepted_at: i.accepted_at,
        accepted_by: i.accepted_by || '',
        status: i.status,
        campaign: i.campaign || '',
        notes: i.notes || ''
      })),
      guestTesters: guestTesters.map((t: any) => ({
        id: t.id,
        user_id: t.user_id,
        email: t.email,
        tester_name: t.tester_name || '',
        professional_role: t.professional_role || '',
        invitation_source: t.invitation_source || '',
        campaign: t.campaign || '',
        test_started_at: t.test_started_at,
        test_completed_at: t.test_completed_at,
        test_notes: t.test_notes || '',
        bugs_reported_count: t.bugs_reported_count || 0,
        feature_requests_count: t.feature_requests_count || 0,
        final_assessment: t.final_assessment || 'not_started'
      }))
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}