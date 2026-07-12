import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onUserCreated, onUserDeleted } from "firebase-functions/v2/auth";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

admin.initializeApp();

setGlobalOptions({ region: "us-central1", maxInstances: 10 });

// --- Authentication & User Management ---

export const onUserCreate = onUserCreated(async (event) => {
  const user = event.data;
  if (!user) return;

  const { uid, email, displayName, photoURL } = user;

  try {
    // 1. Create Firestore user profile
    await admin.firestore().collection("users").doc(uid).set({
      id: uid,
      email: email || "",
      name: displayName || "",
      avatar: photoURL || "",
      role: "customer",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      preferences: {},
      isVerified: false
    });

    // 2. Set custom claim
    await admin.auth().setCustomUserClaims(uid, { role: "customer" });
    logger.info(`User profile and claims created for ${uid}`);
  } catch (error) {
    logger.error(`Error in onUserCreate for ${uid}:`, error);
  }
});

export const onUserDelete = onUserDeleted(async (event) => {
  const user = event.data;
  if (!user) return;

  try {
    await admin.firestore().collection("users").doc(user.uid).delete();
    logger.info(`User profile deleted for ${user.uid}`);
  } catch (error) {
    logger.error(`Error in onUserDelete for ${user.uid}:`, error);
  }
});

export const setUserRole = onCall(async (request) => {
  // Verify admin status
  if (!request.auth || !request.auth.token.admin) {
    throw new HttpsError("permission-denied", "Only admins can set user roles.");
  }

  const { uid, role } = request.data;
  if (!uid || !["customer", "companion", "admin"].includes(role)) {
    throw new HttpsError("invalid-argument", "Invalid UID or role.");
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    await admin.firestore().collection("users").doc(uid).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, message: `Role ${role} set for user ${uid}` };
  } catch (error) {
    logger.error(`Error in setUserRole for ${uid}:`, error);
    throw new HttpsError("internal", "Failed to set user role.");
  }
});

// --- Booking Management ---

export const onBookingCreate = onDocumentCreated("bookings/{bookingId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const bookingData = snapshot.data();
  const bookingId = event.params.bookingId;

  try {
    // Initial validation and commission calculation logic would go here
    // For now, we initialize status and timestamps if missing
    await snapshot.ref.update({
      paymentStatus: "pending",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create notification for companion
    if (bookingData.companionId) {
      await admin.firestore().collection("notifications").add({
        userId: bookingData.companionId,
        title: "New Booking Request",
        message: "You have a new booking request. Please review and confirm.",
        type: "booking_request",
        relatedId: bookingId,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    logger.error(`Error in onBookingCreate for ${bookingId}:`, error);
  }
});

export const onBookingUpdate = onDocumentUpdated("bookings/{bookingId}", async (event) => {
  const change = event.data;
  if (!change) return;

  const before = change.before.data();
  const after = change.after.data();
  const bookingId = event.params.bookingId;

  if (before.status === after.status) return;

  try {
    // Handle status transitions
    if (after.status === "completed" && after.companionId) {
      // Update companion stats
      const companionRef = admin.firestore().collection("companions").doc(after.companionId);
      await admin.firestore().runTransaction(async (transaction) => {
        const companionDoc = await transaction.get(companionRef);
        if (companionDoc.exists) {
          const completedCount = (companionDoc.data()?.completedBookings || 0) + 1;
          transaction.update(companionRef, { completedBookings: completedCount });
        }
      });

      // Notify user to leave a review
      await admin.firestore().collection("notifications").add({
        userId: after.userId,
        title: "Booking Completed",
        message: "Your booking is complete. Please take a moment to leave a review.",
        type: "review_request",
        relatedId: bookingId,
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    logger.error(`Error in onBookingUpdate for ${bookingId}:`, error);
  }
});

// --- Messaging ---

export const onMessageCreate = onDocumentCreated("conversations/{conversationId}/messages/{messageId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const messageData = snapshot.data();
  const { conversationId } = event.params;

  try {
    // Update parent conversation
    await admin.firestore().collection("conversations").doc(conversationId).update({
      lastMessage: {
        text: messageData.text || (messageData.imageUrl ? "Sent an image" : "New message"),
        senderId: messageData.senderId,
        timestamp: messageData.createdAt || admin.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // In a real app, we'd also send push notifications here
  } catch (error) {
    logger.error(`Error in onMessageCreate for ${conversationId}:`, error);
  }
});

// --- Reviews & Ratings ---

export const onReviewCreate = onDocumentCreated("reviews/{reviewId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const reviewData = snapshot.data();
  const { companionId, rating } = reviewData;

  if (!companionId || typeof rating !== "number") return;

  const companionRef = admin.firestore().collection("companions").doc(companionId);

  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const companionDoc = await transaction.get(companionRef);
      if (companionDoc.exists) {
        const data = companionDoc.data()!;
        const oldCount = data.reviewsCount || 0;
        const oldRating = data.rating || 0;
        
        const newCount = oldCount + 1;
        const newRating = (oldRating * oldCount + rating) / newCount;

        transaction.update(companionRef, {
          reviewsCount: newCount,
          rating: newRating,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
  } catch (error) {
    logger.error(`Error in onReviewCreate for companion ${companionId}:`, error);
  }
});
