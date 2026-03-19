import { Pool } from 'pg';
import { AuditLog, AuditLogFilter, PaginatedResult } from '../types/archive.types';

export class AuditRepository {
  constructor(private readonly pool: Pool) {}

  async findAll(
    filter: AuditLogFilter
  ): Promise<PaginatedResult<AuditLog>> {
    const client = await this.pool.connect();
    try {
      const page = filter.page ?? 1;
      const limit = filter.limit ?? 10;
      const offset = (page - 1) * limit;

      const conditions: string[] = ['1=1'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (filter.entity_type) {
        conditions.push(`entity_type = $${paramIndex++}`);
        params.push(filter.entity_type);
      }

      if (filter.entity_id) {
        conditions.push(`entity_id = $${paramIndex++}`);
        params.push(filter.entity_id);
      }

      if (filter.actor_id) {
        conditions.push(`actor_id = $${paramIndex++}`);
        params.push(filter.actor_id);
      }

      if (filter.action) {
        conditions.push(`action = $${paramIndex++}`);
        params.push(filter.action);
      }

      if (filter.from_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(filter.from_date);
      }

      if (filter.to_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(filter.to_date);
      }

      const whereClause = conditions.join(' AND ');
      params.push(limit);
      params.push(offset);

      const sql = `
        SELECT
          id, entity_type, entity_id, action, actor_id,
          before_state, after_state, created_at,
          COUNT(*) OVER() AS total_count
        FROM audit_logs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await client.query(sql, params);
      const rows = result.rows;

      const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
      const data: AuditLog[] = rows.map((row) => this.mapRow(row));

      return { data, total, page, limit };
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<AuditLog | null> {
    const client = await this.pool.connect();
    try {
      const sql = `
        SELECT
          id, entity_type, entity_id, action, actor_id,
          before_state, after_state, created_at
        FROM audit_logs
        WHERE id = $1
      `;
      const result = await client.query(sql, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async createLog(
    entry: Omit<AuditLog, 'id' | 'created_at'>
  ): Promise<AuditLog> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const sql = `
        INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, before_state, after_state)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, entity_type, entity_id, action, actor_id, before_state, after_state, created_at
      `;
      const params = [
        entry.entity_type,
        entry.entity_id,
        entry.action,
        entry.actor_id,
        JSON.stringify(entry.before_state),
        JSON.stringify(entry.after_state),
      ];

      const result = await client.query(sql, params);

      await client.query('COMMIT');

      return this.mapRow(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRow(row: Record<string, unknown>): AuditLog {
    return {
      id: row.id as string,
      entity_type: row.entity_type as string,
      entity_id: row.entity_id as string,
      action: row.action as string,
      actor_id: row.actor_id as string,
      before_state: typeof row.before_state === 'string'
        ? JSON.parse(row.before_state)
        : (row.before_state as Record<string, unknown> | null),
      after_state: typeof row.after_state === 'string'
        ? JSON.parse(row.after_state)
        : (row.after_state as Record<string, unknown> | null),
      created_at: row.created_at as string,
    };
  }
}
