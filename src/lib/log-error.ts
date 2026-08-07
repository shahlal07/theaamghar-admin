// Structures error-boundary catches as a single JSON line via console.error
// -- Vercel's Runtime Logs already capture stdout/stderr, so this doesn't
// need a new logging dependency, it just makes those logs (and the
// get_runtime_errors/get_runtime_logs MCP tools that read them) actually
// greppable instead of a bare error object dump.
export function logError(error: Error & { digest?: string }, context?: { url?: string }) {
  console.error(
    JSON.stringify({
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      url: context?.url ?? (typeof window !== 'undefined' ? window.location.href : undefined),
      timestamp: new Date().toISOString(),
    })
  );
}
