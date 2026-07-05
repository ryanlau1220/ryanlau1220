import { generateOpenAPI } from "@orpc/openapi";
import { router } from "./orpc";

export async function getOpenAPISpec() {
  return await generateOpenAPI(
    {
      router,
      info: {
        title: "Ryan Lau Portfolio API",
        version: "1.0.0",
        description:
          "API for managing portfolio data including projects, skills, and timeline entries.",
      },
      servers: [{ url: "/api/admin", description: "Admin API" }],
    },
    { ignoreUndefinedPathProcedures: true },
  );
}
