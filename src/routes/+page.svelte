<script lang="ts">
	import { onMount } from 'svelte';
	import BalanceScale from '$lib/components/BalanceScale.svelte';
	import Transposition from '$lib/components/Transposition.svelte';

	interface WeightItem {
		id: string;
		type: 'x' | 'weight';
		value: number;
	}

	let activeTab: 'balance' | 'transposition' = $state('balance');

	// Balance scale state
	let initialLeft: WeightItem[] = $state([]);
	let initialRight: WeightItem[] = $state([]);

	// Equation solver state: ax + b = cx + d
	let equationA = $state(1);
	let equationB = $state(2);
	let equationC = $state(0);
	let equationD = $state(5);
	let solution = $state('');
	const balanceRules = [
		'Perhatikan persamaan di atas neraca, lalu cocokkan isi ruas kiri dan kanan.',
		'Jika ada blok seperti 2x atau 4kg, pilih tool hammer untuk memecahnya menjadi bagian-bagian kecil yang setara.',
		'Klik atau pilih beban yang ingin dibuang, lalu seret ke area sampah.',
		'Setiap pengurangan harus dilakukan sama pada kedua ruas agar neraca tetap seimbang.',
		'Tool hammer hanya untuk memecah kelompok, bukan untuk menghapus satu ruas saja.',
		'Tujuan akhir permainan adalah menyisakan 1x di satu ruas dan nilai beratnya di ruas lain.'
	];
	const transpositionRules = [
		'Baca bentuk persamaan pada ruas kiri dan kanan sebelum memilih operasi.',
		'Seret kartu operasi ke kedua ruas dengan operasi yang sama agar persamaan tetap setara.',
		'Jika status masih "Tidak Seimbang", tambahkan pasangan operasi yang sama atau batalkan.',
		'Gunakan tombol "Terapkan" setelah kedua ruas seimbang untuk menyederhanakan persamaan hingga x ditemukan.'
	];

	function createWeightItem(side: 'left' | 'right', value: number, index: number): WeightItem {
		return {
			id: `w-${side}-${index}-${Math.random().toString(36).substring(2, 9)}`,
			type: 'weight',
			value
		};
	}

	function createVariableItem(side: 'left' | 'right', value: number, index: number): WeightItem {
		return {
			id: `x-${side}-${index}-${Math.random().toString(36).substring(2, 9)}`,
			type: 'x',
			value
		};
	}

	function buildGreedyVariables(leftValue: number, rightValue: number) {
		const leftVariables: WeightItem[] = [];
		const rightVariables: WeightItem[] = [];
		let variableIndex = 0;

		if (leftValue <= 0 && rightValue <= 0) {
			return { leftVariables, rightVariables };
		}

		const commonVariable = Math.min(leftValue, rightValue);
		if (commonVariable > 0) {
			leftVariables.push(createVariableItem('left', commonVariable, variableIndex));
			rightVariables.push(createVariableItem('right', commonVariable, variableIndex));
			variableIndex += 1;
		}

		const leftRemainder = leftValue - commonVariable;
		const rightRemainder = rightValue - commonVariable;

		if (leftRemainder > 0) {
			leftVariables.push(createVariableItem('left', leftRemainder, variableIndex));
			variableIndex += 1;
		}

		if (rightRemainder > 0) {
			rightVariables.push(createVariableItem('right', rightRemainder, variableIndex));
		}

		return { leftVariables, rightVariables };
	}

	function buildGreedyWeights(leftValue: number, rightValue: number) {
		const leftWeights: WeightItem[] = [];
		const rightWeights: WeightItem[] = [];
		let weightIndex = 0;

		if (leftValue <= 0 && rightValue <= 0) {
			return { leftWeights, rightWeights };
		}

		const commonWeight = Math.min(leftValue, rightValue);
		if (commonWeight > 0) {
			leftWeights.push(createWeightItem('left', commonWeight, weightIndex));
			rightWeights.push(createWeightItem('right', commonWeight, weightIndex));
			weightIndex += 1;
		}

		const leftRemainder = Number((leftValue - commonWeight).toFixed(2));
		const rightRemainder = Number((rightValue - commonWeight).toFixed(2));

		if (leftRemainder > 0) {
			leftWeights.push(createWeightItem('left', leftRemainder, weightIndex));
			weightIndex += 1;
		}

		if (rightRemainder > 0) {
			rightWeights.push(createWeightItem('right', rightRemainder, weightIndex));
		}

		return { leftWeights, rightWeights };
	}

	function generateRandomEquation(difficulty: 'easy' | 'medium' = 'medium') {
		// x: 1 sampai 6
		const x = Math.floor(Math.random() * 6) + 1;
		let a, c, b, d;

		if (difficulty === 'easy') {
			// x + b = d atau ax = d
			const mode = Math.random() > 0.5 ? 'x+b=d' : 'ax=d';
			if (mode === 'x+b=d') {
				a = 1; c = 0;
				b = Math.floor(Math.random() * 10) + 1;
				d = x + b;
			} else {
				a = Math.floor(Math.random() * 4) + 2; // 2-5
				c = 0; b = 0;
				d = a * x;
			}
		} else {
			// ax + b = cx + d
			a = Math.floor(Math.random() * 5) + 2; // 2-6
			c = Math.floor(Math.random() * (a - 1)) + 1; // 1 to a-1
			
			// (a-c)x = d-b
			b = Math.floor(Math.random() * 8);
			d = b + (a - c) * x;
		}

		equationA = a;
		equationB = b;
		equationC = c;
		equationD = d;
		
		applyToBalance();
	}

	function solveEquation() {
		// (a - c)x = d - b
		const diffX = equationA - equationC;
		const diffW = equationD - equationB;

		if (diffX !== 0) {
			const x = diffW / diffX;
			solution = `x = ${Number(x.toFixed(2))} kg`;
		} else {
			solution = diffW === 0 ? 'Semua nilai x benar' : 'Tidak ada solusi';
		}
	}

	function applyToBalance() {
		const newLeft: WeightItem[] = [];
		const newRight: WeightItem[] = [];

		const { leftVariables, rightVariables } = buildGreedyVariables(Math.abs(equationA), Math.abs(equationC));
		newLeft.push(...leftVariables);
		newRight.push(...rightVariables);

		const { leftWeights, rightWeights } = buildGreedyWeights(equationB, equationD);
		newLeft.push(...leftWeights);
		newRight.push(...rightWeights);

		initialLeft = newLeft;
		initialRight = newRight;
		solution = '';
	}

	onMount(() => {
		generateRandomEquation('medium');
	});

	function formatSide(x: number, w: number) {
		let parts = [];
		if (x > 0) parts.push(x === 1 ? 'x' : `${x}x`);
		if (w > 0) parts.push(`${w}`);
		if (parts.length === 0) return "0";
		return parts.join(" + ");
	}
