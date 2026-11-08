import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public: fetch all published CMS settings (navigation, footer, theme).
// Returns only published_value (never draft). One request for all settings.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const settings = await base44.asServiceRole.entities.CmsSetting.list('-created_date', 100);
    const result = {};
    for (const s of settings) {
      if (s.published_value) {
        try { result[s.key] = JSON.parse(s.published_value); } catch {}
      }
    }
    return Response.json({ settings: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}