import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const task = sqliteTable('task', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export type Workspace = 'wechat' | 'video' | 'general';
export type WorkflowStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const projects = sqliteTable('projects', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	workspace: text('workspace').notNull().$type<Workspace>(),
	currentStep: integer('current_step').notNull().default(0).$type<WorkflowStep>(),
	wordCount: integer('word_count').notNull().default(0),
	targetWordCount: integer('target_word_count').notNull().default(2000),
	aiTasteScore: integer('ai_taste_score').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	breakpoints: text('breakpoints', { mode: 'json' }).notNull().$type<{ specification: boolean; draft: boolean }>().default({ specification: false, draft: false })
});

export const projectContents = sqliteTable('project_contents', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	step: integer('step').notNull(),
	contentType: text('content_type').notNull(),
	content: text('content').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

export const aiTasteHistory = sqliteTable('ai_taste_history', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
	score: integer('score').notNull(),
	connectorRatio: integer('connector_ratio').notNull(),
	clicheRatio: integer('cliche_ratio').notNull(),
	sentenceStdDev: integer('sentence_std_dev').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectContent = typeof projectContents.$inferSelect;
export type NewProjectContent = typeof projectContents.$inferInsert;
