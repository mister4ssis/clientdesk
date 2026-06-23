import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncConflictsPage } from '@renderer/pages/settings/SyncConflictsPage';

const syncClientMock = vi.hoisted(() => ({
  listSyncConflicts: vi.fn(),
  getSyncConflict: vi.fn(),
  resolveSyncConflictKeepLocal: vi.fn(),
  resolveSyncConflictUseRemote: vi.fn()
}));

vi.mock('@renderer/services/sync-client', async () => {
  const actual = await vi.importActual<typeof import('@renderer/services/sync-client')>(
    '@renderer/services/sync-client'
  );

  return {
    ...actual,
    listSyncConflicts: syncClientMock.listSyncConflicts,
    getSyncConflict: syncClientMock.getSyncConflict,
    resolveSyncConflictKeepLocal: syncClientMock.resolveSyncConflictKeepLocal,
    resolveSyncConflictUseRemote: syncClientMock.resolveSyncConflictUseRemote
  };
});

beforeEach(() => {
  syncClientMock.listSyncConflicts.mockReset();
  syncClientMock.getSyncConflict.mockReset();
  syncClientMock.resolveSyncConflictKeepLocal.mockReset();
  syncClientMock.resolveSyncConflictUseRemote.mockReset();
});

describe('SyncConflictsPage', () => {
  it('lists pending conflicts and compares local and remote values', async () => {
    syncClientMock.listSyncConflicts.mockResolvedValue([syncConflictSummary]);
    syncClientMock.getSyncConflict.mockResolvedValue(syncConflictDetails);

    render(<SyncConflictsPage onBack={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Cliente Local' })).toBeInTheDocument();
    expect(screen.getByText('Cliente Remoto')).toBeInTheDocument();
    expect(screen.queryByText('remote_version')).not.toBeInTheDocument();
    expect(syncClientMock.getSyncConflict).toHaveBeenCalledWith(syncConflictSummary.id);
  });

  it('resolves a conflict using the remote version after confirmation', async () => {
    syncClientMock.listSyncConflicts.mockResolvedValueOnce([syncConflictSummary]).mockResolvedValue([]);
    syncClientMock.getSyncConflict.mockResolvedValue(syncConflictDetails);
    syncClientMock.resolveSyncConflictUseRemote.mockResolvedValue({
      ...syncConflictDetails,
      status: 'RESOLVED_REMOTE'
    });

    render(<SyncConflictsPage onBack={vi.fn()} />);

    await screen.findByRole('heading', { name: 'Cliente Local' });
    fireEvent.click(screen.getByRole('button', { name: 'Utilizar dados do servidor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Resolver conflito' }));

    await waitFor(() =>
      expect(syncClientMock.resolveSyncConflictUseRemote).toHaveBeenCalledWith(syncConflictSummary.id)
    );
    expect(await screen.findByText('Nenhum conflito pendente')).toBeInTheDocument();
  });
});

const syncConflictSummary = {
  id: '11111111-1111-4111-8111-111111111111',
  entityId: '22222222-2222-4222-8222-222222222222',
  customerName: 'Cliente Local',
  localUpdatedAt: '2026-06-23T10:00:00.000Z',
  remoteUpdatedAt: '2026-06-23T10:01:00.000Z',
  remoteVersion: 2,
  status: 'PENDING' as const,
  createdAt: '2026-06-23T10:02:00.000Z'
};

const syncConflictDetails = {
  ...syncConflictSummary,
  localData: {
    id: syncConflictSummary.entityId,
    personType: 'FISICA' as const,
    legalName: 'Cliente Local',
    tradeName: null,
    representative: 'Representante Local',
    taxId: null,
    email: null,
    phone: null,
    birthDate: null,
    postalCode: null,
    street: null,
    addressNumber: null,
    addressComplement: null,
    neighborhood: null,
    city: null,
    state: null,
    notes: null,
    active: true,
    createdAt: '2026-06-23T09:00:00.000Z',
    updatedAt: '2026-06-23T10:00:00.000Z',
    deletedAt: null,
    remoteVersion: 1,
    remoteUpdatedAt: '2026-06-23T09:00:00.000Z'
  },
  remoteData: {
    id: syncConflictSummary.entityId,
    personType: 'FISICA' as const,
    legalName: 'Cliente Remoto',
    tradeName: null,
    representative: 'Representante Remoto',
    taxId: null,
    email: null,
    phone: null,
    birthDate: null,
    postalCode: null,
    street: null,
    addressNumber: null,
    addressComplement: null,
    neighborhood: null,
    city: null,
    state: null,
    notes: null,
    active: true,
    createdAt: '2026-06-23T09:00:00.000Z',
    updatedAt: '2026-06-23T10:01:00.000Z',
    deletedAt: null,
    remoteVersion: 2,
    remoteUpdatedAt: '2026-06-23T10:01:00.000Z'
  }
};
