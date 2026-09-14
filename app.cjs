// Entry point for cPanel "Setup Node.js App" (Phusion Passenger) and `pnpm start`.
// Runs the bundled server; build it first with `pnpm build`.
require('./packages/server/dist/server.cjs');
