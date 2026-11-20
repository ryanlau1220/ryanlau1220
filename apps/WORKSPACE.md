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
