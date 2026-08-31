/**
 * The fixture dataset every router reads from while the database port is
 * outstanding.
 *
 * It lives behind the real procedures rather than inside components on purpose:
 * the web app calls `orpc.company.options.queryOptions()` exactly as it will
 * against Postgres, so replacing these handler bodies with Prisma queries is a
 * change confined to packages/api. Nothing in apps/web knows the data is fake.
 *
 * Shapes mirror the Drizzle rows the React template's routers returned, so the
 * ported screens need no adaptation either.
 */

export type MockCompany = {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
};

export type MockActivityEntry = {
  id: string;
  companyId: string;
  entityType: string;
  entityId: string;
  /** Denormalised so the feed can still name a deleted project. */
  entityLabel: string;
  action: string;
  /** Denormalised for the same reason — a deleted user keeps their name here. */
  actorName: string;
  detail: string | null;
  createdAt: Date;
};

/** Fixed instants, so a fixture never renders "in 3 hours" as the day rolls over. */
const T0 = new Date("2026-08-31T09:00:00.000Z");
const minutesBefore = (minutes: number) => new Date(T0.getTime() - minutes * 60_000);

export const companies: MockCompany[] = [
  {
    id: "3f1c2a54-9d6e-4b18-8a07-2c5b91e4d730",
    name: "Fushin Konstruksi",
    code: "FSK",
    createdAt: new Date("2026-01-12T02:00:00.000Z"),
  },
  {
    id: "7b9e4d21-5c83-42af-9e16-8d04f7a3b652",
    name: "Nusantara Bangun Persada",
    code: "NBP",
    createdAt: new Date("2026-03-04T02:00:00.000Z"),
  },
  {
    id: "c48a7e10-2f65-4d99-b3c7-61e8a95d0f24",
    name: "Graha Mitra Sejahtera",
    code: "GMS",
    createdAt: new Date("2026-05-21T02:00:00.000Z"),
  },
];

export const activityEntries: MockActivityEntry[] = [
  {
    id: "act-0001",
    companyId: companies[0]!.id,
    entityType: "progress",
    entityId: "prj-0001",
    entityLabel: "Jalan Tol Cisumdawu Seksi 4",
    action: "submitted",
    actorName: "Rangga Wijaya",
    detail: null,
    createdAt: minutesBefore(12),
  },
  {
    id: "act-0002",
    companyId: companies[0]!.id,
    entityType: "ticket",
    entityId: "tkt-0044",
    entityLabel: "Keterlambatan pengiriman besi beton",
    action: "status_changed",
    actorName: "Sari Puspita",
    detail: "in_progress",
    createdAt: minutesBefore(48),
  },
  {
    id: "act-0003",
    companyId: companies[0]!.id,
    entityType: "boq",
    entityId: "prj-0002",
    entityLabel: "Gedung Perkantoran Menara Kirana",
    action: "imported",
    actorName: "Bayu Nugroho",
    detail: "412",
    createdAt: minutesBefore(146),
  },
  {
    id: "act-0004",
    companyId: companies[0]!.id,
    entityType: "project",
    entityId: "prj-0003",
    entityLabel: "Revitalisasi Pasar Rakyat Cibadak",
    action: "created",
    actorName: "Dewi Anggraini",
    detail: null,
    createdAt: minutesBefore(320),
  },
  {
    id: "act-0005",
    companyId: companies[0]!.id,
    entityType: "user",
    entityId: "usr-0009",
    entityLabel: "Fajar Ramadhan",
    action: "role_changed",
    actorName: "Dewi Anggraini",
    detail: "admin",
    createdAt: minutesBefore(1_180),
  },
];

/** Unread support notices for the signed-in requester. */
export const supportUnreadCount = 2;
