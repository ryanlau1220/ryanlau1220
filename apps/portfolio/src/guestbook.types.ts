export interface GuestbookEntry {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface GuestbookRealtimeConfig {
  key: string;
  cluster: string;
}

export interface GuestbookSnapshot {
  enabled: boolean;
  turnstileSiteKey: string | null;
  realtime: GuestbookRealtimeConfig | null;
  entries: GuestbookEntry[];
}
