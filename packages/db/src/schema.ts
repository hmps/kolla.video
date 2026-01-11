import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  unique,
} from "drizzle-orm/sqlite-core";

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
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
  venue: text("venue"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Clips table
export const clips = sqliteTable(
  "clips",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    uploaderId: integer("uploader_id").references(() => users.id),
    uploaderName: text("uploader_name"),
    index: integer("index").notNull(),
    name: text("name"),
    storageKey: text("storage_key").notNull(),
    hlsPrefix: text("hls_prefix"),
    durationS: real("duration_s"),
    width: integer("width"),
    height: integer("height"),
    status: text("status", {
      enum: ["uploaded", "processing", "ready", "failed"],
    }).notNull(),
    approvalStatus: text("approval_status", {
      enum: ["pending", "approved", "rejected"],
    })
      .notNull()
      .default("approved"),
    failReason: text("fail_reason"),
    transcodingJobId: text("transcoding_job_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    eventIndexUnique: unique().on(table.eventId, table.index),
  }),
);

// Clip tags table
export const clipTags = sqliteTable("clip_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clipId: integer("clip_id")
    .notNull()
    .references(() => clips.id),
  tag: text("tag").notNull(),
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
  level: text("level", { enum: ["all", "coaches", "private"] })
    .notNull()
    .default("coaches"),
  targetUserId: integer("target_user_id").references(() => users.id),
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

// Upload links table - public upload access for events
export const uploadLinks = sqliteTable("upload_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id")
    .notNull()
    .references(() => teams.id),
  eventId: integer("event_id")
    .notNull()
    .references(() => events.id),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Onboarding progress table
export const onboardingProgress = sqliteTable(
  "onboarding_progress",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    key: text("key").notNull(),
    completedAt: integer("completed_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    userKeyUnique: unique().on(table.userId, table.key),
  }),
);

// Segments table - virtual clips within a source video
export const segments = sqliteTable(
  "segments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),
    eventId: integer("event_id")
      .notNull()
      .references(() => events.id),
    clipId: integer("clip_id")
      .notNull()
      .references(() => clips.id, { onDelete: "cascade" }),
    creatorId: integer("creator_id")
      .notNull()
      .references(() => users.id),
    index: integer("index").notNull(),
    name: text("name"),
    startS: real("start_s").notNull(),
    endS: real("end_s").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => ({
    eventIndexUnique: unique().on(table.eventId, table.index),
  }),
);

// Segment tags table
export const segmentTags = sqliteTable("segment_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  segmentId: integer("segment_id")
    .notNull()
    .references(() => segments.id, { onDelete: "cascade" }),
  tag: text("tag").notNull(),
});

// Segment players join table
export const segmentPlayers = sqliteTable("segment_players", {
  segmentId: integer("segment_id")
    .notNull()
    .references(() => segments.id, { onDelete: "cascade" }),
  playerId: integer("player_id")
    .notNull()
    .references(() => players.id),
});

// Segment comments table
export const segmentComments = sqliteTable("segment_comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  segmentId: integer("segment_id")
    .notNull()
    .references(() => segments.id, { onDelete: "cascade" }),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  level: text("level", { enum: ["all", "coaches", "private"] })
    .notNull()
    .default("coaches"),
  targetUserId: integer("target_user_id").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(teamMemberships),
  clips: many(clips),
  comments: many(comments),
  onboardingProgress: many(onboardingProgress),
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
  }),
);

export const eventsRelations = relations(events, ({ one, many }) => ({
  team: one(teams, {
    fields: [events.teamId],
    references: [teams.id],
  }),
  clips: many(clips),
  segments: many(segments),
  shareLinks: many(shareLinks),
  uploadLinks: many(uploadLinks),
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
  segments: many(segments),
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
  targetUser: one(users, {
    fields: [comments.targetUserId],
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

export const uploadLinksRelations = relations(uploadLinks, ({ one }) => ({
  team: one(teams, {
    fields: [uploadLinks.teamId],
    references: [teams.id],
  }),
  event: one(events, {
    fields: [uploadLinks.eventId],
    references: [events.id],
  }),
  createdBy: one(users, {
    fields: [uploadLinks.createdById],
    references: [users.id],
  }),
}));

export const onboardingProgressRelations = relations(
  onboardingProgress,
  ({ one }) => ({
    user: one(users, {
      fields: [onboardingProgress.userId],
      references: [users.id],
    }),
  }),
);

export const segmentsRelations = relations(segments, ({ one, many }) => ({
  team: one(teams, {
    fields: [segments.teamId],
    references: [teams.id],
  }),
  event: one(events, {
    fields: [segments.eventId],
    references: [events.id],
  }),
  clip: one(clips, {
    fields: [segments.clipId],
    references: [clips.id],
  }),
  creator: one(users, {
    fields: [segments.creatorId],
    references: [users.id],
  }),
  tags: many(segmentTags),
  players: many(segmentPlayers),
  comments: many(segmentComments),
}));

export const segmentTagsRelations = relations(segmentTags, ({ one }) => ({
  segment: one(segments, {
    fields: [segmentTags.segmentId],
    references: [segments.id],
  }),
}));

export const segmentPlayersRelations = relations(segmentPlayers, ({ one }) => ({
  segment: one(segments, {
    fields: [segmentPlayers.segmentId],
    references: [segments.id],
  }),
  player: one(players, {
    fields: [segmentPlayers.playerId],
    references: [players.id],
  }),
}));

export const segmentCommentsRelations = relations(
  segmentComments,
  ({ one }) => ({
    segment: one(segments, {
      fields: [segmentComments.segmentId],
      references: [segments.id],
    }),
    author: one(users, {
      fields: [segmentComments.authorId],
      references: [users.id],
    }),
    targetUser: one(users, {
      fields: [segmentComments.targetUserId],
      references: [users.id],
    }),
  }),
);
