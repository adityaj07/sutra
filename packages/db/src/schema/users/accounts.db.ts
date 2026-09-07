import {
  index,
  pgEnum,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { usersSchema } from ".";
import { usersTable } from "./users.db";
import { enumToPgEnum } from "@sutra/shared";
import { relations } from "drizzle-orm";
import { sessionsTable } from "./sessions.db";

export enum AccountProvider {
  GOOGLE = "google",
  APPLE = "apple",
  GITHUB = "github",
}

export const accountProviderEnum = pgEnum(
  "account_provider",
  enumToPgEnum(AccountProvider),
);

export const accountsTable = usersSchema.table(
  "accounts",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, {
        onDelete: "cascade",
      }),
    provider: accountProviderEnum("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    providerScope: text("provider_scope").notNull(),

    providerAccessToken: text("provider_access_token").notNull(),
    providerAccessTokenIv: text("provider_access_token_iv").notNull(),
    providerAccessTokenTag: text("provider_access_token_tag").notNull(),
    providerAccessTokenExpiresAt: timestamp(
      "provider_access_token_expires_at",
      {
        withTimezone: true,
      },
    ).notNull(),

    providerRefreshToken: text("provider_refresh_token"),
    providerRefreshTokenIv: text("provider_refresh_token_iv"),
    providerRefreshTokenTag: text("provider_refresh_token_tag"),
    providerRefreshTokenExpiresAt: timestamp(
      "provider_refresh_token_expires_at",
      {
        withTimezone: true,
      },
    ),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("accounts_provider_provider_account_id_unique").on(
      table.provider,
      table.providerAccountId,
    ),
    index("accounts_user_id_idx").on(table.userId),
  ],
);

export const accountsRelations = relations(accountsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [accountsTable.userId],
    references: [usersTable.id],
  }),

  sessions: many(sessionsTable),
}));

export type Account = typeof accountsTable.$inferSelect;
export type NewAccount = typeof accountsTable.$inferInsert;
export type UpdateAccount = Partial<NewAccount>;
