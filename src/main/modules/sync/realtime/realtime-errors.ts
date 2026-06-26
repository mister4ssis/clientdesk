export const RealtimeErrorCode = {
  ChannelError: 'REALTIME_CHANNEL_ERROR',
  TimedOut: 'REALTIME_TIMED_OUT',
  AuthError: 'REALTIME_AUTH_ERROR',
  Closed: 'REALTIME_CLOSED'
} as const;

export type RealtimeErrorCodeValue =
  (typeof RealtimeErrorCode)[keyof typeof RealtimeErrorCode];
