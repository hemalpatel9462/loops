import { describe, expect, it } from 'vitest';
import { createEdgeId } from '@loops/puzzle-format';
import {
  DEFAULT_SETTINGS,
  MemoryStorage,
  createDefaultStatistics,
  createPersistenceRepository,
  storageKeys,
} from './index';
import { restoreGameStateFromProgress } from '../state/persistence';
import type { PlayerProgress } from '@loops/puzzle-format';

const unfinishedProgress: PlayerProgress = {
  schemaVersion: '1.0',
  puzzleId: 'loop-persistence-1',
  mode: 'assisted',
  edgeStates: {
    [createEdgeId('h', 0, 0)]: 'line',
    [createEdgeId('v', 0, 0)]: 'x',
  },
  elapsedSeconds: 42,
  hintsUsed: 1,
  checksUsed: 2,
  completed: false,
  startedAt: '2026-09-18T12:00:00.000Z',
  updatedAt: '2026-09-18T12:00:42.000Z',
};

describe('local persistence repository', () => {
  it('writes progress and a Continue pointer under versioned keys', () => {
    const storage = new MemoryStorage();
    const repository = createPersistenceRepository(storage);

    repository.saveContinue(unfinishedProgress);

    expect(storage.getItem(storageKeys.progress(unfinishedProgress.puzzleId))).toContain('loop-persistence-1');
    expect(storage.getItem(storageKeys.progress(unfinishedProgress.puzzleId))).toContain('"schemaVersion":"1.0"');
    expect(storage.getItem(storageKeys.continue)).toContain('loop-persistence-1');
    expect(repository.loadContinue()).toEqual(unfinishedProgress);
  });

  it('restores only the pointer target and clears completed progress from Continue', () => {
    const storage = new MemoryStorage();
    const repository = createPersistenceRepository(storage);

    repository.saveContinue(unfinishedProgress);
    expect(repository.loadContinue('different-puzzle')).toBeUndefined();
    repository.saveContinue({ ...unfinishedProgress, completed: true, completedAt: '2026-09-18T12:01:00.000Z' });
    expect(repository.loadContinue()).toBeUndefined();
  });

  it('returns schema-backed defaults and supports reset', () => {
    const storage = new MemoryStorage();
    const repository = createPersistenceRepository(storage);

    expect(repository.getSettings()).toEqual(DEFAULT_SETTINGS);
    expect(repository.getStatistics()).toEqual(createDefaultStatistics());
    repository.saveSettings({
      ...DEFAULT_SETTINGS,
      defaultMode: 'assisted',
      reducedMotion: true,
      sound: false,
      locale: 'en-US',
    });
    repository.saveStatistics(createDefaultStatistics());
    expect(repository.getSettings()).toMatchObject({
      defaultMode: 'assisted',
      reducedMotion: true,
      sound: false,
      locale: 'en-US',
    });
    repository.resetAll();
    expect(repository.loadSettings()).toBeUndefined();
    expect(repository.loadStatistics()).toBeUndefined();
  });

  it('removes corrupt and outdated records instead of throwing on read', () => {
    const storage = new MemoryStorage();
    const repository = createPersistenceRepository(storage);
    const key = storageKeys.progress(unfinishedProgress.puzzleId);

    storage.setItem(key, '{"schemaVersion":"0.9","puzzleId":"old"}');

    expect(repository.loadProgress(unfinishedProgress.puzzleId)).toBeUndefined();
    expect(storage.getItem(key)).toBeNull();
  });

  it('normalizes legacy appearance fields while preserving supported settings', () => {
    const storage = new MemoryStorage();
    const repository = createPersistenceRepository(storage);

    storage.setItem(storageKeys.settings, JSON.stringify({
      ...DEFAULT_SETTINGS,
      defaultMode: 'assisted',
      reducedMotion: true,
      locale: 'en-US',
      theme: 'dark',
      highContrast: true,
    }));

    expect(repository.loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      defaultMode: 'assisted',
      reducedMotion: true,
      locale: 'en-US',
    });
    expect(storage.getItem(storageKeys.settings)).not.toContain('theme');
    expect(storage.getItem(storageKeys.settings)).not.toContain('highContrast');
  });

  it('rejects malformed canonical settings and removes them from storage', () => {
    const storage = new MemoryStorage();
    const repository = createPersistenceRepository(storage);

    storage.setItem(storageKeys.settings, JSON.stringify({
      ...DEFAULT_SETTINGS,
      defaultMode: 'invalid',
    }));

    expect(repository.loadSettings()).toBeUndefined();
    expect(storage.getItem(storageKeys.settings)).toBeNull();
  });
});

describe('persistence state handoff', () => {
  it('restores saved line and exclusion states on a fresh board', () => {
    const state = restoreGameStateFromProgress(unfinishedProgress, {
      puzzleId: unfinishedProgress.puzzleId,
      width: 2,
      height: 2,
      startingEdges: [],
    });

    expect(state.edgeStates[createEdgeId('h', 0, 0)]).toBe('line');
    expect(state.edgeStates[createEdgeId('v', 0, 0)]).toBe('x');
  });
});
