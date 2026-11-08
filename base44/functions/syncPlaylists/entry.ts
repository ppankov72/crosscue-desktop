import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// CROSSCUE cloud playlist metadata sync.
// Push: upsert cloud playlist records for the authenticated user.
// Pull: return all cloud playlists for the authenticated user (including deleted, for deletion sync).
// Conflict model: if another device updated more recently, mark as conflict but still update.
// Tokens/secrets are never stored here — this function only manages playlist metadata.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, playlists } = body;

    if (action === 'push') {
      let pushed = 0;
      let conflicts = 0;

      for (const p of playlists) {
        const existing = await base44.entities.CloudPlaylist.filter({
          sync_id: p.sync_id,
        });

        if (existing.length > 0) {
          const existingRecord = existing[0];
          // Conflict detection: another device updated more recently
          const isConflict = existingRecord.updated_by_device !== p.updated_by_device &&
            existingRecord.updated_at > p.updated_at;

          await base44.entities.CloudPlaylist.update(existingRecord.id, {
            name: p.name,
            track_descriptors: p.track_descriptors,
            sort_order: p.sort_order || 0,
            updated_by_device: p.updated_by_device,
            updated_at: p.updated_at,
            sync_status: isConflict ? 'conflict' : 'synced',
            deleted: p.deleted || false,
          });

          if (isConflict) conflicts++;
        } else {
          await base44.entities.CloudPlaylist.create({
            user_id: user.id,
            sync_id: p.sync_id,
            name: p.name,
            track_descriptors: p.track_descriptors,
            sort_order: p.sort_order || 0,
            updated_by_device: p.updated_by_device,
            updated_at: p.updated_at,
            sync_status: 'synced',
            deleted: p.deleted || false,
          });
        }
        pushed++;
      }

      return Response.json({ status: 'synced', pushed, conflicts });
    }

    if (action === 'pull') {
      const cloudPlaylists = await base44.entities.CloudPlaylist.list();

      return Response.json({
        status: 'synced',
        playlists: cloudPlaylists.map(p => ({
          sync_id: p.sync_id,
          name: p.name,
          track_descriptors: p.track_descriptors,
          sort_order: p.sort_order,
          updated_at: p.updated_at,
          updated_by_device: p.updated_by_device,
          sync_status: p.sync_status,
          deleted: p.deleted,
        })),
      });
    }

    return Response.json({ error: 'Invalid action. Use "push" or "pull".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}