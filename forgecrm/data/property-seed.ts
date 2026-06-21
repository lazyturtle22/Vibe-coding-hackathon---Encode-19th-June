// data/property-seed.ts — seeded demo data for the property pivot.
//
// Engineered so each of the 5 stakeholder requirements has a clear story:
//  - REQ#3 rent: 3 late payments + pending + paid across the portfolio.
//  - REQ#4 maintenance: one emergency that escalates, plus routine ones.
//  - REQ#5 notices: scheduled + already-sent, incl. an auto late-rent reminder.
//  - REQ#1 aggregator: a corpus of posts across platforms with search terms.
//  - REQ#2 Q&A: chat logs + extracted question/solution pairs.
//
// TODAY is fixed so "late" / scheduling is deterministic (mirrors the old BILLING_NOW).

import type {
  ChatLog,
  Landlord,
  MaintenanceRequest,
  Notice,
  Payment,
  Property,
  QAEntry,
  SocialPost,
  Tenancy,
  Tenant,
} from "@/types/property";

/** Fixed "today" for deterministic late-payment / scheduling logic. */
export const TODAY = new Date("2026-06-21T00:00:00Z");

export const landlord: Landlord = {
  id: "ll-1",
  name: "Sam Okonkwo",
  email: "sam@okonkwolets.example",
  tier: "Pro",
};

export const properties: Property[] = [
  { id: "p-oak2", landlordId: "ll-1", label: "12 Oakfield Rd · Flat 2", addressLine: "12 Oakfield Road, Flat 2", city: "Leeds", postcode: "LS6 2AB", type: "flat", bedrooms: 2, status: "occupied", monthlyRent: 1100, marketRent: 1250 },
  { id: "p-mill", landlordId: "ll-1", label: "5 Millbrook Terrace", addressLine: "5 Millbrook Terrace", city: "Leeds", postcode: "LS4 1XQ", type: "house", bedrooms: 3, status: "occupied", monthlyRent: 1450, marketRent: 1500 },
  { id: "p-quay", landlordId: "ll-1", label: "Quay Point · Apt 14", addressLine: "Quay Point, Apartment 14", city: "Leeds", postcode: "LS1 4HR", type: "flat", bedrooms: 1, status: "occupied", monthlyRent: 950, marketRent: 1050 },
  { id: "p-elm", landlordId: "ll-1", label: "28 Elmwood Ave", addressLine: "28 Elmwood Avenue", city: "Bradford", postcode: "BD9 4PS", type: "house", bedrooms: 4, status: "occupied", monthlyRent: 1300, marketRent: 1400 },
  { id: "p-studio", landlordId: "ll-1", label: "Carlton House · Studio 3", addressLine: "Carlton House, Studio 3", city: "Leeds", postcode: "LS2 9NZ", type: "studio", bedrooms: 0, status: "vacant", monthlyRent: 725, marketRent: 800 },
  { id: "p-rose", landlordId: "ll-1", label: "9 Rosebank Close", addressLine: "9 Rosebank Close", city: "Wakefield", postcode: "WF1 3LD", type: "house", bedrooms: 3, status: "listed", monthlyRent: 1150, marketRent: 1200 },
];

export const tenants: Tenant[] = [
  { id: "t-amelia", name: "Amelia Hart", email: "amelia.hart@example.com", phone: "+44 7700 900101", propertyId: "p-oak2" },
  { id: "t-jon", name: "Jon Reyes", email: "jon.reyes@example.com", phone: "+44 7700 900102", propertyId: "p-oak2" },
  { id: "t-priya", name: "Priya Bhatt", email: "priya.bhatt@example.com", phone: "+44 7700 900103", propertyId: "p-mill" },
  { id: "t-deniz", name: "Deniz Yilmaz", email: "deniz.yilmaz@example.com", phone: "+44 7700 900104", propertyId: "p-quay" },
  { id: "t-grace", name: "Grace Owusu", email: "grace.owusu@example.com", phone: "+44 7700 900105", propertyId: "p-elm" },
];

