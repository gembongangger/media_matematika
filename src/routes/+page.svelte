<script lang="ts">
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
	let equationA = $state(3); // x di kiri
	let equationB = $state(2); // konstanta di kiri
	let equationC = $state(1); // x di kanan
	let equationD = $state(10); // konstanta di kanan
	let solution = $state('');

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

		// Ruas Kiri (ax + b)
		for (let i = 0; i < Math.abs(equationA); i++) {
			newLeft.push({
				id: `x-left-${i}-${Math.random().toString(36).substr(2, 9)}`,
				type: 'x',
				value: 0
			});
		}
		if (equationB > 0) {
			newLeft.push({
				id: `weight-left-b-${Math.random().toString(36).substr(2, 9)}`,
				type: 'weight',
				value: equationB
			});
		}

		// Ruas Kanan (cx + d)
		for (let i = 0; i < Math.abs(equationC); i++) {
			newRight.push({
				id: `x-right-${i}-${Math.random().toString(36).substr(2, 9)}`,
				type: 'x',
				value: 0
			});
		}
		
		// Konstanta kanan dipecah jadi satuan 1kg
		const fullKg = Math.floor(equationD);
		const remainder = equationD - fullKg;

		for (let i = 0; i < fullKg; i++) {
			newRight.push({
				id: `weight-right-d-${i}-${Math.random().toString(36).substr(2, 9)}`,
				type: 'weight',
				value: 1
			});
		}
		if (remainder > 0) {
			newRight.push({
				id: `weight-right-d-rem-${Math.random().toString(36).substr(2, 9)}`,
				type: 'weight',
				value: remainder
			});
		}

		initialLeft = newLeft;
		initialRight = newRight;
		solution = '';
	}

	function loadPreset(preset: string) {
		switch (preset) {
			case 'both1':
				equationA = 3; equationB = 2; equationC = 1; equationD = 8; // 2x = 6 -> x=3
				break;
			case 'both2':
				equationA = 4; equationB = 1; equationC = 2; equationD = 9; // 2x = 8 -> x=4
				break;
			case 'both3':
				equationA = 5; equationB = 3; equationC = 3; equationD = 11; // 2x = 8 -> x=4
				break;
			case 'easy1':
				equationA = 1; equationB = 3; equationC = 0; equationD = 8; // x = 5
				break;
			case 'easy2':
				equationA = 2; equationB = 2; equationC = 0; equationD = 10; // x = 4
				break;
			default:
				equationA = 1; equationB = 2; equationC = 0; equationD = 5;
				break;
		}
		applyToBalance();
		solution = '';
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
					<h2>🎯 Konfigurasi Persamaan: ax + b = cx + d</h2>
					
					<div class="config-grid">
						<div class="side-config">
							<h3>Ruas Kiri (ax + b)</h3>
							<div class="input-item">
								<label for="a">a (jumlah kantong x)</label>
								<input id="a" type="number" bind:value={equationA} min="0" max="5" />
							</div>
							<div class="input-item">
								<label for="b">b (berat konstan, kg)</label>
								<input id="b" type="number" bind:value={equationB} min="0" max="20" step="0.5" />
							</div>
						</div>
						
						<div class="eq-divider">=</div>

						<div class="side-config">
							<h3>Ruas Kanan (cx + d)</h3>
							<div class="input-item">
								<label for="c">c (jumlah kantong x)</label>
								<input id="c" type="number" bind:value={equationC} min="0" max="5" />
							</div>
							<div class="input-item">
								<label for="d">d (berat konstan, kg)</label>
								<input id="d" type="number" bind:value={equationD} min="0" max="20" step="0.5" />
							</div>
						</div>
					</div>

					<div class="preset-section">
						<h4>Pilih Soal Tantangan:</h4>
						<div class="preset-buttons">
							<button class="btn btn-secondary btn-small" onclick={() => loadPreset('both1')}>
								📦 3x + 2 = x + 8
							</button>
							<button class="btn btn-secondary btn-small" onclick={() => loadPreset('both2')}>
								📦 4x + 1 = 2x + 9
							</button>
							<button class="btn btn-secondary btn-small" onclick={() => loadPreset('both3')}>
								📦 5x + 3 = 3x + 11
							</button>
						</div>
						<div class="preset-buttons" style="margin-top: 8px;">
							<button class="btn btn-secondary btn-small" onclick={() => loadPreset('easy1')}>
								📦 x + 3 = 8
							</button>
							<button class="btn btn-secondary btn-small" onclick={() => loadPreset('easy2')}>
								📦 2x + 2 = 10
							</button>
						</div>
					</div>

					<div class="button-group">
						<button class="btn btn-primary" onclick={solveEquation}>
							🔍 Hitung Nilai x
						</button>
						<button class="btn btn-success" onclick={applyToBalance}>
							⚖️ Terapkan ke Neraca
						</button>
					</div>

					{#if solution}
						<div class="solution-display">
							<strong>Solusi:</strong> {solution}
						</div>
					{/if}
				</div>

				<BalanceScale initialLeft={initialLeft} initialRight={initialRight} />
			</section>
		{:else}
			<section class="section">
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

	.config-grid {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 24px;
	}
	.side-config { flex: 1; background: #f7fafc; padding: 16px; border-radius: 12px; }
	.side-config h3 { margin: 0 0 12px 0; font-size: 1rem; color: #4a5568; }
	.eq-divider { font-size: 2.5rem; font-weight: bold; color: #cbd5e0; }

	.input-item { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
	.input-item label { font-size: 0.85rem; font-weight: 600; color: #718096; }
	.input-item input { padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; }

	.preset-section { margin-bottom: 24px; }
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

	.app-footer { text-align: center; color: rgba(255, 255, 255, 0.7); margin-top: 40px; }

	@media (max-width: 768px) {
		.config-grid { flex-direction: column; }
		.eq-divider { transform: rotate(90deg); margin: -10px 0; }
	}
</style>