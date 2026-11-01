export type DesktopCapabilities = {
  platform: string;
  applications: { id: string; name: string }[];
  roots: { id: string; name: string }[];
  running: string[];
  audit: { id: string; date: string; tool: string; status: string }[];
};
declare global {
  interface Window {
    prometheusDesktop?: {
      capabilities: () => Promise<DesktopCapabilities>;
      execute: (
        action: string,
        input: object,
      ) => Promise<{
        cancelled?: boolean;
        message?: string;
        results?: { name: string; path: string; kind: string }[];
        truncated?: boolean;
      }>;
    };
  }
}
