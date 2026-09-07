import { AuditLog } from '../domain/types';
import { auditRepo } from '../repositories';

export async function logActivity(params: {
  school_id: string;
  user_id: string;
  user_name: string;
  action: string;
  module: string;
  entity: string;
  entity_id: string;
  old_value?: string;
  new_value?: string;
}): Promise<void> {
  const audit: AuditLog = {
    id: 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    school_id: params.school_id,
    user_id: params.user_id,
    user_name: params.user_name,
    action: params.action,
    module: params.module,
    entity: params.entity,
    entity_id: params.entity_id,
    old_value: params.old_value,
    new_value: params.new_value,
    timestamp: new Date().toISOString(),
  };
  await auditRepo.log(audit);
}

export async function getAuditLogs(schoolId: string): Promise<AuditLog[]> {
  return auditRepo.getAll(schoolId);
}