export const tenancies: Tenancy[] = [
  { id: "ten-oak2", propertyId: "p-oak2", tenantIds: ["t-amelia", "t-jon"], startDate: "2025-09-01T00:00:00Z", endDate: "2026-08-31T00:00:00Z", monthlyRent: 1100, rentDueDay: 1, depositAmount: 1270, status: "active" },
  { id: "ten-mill", propertyId: "p-mill", tenantIds: ["t-priya"], startDate: "2024-11-15T00:00:00Z", endDate: "2026-11-14T00:00:00Z", monthlyRent: 1450, rentDueDay: 15, depositAmount: 1670, status: "active" },
  { id: "ten-quay", propertyId: "p-quay", tenantIds: ["t-deniz"], startDate: "2026-02-01T00:00:00Z", endDate: "2027-01-31T00:00:00Z", monthlyRent: 950, rentDueDay: 1, depositAmount: 1095, status: "active" },
  { id: "ten-elm", propertyId: "p-elm", tenantIds: ["t-grace"], startDate: "2025-06-01T00:00:00Z", endDate: "2026-05-31T00:00:00Z", monthlyRent: 1300, rentDueDay: 5, depositAmount: 1500, status: "active" },
];

// Payments — TODAY is 2026-06-21. Late = unpaid & dueDate < today.
export const payments: Payment[] = [
  // Oakfield: June rent LATE (due 1 Jun, unpaid), May paid, deposit paid.
  { id: "pay-oak-jun", tenancyId: "ten-oak2", tenantId: "t-amelia", type: "rent", label: "Rent — Jun 2026", amount: 1100, dueDate: "2026-06-01T00:00:00Z", paidDate: null },
  { id: "pay-oak-may", tenancyId: "ten-oak2", tenantId: "t-amelia", type: "rent", label: "Rent — May 2026", amount: 1100, dueDate: "2026-05-01T00:00:00Z", paidDate: "2026-05-02T00:00:00Z" },
  { id: "pay-oak-dep", tenancyId: "ten-oak2", tenantId: "t-amelia", type: "deposit", label: "Deposit", amount: 1270, dueDate: "2025-09-01T00:00:00Z", paidDate: "2025-08-28T00:00:00Z" },
  // Millbrook: June rent due 15 Jun → LATE; water bill pending (due 25 Jun, future).
  { id: "pay-mill-jun", tenancyId: "ten-mill", tenantId: "t-priya", type: "rent", label: "Rent — Jun 2026", amount: 1450, dueDate: "2026-06-15T00:00:00Z", paidDate: null },
  { id: "pay-mill-water", tenancyId: "ten-mill", tenantId: "t-priya", type: "bill", label: "Water bill — Q2", amount: 96, dueDate: "2026-06-25T00:00:00Z", paidDate: null },
  // Quay: June rent PAID on time.
  { id: "pay-quay-jun", tenancyId: "ten-quay", tenantId: "t-deniz", type: "rent", label: "Rent — Jun 2026", amount: 950, dueDate: "2026-06-01T00:00:00Z", paidDate: "2026-06-01T00:00:00Z" },
  // Elm: June rent due 5 Jun → LATE (the third late one); council tax bill pending.
  { id: "pay-elm-jun", tenancyId: "ten-elm", tenantId: "t-grace", type: "rent", label: "Rent — Jun 2026", amount: 1300, dueDate: "2026-06-05T00:00:00Z", paidDate: null },
  { id: "pay-elm-ctax", tenancyId: "ten-elm", tenantId: "t-grace", type: "bill", label: "Council tax top-up", amount: 140, dueDate: "2026-06-28T00:00:00Z", paidDate: null },
];

