/**
 * A tiny in-memory Prisma stand-in for integration tests.
 *
 * It is NOT a full Prisma implementation — it implements the handful of query
 * methods the critical-path services actually use (findUnique/findFirst/findMany/
 * count/groupBy/create/update/upsert/delete/deleteMany/createMany), with enough
 * `where` / `include` / `select` support to exercise real controller + guard +
 * service wiring without a database.
 *
 * A Proxy exposes an object per model on demand, so any model referenced by the
 * app (even ones the critical path doesn't touch) resolves to a working handler
 * over an initially-empty collection instead of throwing.
 */

type Row = Record<string, any>;

function matchWhere(row: Row, where: any): boolean {
  if (!where) return true;
  for (const [key, cond] of Object.entries<any>(where)) {
    if (key === 'AND') {
      if (!(cond as any[]).every((c) => matchWhere(row, c))) return false;
      continue;
    }
    if (key === 'OR') {
      if (!(cond as any[]).some((c) => matchWhere(row, c))) return false;
      continue;
    }
    if (key === 'NOT') {
      if (matchWhere(row, cond)) return false;
      continue;
    }
    // Relation filter like { lead: { isNot: null } } / { isNot: null }
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('isNot' in cond) {
        const val = row[key];
        if (cond.isNot === null && (val === null || val === undefined)) return false;
        continue;
      }
      if ('gte' in cond || 'lte' in cond || 'gt' in cond || 'lt' in cond || 'in' in cond) {
        const val = row[key];
        if ('gte' in cond && !(val >= cond.gte)) return false;
        if ('lte' in cond && !(val <= cond.lte)) return false;
        if ('gt' in cond && !(val > cond.gt)) return false;
        if ('lt' in cond && !(val < cond.lt)) return false;
        if ('in' in cond && !(cond.in as any[]).includes(val)) return false;
        continue;
      }
      // Nested composite unique like userId_workspaceId
      // Fall through to deep equality on the object.
    }
    if (row[key] !== cond) return false;
  }
  return true;
}

function applySelect(row: Row, select: any): Row {
  if (!select) return row;
  const out: Row = {};
  for (const [k, v] of Object.entries(select)) {
    if (v) out[k] = row[k];
  }
  return out;
}

class ModelStore {
  rows: Row[] = [];
  constructor(
    private name: string,
    private db: FakePrismaData,
  ) {}

  private resolveInclude(row: Row, include: any): Row {
    if (!include) return row;
    const out = { ...row };
    for (const [rel, val] of Object.entries<any>(include)) {
      if (!val) continue;
      // Heuristic relation resolution by common FK conventions.
      if (rel === 'contact' && row.contactId) {
        out.contact = this.db.contact?.rows.find((r) => r.id === row.contactId) ?? null;
      } else if (rel === 'lead') {
        out.lead = this.db.lead?.rows.find((r) => r.contactId === row.id) ?? null;
      } else if (rel === 'reviews') {
        out.reviews = (this.db.competitorReview?.rows ?? []).filter((r) => r.competitorId === row.id);
      } else if (rel === 'assignedUser') {
        const u = this.db.user?.rows.find((r) => r.id === row.assignedUserId) ?? null;
        out.assignedUser = u
          ? typeof val === 'object' && val.select
            ? applySelect(u, val.select)
            : u
          : null;
      } else if (rel === 'workspace') {
        out.workspace = this.db.workspace?.rows.find((r) => r.id === row.workspaceId) ?? null;
      } else if (rel === 'recipients') {
        out.recipients = (this.db.campaignRecipient?.rows ?? []).filter((r) => r.campaignId === row.id);
      } else {
        out[rel] = null;
      }
    }
    return out;
  }

  async findUnique({ where, include, select }: any = {}) {
    // Support composite unique keys (single-level object value).
    let row: Row | undefined;
    const entries = Object.entries<any>(where || {});
    if (entries.length === 1 && entries[0][1] && typeof entries[0][1] === 'object') {
      const composite = entries[0][1];
      row = this.rows.find((r) => Object.entries(composite).every(([k, v]) => r[k] === v));
    } else {
      row = this.rows.find((r) => matchWhere(r, where));
    }
    if (!row) return null;
    return applySelect(this.resolveInclude(row, include), select);
  }

  async findFirst({ where, include, select, orderBy }: any = {}) {
    let rows = this.rows.filter((r) => matchWhere(r, where));
    rows = this.applyOrder(rows, orderBy);
    const row = rows[0];
    if (!row) return null;
    return applySelect(this.resolveInclude(row, include), select);
  }

  async findMany({ where, include, select, orderBy, take, skip }: any = {}) {
    let rows = this.rows.filter((r) => matchWhere(r, where));
    rows = this.applyOrder(rows, orderBy);
    if (skip) rows = rows.slice(skip);
    if (take) rows = rows.slice(0, take);
    return rows.map((r) => applySelect(this.resolveInclude(r, include), select));
  }

