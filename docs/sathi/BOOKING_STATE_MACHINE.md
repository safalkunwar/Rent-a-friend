# Canonical booking policy — P0-E

Policy source: src/services/bookingPolicy.json; client helpers consume it and a regression check requires the Firestore transition block to match. No component defines an alternate policy. Status names preserve the actual application: pending, confirmed, active, completed, cancelled. Draft is unsaved form state, not a reservation. Decline maps to cancelled.

| From -> to | Actor | Lock | Payment |
| --- | --- | --- | --- |
| unsaved -> pending | authenticated booker, approved canonical companion | atomic booking + exclusive companion/date lock | not_started, no payment claimed |
| pending -> confirmed | companion/operator | same lock confirmed | remains unverified; confirmation is reservation acceptance only |
| pending/confirmed -> cancelled | booker/companion/operator | retained cancellation record, reusable only with matching cancelled booking | no refund/settlement implied |
| confirmed -> active | companion/operator, not before start | retained active lock | unchanged |
| active -> completed | companion/operator, not before end | retained completed day lock | unchanged, completion is not payment evidence |
| active -> cancelled | operator only | retained cancelled lock | manual financial review required |
| completed/cancelled -> any | none | terminal | no client financial mutation |

Reservation identity remains lock_COMPANION_YYYY_MM_DD, matching existing date locks. New reservations require companion document ID == its authenticated owner UID, and approved user status. Noncanonical legacy companion IDs and orphan legacy locks fail closed until an approved inventory/migration; never silently bypass them. New policyVersion=2 stores companionUid, startAt and integer NPR-paisa quote. New bookings cannot modify quote, participants, ownership, date, payment or duration after creation; rescheduling is cancellation plus a new request.

The same stable form-generated booking ID is reused after retry/lost acknowledgement. Reusing an ID with different intent is rejected. The transaction re-reads the authoritative public rate and companion state, and rules revalidate price/actor/lock. Follow-up conversation/notification failure must not erase or report failure of a committed reservation.

Concurrency guarantee is conservative day-level exclusion, including overlapping time requests. There is no automatic expiry or TTL cleanup. Operators/participants explicitly cancel abandoned pending reservations. Spark supports these Firestore transactions/rules within quotas; production abuse controls, expiry scheduling, payment verification and independent load/device qualification require further work. Existing Functions remain paused.
