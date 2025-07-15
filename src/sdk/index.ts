/**
 * loomcal - Main SDK Entry Point
 *
 * Export everything developers need for LoomCal integration
 */

// Core SDK with new unified API structure
export {
  LoomCal,
  createLoomCalClient,
  createDebugLoomCalClient,
  VERSION,
  SDK_NAME,
} from "./loomcal";

// All types (using new chainable types system)
export * from "./types";

// React Components (optional, only when React is available)
export { LoomCalProvider, useLoomCal } from "./components";