</script>

<div class="app-container">
	<header class="app-header">
		<h1>📐 MediaMatematika</h1>
		<p class="subtitle">Media Pembelajaran Aljabar Interaktif dengan Visualisasi Timbangan</p>
	</header>

	<nav class="tab-nav">
		<button 
			class="tab-btn {activeTab === 'balance' ? 'active' : ''}" 
			onclick={() => activeTab = 'balance'}
		>
			⚖️ Neraca Keseimbangan
		</button>
		<button 
			class="tab-btn {activeTab === 'transposition' ? 'active' : ''}" 
			onclick={() => activeTab = 'transposition'}
		>
			🔄 Pindah Ruas
		</button>
	</nav>

	<main class="app-main">
		{#if activeTab === 'balance'}
			<section class="section">
				<div class="equation-config">
					<h2>🎯 Selesaikan Persamaan: {formatSide(equationA, equationB)} = {formatSide(equationC, equationD)}</h2>
					
					<div class="action-bar">
						<button class="btn btn-primary" onclick={generateRandomEquation}>
							🔄 Berikan Soal Baru (Random)
						</button>
						<button class="btn btn-success" onclick={solveEquation}>
							🔍 Lihat Kunci Jawaban
						</button>
					</div>

					<div class="preset-section">
						<h4>Atau pilih tingkat kesulitan:</h4>
						<div class="preset-buttons">
							<button class="btn btn-secondary btn-small" onclick={() => generateRandomEquation('easy')}>
								🌱 Sederhana (ax = d atau x + b = d)
							</button>
							<button class="btn btn-secondary btn-small" onclick={() => generateRandomEquation('medium')}>
								🌳 Menengah (ax + b = cx + d)
							</button>
						</div>
					</div>

					{#if solution}
						<div class="solution-display">
							<strong>Solusi:</strong> {solution}
						</div>
					{/if}
				</div>

				<div class="rules-card">
					<h3>📘 Aturan Permainan Neraca</h3>
					<ol class="rules-list">
						{#each balanceRules as rule}
							<li>{rule}</li>
						{/each}
					</ol>
				</div>

				<BalanceScale initialLeft={initialLeft} initialRight={initialRight} />
			</section>
		{:else}
			<section class="section">
				<div class="rules-card">
					<h3>📘 Aturan Permainan Pindah Ruas</h3>
					<ol class="rules-list">
						{#each transpositionRules as rule}
							<li>{rule}</li>
						{/each}
					</ol>
				</div>

				<Transposition />
			</section>
		{/if}
	</main>

	<footer class="app-footer">
		<p>MediaMatematika - Belajar Aljabar dengan Visualisasi Timbangan</p>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		min-height: 100vh;
	}

	.app-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.app-header { text-align: center; color: white; margin-bottom: 30px; }
	.subtitle { opacity: 0.9; }

	.tab-nav { display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; }
	.tab-btn {
		padding: 12px 24px;
		border: none;
		border-radius: 12px;
		font-weight: 600;
		cursor: pointer;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		transition: 0.3s;
	}
	.tab-btn.active { background: white; color: #764ba2; }

	.equation-config {
		background: white;
		border-radius: 16px;
		padding: 24px;
		margin-bottom: 24px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.equation-config h2 {
		margin-top: 0;
		color: #2d3748;
		font-size: 1.5rem;
		margin-bottom: 20px;
	}

	.action-bar {
		display: flex;
		gap: 12px;
		margin-bottom: 24px;
		flex-wrap: wrap;
	}

	.preset-section { margin-bottom: 0; }
	.preset-section h4 { margin-bottom: 12px; color: #4a5568; }
	.preset-buttons { display: flex; gap: 8px; flex-wrap: wrap; }

	.button-group { display: flex; gap: 12px; }
	.btn { padding: 12px 20px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.2s; }
	.btn-primary { background: #667eea; color: white; }
	.btn-success { background: #48bb78; color: white; }
	.btn-secondary { background: #edf2f7; color: #4a5568; }
	.btn-small { padding: 8px 12px; font-size: 0.85rem; }

	.solution-display {
		margin-top: 20px;
		padding: 16px;
		background: #ebf8ff;
		color: #2b6cb0;
		border-radius: 8px;
		text-align: center;
		font-weight: bold;
	}

	.rules-card {
		background: rgba(255, 255, 255, 0.96);
		border-left: 6px solid #f59e0b;
		border-radius: 16px;
		padding: 20px 24px;
		margin-bottom: 24px;
		box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
	}

	.rules-card h3 {
		margin: 0 0 12px;
		color: #92400e;
	}

	.rules-list {
		margin: 0;
		padding-left: 22px;
		color: #374151;
		line-height: 1.6;
	}

	.app-footer { text-align: center; color: rgba(255, 255, 255, 0.7); margin-top: 40px; }

	@media (max-width: 768px) {
		.config-grid { flex-direction: column; }
		.eq-divider { transform: rotate(90deg); margin: -10px 0; }
	}
</style>
