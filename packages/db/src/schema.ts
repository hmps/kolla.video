import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Teams table
export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Team memberships table
export const teamMemberships = sqliteTable("team_memberships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role", { enum: ["coach", "player"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Events table
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  type: text("type", { enum: ["game", "practice"] }).notNull(),
  title: text("title").notNull(),
  date: integer("date", { mode: "timestamp" }).notNull(),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Clips table
export const clips = sqliteTable("clips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  uploaderId: integer("uploader_id")
    .notNull()
    .references(() => users.id),
  storageKey: text("storage_key").notNull(),
  hlsPrefix: text("hls_prefix"),
  durationS: real("duration_s"),
  width: integer("width"),
  height: integer("height"),
  status: text("status", {
    enum: ["uploaded", "processing", "ready", "failed"],
  }).notNull(),
  failReason: text("fail_reason"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Clip tags table
export const clipTags = sqliteTable("clip_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clipId: integer("clip_id")
    .notNull()
    .references(() => clips.id),
  tag: text("tag", { enum: ["offense", "defense"] }).notNull(),
});

// Players table
export const players = sqliteTable("players", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  name: text("name").notNull(),
  number: integer("number"),
  externalId: text("external_id"),
});

// Clip players join table
export const clipPlayers = sqliteTable("clip_players", {
  clipId: integer("clip_id")
    .notNull()
    .references(() => clips.id),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
});

// Comments table
export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clipId: integer("clip_id")
    .notNull()
    .references(() => clips.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Share links table
export const shareLinks = sqliteTable("share_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  allowPublic: integer("allow_public", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(teamMemberships),
  clips: many(clips),
  comments: many(comments),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  memberships: many(teamMemberships),
  events: many(events),
  players: many(players),
}));

export const teamMembershipsRelations = relations(
  teamMemberships,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamMemberships.teamId],
      references: [teams.id],
    }),
    user: one(users, {
      fields: [teamMemberships.userId],
      references: [users.id],
    }),
  })
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  team: one(teams, {
    fields: [events.teamId],
    references: [teams.id],
  }),
  clips: many(clips),
  shareLinks: many(shareLinks),
}));

export const clipsRelations = relations(clips, ({ one, many }) => ({
  team: one(teams, {
    fields: [clips.teamId],
    references: [teams.id],
  }),
  event: one(events, {
    fields: [clips.eventId],
    references: [events.id],
  }),
  uploader: one(users, {
    fields: [clips.uploaderId],
    references: [users.id],
  }),
  tags: many(clipTags),
  players: many(clipPlayers),
  comments: many(comments),
}));

export const clipTagsRelations = relations(clipTags, ({ one }) => ({
  clip: one(clips, {
    fields: [clipTags.clipId],
    references: [clips.id],
  }),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, {
    fields: [players.teamId],
    references: [teams.id],
  }),
  clips: many(clipPlayers),
}));

export const clipPlayersRelations = relations(clipPlayers, ({ one }) => ({
  clip: one(clips, {
    fields: [clipPlayers.clipId],
    references: [clips.id],
  }),
  player: one(players, {
    fields: [clipPlayers.playerId],
    references: [players.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  clip: one(clips, {
    fields: [comments.clipId],
    references: [clips.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const shareLinksRelations = relations(shareLinks, ({ one }) => ({
  team: one(teams, {
    fields: [shareLinks.teamId],
    references: [teams.id],
  }),
  event: one(events, {
    fields: [shareLinks.eventId],
    references: [events.id],
  }),
}));
