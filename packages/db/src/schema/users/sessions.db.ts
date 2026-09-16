import { enumToPgEnum } from "@sutra/shared";
import {
  index,
  jsonb,
  pgEnum,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usersSchema } from ".";
import { usersTable } from "./users.db";
import { relations } from "drizzle-orm";
import { accountsTable } from "./accounts.db";

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  os?: string;
  browser?: string;
}

export enum SessionStatus {
  ACTIVE = "active",
  REVOKED = "revoked",
  EXPIRED = "expired",
}

export const sessionStatusEnum = pgEnum(
  "session_status",
  enumToPgEnum(SessionStatus),
);

export const sessionsTable = usersSchema.table(
  "sessions",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
      }),
    status: sessionStatusEnum("status").notNull(),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accountsTable.id, {
        onDelete: "cascade",
      }),

    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    refreshTokenHash: text("refresh_token_hash"),
    metadata: jsonb("metadata").$type<SessionMetadata>().default({}),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_status_idx").on(table.status),
    index("sessions_last_accessed_at_idx").on(table.lastAccessedAt),
    index("sessions_revoked_at_idx").on(table.revokedAt),
    index("sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const sessionsRelations = relations(sessionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [sessionsTable.userId],
    references: [usersTable.id],
  }),

  account: one(accountsTable, {
    fields: [sessionsTable.accountId],
    references: [accountsTable.id],
  }),
}));

export type Session = typeof sessionsTable.$inferSelect;
export type NewSession = typeof sessionsTable.$inferInsert;
export type UpdateSession = Partial<NewSession>;
