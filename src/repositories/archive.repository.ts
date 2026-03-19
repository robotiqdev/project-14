import { Pool } from 'pg';
import {
  ArchiveFilter,
  ArchivedTask,
  PaginatedResult,
  Task,
} from '../types/archive.types';

export class ArchiveRepository {
  constructor(private readonly pool: Pool) {}

  async findAllArchived(
    filter: ArchiveFilter
  ): Promise<PaginatedResult<ArchivedTask>> {
    const client = await this.pool.connect();
    try {
      const page = filter.page ?? 1;
      const limit = filter.limit ?? 10;
      const offset = (page - 1) * limit;

      const conditions: string[] = ['archived_at IS NOT NULL'];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (filter.team_id) {
        conditions.push(`team_id = $${paramIndex++}`);
        params.push(filter.team_id);
      }

      if (filter.from_date) {
        conditions.push(`archived_at >= $${paramIndex++}`);
        params.push(filter.from_date);
      }

      if (filter.to_date) {
        conditions.push(`archived_at <= $${paramIndex++}`);
        params.push(filter.to_date);
      }

      if (filter.search) {
        conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${filter.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      params.push(limit);
      params.push(offset);

      const sql = `
        SELECT
          id, title, description, team_id, status,
          archived_at, archived_by, archive_reason,
          created_at, updated_at,
          COUNT(*) OVER() AS total_count
        FROM tasks
        WHERE ${whereClause}
        ORDER BY archived_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const result = await client.query(sql, params);
      const rows = result.rows;

      const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
      const data: ArchivedTask[] = rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        team_id: row.team_id,
        status: row.status,
        archived_at: row.archived_at,
        archived_by: row.archived_by,
        archive_reason: row.archive_reason,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      return { data, total, page, limit };
    } finally {
      client.release();
    }
  }

  async findArchivedById(id: string): Promise<ArchivedTask | null> {
    const client = await this.pool.connect();
    try {
      const sql = `
        SELECT
          id, title, description, team_id, status,
          archived_at, archived_by, archive_reason,
          created_at, updated_at
        FROM tasks
        WHERE id = $1 AND archived_at IS NOT NULL
      `;
      const result = await client.query(sql, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        team_id: row.team_id,
        status: row.status,
        archived_at: row.archived_at,
        archived_by: row.archived_by,
        archive_reason: row.archive_reason,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  async restoreTask(id: string, restoredBy: string): Promise<Task> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const sql = `
        UPDATE tasks
        SET
          archived_at = NULL,
          archived_by = NULL,
          archive_reason = NULL,
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, title, description, team_id, status,
                  archived_at, archived_by, archive_reason,
                  created_at, updated_at
      `;
      const result = await client.query(sql, [id]);

      await client.query('COMMIT');

      const row = result.rows[0];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        team_id: row.team_id,
        status: row.status,
        archived_at: row.archived_at,
        archived_by: row.archived_by,
        archive_reason: row.archive_reason,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
