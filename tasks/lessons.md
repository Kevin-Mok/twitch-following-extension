# Extension integration lessons

Use the fixture suite and live Chrome checks together when changing Twitch integration. These lessons record failures caught during the first implementation.

- Twitch’s native sort popup can set aria-hidden on the root containing its own trigger. Keep the observed stable trigger addressable for close/focus while respecting actual hidden controls. A generic aria-hidden filter broke both label updates and menu closure.
- Observe characterData as well as childList: React may update a trigger’s existing text node.
- An unauthenticated snapshot must not broadcast accountChanged merely to clear already absent credentials. That event invalidates the pending content request and hides its intended reconnect error.
- Language filtering does not necessarily change the URL. Read and validate the observed languageDirectoryFilters JSON preference, including malformed or missing state; do not infer an empty filter solely from the URL.
- React may remove the extension panel without replacing the native grid. Reattach from the current snapshot before leaving that grid hidden; track full URL changes so query-only history updates cannot leave stale filters or Following active over a changed native sort.
- Reserve account-change ownership before asynchronous reads and serialize complete credential storage transitions. A generation check only after fetching is too late; delayed reads, token writes, or pending-state removal can otherwise undo Disconnect or corrupt a newer connection. Keep OAuth/network waits outside that short queue, and validate persisted shapes before forming requests.
