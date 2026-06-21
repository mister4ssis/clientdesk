import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from '@shared/ipc/ipc-channels';
import { createIpcSuccess, type IpcResult } from '@shared/ipc/ipc-result';

describe('IPC contracts', () => {
  it('defines unique channel names', () => {
    const channels = Object.values(IPC_CHANNELS).flatMap((group) => Object.values(group));
    const uniqueChannels = new Set(channels);

    expect(uniqueChannels.size).toBe(channels.length);
  });

  it('creates a success result with the standard shape', () => {
    const result = createIpcSuccess({ id: 'customer-1' });

    expect(result).toEqual({
      success: true,
      data: {
        id: 'customer-1'
      }
    });
  });

  it('supports an error result with the standard shape', () => {
    const result: IpcResult<never> = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Os dados informados são inválidos.',
        details: {
          fieldErrors: {
            legalName: ['Obrigatório']
          }
        }
      }
    };

    expect(result.success).toBe(false);
    expect(result.error.code).toBe('VALIDATION_ERROR');
    expect(result.error).not.toHaveProperty('stack');
  });
});
