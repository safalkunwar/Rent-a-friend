/**
 * Canonical deep links for SATHI content.
 * The URL is derived ONLY from the real Firebase document ID.
 */
export function postUrl(postId: string): string {
  return `${window.location.origin}/post/${postId}`;
}
