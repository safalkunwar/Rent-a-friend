import { patchPayments } from './patch.mjs';
import { patchAssignments, originalAssignments, containedAssignments } from '../staff-containment/assignment-patch.mjs';

export function composeContainment(baseline) {
  // Validate both isolated patches against the SAME exact production baseline.
  patchAssignments(baseline);
  return patchPayments(baseline).replace(originalAssignments, containedAssignments);
}
