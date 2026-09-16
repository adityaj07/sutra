import { logger } from "@sutra/shared";
import { db, type DBTransaction } from "../connection";
import {
  sessionsTable,
  SessionStatus,
  type NewSession,
  type UpdateSession,
} from "../schema";
import { and, eq, gt, isNull } from "drizzle-orm";

export namespace SessionService {
  /**
   * Creates a new session in the database
   * @param payload new session
   * @param options extra options for query
   * @returns the created session
   */
  export async function create(
    payload: NewSession,
    options?: {
      // tx to use for the query
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;

    try {
      const result = await queryClient
        .insert(sessionsTable)
        .values(payload)
        .returning();
      const [session] = result;

      logger.audit("Created new session", {
        module: "session",
        action: "service:create",
        sessionId: session?.id,
        userId: session?.userId,
        accountId: session?.accountId,
      });

      return session;
    } catch (error) {
      logger.error("Error creating session", {
        module: "session",
        action: "service:create",
        error: error,
      });

      throw error;
    }
  }

  /**
   * Finds a session by id
   * @param id session id to find by
   * @param options extra options for query
   * @returns the found session
   */
  export async function findById(
    id: string,
    options?: {
      // tx to use for the query
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;
    try {
      return await queryClient.query.sessionsTable.findFirst({
        where: eq(sessionsTable.id, id),
      });
    } catch (error) {
      logger.error("Error finding session by id", {
        module: "session",
        action: "service:findById",
        error: error,
      });

      throw error;
    }
  }

  /**
   * Find all sessions belonging to a user
   * @param userId - The ID of the user
   * @param options - Extra options for the query
   * @returns All matching sessions
   */
  export async function findByUserId(
    userId: string,
    options?: {
      /**
       * Database transaction object
       */
      tx?: DBTransaction;

      /**
       * Include soft-deleted sessions in the search
       */
      includeDeleted?: boolean;
    },
  ) {
    try {
      const queryClient = options?.tx ?? db;

      const conditions = [eq(sessionsTable.userId, userId)];

      if (!options?.includeDeleted) {
        conditions.push(isNull(sessionsTable.deletedAt));
      }

      return await queryClient.query.sessionsTable.findMany({
        where: and(...conditions),
      });
    } catch (error) {
      logger.error("Error finding sessions by user id", {
        module: "session",
        action: "service:findByUserId",
        error,
      });

      throw error;
    }
  }

  /**
   * Find all sessions belonging to an account
   * @param accountId - The ID of the account
   * @param options - Extra options for the query
   * @returns All matching sessions
   */
  export async function findByAccountId(
    accountId: string,
    options?: {
      /**
       * Database transaction object
       */
      tx?: DBTransaction;

      /**
       * Include soft-deleted sessions in the search
       */
      includeDeleted?: boolean;
    },
  ) {
    try {
      const queryClient = options?.tx ?? db;

      const conditions = [eq(sessionsTable.accountId, accountId)];

      if (!options?.includeDeleted) {
        conditions.push(isNull(sessionsTable.deletedAt));
      }

      return await queryClient.query.sessionsTable.findMany({
        where: and(...conditions),
      });
    } catch (error) {
      logger.error("Error finding sessions by account id", {
        module: "session",
        action: "service:findByAccountId",
        error,
      });

      throw error;
    }
  }

  /**
   * Find all active sessions belonging to a user
   * @param userId - The ID of the user
   * @param options - Extra options for the query
   * @returns All active sessions belonging to the user
   */
  export async function findActiveByUserId(
    userId: string,
    options?: {
      /**
       * Database transaction object
       */
      tx?: DBTransaction;
    },
  ) {
    try {
      const queryClient = options?.tx ?? db;

      return await queryClient.query.sessionsTable.findMany({
        where: and(
          eq(sessionsTable.userId, userId),
          eq(sessionsTable.status, SessionStatus.ACTIVE),
          isNull(sessionsTable.deletedAt),
        ),
      });
    } catch (error) {
      logger.error("Error finding active sessions by user id", {
        module: "session",
        action: "service:findActiveByUserId",
        error,
      });

      throw error;
    }
  }

  /**
   * Update a session by id
   * @param id session id to update
   * @param payload new details to update
   * @param options extra options for query
   * @returns the updated session
   */
  export async function updateById(
    id: string,
    payload: UpdateSession,
    options?: {
      /**
       * Transaction to use for the query
       */
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;
    try {
      const result = await queryClient
        .update(sessionsTable)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(eq(sessionsTable.id, id))
        .returning();

      const [updatedSession] = result;

      logger.audit("Updated session by id", {
        module: "session",
        action: "service:updateById",
        sessionId: id,
      });

      return updatedSession;
    } catch (error) {
      logger.error("Error updating session by id", {
        module: "session",
        action: "service:updateById",
        error: error,
      });

      throw error;
    }
  }

  /**
   * Atomically rotates a session's refresh-token hash.
   *
   * Replaces `currentHash` with `nextHash` only if the session is still active,
   * unrevoked, undeleted, unexpired, and still holds `currentHash`. Concurrent
   * refreshes with the same old token therefore cannot both succeed: exactly
   * one conditional update matches.
   * @param id session id to rotate
   * @param currentHash expected currently stored hash
   * @param nextHash replacement hash
   * @param options extra options for query
   * @returns the rotated session, or undefined when preconditions failed
   */
  export async function rotateRefreshTokenHash(
    id: string,
    currentHash: string,
    nextHash: string,
    options?: {
      /**
       * Transaction to use for the query
       */
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;
    try {
      const now = new Date();

      const result = await queryClient
        .update(sessionsTable)
        .set({
          refreshTokenHash: nextHash,
          lastAccessedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(sessionsTable.id, id),
            eq(sessionsTable.refreshTokenHash, currentHash),
            eq(sessionsTable.status, SessionStatus.ACTIVE),
            isNull(sessionsTable.revokedAt),
            isNull(sessionsTable.deletedAt),
            gt(sessionsTable.expiresAt, now),
          ),
        )
        .returning();

      const [rotatedSession] = result;

      if (rotatedSession) {
        logger.audit("Rotated session refresh token hash", {
          module: "session",
          action: "service:rotateRefreshTokenHash",
          sessionId: id,
        });
      }

      return rotatedSession;
    } catch (error) {
      logger.error("Error rotating session refresh token hash", {
        module: "session",
        action: "service:rotateRefreshTokenHash",
        error: error,
      });

      throw error;
    }
  }

  /**
   * Revokes a session by id
   * @param id - The ID of the session to revoke
   * @param options - Extra options for the query
   * @returns The revoked session
   */
  export async function revokeById(
    id: string,
    options?: {
      /**
       * Database transaction object
       */
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;

    try {
      const result = await queryClient
        .update(sessionsTable)
        .set({
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(sessionsTable.id, id))
        .returning();

      const [revokedSession] = result;

      logger.audit("Session revoked by id", {
        module: "session",
        action: "service:revokeById",
        sessionId: id,
      });

      return revokedSession;
    } catch (error) {
      logger.error("Error revoking session by id", {
        module: "session",
        action: "service:revokeById",
        sessionId: id,
        error,
      });

      throw error;
    }
  }

  /**
   * Revokes all active sessions belonging to a user
   * @param userId - The ID of the user whose sessions should be revoked
   * @param options - Extra options for the query
   * @returns The revoked sessions
   */
  export async function revokeByUserId(
    userId: string,
    options?: {
      /**
       * Database transaction object
       */
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;

    try {
      const now = new Date();

      const revokedSessions = await queryClient
        .update(sessionsTable)
        .set({
          status: SessionStatus.REVOKED,
          revokedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(sessionsTable.userId, userId),
            eq(sessionsTable.status, SessionStatus.ACTIVE),
            isNull(sessionsTable.deletedAt),
          ),
        )
        .returning();

      logger.audit("All active sessions revoked for user", {
        module: "session",
        action: "service:revokeByUserId",
        userId,
        revokedSessionCount: revokedSessions.length,
      });

      return revokedSessions;
    } catch (error) {
      logger.error("Error revoking sessions by user id", {
        module: "session",
        action: "service:revokeByUserId",
        userId,
        error,
      });

      throw error;
    }
  }
}
