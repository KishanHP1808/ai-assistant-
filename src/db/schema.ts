import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'research_dossiers' table
export const researchDossiers = pgTable('research_dossiers', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.uid),
  topic: text('topic').notNull(),
  report: text('report').notNull(),
  sources: text('sources').notNull(), // JSON string array of SourceItem
  departmentCode: text('department_code'),
  departmentName: text('department_name'),
  trainedEpoch: integer('trained_epoch').default(1),
  createdAt: text('created_at'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Define the 'training_events' table
export const trainingEvents = pgTable('training_events', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(), // 'question' | 'code_error' | 'github_dataset'
  title: text('title').notNull(),
  epoch: integer('epoch').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relationships for the 'users' table
export const usersRelations = relations(users, ({ many }) => ({
  dossiers: many(researchDossiers),
}));

// Define relationships for the 'research_dossiers' table
export const researchDossiersRelations = relations(researchDossiers, ({ one }) => ({
  user: one(users, {
    fields: [researchDossiers.userId],
    references: [users.uid],
  }),
}));
