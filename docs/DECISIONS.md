# Architecture Decision Records

This log captures non-trivial engineering decisions made while building the
Fintech Payment Processing API — what problem each one solves, what was
traded away, and what breaks if it's changed.

---

## ADR-012: Railway build cache served a stale script despite correct committed source

**Status:** Resolved

**Context:**

A bug was found where `packages/shared`'s build step compiled TypeScript
via `tsc` but never copied the SQL migration files (`.sql`) into `dist/`.
Locally this never surfaced because `ts-node` ran directly against `src/`,
where the SQL files sit next to the source. In production, the compiled
`migrate.js` in `dist/` expected `dist/db/migrations` to exist — it didn't.

The fix was straightforward: change the `build` script in
`packages/shared/package.json` from `tsc` to `tsc && cp -r src/db/migrations
dist/db/migrations`.

The fix was committed and pushed to `main`. Over three separate Railway
deploys spanning two days, the build logs continued to echo the **old**
script (`> tsc`), and the runtime kept failing with:

```
Error: ENOENT: no such file or directory, scandir '.../dist/db/migrations'
```

This happened despite:
- `git show <commit>:packages/shared/package.json` confirming the fix was
  correctly committed on `main`
- `git rev-parse --short=8 HEAD` matching the pushed commit
- Railway reporting a "fetched snapshot" on every build attempt

**Decision:**

Rather than continuing to re-edit the file (which was already correct),
the build command itself was temporarily changed to:

```
cat packages/shared/package.json && npm run build:api
```

This is a diagnostic, not a fix — printing the file content Railway
actually had, immediately before running the build. The `cat` output
confirmed the file was correct all along. More importantly, changing the
literal text of the `RUN` instruction gave Docker/BuildKit a new cache key,
forcing it to actually re-execute the build step instead of reusing a
cached layer. On that build, the correct script (`tsc && cp -r ...`)
finally appeared in the log, and the deployment succeeded.

**Consequences:**

- No code change was the actual fix. The source was correct through all
  three failed attempts — the problem was Railway's build layer caching
  reusing a stale execution of the `RUN npm run build:api` step, not
  re-reading changed source underneath it.
- The precise root cause (why the `COPY . /app/.` layer wasn't invalidated
  by a genuine file content change) isn't confirmed. Suspected interaction
  between Nixpacks-generated Dockerfiles and BuildKit's `--mount=type=cache`
  layers, but this isn't diagnosable from application-level logs alone.
- **Working diagnostic pattern for future incidents:** if a build log's
  echoed script doesn't match the file's actual committed content, don't
  assume the commit is wrong — verify with `git show <sha>:<path>` first.
  If the commit is confirmed correct but the build still runs stale, mutate
  the build command's literal text (even a harmless prefix like `cat` or
  `echo`) to force a cache-key change, and check whether the correct script
  appears on the next build. This isolates "stale cache" from "wrong
  commit deployed" definitively, rather than guessing.
- If this recurs on a future deploy, escalate to Railway support with this
  ADR and the associated build logs as evidence, rather than re-debugging
  from scratch.
