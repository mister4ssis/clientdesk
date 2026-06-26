import type { RealtimeConnectionStatus } from '@shared/sync/sync.types';

export type { RealtimeConnectionStatus };

export type RealtimeSubscribeStatus =
  | 'SUBSCRIBED'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'CLOSED';

export const customerRealtimeTopicPrefix = 'user:';
export const customerRealtimeTopicSuffix = ':customers';

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildCustomerRealtimeTopic(userId: string): string {
  if (!uuidPattern.test(userId)) {
    throw new Error('Invalid realtime user id.');
  }

  return `${customerRealtimeTopicPrefix}${userId}${customerRealtimeTopicSuffix}`;
}

export function redactRealtimeTopic(topic: string): string {
  if (!topic.startsWith(customerRealtimeTopicPrefix) || !topic.endsWith(customerRealtimeTopicSuffix)) {
    return 'unknown-topic';
  }

  return 'user:<redacted>:customers';
}
