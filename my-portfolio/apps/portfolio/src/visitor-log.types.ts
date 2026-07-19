export interface VisitorLogEntry {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface VisitorLogRealtimeConfig {
  key: string;
  cluster: string;
}

export interface VisitorLogSnapshot {
  enabled: boolean;
  turnstileSiteKey: string | null;
  realtime: VisitorLogRealtimeConfig | null;
  entries: VisitorLogEntry[];
}
