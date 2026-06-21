// quick backend check for the rent ledger (REQ #3). Run: npx tsx scripts/rent-check.mts
import assert from "node:assert/strict";
import { summarize, viewPayments, paymentStatus, lateReminderBody } from "@/lib/payments";
import { payments, tenants } from "@/data/property-seed";

const s = summarize(payments);
console.log("summary:", JSON.stringify(s));
assert.equal(s.lateCount, 3, "expected 3 late payments (Oakfield/Millbrook/Elm rent)");
assert.equal(s.lateAmount, 1100 + 1450 + 1300, "late amount = sum of the 3 late rents");
assert.ok(s.pendingCount >= 2, "expected pending bills (water + council tax)");
assert.equal(s.collected, 1100 + 950, "collected rent = May Oak + Jun Quay paid");

const rows = viewPayments(payments);
assert.equal(rows[0].status, "late", "late sorts first");
assert.ok(rows[0].overdueDays >= rows[1].overdueDays || rows[1].status !== "late", "most-overdue first among late");

// the late reminder text
const late = payments.find((p) => p.id === "pay-oak-jun")!;
const t = tenants.find((x) => x.id === late.tenantId)!;
const body = lateReminderBody(t.name, late);
console.log("reminder:", body);
assert.ok(/overdue/.test(body) && /£1,100/.test(body));

assert.equal(paymentStatus(payments.find((p) => p.id === "pay-quay-jun")!), "paid");
console.log("\n✓ rent-check passed");
