import express from "express";
import type { ErrorRequestHandler } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DockerHub } from "./dockerHub.js";
import { ApiError } from "./errors.js";
import { pageNumber, queryText, repositorySegment } from "./validation.js";

export function createApp(hub = new DockerHub()) {
  const app = express();
  app.disable("x-powered-by");
  app.get("/api/popular", async (_req, res) => {
    res.json(await hub.popular());
  });
  app.get("/api/search", async (req, res) => {
    const query = queryText(req.query.q);
    if (!query) throw new ApiError(400, "Enter a repository keyword.");
    res.json(await hub.search(query, pageNumber(req.query.page)));
  });
  app.get("/api/repositories/:namespace/:name", async (req, res) => {
    res.json(
      await hub.repository(
        repositorySegment(req.params.namespace),
        repositorySegment(req.params.name),
      ),
    );
  });
  app.get("/api/repositories/:namespace/:name/tags", async (req, res) => {
    res.json(
      await hub.tags(
        repositorySegment(req.params.namespace),
        repositorySegment(req.params.name),
        pageNumber(req.query.page),
        queryText(req.query.q),
      ),
    );
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "API route not found." });
  });
  const clientPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../client",
  );
  app.use(express.static(clientPath));
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _req,
    res,
    next,
  ) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    if (error instanceof ApiError) {
      if (error.retryAfter) res.setHeader("Retry-After", error.retryAfter);
      res
        .status(error.status)
        .json({ message: error.message, retryAfter: error.retryAfter });
    } else {
      res.status(500).json({ message: "An unexpected server error occurred." });
    }
  };
  app.use(errorHandler);
  return app;
}
