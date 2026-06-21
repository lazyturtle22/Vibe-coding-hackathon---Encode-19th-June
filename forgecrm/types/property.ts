// types/property.ts — the property-management domain model (the pivot).
//
// ForgeCRM is an AI-native CRM for private accommodation landlords. These are the core
// entities the five stakeholder requirements operate on. Plain TS interfaces; Zod schemas
// for AI-facing I/O live next to their routes (maintenance triage, Q&A extraction).

// ── The user (an individual housing provider) ───────────────────────────────
export type SubscriptionTier = "Standard" | "Pro"; // £40 / £90 per month (flat — no usage pricing)

export interface Landlord {
  id: string;
  name: string;
  email: string;
  tier: SubscriptionTier;
}

// ── Properties ───────────────────────────────────────────────────────────────
export type PropertyType = "flat" | "house" | "studio" | "room";
export type PropertyStatus = "occupied" | "vacant" | "listed";

export interface Property {
  id: string;
  landlordId: string;
  label: string;            // short name, e.g. "12 Oakfield Rd, Flat 2"
  addressLine: string;
  city: string;
  postcode: string;
  type: PropertyType;
  bedrooms: number;
  status: PropertyStatus;
  monthlyRent: number;      // GBP — the advertised/contracted rent
  marketRent: number;       // GBP — estimated market rate (deck: "rent above market rate")
}

// ── People ───────────────────────────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  propertyId: string | null; // current property (null = prospect / former)
}

// ── Tenancies (the billed/managed relationship) ──────────────────────────────
export type TenancyStatus = "active" | "upcoming" | "ended";

export interface Tenancy {
  id: string;
  propertyId: string;
  tenantIds: string[];
  startDate: string;        // ISO
  endDate: string;          // ISO
  monthlyRent: number;      // GBP
  rentDueDay: number;       // day of month rent is due, 1–28
  depositAmount: number;    // GBP held
  status: TenancyStatus;
}

// ── Payments: rent, deposit, bills (REQ #3) ──────────────────────────────────
export type PaymentType = "rent" | "deposit" | "bill";
/** Stored status; "late" is derived from dueDate vs today when unpaid (see lib/payments). */
export type PaymentStatus = "pending" | "paid" | "late";

export interface Payment {
  id: string;
  tenancyId: string;
  tenantId: string;
  type: PaymentType;
  label: string;            // "Rent — Jun 2026", "Water bill", "Deposit"
  amount: number;           // GBP
  dueDate: string;          // ISO
  paidDate: string | null;  // ISO when paid, else null
}

// ── Maintenance (REQ #4) ─────────────────────────────────────────────────────
export type MaintenanceCategory =
  | "plumbing"
  | "electrical"
  | "heating"
  | "appliance"
  | "structural"
  | "pest"
  | "other";

export type MaintenanceStatus = "open" | "triaged" | "escalated" | "resolved";

/** AI/deterministic triage output for a maintenance request. */
export interface MaintenanceTriage {
  category: MaintenanceCategory;
  urgency: "low" | "medium" | "high" | "emergency";
  solutionSteps: string[];      // ideal self-serve / first-response steps
  photosToRequest: string[];    // "Photograph the leak under the sink", "the boiler pressure gauge"
  escalate: boolean;            // escalate to personal management?
  summary: string;              // one-line summary for the landlord if escalated
}

export interface MaintenanceRequest {
  id: string;
  propertyId: string;
  tenantId: string;
  title: string;
  description: string;
  photos: string[];             // labels of photos the tenant has submitted
  status: MaintenanceStatus;
  triage: MaintenanceTriage | null;
  createdAt: string;            // ISO
}

// ── Notices / scheduled messages (REQ #5) ────────────────────────────────────
export type NoticeChannel = "sms" | "email";
export type NoticeStatus = "scheduled" | "sent";
/** "property" = all tenants of a property; "tenant" = one tenant; "all" = whole portfolio. */
export type NoticeTargetKind = "all" | "property" | "tenant";

export interface Notice {
  id: string;
  targetKind: NoticeTargetKind;
  targetId: string | null;      // propertyId or tenantId (null when targetKind === "all")
  channel: NoticeChannel;
  body: string;
  scheduledFor: string;         // ISO — when it should send
  sentAt: string | null;        // ISO when sent, else null
  status: NoticeStatus;
  auto: boolean;                // true if generated automatically (e.g. late-rent reminder)
}

// ── Social acquisition leads (REQ #1) ────────────────────────────────────────
export type SocialPlatform = "X" | "LinkedIn" | "Reddit" | "Facebook" | "Gumtree" | "PropertyForum";
export type LeadContactStatus = "new" | "saved" | "contacted" | "converted";

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  author: string;
  handle: string;
  text: string;
  postedAt: string;             // ISO
  location: string;             // regional signal (deck: "regional market knowledge")
  terms: string[];              // search terms this post matches
  intent: "looking-to-let" | "tenant-seeking" | "landlord-frustration" | "market-question";
  contactStatus: LeadContactStatus;
}

// ── Chat-log Q&A agent (REQ #2) ──────────────────────────────────────────────
export interface ChatLog {
  id: string;
  title: string;
  participants: string[];
  messages: { role: "client" | "landlord"; name: string; text: string; at: string }[];
  processed: boolean;           // has Q&A extraction run on it?
}

export interface QAEntry {
  id: string;
  question: string;
  solution: string;             // what the landlord/salesperson answered
  tags: string[];
  sourceLogId: string | null;
  createdAt: string;
}

// ── Label maps (UI convenience) ──────────────────────────────────────────────
export const PROPERTY_STATUS_LABEL: Record<PropertyStatus, string> = {
  occupied: "Occupied",
  vacant: "Vacant",
  listed: "Listed",
};

export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  rent: "Rent",
  deposit: "Deposit",
  bill: "Bill",
};

export const MAINTENANCE_CATEGORY_LABEL: Record<MaintenanceCategory, string> = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  heating: "Heating",
  appliance: "Appliance",
  structural: "Structural",
  pest: "Pest control",
  other: "Other",
};

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  X: "X",
  LinkedIn: "LinkedIn",
  Reddit: "Reddit",
  Facebook: "Facebook",
  Gumtree: "Gumtree",
  PropertyForum: "Property forum",
};
