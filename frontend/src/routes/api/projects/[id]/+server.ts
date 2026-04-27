import { db } from '$lib/server/db';
import { projects, projectContents } from '$lib/server/db/schema';
import { error, json, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function GET({ params }: RequestEvent) {
	const { id } = params;

	const project = await db.select().from(projects).where(eq(projects.id, id)).limit(1);

	if (project.length === 0) {
		error(404, 'Project not found');
	}

	return json(project[0]);
}

export async function PATCH({ params, request }: RequestEvent) {
	const { id } = params;
	const body = await request.json();

	const { title, currentStep, wordCount, aiTasteScore, breakpoints } = body;

	const updateData: Record<string, unknown> = {
		updatedAt: new Date()
	};

	if (title !== undefined) updateData.title = title;
	if (currentStep !== undefined) updateData.currentStep = currentStep;
	if (wordCount !== undefined) updateData.wordCount = wordCount;
	if (aiTasteScore !== undefined) updateData.aiTasteScore = aiTasteScore;
	if (breakpoints !== undefined) updateData.breakpoints = breakpoints;

	const updatedProject = await db
		.update(projects)
		.set(updateData)
		.where(eq(projects.id, id))
		.returning();

	if (updatedProject.length === 0) {
		error(404, 'Project not found');
	}

	return json(updatedProject[0]);
}

export async function DELETE({ params }: RequestEvent) {
	const { id } = params;

	await db.delete(projectContents).where(eq(projectContents.projectId, id));
	await db.delete(projects).where(eq(projects.id, id));

	return json({ success: true });
}
