import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const genderEnum = pgEnum("gender", ["male", "female"]);
export const treePrivacyEnum = pgEnum("tree_privacy", ["private", "public"]);
export const relationshipTypeEnum = pgEnum("relationship_type", [
  "biological_child",
  "adopted_child",
  "child_in_law",
  "spouse",
]);
export const spouseStatusEnum = pgEnum("spouse_status", ["married", "divorced"]);
export const shareAccessEnum = pgEnum("share_access", ["view", "edit"]);

/** Mirrors `auth.users` — one row per Supabase-authenticated account. */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Global biodata for an individual — shared across every tree they appear in. */
export const persons = pgTable("persons", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  photoUrl: text("photo_url"),
  gender: genderEnum("gender").notNull(),
  birthDate: text("birth_date"),
  deathDate: text("death_date"),
  notes: text("notes"),
  createdBy: uuid("created_by").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trees = pgTable("trees", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: uuid("owner_id").notNull().references(() => profiles.id),
  privacy: treePrivacyEnum("privacy").notNull().default("private"),
  founderPersonId: uuid("founder_person_id").references(() => persons.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Junction: a Person's membership + computed position within one specific Tree. */
export const treeMembers = pgTable(
  "tree_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id").notNull().references(() => trees.id, { onDelete: "cascade" }),
    personId: uuid("person_id").notNull().references(() => persons.id, { onDelete: "cascade" }),
    generation: integer("generation"),
    roleLabel: text("role_label"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("tree_members_tree_person_unique").on(t.treeId, t.personId),
    index("tree_members_tree_id_idx").on(t.treeId),
  ],
);

/** A relation between two TreeMembers, scoped to one Tree. Never links Persons directly. */
export const relationships = pgTable(
  "relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id").notNull().references(() => trees.id, { onDelete: "cascade" }),
    fromMemberId: uuid("from_member_id").notNull().references(() => treeMembers.id, { onDelete: "cascade" }),
    toMemberId: uuid("to_member_id").notNull().references(() => treeMembers.id, { onDelete: "cascade" }),
    type: relationshipTypeEnum("type").notNull(),
    status: spouseStatusEnum("status"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("relationships_tree_id_idx").on(t.treeId)],
);

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  treeId: uuid("tree_id").notNull().references(() => trees.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  accessLevel: shareAccessEnum("access_level").notNull().default("view"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdBy: uuid("created_by").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const collaborators = pgTable(
  "collaborators",
  {
    treeId: uuid("tree_id").notNull().references(() => trees.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("collaborators_tree_user_unique").on(t.treeId, t.userId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    treeId: uuid("tree_id").references(() => trees.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => profiles.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    diff: jsonb("diff"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_tree_id_idx").on(t.treeId)],
);

export const treesRelations = relations(trees, ({ many, one }) => ({
  members: many(treeMembers),
  shareLinks: many(shareLinks),
  collaborators: many(collaborators),
  founder: one(persons, { fields: [trees.founderPersonId], references: [persons.id] }),
}));

export const treeMembersRelations = relations(treeMembers, ({ one, many }) => ({
  tree: one(trees, { fields: [treeMembers.treeId], references: [trees.id] }),
  person: one(persons, { fields: [treeMembers.personId], references: [persons.id] }),
  relationshipsFrom: many(relationships, { relationName: "from" }),
  relationshipsTo: many(relationships, { relationName: "to" }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  fromMember: one(treeMembers, {
    fields: [relationships.fromMemberId],
    references: [treeMembers.id],
    relationName: "from",
  }),
  toMember: one(treeMembers, {
    fields: [relationships.toMemberId],
    references: [treeMembers.id],
    relationName: "to",
  }),
}));

export const personsRelations = relations(persons, ({ many }) => ({
  memberships: many(treeMembers),
}));
