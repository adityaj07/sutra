import { and, eq, isNull } from "drizzle-orm";
import { db, type DBTransaction } from "../connection";
import {
  accountsTable,
  type AccountProvider,
  type NewAccount,
  type UpdateAccount,
} from "../schema";
import { logger } from "@sutra/shared";

// AccountsService
// │
// ├── findById()
// ├── findByProviderAccountId()
// ├── findByUserId()
// │
// ├── create()
// ├── updateById()
// │
// ├── softDeleteById()
// └── restoreById()

export namespace AccountsService {
  /**
   * Find a account by id
   * @param id id of the account
   * @param options extra options for the query
   */
  export async function findById(
    id: string,
    options?: {
      // db transaction object
      tx?: DBTransaction;
    },
  ) {
    try {
      const queryClient = options?.tx ?? db;

      return await queryClient.query.accountsTable.findFirst({
        where: eq(accountsTable.id, id),
      });
    } catch (error) {
      logger.error("Error finding account by id", {
        module: "accounts",
        action: "service:findById",
        error: error,
      });
      throw error;
    }
  }

  /**
   * Find an account by its OAuth provider and provider account ID.
   *
   * @param provider - OAuth provider associated with the account
   * @param providerAccountId - Unique account ID assigned by the OAuth provider
   * @returns The matching account, or undefined if no account is found
   */
  export async function findByProviderAccountId(
    provider: AccountProvider,
    providerAccountId: string,
    options?: {
      /**
       * database transaction object
       */
      tx?: DBTransaction;
      /**
       * Include soft-deleted users in the search
       */
      includeDeleted?: boolean;
    },
  ) {
    const queryClient = options?.tx ?? db;

    try {
      return await queryClient.query.accountsTable.findFirst({
        where: (table, { eq, and, isNull }) =>
          options?.includeDeleted
            ? and(
                eq(table.provider, provider),
                eq(table.providerAccountId, providerAccountId),
              )
            : and(
                eq(table.provider, provider),
                eq(table.providerAccountId, providerAccountId),
                isNull(table.deletedAt),
              ),
      });
    } catch (error) {
      logger.error("error finding account by provider account id", {
        module: "accounts",
        action: "service:findByProviderAccountId",
        error,
      });

      throw error;
    }
  }

  /**
   * Find all accounts belonging to a user
   * @param userId id of the user
   * @param options extra options for the query
   */
  export async function findByUserId(
    userId: string,
    options?: {
      // db transaction object
      tx?: DBTransaction;
      // Include soft-deleted accounts in the search
      includeDeleted?: boolean;
    },
  ) {
    try {
      const queryClient = options?.tx ?? db;

      const conditions = [eq(accountsTable.userId, userId)];

      if (!options?.includeDeleted) {
        conditions.push(isNull(accountsTable.deletedAt));
      }

      return await queryClient.query.accountsTable.findMany({
        where: and(...conditions),
      });
    } catch (error) {
      logger.error("Error finding accounts by user id", {
        module: "accounts",
        action: "service:findByUserId",
        error: error,
      });
      throw error;
    }
  }

  /**
   * Creates a new account in the database
   * @param payload - The new account's data
   * @param options - extra options for a query
   */
  export async function create(
    payload: NewAccount,
    options?: {
      // database transaction object
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;

    try {
      const result = await queryClient
        .insert(accountsTable)
        .values(payload)
        .returning(); // to get the inserted row back

      const [createdAccount] = result;

      logger.audit("new account created", {
        module: "accounts",
        action: "service:create",
      });

      return createdAccount;
    } catch (error) {
      logger.error("error creating account", {
        module: "accounts",
        action: "service:create",
        error: error,
      });

      throw error;
    }
  }

  /**
   * Update an account by id
   * @param id id of the account to update
   * @param payload new details to update
   * @param options extra options for a query
   */
  export async function updateById(
    id: string,
    payload: UpdateAccount,
    options?: {
      // db tx object
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;

    try {
      const result = await queryClient
        .update(accountsTable)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(eq(accountsTable.id, id))
        .returning();

      const [updatedAccount] = result;

      logger.audit("account updated by id", {
        module: "accounts",
        action: "service:updateById",
      });

      return updatedAccount;
    } catch (error) {
      logger.error("error updating account by id", {
        module: "accounts",
        action: "service:updateById",
        error: error,
      });

      throw error;
    }
  }

  /**
   * Soft delete an account by id
   * @param id id of the account to soft delete
   * @param options extra options for a query
   */
  export async function softDeleteById(
    id: string,
    options?: {
      // db tx object
      tx?: DBTransaction;
    },
  ) {
    try {
      const queryClient = options?.tx ?? db;

      const result = await queryClient
        .update(accountsTable)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(accountsTable.id, id))
        .returning();

      const [deletedAccount] = result;

      logger.audit("account soft deleted by id", {
        module: "accounts",
        action: "service:softDeleteById",
      });

      return deletedAccount;
    } catch (error) {
      logger.error("error soft deleting account by id", {
        module: "accounts",
        action: "service:softDeleteById",
        error,
      });

      throw error;
    }
  }

  /**
   * Restore a soft-deleted account by id
   * @param id id of the account to restore
   * @param options extra options for a query
   */
  export async function restoreById(
    id: string,
    options?: {
      // db tx object
      tx?: DBTransaction;
    },
  ) {
    try {
      const queryClient = options?.tx ?? db;

      const result = await queryClient
        .update(accountsTable)
        .set({
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(accountsTable.id, id))
        .returning();

      const [restoredAccount] = result;

      logger.audit("account restored by id", {
        module: "accounts",
        action: "service:restoreById",
      });

      return restoredAccount;
    } catch (error) {
      logger.error("error restoring account by id", {
        module: "accounts",
        action: "service:restoreById",
        error,
      });

      throw error;
    }
  }
}
