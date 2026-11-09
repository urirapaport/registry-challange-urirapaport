import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 3001);
createApp().listen(port, "127.0.0.1", (error?: Error) => {
  if (error) {
    console.error(`Could not start Registry on port ${port}: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Registry is running at http://127.0.0.1:${port}`);
});
