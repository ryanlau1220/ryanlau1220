import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { createServerEntry } from "@tanstack/react-start/server-entry";
import { handleServerResponse } from "./server-response";

const startHandler = createStartHandler(defaultStreamHandler);

export default createServerEntry({
  async fetch(request, options) {
    return handleServerResponse(request, () => {
      if (import.meta.env.DEV && new URL(request.url).searchParams.has("__serverError")) {
        throw new Error("Server recovery preview");
      }
      return startHandler(request, options);
    });
  },
});
