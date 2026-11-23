# Workspace

This workspace contains the applications under `apps/` and shared packages under `packages/` when they are needed.

From the repository root:

```sh
cd apps
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
```

Each app keeps its deployment configuration, D1 migrations, and setup instructions in its own folder (`portfolio/`, `diary/`). One GitHub Actions pipeline (`.github/workflows/pipeline.yml`) validates the whole workspace, then deploys only the apps whose files changed: `deploy-portfolio` for `portfolio/`, `deploy-diary` for `diary/`, and both when shared packages, workspace configuration, or the pipeline change. A manual run deploys both. README files and the setup and credential-source documents do not trigger the pipeline. Profile assets have a separate scheduled and manually triggered workflow.

## Dependency release-age window

`pnpm-workspace.yaml` sets `minimumReleaseAge: 10080`, so pnpm will not resolve a package version published in the last 7 days. This mirrors the 7-day cooldown in `.github/dependabot.yml`; Dependabot enforces its cooldown strictly, so a lockfile containing anything younger makes its npm updates fail. If `pnpm add` or `pnpm update` reports that no mature version matches, wait for the release to age, or add the package to `minimumReleaseAgeExclude` when you need it immediately (for example a security fix).
