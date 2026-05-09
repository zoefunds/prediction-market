import * as functionsV1 from "firebase-functions/v1";
import { Timestamp } from "firebase-admin/firestore";
import { db } from "../lib/admin";
import type { UserDoc } from "../types";

/**
 * Auth trigger — fires when a new Firebase user signs up.
 * Creates a default `users/{uid}` Firestore doc.
 */
export const onUserCreate = functionsV1
  .region("us-central1")
  .auth.user()
  .onCreate(async (user) => {
    const doc: UserDoc = {
      uid: user.uid,
      displayName: user.displayName ?? undefined,
      photoURL: user.photoURL ?? undefined,
      joinedAt: Timestamp.now(),
      marketsCreated: 0,
      positionsTaken: 0,
      totalVolumeStaked: 0,
    };
    await db.collection("users").doc(user.uid).set(doc);
  });
