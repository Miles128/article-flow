<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Project, Workspace } from '$lib/server/db/schema';
	import { workflowSteps, workspaceConfigs, getWorkspaceConfig } from '$lib/workflow';

	let projects: Project[] = $state([]);
	let showCreateModal = $state(false);

	let newProject = $state({
		title: '',
		workspace: 'general' as Workspace,
		targetWordCount: 2000
	});

	async function loadProjects() {
		const res = await fetch('/api/projects');
		projects = await res.json();
	}

	async function createProject() {
		if (!newProject.title.trim()) return;

		const res = await fetch('/api/projects', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(newProject)
		});

		const project = await res.json();
		showCreateModal = false;
		newProject = { title: '', workspace: 'general', targetWordCount: 2000 };
		await loadProjects();
		goto(`/projects/${project.id}`);
	}

	async function deleteProject(id: string) {
		if (!confirm('确定要删除这个项目吗？')) return;
		await fetch(`/api/projects/${id}`, { method: 'DELETE' });
		await loadProjects();
	}

	function formatDate(date: Date | string | number) {
		const d = new Date(date);
		return d.toLocaleDateString('zh-CN', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	onMount(() => {
		loadProjects();
	});
</script>

<svelte:head>
	<title>文章写作工作流</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b">
		<div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
					<span class="text-white font-bold text-lg">A</span>
				</div>
				<h1 class="text-xl font-semibold">文章写作工作流</h1>
			</div>
			<button
				onclick={() => (showCreateModal = true)}
				class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
			>
				<span>＋</span>
				新建项目
			</button>
		</div>
	</header>

	<main class="max-w-7xl mx-auto px-4 py-8">
		{#if projects.length === 0}
			<div class="text-center py-16">
				<div class="text-6xl mb-4">📝</div>
				<h2 class="text-xl font-medium mb-2">还没有项目</h2>
				<p class="text-gray-500 mb-6">点击"新建项目"开始你的第一篇文章</p>
				<button
					onclick={() => (showCreateModal = true)}
					class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					新建项目
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each projects as project}
					{@const workspaceConfig = getWorkspaceConfig(project.workspace as 'wechat' | 'video' | 'general')}
					{@const stepConfig = workflowSteps[project.currentStep]}
					{@const progress = Math.min(
						100,
						Math.round((project.wordCount / project.targetWordCount) * 100)
					)}

					<div
						class="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
						onclick={() => goto(`/projects/${project.id}`)}
					>
						<div class="p-5">
							<div class="flex justify-between items-start mb-3">
								<h3 class="font-medium text-gray-900 truncate pr-2">{project.title}</h3>
								<button
									onclick={(e) => {
										e.stopPropagation();
										deleteProject(project.id);
									}}
									class="text-gray-400 hover:text-red-500 transition-colors"
								>
									✕
								</button>
							</div>

							<div class="flex gap-2 mb-4">
								<span
									class="px-2 py-1 text-xs rounded-full"
									class:bg-blue-100={project.workspace === 'wechat'}
									class:text-blue-700={project.workspace === 'wechat'}
									class:bg-purple-100={project.workspace === 'video'}
									class:text-purple-700={project.workspace === 'video'}
									class:bg-gray-100={project.workspace === 'general'}
									class:text-gray-700={project.workspace === 'general'}
								>
									{workspaceConfig.name}
								</span>
								<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
									步骤 {project.currentStep + 1}/12
								</span>
							</div>

							<div class="text-sm text-gray-500 mb-3">
								{stepConfig.name}
							</div>

							<div class="mb-2">
								<div class="flex justify-between text-xs text-gray-500 mb-1">
									<span>字数进度</span>
									<span>{project.wordCount} / {project.targetWordCount}</span>
								</div>
								<div class="w-full bg-gray-200 rounded-full h-2">
									<div
										class="bg-blue-600 h-2 rounded-full transition-all"
										style="width: {progress}%"
									/>
								</div>
							</div>

							<div class="text-xs text-gray-400 mt-3">
								更新于 {formatDate(project.updatedAt)}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

{#if showCreateModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="bg-white rounded-xl p-6 w-full max-w-md mx-4">
			<h2 class="text-xl font-semibold mb-6">新建项目</h2>

			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
					<input
						bind:value={newProject.title}
						type="text"
						placeholder="输入文章标题..."
						class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">工作区类型</label>
					<div class="grid grid-cols-3 gap-3">
						{#each workspaceConfigs as config}
							<button
								type="button"
								onclick={() => (newProject.workspace = config.type)}
								class="p-3 border rounded-lg text-sm transition-all"
								class:border-blue-500={newProject.workspace === config.type}
								class:bg-blue-50={newProject.workspace === config.type}
								class:ring-2={newProject.workspace === config.type}
								class:ring-blue-500={newProject.workspace === config.type}
							>
								<div class="font-medium mb-1">{config.name}</div>
								<div class="text-xs text-gray-500">{config.description.slice(0, 20)}...</div>
							</button>
						{/each}
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">目标字数</label>
					<input
						bind:value={newProject.targetWordCount}
						type="number"
						min="100"
						max="100000"
						class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
					/>
				</div>
			</div>

			<div class="flex justify-end gap-3 mt-6">
				<button
					onclick={() => (showCreateModal = false)}
					class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
				>
					取消
				</button>
				<button
					onclick={createProject}
					disabled={!newProject.title.trim()}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					创建项目
				</button>
			</div>
		</div>
	</div>
{/if}
