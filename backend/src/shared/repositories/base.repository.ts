import type { Pool, QueryResultRow } from 'pg';
import { db } from '../../infra/db/pg.js';

/**
 * 基础Repository类，提供数据库访问能力
 */
export abstract class BaseRepository {
  protected readonly db: Pool;

  constructor() {
    this.db = db;
  }

  /**
   * 执行查询并返回单条记录
   */
  protected async queryOne<T extends QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<T | null> {
    const result = await this.db.query<T>(text, params);
    return result.rows[0] || null;
  }

  /**
   * 执行查询并返回多条记录
   */
  protected async queryMany<T extends QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<T[]> {
    const result = await this.db.query<T>(text, params);
    return result.rows;
  }

  /**
   * 执行查询并返回结果对象（包含rows和rowCount）
   */
  protected async query<T extends QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    const result = await this.db.query<T>(text, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    };
  }

  /**
   * 执行插入/更新操作
   */
  protected async execute(
    text: string,
    params: unknown[] = []
  ): Promise<{ rowCount: number }> {
    const result = await this.db.query(text, params);
    return { rowCount: result.rowCount || 0 };
  }
}