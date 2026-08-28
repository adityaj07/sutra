import { logger } from "@sutra/shared";
import { db, type DBTransaction } from "../connection";
import { usersTable, type NewUser, type UpdateUser } from "../schema";
import { count, eq } from "drizzle-orm";

export namespace UsersService {
  /**
   * Creates a new user in the database
   * @param payload - The new user's data
   * @param options - extra options for a query
   */
  export async function create(
    payload: NewUser,
    options?: {
      // database transaction object
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;

    try {
      const result = await queryClient
        .insert(usersTable)
        .values(payload)
        .returning();

      const [createdUser] = result;

      logger.audit("new user created", {
        module: "users",
        action: "service:create",
      });

      return createdUser;
    } catch (error) {
      logger.error("error creating user", {
        module: "users",
        action: "service:create",
        error: error,
      });

      throw error;
    }
  }

  /**
   * Find a user by id
   * @param id id of the user
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

      return await queryClient.query.usersTable.findFirst({
        where: eq(usersTable.id, id),
      });
    } catch (error) {
      logger.error("Error finding user by id", {
        module: "users",
        action: "service:findById",
        error: error,
      });
      throw error;
    }
  }

  /**
   * Find a user by email (excluding soft-deleted users)
   * @param email - The user's email
   * @param options extra options for a query
   */
  export async function findByEmail(
    email: string,
    options?: {
      // db transaction object
      tx?: DBTransaction;
      // include soft-deleted users in the search
      includeDeleted?: boolean;
    },
  ) {
    const queryClient = options?.tx ?? db;

    try {
      return await queryClient.query.usersTable.findFirst({
        where: (table, { eq, and, isNull }) =>
          options?.includeDeleted
            ? eq(table.email, email)
            : and(eq(table.email, email), isNull(table.deletedAt)),
      });
    } catch (error) {
      logger.error("error finding user by email", {
        module: "users",
        action: "service:findByEmail",
        error: error,
      });
      throw error;
    }
  }

  /**
   * Find a user by provider account ID (excluding soft-deleted users)
   * @param providerAccountId - The provider account ID
   * @param options extra options for a query
   */
  export async function findByProviderAccountId(
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
      return await queryClient.query.usersTable.findFirst({
        where: (table, { eq, and, isNull }) =>
          options?.includeDeleted
            ? eq(table.providerAccountId, providerAccountId)
            : and(
                eq(table.providerAccountId, providerAccountId),
                isNull(table.deletedAt),
              ),
      });
    } catch (error) {
      logger.error("error finding user by provider account id", {
        module: "users",
        action: "service:findByProviderAccountId",
        error: error,
      });
      throw error;
    }
  }

  /**
   * Creates or updates a user (upsert pattern to prevent race conditions)
   * @param payload - The user's data
   * @param options extra options for a query
   */
  export async function upsertByProviderAccountId(
    payload: NewUser,
    options?: {
      /**
       * database transaction object
       */
      tx?: DBTransaction;
    },
  ) {
    if (!options?.tx) {
      throw new Error(
        "Transaction is required for upsertByProviderAccountId to prevent race conditions",
      );
    }

    const queryClient = options.tx;
    try {
      // try to find existing user by the provider account ID first
      let user = await findByProviderAccountId(payload.providerAccountId, {
        tx: queryClient,
        includeDeleted: false,
      });

      if (user) {
        // Update existing user
        user = await updateById(
          user.id,
          {
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            avatar: payload.avatar,
            providerAccountId: payload.providerAccountId,
          },
          { tx: queryClient },
        );
      } else {
        // Try to find by email to handle provider account ID
        const userByEmail = await findByEmail(payload.email, {
          tx: queryClient,
          includeDeleted: false,
        });

        if (userByEmail) {
          // Update the existing user with new provider account ID
          user = await updateById(
            userByEmail.id,
            {
              email: payload.email,
              firstName: payload.firstName,
              lastName: payload.lastName,
              avatar: payload.avatar,
              providerAccountId: payload.providerAccountId,
            },
            { tx: queryClient },
          );
        } else {
          // Create new user
          user = await create(payload, { tx: queryClient });
        }
      }

      return user;
    } catch (error) {
      logger.error("error upserting user by provider account id", {
        module: "users",
        action: "service:upsertByProviderAccountId",
        error: error,
      });
      throw error;
    }
  }

  /**
   * Get all users in the db
   */
  export async function findAll(options?: {
    // page number
    page?: number;
    // no.of users per page
    limit?: number;
    //db tx object
    tx?: DBTransaction;
  }) {
    try {
      const [totalCount] = await db
        .select({
          count: count(),
        })
        .from(usersTable);

      const total = totalCount?.count ?? 0;
      const users = await db.query.usersTable.findMany({
        limit: options?.limit,
        offset:
          options?.page && options?.limit
            ? (options.page - 1) * options.limit
            : 0,
      });

      return {
        users,
        pagination: {
          page: options?.page,
          limit: options?.limit,
          total: total,
          totalPages: options?.limit ? Math.ceil(total / options.limit) : 1,
        },
      };
    } catch (error) {
      logger.error("error finding all users", {
        module: "users",
        action: "service:findAll",
        error: error,
      });

      throw error;
    }
  }

  /**
   * Update a user by id
   * @param id id of the user to update
   * @param payload new details to update
   * @param options extra options for a query
   */
  export async function updateById(
    id: string,
    payload: UpdateUser,
    options?: {
      // db tx object
      tx?: DBTransaction;
    },
  ) {
    const queryClient = options?.tx ?? db;

    try {
      const result = await queryClient
        .update(usersTable)
        .set({
          ...payload,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.id, id))
        .returning();

      const [updatedUser] = result;

      logger.audit("user updated by id", {
        module: "users",
        action: "service:updateById",
      });

      return updatedUser;
    } catch (error) {
      logger.error("error updating user by id", {
        module: "users",
        action: "service:updateById",
        error: error,
      });

      throw error;
    }
  }
}
