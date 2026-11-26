# Security Specification — Leonida Run Public Leaderboard

## 1. Data Invariants
1. `leaderboard_entries/{entryId}` is a public non-PII arcade scoreboard: anyone may view scores and submit a new run with either `uid: 'public'` or their verified `request.auth.uid`.
2. Zero PII (`email`, `phone`, `address`) may be stored in `leaderboard_entries`; only sanitized public `driverName` (2–20 chars matching `^[a-zA-Z0-9 _\-]+$`) is allowed.
3. All `create` payloads must include the exact 14 required fields and zero shadow/extra fields (`hasAll` + `hasOnly`).
4. Numeric metrics (`haul`, `distanceMeters`, `copsWrecked`, `nearMisses`, `maxCombo`, `peakStars`, `seed`) are strictly bounded integers (`0 <= haul <= 10000000`, `1 <= maxCombo <= 15`, `1 <= peakStars <= 5`).
5. `createdAt` must equal `request.time` (server timestamp).
6. Leaderboard entries are immutable once created (`allow update: if false;`), and `'public'` entries cannot be deleted via client SDK.

## 2. Adversarial Payloads Blocked
1. Identity spoofing (`uid` set to another user's UID without matching verified auth) -> `PERMISSION_DENIED`
2. Shadow field injection (`{ ..., isAdmin: true }`) -> `PERMISSION_DENIED`
3. Fake `createdAt` timestamp (`createdAt != request.time`) -> `PERMISSION_DENIED`
4. Negative or absurd `haul` (`haul: -500` or `haul: 999999999`) -> `PERMISSION_DENIED`
5. Oversized `driverName` (`"A".repeat(500)`) or XSS payload (`"<script>alert(1)</script>"`) -> `PERMISSION_DENIED`
6. Invalid `carId` (`carId: "tank"`) or invalid `mode` (`mode: "CHEAT"`) -> `PERMISSION_DENIED`
7. Invalid `entryId` path poisoning (`entryId` > 128 chars or containing spaces/symbols) -> `PERMISSION_DENIED`
8. Attempted `update` on existing score to inflate `haul` -> `PERMISSION_DENIED`
9. Deleting `'public'` or another user's leaderboard entry -> `PERMISSION_DENIED`
10. Missing required fields (`titleEarned` omitted) -> `PERMISSION_DENIED`
