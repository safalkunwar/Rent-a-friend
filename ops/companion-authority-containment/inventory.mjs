/** Pure redacted classifier: input IDs/fields stay in memory, output is aggregate counts only. */
const string = (fields, key) => fields?.[key]?.stringValue;
const boolean = (fields, key) => fields?.[key]?.booleanValue === true;
const bucket = (value, allowed) => allowed.includes(value) ? value : 'OTHER_OR_MISSING';
const increment = (target, key) => { target[key] = (target[key] ?? 0) + 1; };

export function summarizeAuthority({ users, companions, applications, admins }) {
  const counts = {
    users: users.size, companions: companions.size, applications: applications.size, admins: admins.size,
    userCompanionStatus: {}, applicationStatus: {},
    verifiedProfiles: 0, approvedUsers: 0, approvedApplications: 0,
    profileMissingUserId: 0, profileNoncanonicalUserId: 0, profileMissingUser: 0,
    profileStoredUserIdMatchesExistingUser: 0, profileIdCollidesWithDifferentUser: 0,
    noncanonicalProfileWithOccupiedTarget: 0, usersWithMultipleProfiles: 0,
    verifiedProfileWithoutApprovedUser: 0, approvedUserWithoutVerifiedCanonicalProfile: 0,
    profileWithApprovalPointer: 0, userWithApprovalPointer: 0, approvedApplicationWithMatchingPointers: 0,
    approvedApplicationMissingUser: 0, approvedApplicationWithNoncanonicalProfile: 0,
    usersWithMultipleApplications: 0, assignedKycReviewers: 0, assignedSuperAdmins: 0,
  };
  const appCountsByUid = new Map();
  const profilesByUid = new Map();
  for (const [id, fields] of companions) {
    const userId = string(fields, 'userId');
    if (!userId) counts.profileMissingUserId++;
    else if (userId !== id) counts.profileNoncanonicalUserId++;
    if (!users.has(userId || id)) counts.profileMissingUser++;
    if (userId && users.has(userId)) counts.profileStoredUserIdMatchesExistingUser++;
    if (userId && userId !== id && users.has(id)) counts.profileIdCollidesWithDifferentUser++;
    if (userId && userId !== id && companions.has(userId)) counts.noncanonicalProfileWithOccupiedTarget++;
    if (userId) {
      const matches = profilesByUid.get(userId) ?? [];
      matches.push(id);
      profilesByUid.set(userId, matches);
    }
    if (boolean(fields, 'isVerified')) {
      counts.verifiedProfiles++;
      if (string(users.get(userId || id), 'companionStatus') !== 'APPROVED') counts.verifiedProfileWithoutApprovedUser++;
    }
    if (string(fields, 'approvalApplicationId')) counts.profileWithApprovalPointer++;
  }
  for (const [id, fields] of users) {
    const status = bucket(string(fields, 'companionStatus'), ['NOT_APPLIED','PENDING','UNDER_REVIEW','CHANGES_REQUIRED','APPROVED','REJECTED']);
    increment(counts.userCompanionStatus, status);
    if (string(fields, 'companionApprovalApplicationId')) counts.userWithApprovalPointer++;
    if (status === 'APPROVED') {
      counts.approvedUsers++;
      if (!boolean(companions.get(id), 'isVerified')) counts.approvedUserWithoutVerifiedCanonicalProfile++;
    }
  }
  for (const [appId, fields] of applications) {
    const status = bucket(string(fields, 'status'), ['DRAFT','SUBMITTED','UNDER_REVIEW','CHANGES_REQUIRED','APPROVED','REJECTED']);
    increment(counts.applicationStatus, status);
    const uid = string(fields, 'userId');
    if (uid) appCountsByUid.set(uid, (appCountsByUid.get(uid) ?? 0) + 1);
    if (status === 'APPROVED') {
      counts.approvedApplications++;
      if (!users.has(uid)) counts.approvedApplicationMissingUser++;
      const profile = companions.get(uid);
      if (!profile && (profilesByUid.get(uid)?.length ?? 0) > 0) counts.approvedApplicationWithNoncanonicalProfile++;
      if (profile && string(users.get(uid), 'companionApprovalApplicationId') === appId &&
          string(profile, 'approvalApplicationId') === appId && boolean(profile, 'isVerified')) {
        counts.approvedApplicationWithMatchingPointers++;
      }
    }
  }
  counts.usersWithMultipleApplications = [...appCountsByUid.values()].filter(value => value > 1).length;
  counts.usersWithMultipleProfiles = [...profilesByUid.values()].filter(ids => ids.length > 1).length;
  for (const [, fields] of admins) {
    if (string(fields, 'role') === 'kyc_reviewer') counts.assignedKycReviewers++;
    if (string(fields, 'role') === 'super_admin') counts.assignedSuperAdmins++;
  }
  return counts;
}
