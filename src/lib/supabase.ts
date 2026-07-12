type Filter = { field: string; operator: string; value: unknown };
type Order = { field: string; ascending?: boolean; nullsFirst?: boolean };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ApiResult<T = any> = { data: T | null; count?: number | null; error: { message: string } | null };

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class MongoQueryBuilder {
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: Filter[] = [];
  private orders: Order[] = [];
  private maxRows?: number;
  private payload: unknown;
  private countOnly = false;
  private singleResult = false;
  private orExpression?: string;

  constructor(private collection: string) {}

  select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
    void columns;
    if (this.operation === 'select') {
      this.countOnly = options?.count === 'exact' && options?.head === true;
    }
    return this;
  }

  insert(data: unknown) { this.operation = 'insert'; this.payload = data; return this; }
  update(data: unknown) { this.operation = 'update'; this.payload = data; return this; }
  delete() { this.operation = 'delete'; return this; }
  eq(field: string, value: unknown) { this.filters.push({ field, operator: 'eq', value }); return this; }
  neq(field: string, value: unknown) { this.filters.push({ field, operator: 'neq', value }); return this; }
  gt(field: string, value: unknown) { this.filters.push({ field, operator: 'gt', value }); return this; }
  gte(field: string, value: unknown) { this.filters.push({ field, operator: 'gte', value }); return this; }
  lt(field: string, value: unknown) { this.filters.push({ field, operator: 'lt', value }); return this; }
  lte(field: string, value: unknown) { this.filters.push({ field, operator: 'lte', value }); return this; }
  in(field: string, value: unknown[]) { this.filters.push({ field, operator: 'in', value }); return this; }
  is(field: string, value: unknown) { this.filters.push({ field, operator: 'is', value }); return this; }
  or(expression: string) { this.orExpression = expression; return this; }
  order(field: string, options?: { ascending?: boolean; nullsFirst?: boolean }) { this.orders.push({ field, ...options }); return this; }
  limit(value: number) { this.maxRows = value; return this; }
  single() { this.singleResult = true; return this; }
  maybeSingle() { this.singleResult = true; return this; }

  private async execute(): Promise<ApiResult> {
    try {
      let response: Response;
      if (this.operation === 'select') {
        response = await fetch(`${API_URL}/db/${this.collection}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filters: this.filters, orders: this.orders, limit: this.maxRows, countOnly: this.countOnly, single: this.singleResult, or: this.orExpression }),
        });
      } else if (this.operation === 'insert') {
        response = await fetch(`${API_URL}/db/${this.collection}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: this.payload }),
        });
      } else if (this.operation === 'update') {
        response = await fetch(`${API_URL}/db/${this.collection}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: this.payload, filters: this.filters }),
        });
      } else {
        response = await fetch(`${API_URL}/db/${this.collection}`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filters: this.filters }),
        });
      }

      const result = await response.json();
      if (!response.ok) return { data: null, error: result.error || { message: `Request failed (${response.status})` } };
      if (this.singleResult && Array.isArray(result.data)) result.data = result.data[0] ?? null;
      return result;
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : 'Network request failed' } };
    }
  }

  then<TResult1 = ApiResult, TResult2 = never>(
    onfulfilled?: ((value: ApiResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const supabase = {
  from(collection: string) { return new MongoQueryBuilder(collection); },
};
