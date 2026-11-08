import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  sanitizeText, sanitizeLongText, extractBrowserInfo, isBugCategory, isBugSeverity
} from '../../shared/feedbackSanitizer.ts';

// Phase G.1 — Submit a bug report (authenticated users only).
// Collects safe technical context from headers — no fingerprinting, no tokens, no secrets.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch {}

    const title = sanitizeText(body.title || "", 200);
    const description = sanitizeLongText(body.description || "", 3000);
    const category = isBugCategory(body.category) ? body.category : 'other';
    const severity = isBugSeverity(body.severity) ? body.severity : 'medium';
    const appArea = sanitizeText(body.app_area || "", 100);
    const reproductionSteps = sanitizeLongText(body.reproduction_steps || "", 2000);
    const route = sanitizeText(body.route || "", 200);

    if (title.length < 3) {
      return Response.json({ error: 'title_too_short' }, { status: 400 });
    }
    if (description.length < 10) {
      return Response.json({ error: 'description_too_short' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') || '';
    const { browser, os, device_type } = extractBrowserInfo(userAgent);

    const report = await base44.asServiceRole.entities.CrosscueBugReport.create({
      reporter_user_id: user.id,
      reporter_email: user.email || '',
      title,
      description,
      category,
      severity,
      app_area: appArea,
      browser,
      os,
      device_type,
      route,
      reproduction_steps: reproductionSteps,
      status: 'new'
    });

    return Response.json({
      ok: true,
      report_id: report.id,
      status: 'new'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}