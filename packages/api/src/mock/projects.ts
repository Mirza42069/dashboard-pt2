import { companies } from "./data";

/**
 * Portfolio fixtures for the dashboard and the project screens.
 *
 * The row shape is `projectExceptions`' output in the React template — the
 * dashboard's attention list reads these fields directly, so keeping the names
 * identical is what lets the ported components run unmodified.
 *
 * The spread is deliberate rather than arbitrary: the dashboard exists to rank
 * problems, so the set covers every severity the ranking distinguishes — behind
 * schedule, unreported, stale, reports due, awaiting review, no baseline, and
 * one project with nothing wrong but open actions.
 */

export const PROJECT_STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type MockProject = {
  projectId: string;
  companyId: string;
  code: string;
  name: string;
  status: ProjectStatus;
  hiddenModules: string[];
  hasBaseline: boolean;
  /** Percent complete, 0-100. */
  progress: number;
  /** Percent planned at the data date, 0-100. */
  planned: number;
  contractValue: number;
  /** actual - planned, in percentage points. Negative is behind. */
  deviation: number | null;
  previousDeviation: number | null;
  /** Last reported period end, or null when nothing has been reported. */
  dataDate: string | null;
  reportAgeDays: number | null;
  reportsDue: number;
  reportsAwaitingReview: number;
  openTickets: number;
};

const COMPANY = companies[0]!.id;

export const projects: MockProject[] = [
  {
    projectId: "prj-0001",
    companyId: COMPANY,
    code: "TOL-CSD-04",
    name: "Jalan Tol Cisumdawu Seksi 4",
    status: "active",
    hiddenModules: [],
    hasBaseline: true,
    progress: 38.4,
    planned: 47.1,
    contractValue: 412_500_000_000,
    deviation: -8.7,
    previousDeviation: -5.2,
    dataDate: "2026-08-23",
    reportAgeDays: 8,
    reportsDue: 1,
    reportsAwaitingReview: 0,
    openTickets: 3,
  },
  {
    projectId: "prj-0002",
    companyId: COMPANY,
    code: "GDG-KRN-01",
    name: "Gedung Perkantoran Menara Kirana",
    status: "active",
    hiddenModules: [],
    hasBaseline: true,
    progress: 62.9,
    planned: 65.4,
    contractValue: 188_900_000_000,
    deviation: -2.5,
    previousDeviation: -3.1,
    dataDate: "2026-08-30",
    reportAgeDays: 1,
    reportsDue: 0,
    reportsAwaitingReview: 2,
    openTickets: 1,
  },
  {
    projectId: "prj-0003",
    companyId: COMPANY,
    code: "PSR-CBD-02",
    name: "Revitalisasi Pasar Rakyat Cibadak",
    status: "active",
    hiddenModules: [],
    hasBaseline: true,
    // Reported once and then nothing for six weeks — the "stale" signal.
    progress: 21.0,
    planned: 34.8,
    contractValue: 47_200_000_000,
    deviation: -13.8,
    previousDeviation: -9.4,
    dataDate: "2026-07-19",
    reportAgeDays: 43,
    reportsDue: 3,
    reportsAwaitingReview: 0,
    openTickets: 0,
  },
  {
    projectId: "prj-0004",
    companyId: COMPANY,
    code: "JMB-SLR-01",
    name: "Jembatan Sungai Larangan",
    status: "active",
    hiddenModules: [],
    // Baselined but never reported — the "unreported" signal.
    hasBaseline: true,
    progress: 0,
    planned: 12.5,
    contractValue: 63_800_000_000,
    deviation: null,
    previousDeviation: null,
    dataDate: null,
    reportAgeDays: null,
    reportsDue: 2,
    reportsAwaitingReview: 0,
    openTickets: 0,
  },
  {
    projectId: "prj-0005",
    companyId: COMPANY,
    code: "PRM-HRP-03",
    name: "Perumahan Harapan Indah Tahap 3",
    status: "planning",
    hiddenModules: [],
    // No baseline yet — nothing can be measured against.
    hasBaseline: false,
    progress: 0,
    planned: 0,
    contractValue: 0,
    deviation: null,
    previousDeviation: null,
    dataDate: null,
    reportAgeDays: null,
    reportsDue: 0,
    reportsAwaitingReview: 0,
    openTickets: 2,
  },
  {
    projectId: "prj-0006",
    companyId: COMPANY,
    code: "RSU-MJL-01",
    name: "Rumah Sakit Umum Majalengka",
    status: "active",
    hiddenModules: [],
    // Ahead of plan and reporting on time: on the list only for open actions.
    hasBaseline: true,
    progress: 74.2,
    planned: 71.0,
    contractValue: 254_000_000_000,
    deviation: 3.2,
    previousDeviation: 1.8,
    dataDate: "2026-08-30",
    reportAgeDays: 1,
    reportsDue: 0,
    reportsAwaitingReview: 0,
    openTickets: 4,
  },
  {
    projectId: "prj-0007",
    companyId: COMPANY,
    code: "IPL-BDG-01",
    name: "Instalasi Pengolahan Air Limbah Bandung",
    status: "on_hold",
    hiddenModules: [],
    hasBaseline: true,
    progress: 44.6,
    planned: 58.2,
    contractValue: 96_400_000_000,
    deviation: -13.6,
    previousDeviation: -13.6,
    dataDate: "2026-08-16",
    reportAgeDays: 15,
    reportsDue: 2,
    reportsAwaitingReview: 1,
    openTickets: 2,
  },
  {
    projectId: "prj-0008",
    companyId: COMPANY,
    code: "SKL-GRT-02",
    name: "Sekolah Dasar Negeri Garut 2",
    status: "completed",
    hiddenModules: [],
    hasBaseline: true,
    progress: 100,
    planned: 100,
    contractValue: 18_600_000_000,
    deviation: 0,
    previousDeviation: -0.4,
    dataDate: "2026-06-28",
    reportAgeDays: 64,
    reportsDue: 0,
    reportsAwaitingReview: 0,
    openTickets: 0,
  },
];

/** Days without a report before a project reads as stale. */
export const STALE_AFTER_DAYS = 14;
