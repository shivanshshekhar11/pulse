import { Landing } from '~/components/landing/landing';

/**
 * Root page — the public landing page.
 * Authenticated users can click "launch dashboard" to go to their org.
 * Auth.js session detection + redirect wired in Phase 4.
 */
export default function RootPage() {
  return <Landing />;
}
