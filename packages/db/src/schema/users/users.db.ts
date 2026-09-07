import { enumToPgEnum } from "@sutra/shared";
import {
  pgEnum,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { usersSchema } from ".";
import { relations } from "drizzle-orm";
import { accountsTable } from "./accounts.db";
import { sessionsTable } from "./sessions.db";

export enum UserRole {
  ADMIN = "admin",
  USER = "user",
}

export const userRoleEnum = pgEnum("user_role", enumToPgEnum(UserRole));

export const usersTable = usersSchema.table("users", {
  id: uuid("id").notNull().primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  avatar: text("avatar"),
  role: userRoleEnum("role").notNull().default(UserRole.USER),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  accounts: many(accountsTable),
  sessions: many(sessionsTable),
}));

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type UpdateUser = Partial<NewUser>;
