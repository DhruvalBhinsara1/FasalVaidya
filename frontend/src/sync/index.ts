/**
 * Sync Orchestrator for FasalVaidya
 * ==================================
 * Integrates local SQLite and remote Supabase sync
 * Provides unified API for the application
 */

import { localSyncDB } from './localSync';
import { supabaseSyncClient, SyncMetadata, SyncResult } from './supabaseSync';

// =================================================================
// TYPES
// =================================================================

export interface SyncOrchestratorConfig {
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  retryFailedSyncs: boolean;
  maxRetries: number;
}

export interface CompleteSyncStatus {
  isAvailable: boolean;
  isEnabled: boolean;
  isSyncing: boolean;
  lastSync: SyncMetadata;
  localStats: {
    pendingPush: { [tableName: string]: number };
    unresolvedConflicts: number;
  };
}

// =================================================================
// SYNC ORCHESTRATOR CLASS
// =================================================================

class SyncOrchestrator {
  private config: SyncOrchestratorConfig = {
    autoSyncEnabled: true,
    syncIntervalMinutes: 5,
    retryFailedSyncs: true,
    maxRetries: 3,
  };

  private syncInProgress: boolean = false;
  private lastSyncResult: SyncResult | null = null;

  /**
   * Initialize sync system
   * Call this after user authentication
   */
  async initialize(config?: Partial<SyncOrchestratorConfig>): Promise<void> {
    // Merge config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize local database
    await localSyncDB.migrateDatabaseForSync();

    // Check if sync is available
    const isAvailable = await supabaseSyncClient.isSyncAvailable();
    const isEnabled = await supabaseSyncClient.isSyncEnabled();

    console.log('🔄 Sync Orchestrator initialized');
    console.log('   - Available:', isAvailable);
    console.log('   - Enabled:', isEnabled);
    console.log('   - Auto-sync:', this.config.autoSyncEnabled);

    // Start auto-sync if enabled
    if (isAvailable && isEnabled && this.config.autoSyncEnabled) {
      await this.startAutoSync(this.config.syncIntervalMinutes);
    }
  }

  /**
   * Get complete sync status
   */
  async getStatus(): Promise<CompleteSyncStatus> {
    const isAvailable = await supabaseSyncClient.isSyncAvailable();
    const isEnabled = await supabaseSyncClient.isSyncEnabled();
    const lastSync = await supabaseSyncClient.getSyncMetadata();
    const dirtyCounts = await localSyncDB.getAllDirtyRecordCounts();
    const conflicts = await localSyncDB.getUnresolvedConflicts();

    return {
      isAvailable,
      isEnabled,
      isSyncing: this.syncInProgress,
      lastSync,
      localStats: {
        pendingPush: dirtyCounts,
        unresolvedConflicts: conflicts.length,
      },
    };
  }

  /**
   * Perform manual sync
   */
  async syncNow(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.warn('⏳ Sync already in progress');
      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        failedCount: 0,
        errors: [{ error: 'Sync already in progress' }],
        duration: 0,
      };
    }

    try {
      this.syncInProgress = true;
      console.log('🔄 Starting manual sync...');

      // Perform bidirectional sync
      const result = await this.performBidirectionalSync();

      this.lastSyncResult = result;
      return result;

    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Start automatic background sync
   */
  async startAutoSync(intervalMinutes: number = 5): Promise<void> {
    // Stop existing auto-sync first to prevent duplicates
    this.stopAutoSync();
    
    console.log(`✅ Starting auto-sync (every ${intervalMinutes} minutes)`);
    this.config.autoSyncEnabled = true;
    this.config.syncIntervalMinutes = intervalMinutes;

    // Delegate to Supabase client
    await supabaseSyncClient.startAutoSync(intervalMinutes);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync(): void {
    if (!this.config.autoSyncEnabled) {
      return; // Already stopped, no need to log
    }
    
    console.log('⏹️ Stopping auto-sync');
    this.config.autoSyncEnabled = false;
    supabaseSyncClient.stopAutoSync();
  }

  /**
   * Enable/disable sync
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await supabaseSyncClient.setSyncEnabled(enabled);

    if (enabled && this.config.autoSyncEnabled) {
      await this.startAutoSync(this.config.syncIntervalMinutes);
    } else {
      this.stopAutoSync();
    }
  }

  // =================================================================
  // PRIVATE: Bidirectional Sync Logic
  // =================================================================

  private async performBidirectionalSync(): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      // Delegate entire sync to Supabase client which handles both push and pull
      console.log('🔗 Delegating sync to Supabase client...');
      const result = await supabaseSyncClient.performSync();

      console.log('✅ Sync completed:', {
        duration: `${result.duration}ms`,
        pushed: result.pushedCount,
        pulled: result.pulledCount,
        failed: result.failedCount,
        success: result.success,
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('❌ Sync failed:', error);

      return {
        success: false,
        pushedCount: 0,
        pulledCount: 0,
        failedCount: 0,
        errors: [{ error: String(error) }],
        duration,
      };
    }
  }

  // =================================================================
  // CONFLICT RESOLUTION
  // =================================================================

  async getUnresolvedConflicts() {
    return await localSyncDB.getUnresolvedConflicts();
  }

  async resolveConflict(conflictId: number, resolution: 'use_local' | 'use_remote') {
    await localSyncDB.resolveConflict(conflictId, resolution);
    
    // Trigger sync to push resolution
    await this.syncNow();
  }

  // =================================================================
  // STATISTICS & MONITORING
  // =================================================================

  async getStatistics() {
    return await localSyncDB.getSyncStatistics();
  }

  getLastSyncResult(): SyncResult | null {
    return this.lastSyncResult;
  }
}

// =================================================================
// SINGLETON INSTANCE
// =================================================================

export const syncOrchestrator = new SyncOrchestrator();

// =================================================================
// CONVENIENCE EXPORTS
// =================================================================

export { localSyncDB } from './localSync';
export { supabaseSyncClient } from './supabaseSync';

// =================================================================
// PUBLIC API
// =================================================================

/**
 * Initialize the sync system (call on app startup after auth)
 */
export async function initializeSync(config?: Partial<SyncOrchestratorConfig>) {
  await syncOrchestrator.initialize(config);
}

/**
 * Get current sync status
 */
export async function getSyncStatus() {
  return await syncOrchestrator.getStatus();
}

/**
 * Trigger manual sync
 */
export async function performSync() {
  return await syncOrchestrator.syncNow();
}

/**
 * Enable/disable sync
 */
export async function toggleSync(enabled: boolean) {
  await syncOrchestrator.setEnabled(enabled);
}

/**
 * Start automatic background sync
 */
export async function startAutoSync(intervalMinutes: number = 5) {
  await syncOrchestrator.startAutoSync(intervalMinutes);
}

/**
 * Stop automatic sync
 */
export function stopAutoSync() {
  syncOrchestrator.stopAutoSync();
}

/**
 * Get unresolved conflicts
 */
export async function getConflicts() {
  return await syncOrchestrator.getUnresolvedConflicts();
}

/**
 * Resolve a conflict
 */
export async function resolveConflict(conflictId: number, resolution: 'use_local' | 'use_remote') {
  await syncOrchestrator.resolveConflict(conflictId, resolution);
}

/**
 * Get sync statistics
 */
export async function getSyncStatistics() {
  return await syncOrchestrator.getStatistics();
}
