import { db } from '$lib/server/db';
import { projectContents } from '$lib/server/db/schema';
import { error, json, type RequestEvent } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';

export async function GET({ params }: RequestEvent) {
	const { id } = params;
	const step = params.step ? parseInt(params.step) : undefined;

	if (step !== undefined) {
		const content = await db
			.select()
			.from(projectContents)
			.where(and(eq(projectContents.projectId, id), eq(projectContents.step, step)))
			.orderBy(projectContents.updatedAt)
			.limit(1);

		return json(content[0] || null);
	}

	const contents = await db
		.select()
		.from(projectContents)
		.where(eq(projectContents.projectId, id))
		.orderBy(projectContents.step);

	return json(contents);
}

export async function POST({ params, request }: RequestEvent) {
	const { id } = params;
	const body = await request.json();
	const { step, contentType, content } = body;

	if (step === undefined || !contentType || !content) {
		error(400, 'Step, contentType and content are required');
	}

	const existing = await db
		.select()
		.from(projectContents)
		.where(and(eq(projectContents.projectId, id), eq(projectContents.step, step)))
		.limit(1);

	if (existing.length > 0) {
		const updated = await db
			.update(projectContents)
			.set({
				content,
				contentType,
				updatedAt: new Date()
			})
			.where(eq(projectContents.id, existing[0].id))
			.returning();

		return json(updated[0]);
	}

	const newContent = await db
		.insert(projectContents)
		.values({
			projectId: id,
			step,
			contentType,
			content
		})
		.returning();

	return json(newContent[0]);
}
