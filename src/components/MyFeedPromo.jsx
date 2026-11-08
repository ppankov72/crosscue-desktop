import { Link } from 'react-router-dom';
import { Rss, ExternalLink, CheckCircle, ArrowRight } from 'lucide-react';

// Reusable MYFEED promotional / discovery component.
//
// Shows "Create FREE MYFEED Account" CTA when not linked.
// Shows "MYFEED connected" when linked, with a link to Portal → MYFEED.
//
// Props:
//   linked     — boolean (default false)
//   variant    — 'full' | 'compact' (default 'full')
//   destination — MYFEED registration URL (default: https://myfeed.docflowtools.de)
//                 The exact registration route is NOT known — this links to the
//                 MYFEED homepage where users can find signup.
//
// MYFEED registration is OPTIONAL. This component never auto-creates or auto-links
// accounts. It only informs and links to the MYFEED public site.
const MYFEED_HOMEPAGE = 'https://myfeed.docflowtools.de';

export default function MyFeedPromo({ linked = false, variant = 'full', destination = MYFEED_HOMEPAGE }) {
  if (linked) {
    if (variant === 'compact') {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
          <CheckCircle size={16} className="text-green-600" />
          <span className="font-medium text-green-800">MYFEED connected</span>
          <Link to="/portal" className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800">
            Manage <ArrowRight size={12} />
          </Link>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <CheckCircle size={20} className="text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-green-900">MYFEED connected</h3>
            <p className="mt-1 text-sm text-green-700">
              Your CROSSCUE account is linked to MYFEED. Manage your connection and activity sharing in the Portal.
            </p>
            <Link to="/portal" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700">
              Manage MYFEED <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <a
        href={destination}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm hover:bg-amber-100"
      >
        <Rss size={16} className="text-amber-600" />
        <span className="font-medium text-amber-800">Create FREE MYFEED Account</span>
        <ExternalLink size={12} className="ml-auto text-amber-600" />
      </a>
    );
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Rss size={20} className="text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-amber-900">Join the MYFEED community</h3>
          <p className="mt-1 text-sm text-amber-700">
            Create a free MYFEED account to share your DJ activity, mixes and profile with the MYFEED community.
            Optional — MYFEED is not required for CROSSCUE.
          </p>
          <a
            href={destination}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
          >
            Create FREE MYFEED Account <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}