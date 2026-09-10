import { createHash } from 'node:crypto';

export const BASELINE_HASH = '5e1552736ce1357c83a1447161fdc75741fbc5430dd50a0bf3897f230fe95013';

// Local candidate only: no unrelated production policy changes.
export function patchMessagingFavoritesRules(source) {
  if (createHash('sha256').update(source).digest('hex') !== BASELINE_HASH) {
    throw new Error('Production baseline hash mismatch; review drift before patching.');
  }
  const crlf = source.includes('\r\n');
  let rules = source.replace(/\r\n/g, '\n');
  const favorites = `      // Subcollection for user favorites
      match /favorites/{favoriteId} {
        allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
        allow create, delete: if isAuthenticated() && request.auth.uid == userId;
        allow create, delete: if isAdmin();
        allow write: if isAuthenticated();
      }`;
  if (rules.split(favorites).length !== 2) throw new Error('Favorites branch mismatch');
  rules = rules.replace(favorites, favorites
    .replace('allow create, delete: if isAuthenticated()', 'allow create, update, delete: if isAuthenticated()')
    .replace('\n        allow write: if isAuthenticated();', ''));

  const start = rules.indexOf('    // Conversations Collection:');
  const end = rules.indexOf('    // Messages Collection:', start);
  if (start < 0 || end < start) throw new Error('Conversation branch mismatch');
  rules = rules.slice(0, start) + `    // Conversations Collection: /conversations/{conversationId}
    // Stored membership is authoritative, including historical opaque IDs.
    // Only records without membership use the unambiguous two-part legacy ID.
    function sathiConversationMember(conversationId, data) {
      let members = data.get('participantIds', null);
      let parts = conversationId.split('_');
      return members != null
        ? (members is list && request.auth.uid in members)
        : (!('participantIds' in data) && parts.size() == 2 &&
           parts[0].size() > 0 && parts[1].size() > 0 && parts[0] != parts[1] &&
           request.auth.uid in parts);
    }

    function sathiExistingConversationMember(conversationId) {
      let path = /databases/$(database)/documents/conversations/$(conversationId);
      return exists(path) && sathiConversationMember(conversationId, get(path).data);
    }

    match /conversations/{conversationId} {
      // Create-if-absent transactions may read missing parents, never private data.
      allow get: if isAuthenticated() && resource == null;
      allow get: if isAuthenticated() &&
        (isAdmin() || sathiConversationMember(conversationId, resource.data));
      // Direct array predicate is provable from the existing array-contains query.
      // Legacy ID fallback is get-only, never an unconstrained collection scan.
      allow list: if isAuthenticated() && (isAdmin() ||
        resource.data.participantIds.hasAny([request.auth.uid]));

      function validNewPair() {
        let data = request.resource.data;
        let members = data.get('participantIds', null);
        return members is list && members.size() == 2 &&
          members[0] is string && members[1] is string &&
          members[0].size() > 0 && members[1].size() > 0 && members[0] != members[1] &&
          request.auth.uid in members && data.id == conversationId &&
          (conversationId == members[0] + '_' + members[1] ||
           conversationId == members[1] + '_' + members[0]);
      }
      allow create: if isAuthenticated() && validNewPair() && isValidData(request.resource.data);

      // Inherited staff authority unchanged: this is NOT an RBAC fix.
      allow create, update, delete: if isAdmin();
      allow update: if isAuthenticated() &&
        sathiConversationMember(conversationId, resource.data) &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['lastMessage', 'unreadCount', 'updatedAt']) &&
        isValidData(request.resource.data);

      match /typing/{userId} {
        allow read: if isAuthenticated() &&
          sathiExistingConversationMember(conversationId);
        allow create, update, delete: if isAuthenticated() && request.auth.uid == userId &&
          sathiExistingConversationMember(conversationId);
      }
    }

` + rules.slice(end);

  // Preserve message payload/admin behavior; replace membership guards only.
  const messageStart = rules.indexOf('    // Messages Collection:');
  const messageEnd = rules.indexOf('    // Notifications Collection:', messageStart);
  let messages = rules.slice(messageStart, messageEnd);
  const existing = `(resource != null && request.auth.uid in resource.data.conversationId.split('_')) ||
        (resource != null && exists(/databases/$(database)/documents/conversations/$(resource.data.conversationId)) && request.auth.uid in get(/databases/$(database)/documents/conversations/$(resource.data.conversationId)).data.participantIds)`;
  if (messages.split(existing).length !== 3) throw new Error('Message read/update guards mismatch');
  messages = messages.replaceAll(existing,
    '(resource != null && sathiExistingConversationMember(resource.data.conversationId))');
  const creating = `request.auth.uid in request.resource.data.conversationId.split('_') ||
                      (exists(/databases/$(database)/documents/conversations/$(request.resource.data.conversationId)) && request.auth.uid in get(/databases/$(database)/documents/conversations/$(request.resource.data.conversationId)).data.participantIds)`;
  if (messages.split(creating).length !== 2) throw new Error('Message create guard mismatch');
  messages = messages.replace(creating, 'sathiExistingConversationMember(request.resource.data.conversationId)');
  rules = rules.slice(0, messageStart) + messages + rules.slice(messageEnd);
  return crlf ? rules.replace(/\n/g, '\r\n') : rules;
}
