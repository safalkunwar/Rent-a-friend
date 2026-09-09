/** Patch only the deployed Community comment contract, preserving other branches. */
export function patchCommentRules(source) {
  const replaceOnce = (before, after) => {
    if (source.split(before).length !== 2) throw new Error('Production rule baseline changed; review required.');
    source = source.replace(before, after);
  };
  replaceOnce('match /community_posts/{postId} {', `match /community_posts/{postId} {
      function pairedCommentDelta() {
        let id = request.resource.data.get('lastCommentMutationId', '');
        let path = /databases/$(database)/documents/comments/$(id);
        let before = resource.data.get('commentsCount', 0);
        let after = request.resource.data.commentsCount;
        return isAuthenticated() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['commentsCount','lastCommentMutationId','updatedAt']) &&
          before is int && after is int && after >= 0 &&
          ((!exists(path) && existsAfter(path) && getAfter(path).data.userId == request.auth.uid &&
            getAfter(path).data.postId == postId && after == before + 1) ||
           (exists(path) && !existsAfter(path) && get(path).data.userId == request.auth.uid &&
            get(path).data.postId == postId && after == before - 1));
      }
      allow update: if pairedCommentDelta();`);
  replaceOnce("hasOnly(['likesCount', 'commentsCount', 'updatedAt'])", "hasOnly(['likesCount', 'updatedAt'])");
  const start = source.indexOf('    match /comments/{commentId} {');
  const end = source.indexOf('\n    // Companion Applications:', start);
  if (start < 0 || end < 0) throw new Error('Comment branch boundary missing.');
  source = source.slice(0, start) + `    match /comments/{commentId} {
      function paired(delta) {
        let post = /databases/$(database)/documents/community_posts/$(delta == 1 ? request.resource.data.postId : resource.data.postId);
        return getAfter(post).data.lastCommentMutationId == commentId &&
          getAfter(post).data.commentsCount == get(post).data.get('commentsCount',0) + delta;
      }
      allow read: if true;
      allow create: if isAuthenticated() && request.auth.uid == request.resource.data.userId &&
        request.resource.data.id == commentId && request.resource.data.createdAt == request.time &&
        request.resource.data.text is string && request.resource.data.text.size() > 0 && request.resource.data.text.size() <= 500 &&
        request.resource.data.keys().hasOnly(['id','postId','userId','userName','userAvatar','text','createdAt','parentId']) &&
        get(/databases/$(database)/documents/community_posts/$(request.resource.data.postId)).data.status == 'published' && paired(1);
      allow update: if isAuthenticated() && request.auth.uid == resource.data.userId &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['text']) &&
        request.resource.data.text is string && request.resource.data.text.size() > 0 && request.resource.data.text.size() <= 500;
      allow delete: if isAuthenticated() && request.auth.uid == resource.data.userId &&
        (paired(-1) || get(/databases/$(database)/documents/community_posts/$(resource.data.postId)).data.get('commentsCount',0) == 0);
      allow create, update, delete: if isAdmin();
    }
` + source.slice(end);
  return source;
}

export const commentIndex = { queryScope: 'COLLECTION', fields: [
  { fieldPath: 'postId', order: 'ASCENDING' },
  { fieldPath: 'createdAt', order: 'DESCENDING' },
  { fieldPath: '__name__', order: 'DESCENDING' },
] };
