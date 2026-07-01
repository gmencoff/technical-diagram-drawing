export class PipelineError extends Error {
  constructor(
    public stage: string,
    message: string,
    public details?: unknown
  ) {
    super(`[${stage}] ${message}`);
  }
}