export const maintenanceRequests: MaintenanceRequest[] = [
  {
    id: "mnt-leak", propertyId: "p-mill", tenantId: "t-priya",
    title: "Water leak under kitchen sink",
    description: "There's water pooling in the cupboard under the kitchen sink and a damp smell. Seems to get worse when the tap runs.",
    photos: [], status: "open", triage: null, createdAt: "2026-06-20T09:12:00Z",
  },
  {
    id: "mnt-boiler", propertyId: "p-oak2", tenantId: "t-amelia",
    title: "No hot water — boiler showing error",
    description: "Boiler is showing an F1 error and we have no hot water since this morning. Pressure gauge looks low.",
    photos: ["Boiler error display"], status: "escalated",
    triage: {
      category: "heating", urgency: "high",
      solutionSteps: ["Check the boiler pressure gauge reads 1.0–1.5 bar", "If low, re-pressurise using the filling loop", "Reset the boiler via the reset button and wait 2 minutes"],
      photosToRequest: ["The boiler pressure gauge", "The boiler error display close-up"],
      escalate: true,
      summary: "Oakfield Flat 2: boiler F1 + low pressure, no hot water. Self-reset steps sent; likely needs a Gas Safe engineer — escalated.",
    },
    createdAt: "2026-06-19T08:03:00Z",
  },
  {
    id: "mnt-window", propertyId: "p-elm", tenantId: "t-grace",
    title: "Bedroom window won't close fully",
    description: "The big bedroom window doesn't close flush anymore, there's a draft.",
    photos: [], status: "triaged",
    triage: {
      category: "structural", urgency: "low",
      solutionSteps: ["Check the hinge screws are tight", "Clear any debris from the frame channel"],
      photosToRequest: ["The window hinge", "The gap when the window is shut"],
      escalate: false,
      summary: "",
    },
    createdAt: "2026-06-15T17:40:00Z",
  },
];

export const notices: Notice[] = [
  // Auto late-rent reminders already sent.
  { id: "ntc-late-oak", targetKind: "tenant", targetId: "t-amelia", channel: "sms", body: "Hi Amelia, a friendly reminder that June rent (£1,100) is now overdue. Please arrange payment or reply to discuss. — Sam", scheduledFor: "2026-06-08T09:00:00Z", sentAt: "2026-06-08T09:00:00Z", status: "sent", auto: true },
  // Scheduled portfolio-wide notice (future).
  { id: "ntc-gas", targetKind: "all", targetId: null, channel: "email", body: "Annual gas safety checks are due next month. We'll be in touch to arrange a convenient time for each property.", scheduledFor: "2026-07-01T08:00:00Z", sentAt: null, status: "scheduled", auto: false },
  // Scheduled per-property notice (future).
  { id: "ntc-bins", targetKind: "property", targetId: "p-mill", channel: "sms", body: "Reminder: bin collection at Millbrook Terrace moves to Thursdays from next week.", scheduledFor: "2026-06-23T18:00:00Z", sentAt: null, status: "scheduled", auto: false },
];

// REQ#1 — social acquisition corpus (searched by term + platform).
export const socialPosts: SocialPost[] = [
  { id: "sp-1", platform: "Reddit", author: "u/leeds_renter", handle: "r/Leeds", text: "Anyone know a good landlord in LS6? Looking for a 2-bed flat near the uni from September, fed up with agencies.", postedAt: "2026-06-20T11:00:00Z", location: "Leeds LS6", terms: ["2-bed", "LS6", "September", "flat"], intent: "tenant-seeking", contactStatus: "new" },
  { id: "sp-2", platform: "Facebook", author: "Hannah M.", handle: "Leeds Flatshare & Rentals", text: "Two young professionals after a 1 or 2 bed in central Leeds, budget ~£1000pcm, moving July. DM us!", postedAt: "2026-06-19T15:30:00Z", location: "Leeds LS1", terms: ["1-bed", "2-bed", "central Leeds", "July"], intent: "tenant-seeking", contactStatus: "new" },
  { id: "sp-3", platform: "X", author: "@bradford_lets", handle: "@bradford_lets", text: "Family of 4 relocating to Bradford for work, need a 3/4 bed house BD9 area, long let preferred.", postedAt: "2026-06-18T09:10:00Z", location: "Bradford BD9", terms: ["4-bed", "BD9", "house", "long let"], intent: "tenant-seeking", contactStatus: "saved" },
  { id: "sp-4", platform: "PropertyForum", author: "NorthernHost", handle: "landlordforum.co.uk", text: "How are people in West Yorkshire getting above-market rent? Agencies keep undervaluing my Leeds flats.", postedAt: "2026-06-17T20:05:00Z", location: "West Yorkshire", terms: ["above-market", "Leeds", "rent"], intent: "landlord-frustration", contactStatus: "new" },
  { id: "sp-5", platform: "Gumtree", author: "K. Patel", handle: "Gumtree · Wakefield", text: "Professional couple looking to rent a 2/3 bed in Wakefield WF1, available now, references ready.", postedAt: "2026-06-21T08:45:00Z", location: "Wakefield WF1", terms: ["3-bed", "WF1", "Wakefield"], intent: "tenant-seeking", contactStatus: "new" },
  { id: "sp-6", platform: "Reddit", author: "u/student_ldn_to_leeds", handle: "r/UniversityOfLeeds", text: "3 students need a house share LS6/LS4 for next year, 3-4 bedrooms, sub £450pp.", postedAt: "2026-06-16T13:22:00Z", location: "Leeds LS4", terms: ["house share", "LS4", "LS6", "4-bed"], intent: "tenant-seeking", contactStatus: "new" },
];

