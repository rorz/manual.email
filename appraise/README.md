# appraise

Repo-grown quality checks, each a standalone [Bun](https://bun.sh) executable
written in low-level TypeScript (byte scans, no third-party runtime deps).

## Checks

| Check | Enforces |
| --- | --- |
| `max-file-lines` | Hard **350-line** ceiling (`wc -l` semantics) on authored source in `apps/**` and `appraise/**`. |

## Run

```bash
bun run appraise                 # from repo root — runs every appraisal
bun appraise/index.ts          # equivalent
bun appraise/index.ts max-file-lines   # a single appraisal
```

## Opt-out

`max-file-lines` honours a top-of-file directive (within the first 10 lines):

```ts
// appraise-ignore: max-file-lines -- <written justification>
```

Splitting the file is almost always the better answer — reach for the opt-out
only with a real reason written inline.
