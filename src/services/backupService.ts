import {
  STORES,
  StoreName,
  getAllFromStore,
  clearStore,
  putMultipleToStore,
} from '../repositories/indexeddb/db';
import { logActivity } from './auditService';

export interface BackupPayload {
  version: string;
  timestamp: string;
  app_name: string;
  school_id: string;
  metadata: Record<string, number>;
  stores: Record<string, unknown[]>;
}

export async function createFullBackup(schoolId: string, userId: string, userName: string): Promise<string> {
  const storeNames = Object.values(STORES);
  const data: Record<string, unknown[]> = {};
  const metadata: Record<string, number> = {};

  for (const name of storeNames) {
    const records = await getAllFromStore(name as StoreName);
    data[name] = records;
    metadata[name] = records.length;
  }

  const payload: BackupPayload = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    app_name: 'Aplikasi Koperasi Sekolah',
    school_id: schoolId,
    metadata,
    stores: data,
  };

  const jsonString = JSON.stringify(payload, null, 2);

  await logActivity({
    school_id: schoolId,
    user_id: userId,
    user_name: userName,
    action: 'Backup Database',
    module: 'System',
    entity: 'BackupHistory',
    entity_id: 'bkp_' + Date.now(),
    new_value: `Exported ${Object.keys(data).length} stores (${JSON.stringify(metadata)})`,
  });

  return jsonString;
}

export async function restoreFromBackup(
  jsonContent: string,
  schoolId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const payload = JSON.parse(jsonContent) as BackupPayload;

    if (!payload.stores || !payload.version) {
      throw new Error('Format file cadangan tidak valid.');
    }

    const storeNames = Object.values(STORES);

    // Clear and restore each store
    for (const name of storeNames) {
      if (payload.stores[name] && Array.isArray(payload.stores[name])) {
        await clearStore(name as StoreName);
        await putMultipleToStore(name as StoreName, payload.stores[name]);
      }
    }

    await logActivity({
      school_id: schoolId,
      user_id: userId,
      user_name: userName,
      action: 'Restore Database',
      module: 'System',
      entity: 'BackupHistory',
      entity_id: 'rst_' + Date.now(),
      new_value: `Restored backup from ${payload.timestamp}`,
    });

    return { success: true, message: 'Data berhasil dipulihkan dari cadangan.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memulihkan cadangan';
    return { success: false, message: msg };
  }
}