export const chatLogs: ChatLog[] = [
  {
    id: "log-amelia", title: "Amelia Hart — pre-tenancy questions", participants: ["Amelia Hart", "Sam Okonkwo"], processed: true,
    messages: [
      { role: "client", name: "Amelia", text: "Is the Oakfield flat furnished, and are bills included in the rent?", at: "2025-08-10T10:00:00Z" },
      { role: "landlord", name: "Sam", text: "It's part-furnished (white goods, sofa, beds). Bills aren't included — tenants cover utilities and council tax. Rent is £1,100/mo.", at: "2025-08-10T10:04:00Z" },
      { role: "client", name: "Amelia", text: "Do you allow a cat?", at: "2025-08-10T10:06:00Z" },
      { role: "landlord", name: "Sam", text: "One well-behaved cat is fine with an additional £150 to the deposit and a pet clause in the contract.", at: "2025-08-10T10:09:00Z" },
    ],
  },
  {
    id: "log-deniz", title: "Deniz Yilmaz — viewing & deposit", participants: ["Deniz Yilmaz", "Sam Okonkwo"], processed: true,
    messages: [
      { role: "client", name: "Deniz", text: "How much deposit do you take and when do I get it back?", at: "2026-01-20T14:00:00Z" },
      { role: "landlord", name: "Sam", text: "Deposit is 5 weeks' rent, protected in the DPS scheme, returned within 10 days of checkout minus any agreed deductions.", at: "2026-01-20T14:03:00Z" },
      { role: "client", name: "Deniz", text: "Can I move in early if it's ready?", at: "2026-01-20T14:05:00Z" },
      { role: "landlord", name: "Sam", text: "If it passes the inventory check we can bring the start date forward and pro-rata the first month's rent.", at: "2026-01-20T14:08:00Z" },
    ],
  },
];

export const qaEntries: QAEntry[] = [
  { id: "qa-1", question: "Are bills included in the rent?", solution: "No — tenants cover utilities and council tax; rent is the headline figure only.", tags: ["bills", "rent", "onboarding"], sourceLogId: "log-amelia", createdAt: "2025-08-10T10:05:00Z" },
  { id: "qa-2", question: "Do you allow pets?", solution: "One well-behaved pet is allowed with +£150 to the deposit and a pet clause in the contract.", tags: ["pets", "deposit", "contract"], sourceLogId: "log-amelia", createdAt: "2025-08-10T10:10:00Z" },
  { id: "qa-3", question: "How much deposit and when is it returned?", solution: "5 weeks' rent, protected in the DPS scheme, returned within 10 days of checkout minus agreed deductions.", tags: ["deposit", "checkout"], sourceLogId: "log-deniz", createdAt: "2026-01-20T14:04:00Z" },
  { id: "qa-4", question: "Can a tenant move in early?", solution: "Yes, if the inventory check passes — bring the start date forward and pro-rata the first month's rent.", tags: ["move-in", "rent"], sourceLogId: "log-deniz", createdAt: "2026-01-20T14:09:00Z" },
];
