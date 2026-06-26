import { describe, expect, it, vi } from 'vitest';
import { RealtimeChannelManager } from '@main/modules/sync/realtime/realtime-channel-manager';
import { buildCustomerRealtimeTopic } from '@main/modules/sync/realtime/realtime-status';
import type {
  RealtimeChannelLike,
  RealtimeClientLike
} from '@main/modules/sync/realtime/realtime-channel-manager';

const userA = '11111111-1111-4111-8111-111111111111';
const userB = '22222222-2222-4222-8222-222222222222';

describe('realtime auth lifecycle integration', () => {
  it('creates, refreshes, removes and recreates the private channel for user changes', async () => {
    const client = new MockRealtimeClient();
    const syncStatusService = { setRealtimeStatus: vi.fn() };
    const manager = new RealtimeChannelManager(client, {
      enabled: true,
      reconnectMaxSeconds: 60,
      syncStatusService,
      onDatabaseChange: vi.fn()
    });

    await manager.start(userA, 'token-a');
    await manager.updateAuth('token-a-refreshed');
    await manager.start(userB, 'token-b');

    expect(client.channelTopics).toEqual([
      buildCustomerRealtimeTopic(userA),
      buildCustomerRealtimeTopic(userB)
    ]);
    expect(client.authTokens).toEqual(['token-a', 'token-a-refreshed', 'token-b']);
    expect(client.removedCount).toBe(1);

    await manager.shutdown();

    expect(client.removedCount).toBe(2);
  });
});

class MockRealtimeClient implements RealtimeClientLike {
  channelTopics: string[] = [];
  authTokens: Array<string | null | undefined> = [];
  removedCount = 0;
  realtime = {
    setAuth: vi.fn(async (token?: string | null) => {
      this.authTokens.push(token);
    })
  };

  channel(topic: string): RealtimeChannelLike {
    this.channelTopics.push(topic);

    return new MockRealtimeChannel();
  }

  async removeChannel(): Promise<unknown> {
    this.removedCount += 1;

    return null;
  }
}

class MockRealtimeChannel implements RealtimeChannelLike {
  on(): RealtimeChannelLike {
    return this;
  }

  subscribe(): RealtimeChannelLike {
    return this;
  }
}
