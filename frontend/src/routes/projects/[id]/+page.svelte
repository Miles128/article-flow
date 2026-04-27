<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageLoad } from './$types';
	import type { Project, WorkflowStep } from '$lib/server/db/schema';
	import { workflowSteps, getNextStep, getPrevStep, getStepConfig, type WorkflowStepConfig } from '$lib/workflow';
	import { analyzeAITaste, getAITasteColor, getAITasteBgColor, getImprovementSuggestions, type AITasteAnalysis } from '$lib/aiTaste';
	import { Tipex } from '@friendofsvelte/tipex';
	import '@friendofsvelte/tipex/styles/index.css';

	let { data } = $props<{ data: PageLoad }>();

	let project: Project | null = $state(null);
	let currentStep: WorkflowStep = $state(0);
	let stepConfig: WorkflowStepConfig | null = $state(null);
	let content = $state('');
	let isSaving = $state(false);
	let aiAnalysis: AITasteAnalysis | null = $state(null);
	let showAITastePanel = $state(false);
	let editMode: 'wysiwyg' | 'markdown' = $state('wysiwyg');

	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	async function loadProject() {
		const res = await fetch(`/api/projects/${data.projectId}`);
		if (res.ok) {
			project = await res.json();
			currentStep = project.currentStep as WorkflowStep;
			stepConfig = getStepConfig(currentStep);
			await loadContent();
		}
	}

	async function loadContent() {
		if (!project) return;
		const res = await fetch(`/api/projects/${project.id}/contents?step=${currentStep}`);
		if (res.ok) {
			const data = await res.json();
			if (data && data.content !== undefined && data.content !== null) {
				content = data.content;
			}
		}
	}

	async function saveContent() {
		if (!project) return;
		isSaving = true;

		await fetch(`/api/projects/${project.id}/contents`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				step: currentStep,
				contentType: 'markdown',
				content
			})
		});

		const wordCount = content.length;

		await fetch(`/api/projects/${project.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				currentStep,
				wordCount,
				breakpoints: {
					...project.breakpoints,
					...(stepConfig?.isBreakpoint && stepConfig.breakpointName
						? { [stepConfig.breakpointName]: true }
						: {})
				}
			})
		});

		isSaving = false;
	}

	function autoSave() {
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			saveContent();
		}, 2000);
	}

	function updateContent(newContent: string) {
		content = newContent;
		autoSave();
	}

	function checkAITaste() {
		aiAnalysis = analyzeAITaste(content);
		showAITastePanel = true;
	}

	async function goToStep(step: WorkflowStep) {
		await saveContent();
		currentStep = step;
		stepConfig = getStepConfig(step);
		await loadContent();
	}

	async function nextStep() {
		if (currentStep < 11) {
			await goToStep(getNextStep(currentStep));
		}
	}

	async function prevStep() {
		if (currentStep > 0) {
			await goToStep(getPrevStep(currentStep));
		}
	}

	onMount(() => {
		loadProject();
	});

	onDestroy(() => {
		if (saveTimeout) clearTimeout(saveTimeout);
	});

	$effect(() => {
		if (content && content.length > 50) {
			autoSave();
		}
	});
</script>

<svelte:head>
	<title>{project?.title || '编辑项目'} - 文章写作工作流</title>
</svelte:head>

{#if !project}
	<div class="flex items-center justify-center min-h-screen">
		<div class="text-gray-500">加载中...</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50 flex flex-col">
		<header class="bg-white border-b sticky top-0 z-40">
			<div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
				<div class="flex items-center gap-4">
					<button onclick={() => goto('/')} class="text-gray-500 hover:text-gray-700">
						← 返回
					</button>
					<div class="flex items-center gap-2">
						<h1 class="font-medium">{project.title}</h1>
						<span
							class="px-2 py-0.5 text-xs rounded-full"
							class:bg-blue-100={project.workspace === 'wechat'}
							class:text-blue-700={project.workspace === 'wechat'}
							class:bg-purple-100={project.workspace === 'video'}
							class:text-purple-700={project.workspace === 'video'}
							class:bg-gray-100={project.workspace === 'general'}
							class:text-gray-700={project.workspace === 'general'}
						>
							{project.workspace === 'wechat' ? '公众号' : project.workspace === 'video' ? '视频' : '通用'}
						</span>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<button
						onclick={checkAITaste}
						class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
					>
						AI味检测
					</button>
					<button
						onclick={saveContent}
						disabled={isSaving}
						class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
					>
						{isSaving ? '保存中...' : '保存'}
					</button>
				</div>
			</div>
		</header>

		<div class="flex-1 flex">
			<aside class="w-64 bg-white border-r flex-shrink-0 hidden md:block overflow-y-auto">
				<div class="p-4">
					<h3 class="text-xs font-semibold text-gray-500 uppercase mb-4">工作流步骤</h3>
					<div class="space-y-1">
						{#each workflowSteps as step, index}
							<button
								onclick={() => goToStep(index as WorkflowStep)}
								class="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-3"
								class:bg-blue-50={index === currentStep}
								class:text-blue-700={index === currentStep}
								class:bg-gray-50={index < currentStep}
								class:text-gray-500={index !== currentStep && index < currentStep}
								class:text-gray-400={index > currentStep}
							>
								<span
									class="w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
									class:bg-blue-600={index === currentStep}
									class:text-white={index === currentStep}
									class:bg-green-100={index < currentStep}
									class:text-green-700={index < currentStep}
									class:bg-gray-100={index > currentStep}
								>
									{index < currentStep ? '✓' : index + 1}
								</span>
								<span class="truncate">{step.name}</span>
								{#if step.isBreakpoint}
									<span class="text-yellow-500 text-xs">💾</span>
								{/if}
							</button>
						{/each}
					</div>
				</div>

				<div class="p-4 border-t mt-4">
					<h3 class="text-xs font-semibold text-gray-500 uppercase mb-3">项目进度</h3>
					<div class="space-y-2">
						<div>
							<div class="flex justify-between text-xs text-gray-500 mb-1">
								<span>字数</span>
								<span>{(content || '').length} / {project.targetWordCount}</span>
							</div>
							<div class="w-full bg-gray-200 rounded-full h-2">
								<div
									class="bg-blue-600 h-2 rounded-full transition-all"
									style="width: {Math.min(100, Math.round(((content?.length ?? 0) / project.targetWordCount) * 100))}%"
								></div>
							</div>
						</div>

						{#if project.breakpoints.specification || project.breakpoints.draft}
							<div class="pt-2">
								<div class="text-xs text-gray-500 mb-2">断点</div>
								<div class="flex flex-wrap gap-2">
									{#if project.breakpoints.specification}
										<span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">选题 ✓</span>
									{/if}
									{#if project.breakpoints.draft}
										<span class="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">初稿 ✓</span>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</aside>

			<main class="flex-1 flex flex-col">
				{#if stepConfig}
					<div class="px-6 py-4 border-b bg-white">
						<div class="flex items-center gap-2">
							<h2 class="text-lg font-medium">{stepConfig.name}</h2>
							{#if stepConfig.isBreakpoint}
								<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">断点保存</span>
							{/if}
						</div>
						<p class="text-sm text-gray-500 mt-1">{stepConfig.description}</p>
					</div>

					<div class="flex-1 overflow-y-auto bg-white">
						{#if currentStep <= 2 || currentStep === 4 || currentStep >= 9}
							<div class="max-w-4xl mx-auto px-6 py-8">
								<textarea
									bind:value={content}
									placeholder="在这里输入内容..."
									class="w-full min-h-[400px] p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
								></textarea>
							</div>
						{:else if currentStep >= 5 && currentStep <= 8}
							<div class="h-full flex flex-col">
								<div class="border-b px-6 py-2 flex items-center justify-between">
									<div class="flex gap-2">
										<button
											onclick={() => (editMode = 'wysiwyg')}
											class="px-3 py-1 text-sm rounded transition-colors"
											class:bg-blue-100={editMode === 'wysiwyg'}
											class:text-blue-700={editMode === 'wysiwyg'}
										>
											所见即所得
										</button>
										<button
											onclick={() => (editMode = 'markdown')}
											class="px-3 py-1 text-sm rounded transition-colors"
											class:bg-blue-100={editMode === 'markdown'}
											class:text-blue-700={editMode === 'markdown'}
										>
											Markdown
										</button>
									</div>
									<div class="text-xs text-gray-500">
										{content.length} 字
									</div>
								</div>

								<div class="flex-1 overflow-y-auto">
									{#if editMode === 'wysiwyg'}
										<div class="max-w-4xl mx-auto px-6 py-8">
											<Tipex
												{content}
												floating
												on:bodyChange={(e) => updateContent(e.detail)}
												class="min-h-[500px]"
											/>
										</div>
									{:else}
										<div class="flex h-full">
											<div class="flex-1 border-r">
												<textarea
													bind:value={content}
													placeholder="在这里输入 Markdown 内容..."
													class="w-full h-full p-6 resize-none outline-none font-mono text-sm"
												></textarea>
											</div>
											<div class="flex-1 overflow-y-auto p-6">
												<div class="prose prose-slate max-w-none">
													{#each content.split('\n') as line}
														{#if line.startsWith('# ')}
															<h1 class="text-3xl font-bold">{line.slice(2)}</h1>
														{:else if line.startsWith('## ')}
															<h2 class="text-2xl font-bold mt-6">{line.slice(3)}</h2>
														{:else if line.startsWith('### ')}
															<h3 class="text-xl font-bold mt-4">{line.slice(4)}</h3>
														{:else if line.startsWith('- ') || line.startsWith('* ')}
															<p class="flex items-start gap-2">
																<span class="text-gray-400">•</span>
																<span>{line.slice(2)}</span>
															</p>
														{:else if line.startsWith('> ')}
															<blockquote class="border-l-4 border-gray-300 pl-4 text-gray-600 italic">
																{line.slice(2)}
															</blockquote>
														{:else if line === ''}
															<br />
														{:else}
															<p>{line}</p>
														{/if}
													{/each}
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>

					<div class="border-t bg-white px-6 py-4 flex items-center justify-between">
						<button
							onclick={prevStep}
							disabled={currentStep === 0}
							class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							← 上一步
						</button>

						{#if currentStep === 11}
							<button
								onclick={saveContent}
								class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
							>
								完成并导出
							</button>
						{:else}
							<button
								onclick={nextStep}
								class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								下一步 →
							</button>
						{/if}
					</div>
				{/if}
			</main>
		</div>
	</div>
{/if}

{#if showAITastePanel && aiAnalysis}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
			<div class="p-6 border-b flex items-center justify-between">
				<h2 class="text-lg font-semibold">AI味检测结果</h2>
				<button onclick={() => (showAITastePanel = false)} class="text-gray-400 hover:text-gray-600">
					✕
				</button>
			</div>

			<div class="p-6 space-y-6">
				<div class="text-center">
					<div class="text-4xl font-bold mb-2 {getAITasteColor(aiAnalysis.score)}">
						{aiAnalysis.score}%
					</div>
					<div class="inline-block px-3 py-1 rounded-full text-sm {getAITasteBgColor(aiAnalysis.score)}">
						{aiAnalysis.score < 30
							? 'AI味低，很好！'
							: aiAnalysis.score < 50
								? 'AI味中等，可优化'
								: 'AI味高，建议修改'}
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4">
					<div class="text-center p-3 bg-gray-50 rounded-lg">
						<div class="text-xl font-semibold">{aiAnalysis.connectorRatio}%</div>
						<div class="text-xs text-gray-500">连接词比率</div>
					</div>
					<div class="text-center p-3 bg-gray-50 rounded-lg">
						<div class="text-xl font-semibold">{aiAnalysis.clicheRatio}%</div>
						<div class="text-xs text-gray-500">套话占比</div>
					</div>
					<div class="text-center p-3 bg-gray-50 rounded-lg">
						<div class="text-xl font-semibold">{aiAnalysis.sentenceStdDev}</div>
						<div class="text-xs text-gray-500">句长标准差</div>
					</div>
				</div>

				<div>
					<h3 class="font-medium mb-2">改进建议</h3>
					<ul class="space-y-2">
						{#each getImprovementSuggestions(aiAnalysis) as suggestion}
							<li class="text-sm text-gray-600 flex items-start gap-2">
								<span class="text-yellow-500">•</span>
								<span>{suggestion}</span>
							</li>
						{/each}
					</ul>
				</div>

				{#if aiAnalysis.clichesFound.length > 0}
					<div>
						<h3 class="font-medium mb-2">发现的套话</h3>
						<div class="flex flex-wrap gap-2">
							{#each aiAnalysis.clichesFound as cliche}
								<span class="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
									{cliche}
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<div class="p-6 border-t flex justify-end">
				<button
					onclick={() => (showAITastePanel = false)}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					知道了
				</button>
			</div>
		</div>
	</div>
{/if}
