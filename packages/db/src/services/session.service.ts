import { logger } from "@sutra/shared";
import { db, type DBTransaction } from "../connection";
import { sessionsTable, type NewSession, type UpdateSession } from "../schema";
import { eq } from "drizzle-orm";

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
        session: session,
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
}
