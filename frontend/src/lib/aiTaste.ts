export interface AITasteAnalysis {
	score: number;
	connectorRatio: number;
	clicheRatio: number;
	sentenceStdDev: number;
	sentenceLengths: number[];
	clichesFound: string[];
	connectorsFound: string[];
}

const cliches = [
	'总而言之',
	'综上所述',
	'由此可见',
	'值得一提的是',
	'需要注意的是',
	'更重要的是',
	'不容忽视的是',
	'进一步而言',
	'从某种意义上说',
	'在很大程度上',
	'一般来说',
	'通常情况下',
	'相对而言',
	'相应地',
	'与此同时',
	'不仅如此',
	'更有甚者',
	'一言以蔽之',
	'归根结底',
	'说到底',
	'从根本上说',
	'本质上讲',
	'事实上',
	'实际上',
	'其实不然',
	'反之亦然',
	'换句话说',
	'也就是说',
	'简而言之',
	'概而言之',
	'广而言之'
];

const connectors = [
	'然而',
	'但是',
	'不过',
	'当然',
	'显然',
	'确实',
	'其实',
	'另外',
	'此外',
	'再者',
	'同时',
	'以及',
	'并且',
	'然而',
	'尽管如此',
	'即便如此',
	'虽然如此',
	'因此',
	'所以',
	'因而',
	'故而',
	'于是',
	'从而',
	'因此',
	'由此',
	'据此',
	'鉴于此'
];

export function analyzeAITaste(text: string): AITasteAnalysis {
	if (!text || text.length < 10) {
		return {
			score: 0,
			connectorRatio: 0,
			clicheRatio: 0,
			sentenceStdDev: 0,
			sentenceLengths: [],
			clichesFound: [],
			connectorsFound: []
		};
	}

	const clichesFound: string[] = [];
	const connectorsFound: string[] = [];

	for (const cliche of cliches) {
		if (text.includes(cliche)) {
			clichesFound.push(cliche);
		}
	}

	for (const connector of connectors) {
		if (text.includes(connector)) {
			connectorsFound.push(connector);
		}
	}

	const sentences = text
		.split(/[。！？.!?]+/)
		.filter((s) => s.trim().length > 0);

	const sentenceLengths = sentences.map((s) => s.trim().length);

	const avgLength = sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length || 0;
	const variance =
		sentenceLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) /
			sentenceLengths.length || 0;
	const stdDev = Math.sqrt(variance);

	const totalWords = text.length;
	const clicheCount = clichesFound.length;
	const connectorCount = connectorsFound.length;

	const clicheRatio = totalWords > 0 ? Math.round((clicheCount / (totalWords / 100)) * 100) : 0;
	const connectorRatio = totalWords > 0 ? Math.round((connectorCount / (totalWords / 100)) * 100) : 0;

	const sentenceUniformity = avgLength > 0 ? Math.min(100, Math.round((1 - stdDev / avgLength) * 100)) : 0;

	const score = Math.min(
		100,
		Math.round(clicheRatio * 0.35 + connectorRatio * 0.35 + sentenceUniformity * 0.3)
	);

	return {
		score,
		connectorRatio,
		clicheRatio,
		sentenceStdDev: Math.round(stdDev),
		sentenceLengths,
		clichesFound,
		connectorsFound
	};
}

export function getAITasteColor(score: number): string {
	if (score < 30) return 'text-green-600';
	if (score < 50) return 'text-yellow-600';
	return 'text-red-600';
}

export function getAITasteBgColor(score: number): string {
	if (score < 30) return 'bg-green-100';
	if (score < 50) return 'bg-yellow-100';
	return 'bg-red-100';
}

export function getAITasteLabel(score: number): string {
	if (score < 30) return 'AI味低';
	if (score < 50) return 'AI味中等';
	return 'AI味高';
}

export function getImprovementSuggestions(analysis: AITasteAnalysis): string[] {
	const suggestions: string[] = [];

	if (analysis.clicheRatio > 5) {
		suggestions.push(
			`减少套话使用：发现 ${analysis.clichesFound.length} 个套话，请替换或删除`
		);
	}

	if (analysis.connectorRatio > 5) {
		suggestions.push(
			`减少连接词：发现 ${analysis.connectorsFound.length} 个连接词，尝试用短句或分段代替`
		);
	}

	if (analysis.sentenceStdDev < 5) {
		suggestions.push(
			`句长过于统一（标准差 ${analysis.sentenceStdDev}），尝试混合长短句增加节奏感`
		);
	}

	if (suggestions.length === 0) {
		suggestions.push('文章AI味较低，继续保持！');
	}

	return suggestions;
}
