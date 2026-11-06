import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const courses = sqliteTable('courses', {
  owner: text('owner').notNull(), id: text('id').notNull(),
  data: text('data').notNull(), position: integer('position').notNull(),
  revision: integer('revision').notNull().default(1),
  deletedAt: text('deleted_at'), updatedAt: text('updated_at').notNull(),
}, t => [primaryKey({ columns: [t.owner, t.id] })]);
export const plans = sqliteTable('plans', {
  owner: text('owner').primaryKey(), data: text('data').notNull(),
  revision: integer('revision').notNull().default(1), updatedAt: text('updated_at').notNull(),
});