  async count({ where }: any = {}) {
    return this.rows.filter((r) => matchWhere(r, where)).length;
  }

  async groupBy({ by, where }: any = {}) {
    const rows = this.rows.filter((r) => matchWhere(r, where));
    const key = Array.isArray(by) ? by[0] : by;
    const groups = new Map<any, number>();
    for (const r of rows) groups.set(r[key], (groups.get(r[key]) || 0) + 1);
    return [...groups.entries()].map(([val, n]) => ({ [key]: val, _count: n }));
  }

  async aggregate() {
    return { _count: this.rows.length, _sum: {}, _avg: {} };
  }

  async create({ data, include, select }: any) {
    const row: Row = { id: data.id ?? `${this.name}-${this.rows.length + 1}`, ...data };
    // Strip nested relation writes we don't model (e.g. scenes: { create: [] }).
    for (const [k, v] of Object.entries(row)) {
      if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v) && ('create' in v || 'connect' in v)) {
        delete row[k];
      }
    }
    if (row.createdAt === undefined) row.createdAt = new Date();
    if (row.updatedAt === undefined) row.updatedAt = new Date();
    this.rows.push(row);
    return applySelect(this.resolveInclude(row, include), select);
  }

  async createMany({ data }: any) {
    const arr = Array.isArray(data) ? data : [data];
    for (const d of arr) await this.create({ data: d });
    return { count: arr.length };
  }

  async update({ where, data, include, select }: any) {
    const row = this.rows.find((r) => matchWhere(r, where));
    if (!row) throw new Error(`${this.name}.update: row not found`);
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined) continue;
      row[k] = v;
    }
    row.updatedAt = new Date();
    return applySelect(this.resolveInclude(row, include), select);
  }

  async upsert({ where, create, update, include, select }: any) {
    const existing = this.rows.find((r) => matchWhere(r, where));
    if (existing) {
      return this.update({ where, data: update, include, select });
    }
    return this.create({ data: { ...where, ...create }, include, select });
  }

  async delete({ where }: any) {
    const idx = this.rows.findIndex((r) => matchWhere(r, where));
    if (idx === -1) throw new Error(`${this.name}.delete: row not found`);
    const [removed] = this.rows.splice(idx, 1);
    return removed;
  }

  async deleteMany({ where }: any = {}) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !matchWhere(r, where));
    return { count: before - this.rows.length };
  }

  private applyOrder(rows: Row[], orderBy: any): Row[] {
    if (!orderBy) return rows;
    const spec = Array.isArray(orderBy) ? orderBy[0] : orderBy;
    const [key, dir] = Object.entries<any>(spec)[0];
    return [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return dir === 'desc' ? -cmp : cmp;
    });
  }
}

type FakePrismaData = Record<string, ModelStore>;

export interface FakePrisma {
  client: any;
  seed: (data: Record<string, Row[]>) => void;
}

// Map seed keys (plural-ish) to model names.
const SEED_KEY_TO_MODEL: Record<string, string> = {
  workspaces: 'workspace',
  users: 'user',
  businessProfiles: 'businessProfile',
  contacts: 'contact',
  leads: 'lead',
  competitors: 'competitor',
  competitorReviews: 'competitorReview',
  campaigns: 'campaign',
  socialPosts: 'socialPost',
  scheduledPosts: 'scheduledPost',
  conversations: 'conversation',
  researchReports: 'researchReport',
  brandKits: 'brandKit',
};

export function createFakePrisma(): FakePrisma {
  const db: FakePrismaData = {};

  const getStore = (name: string): ModelStore => {
    if (!db[name]) db[name] = new ModelStore(name, db);
    return db[name];
  };

  // Lifecycle + transaction shims used by the app.
  const lifecycle: Record<string, any> = {
    $connect: async () => undefined,
    $disconnect: async () => undefined,
    $on: () => undefined,
    $transaction: async (arg: any) => {
      if (typeof arg === 'function') return arg(client);
      if (Array.isArray(arg)) return Promise.all(arg);
      return undefined;
    },
    enableShutdownHooks: () => undefined,
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
  };

  const client: any = new Proxy(lifecycle, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      // Any other property is treated as a model accessor.
      return getStore(prop);
    },
  });

  const seed = (data: Record<string, Row[]>) => {
    for (const [key, rows] of Object.entries(data)) {
      const model = SEED_KEY_TO_MODEL[key] || key;
      const store = getStore(model);
      for (const r of rows) {
        store.rows.push({ createdAt: new Date(), updatedAt: new Date(), ...r });
      }
    }
  };

  return { client, seed };
}
