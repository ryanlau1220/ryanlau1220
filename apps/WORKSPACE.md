# Workspace

This workspace contains the applications under `apps/` and shared packages under `packages/` when they are needed.

From the repository root:

```sh
cd apps
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm --filter portfolio-app run test:e2e
```

Portfolio deployment configuration, D1 migrations, and local setup instructions live in `portfolio/`. GitHub Actions validates and deploys it when its application files, shared packages, workspace configuration, or pipeline change. README files and the portfolio setup and credential-source documents do not trigger the portfolio pipeline. Profile assets have a separate scheduled and manually triggered workflow.
