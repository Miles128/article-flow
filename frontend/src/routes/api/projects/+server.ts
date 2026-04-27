import { db } from '$lib/server/db';
import { projects, projectContents } from '$lib/server/db/schema';
import { error, json, type RequestEvent } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
	const allProjects = await db.select().from(projects).orderBy(desc(projects.updatedAt));
	return json(allProjects);
}

export async function POST({ request }: RequestEvent) {
	const body = await request.json();
	const { title, workspace, targetWordCount } = body;

	if (!title || !workspace) {
		error(400, 'Title and workspace are required');
	}

	const newProject = await db
		.insert(projects)
		.values({
			title,
			workspace,
			targetWordCount: targetWordCount || 2000
		})
		.returning();

	return json(newProject[0]);
}
