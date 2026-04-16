<script lang="ts">
	import { spring } from 'svelte/motion';

	interface WeightItem {
		id: string;
		type: 'x' | 'weight';
		value: number;
	}

	interface DragState {
		item: WeightItem | null;
		source: 'left' | 'right' | null;
		x: number;
		y: number;
	}

	interface Props {
		initialLeft?: WeightItem[];
		initialRight?: WeightItem[];
	}

	let { initialLeft = [], initialRight = [] }: Props = $props();

	let leftItems: WeightItem[] = $state([]);
	let rightItems: WeightItem[] = $state([]);
	let trueXValue = $state(0);
	let stepHistory: string[] = $state([]);
	let algebraSteps: string[] = $state([]);
	let drag: DragState = $state({ item: null, source: null, x: 0, y: 0 });
	let dropHover = $state(false);
	let selectedIds: Set<string> = $state(new Set());

	// State untuk melacak persamaan terakhir saat seimbang
	let lastBalancedXLeft = $state(0);
	let lastBalancedWLeft = $state(0);
	let lastBalancedXRight = $state(0);
	let lastBalancedWRight = $state(0);

	// Hitung counts saat ini
	let xCountLeft = $derived(leftItems.filter(i => i.type === 'x').reduce((s, i) => s + i.value, 0));
	let xCountRight = $derived(rightItems.filter(i => i.type === 'x').reduce((s, i) => s + i.value, 0));
	let weightLeft = $derived(leftItems.filter(i => i.type === 'weight').reduce((s, i) => s + i.value, 0));
	let weightRight = $derived(rightItems.filter(i => i.type === 'weight').reduce((s, i) => s + i.value, 0));

	let balance = spring(0, { stiffness: 0.05, damping: 0.4 });
	let totalWeightLeft = $derived(xCountLeft * trueXValue + weightLeft);
	let totalWeightRight = $derived(xCountRight * trueXValue + weightRight);
	
	$effect(() => {
		const diff = totalWeightRight - totalWeightLeft;
		const angle = Math.max(-20, Math.min(20, diff * 5));
		balance.set(angle);
	});

	let isBalanced = $derived(Math.abs(totalWeightLeft - totalWeightRight) < 0.001);
	let isSolved = $derived(isBalanced && ((xCountLeft === 1 && weightLeft === 0 && xCountRight === 0) || (xCountRight === 1 && weightRight === 0 && xCountLeft === 0)));
	let displaySolution = $derived((xCountLeft === 1 && weightLeft === 0 && xCountRight === 0) ? weightRight : (xCountRight === 1 && weightRight === 0 && xCountLeft === 0) ? weightLeft : null);

	function formatEq(x: number, w: number) {
		let parts = [];
		if (x > 0) parts.push(x === 1 ? 'x' : `${x}x`);
		if (w > 0) parts.push(`${w}kg`);
		if (parts.length === 0) return "0";
		return parts.join(" + ");
	}

	function formatVariable(value: number): string {
		if (value === 1) return 'x';
		return `${Number(value.toFixed(2))}x`;
	}

	// Efek untuk mencatat langkah aljabar saat neraca SEIMBANG kembali
	$effect(() => {
		if (isBalanced) {
			// Cek apakah ada perubahan dari keadaan seimbang terakhir
			const dxL = lastBalancedXLeft - xCountLeft;
			const dwL = lastBalancedWLeft - weightLeft;
			const dxR = lastBalancedXRight - xCountRight;
			const dwR = lastBalancedWRight - weightRight;

			if (dxL > 0 || dwL > 0 || dxR > 0 || dwR > 0) {
				// Format langkah aljabar
				let action = "";
				if (dxL === dxR && dxL > 0 && dwL === dwR && dwL > 0) {
					action = `Kedua ruas dikurangi ${dxL}x dan ${dwL}kg`;
				} else if (dxL === dxR && dxL > 0) {
					action = `Kedua ruas dikurangi ${dxL}x`;
				} else if (dwL === dwR && dwL > 0) {
					action = `Kedua ruas dikurangi ${dwL}kg`;
				} else {
					action = `Neraca diseimbangkan kembali`;
				}

				const oldEq = `${formatEq(lastBalancedXLeft, lastBalancedWLeft)} = ${formatEq(lastBalancedXRight, lastBalancedWRight)}`;
				const newEq = `${formatEq(xCountLeft, weightLeft)} = ${formatEq(xCountRight, weightRight)}`;
				
				algebraSteps = [...algebraSteps, `${action} | ${oldEq} → ${newEq}`];
				
				// Update state seimbang terakhir
				lastBalancedXLeft = xCountLeft;
				lastBalancedWLeft = weightLeft;
				lastBalancedXRight = xCountRight;
				lastBalancedWRight = weightRight;
			}
		}
	});

	function formatWeight(value: number): string {
		if (value === 0) return '0kg';
		return `${Number(value.toFixed(2))}kg`;
	}

	function startDrag(item: WeightItem, source: 'left' | 'right', e: MouseEvent | TouchEvent) {
		e.preventDefault();
		
		// Jika klik item yang belum terpilih, bersihkan pilihan lama (kecuali jika tekan Shift, tapi kita pakai sistem toggle saja)
		// Tapi untuk UX yang intuitif: jika drag item yang belum terpilih, pilih itu saja.
		if (!selectedIds.has(item.id)) {
			selectedIds.clear();
			selectedIds.add(item.id);
		}

		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		drag = { item, source, x: clientX, y: clientY };
		dropHover = false;
	}

	function toggleSelect(item: WeightItem, e: MouseEvent | TouchEvent) {
		e.stopPropagation();
		if (selectedIds.has(item.id)) {
			selectedIds.delete(item.id);
		} else {
			selectedIds.add(item.id);
		}
	}

	function moveDrag(e: MouseEvent | TouchEvent) {
		if (!drag.item) return;
		e.preventDefault();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		drag.x = clientX; drag.y = clientY;
		const el = document.elementFromPoint(clientX, clientY);
		dropHover = !!el?.closest('.drop-zone');
	}

	function endDrag(e: MouseEvent | TouchEvent) {
		if (!drag.item || !drag.source) return;
		const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
		const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
		const el = document.elementFromPoint(clientX, clientY);
		
		if (!!el?.closest('.drop-zone')) {
			removeSelectedItems(drag.source);
		}
		
		drag = { item: null, source: null, x: 0, y: 0 };
		dropHover = false;
	}

	function removeSelectedItems(source: 'left' | 'right') {
		const toRemove = Array.from(selectedIds);
		if (toRemove.length === 0) return;

		let itemsToRemove: WeightItem[] = [];
		if (source === 'left') {
			itemsToRemove = leftItems.filter(i => selectedIds.has(i.id));
			leftItems = leftItems.filter(i => !selectedIds.has(i.id));
		} else {
			itemsToRemove = rightItems.filter(i => selectedIds.has(i.id));
			rightItems = rightItems.filter(i => !selectedIds.has(i.id));
		}
		
		const sideName = source === 'left' ? 'kiri' : 'kanan';
		const xCount = itemsToRemove.filter(i => i.type === 'x').reduce((s, i) => s + i.value, 0);
		const wTotal = itemsToRemove.filter(i => i.type === 'weight').reduce((s, i) => s + i.value, 0);
		
		let logParts = [];
		if (xCount > 0) logParts.push(formatVariable(xCount));
		if (wTotal > 0) logParts.push(formatWeight(wTotal));
		
		stepHistory = [...stepHistory, `Buang ${logParts.join(' & ')} (${sideName})`];
		selectedIds.clear();
	}

	function removeItem(item: WeightItem, source: 'left' | 'right') {
		if (source === 'left') leftItems = leftItems.filter(i => i.id !== item.id);
		else rightItems = rightItems.filter(i => i.id !== item.id);
		
		const sideName = source === 'left' ? 'kiri' : 'kanan';
		const itemName = item.type === 'x' ? formatVariable(item.value) : formatWeight(item.value);
		stepHistory = [...stepHistory, `Buang ${itemName} (${sideName})`];
	}

	function reset() {
		leftItems = [...initialLeft];
		rightItems = [...initialRight];
		stepHistory = [];
		algebraSteps = [];
		selectedIds.clear();
		lastBalancedXLeft = leftItems.filter(i => i.type === 'x').reduce((s, i) => s + i.value, 0);
		lastBalancedWLeft = leftItems.filter(i => i.type === 'weight').reduce((s, i) => s + i.value, 0);
		lastBalancedXRight = rightItems.filter(i => i.type === 'x').reduce((s, i) => s + i.value, 0);
		lastBalancedWRight = rightItems.filter(i => i.type === 'weight').reduce((s, i) => s + i.value, 0);
	}

	$effect(() => {
		leftItems = [...initialLeft];
		rightItems = [...initialRight];
		stepHistory = [];
		algebraSteps = [];
		selectedIds.clear();
		
		const a1 = initialLeft.filter(i => i.type === 'x').reduce((s, i) => s + i.value, 0);
		const b1 = initialLeft.filter(i => i.type === 'weight').reduce((s, i) => s + i.value, 0);
		const a2 = initialRight.filter(i => i.type === 'x').reduce((s, i) => s + i.value, 0);
		const b2 = initialRight.filter(i => i.type === 'weight').reduce((s, i) => s + i.value, 0);
		
		if (a1 !== a2) trueXValue = (b2 - b1) / (a1 - a2);
		else trueXValue = 5;

		lastBalancedXLeft = a1; lastBalancedWLeft = b1;
		lastBalancedXRight = a2; lastBalancedWRight = b2;
	});
</script>

<div class="balance-scale" onmousemove={moveDrag} ontouchmove={moveDrag} onmouseup={endDrag} ontouchend={endDrag}>
	<div class="scale-header">
		<h3>⚖️ Neraca Aljabar</h3>
		<div class="header-actions">
			{#if isSolved}
				<span class="badge success">🎉 SELESAI! x = {formatWeight(displaySolution || 0)}</span>
			{:else if isBalanced}
				<span class="badge balanced">⚖️ Seimbang</span>
			{:else}
				<span class="badge unbalanced">⚠️ Tidak Seimbang</span>
			{/if}
			<button class="btn-reset-small" onclick={reset}>↺ Reset Timbangan</button>
		</div>
	</div>

	<div class="current-equation">
		<div class="eq-box">
			<span class="eq-x">{xCountLeft > 0 ? `${xCountLeft}x` : ''}</span>
			{#if xCountLeft > 0 && weightLeft > 0}<span class="eq-plus">+</span>{/if}
			<span class="eq-w">{weightLeft > 0 ? formatWeight(weightLeft) : (xCountLeft === 0 ? '0' : '')}</span>
		</div>
		<div class="eq-sign">{isBalanced ? '=' : '≠'}</div>
		<div class="eq-box">
			<span class="eq-x">{xCountRight > 0 ? `${xCountRight}x` : ''}</span>
			{#if xCountRight > 0 && weightRight > 0}<span class="eq-plus">+</span>{/if}
			<span class="eq-w">{weightRight > 0 ? formatWeight(weightRight) : (xCountRight === 0 ? '0' : '')}</span>
		</div>
	</div>

	<div class="scale-container">
		<div class="pillar">
			<div class="pillar-base"></div>
			<div class="pillar-body"></div>
		</div>
		<div class="beam-wrapper" style="transform: rotate({$balance}deg)">
			<div class="beam">
				<div class="pan-side left" style="transform: rotate({-$balance}deg)">
					<div class="strings"><div class="string"></div><div class="string"></div></div>
					<div class="pan">
						<div class="pan-surface">
							{#each leftItems as item (item.id)}
								<div class="weight-item {drag.item?.id === item.id ? 'dragging' : ''} {selectedIds.has(item.id) ? 'selected' : ''}" 
									onmousedown={(e) => startDrag(item, 'left', e)} 
									ontouchstart={(e) => startDrag(item, 'left', e)}
									onclick={(e) => toggleSelect(item, e)}
								>
									{#if item.type === 'x'}<div class="mystery-bag"><div class="bag-body"></div><div class="bag-label">{formatVariable(item.value)}</div></div>
									{:else}<div class="known-weight"><div class="weight-plate"><div class="weight-body"></div><div class="weight-text">{formatWeight(item.value)}</div></div></div>{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
				<div class="pivot"><div class="pivot-circle"></div></div>
				<div class="pan-side right" style="transform: rotate({-$balance}deg)">
					<div class="strings"><div class="string"></div><div class="string"></div></div>
					<div class="pan">
						<div class="pan-surface">
							{#each rightItems as item (item.id)}
								<div class="weight-item {drag.item?.id === item.id ? 'dragging' : ''} {selectedIds.has(item.id) ? 'selected' : ''}" 
									onmousedown={(e) => startDrag(item, 'right', e)} 
									ontouchstart={(e) => startDrag(item, 'right', e)}
									onclick={(e) => toggleSelect(item, e)}
								>
									{#if item.type === 'x'}<div class="mystery-bag"><div class="bag-body"></div><div class="bag-label">{formatVariable(item.value)}</div></div>
									{:else}<div class="known-weight"><div class="weight-plate"><div class="weight-body"></div><div class="weight-text">{formatWeight(item.value)}</div></div></div>{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="drop-zone {dropHover ? 'hover' : ''}"><div class="drop-icon">🗑️</div><div class="drop-text">Buang di sini</div></div>

	{#if algebraSteps.length > 0}
		<div class="algebra-log">
			<h4>📝 Langkah Aljabar:</h4>
			<div class="steps-container">
				{#each algebraSteps as step}
					<div class="step-card">
						<div class="step-action">{step.split('|')[0]}</div>
						<div class="step-math">{step.split('|')[1]}</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if drag.item}
		<div class="drag-cursor" style="left: {drag.x}px; top: {drag.y}px">
			{#if selectedIds.size > 1}
				<div class="multi-indicator">{selectedIds.size}</div>
			{/if}
			{#if drag.item.type === 'x'}<div class="mini-bag">{formatVariable(drag.item.value)}</div>{:else}<div class="mini-weight">{formatWeight(drag.item.value)}</div>{/if}
		</div>
	{/if}
</div>

<style>
	.balance-scale { background: #2d3748; border-radius: 20px; padding: 24px; color: white; position: relative; overflow: hidden; }
	.scale-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
	.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
	.badge { padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.8rem; }
	.badge.success { background: #48bb78; }
	.badge.balanced { background: #4299e1; }
	.badge.unbalanced { background: #f56565; }

	.current-equation { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 12px; font-size: 1.5rem; font-weight: bold; }
	.eq-x { color: #f6e05e; }
	.eq-w { color: #68d391; }
	.eq-sign { color: #a0aec0; }

	.scale-container { position: relative; height: 280px; margin: 20px 0; display: flex; justify-content: center; }
	.pillar { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); }
	.pillar-base { width: 100px; height: 10px; background: #4a5568; }
	.pillar-body { width: 20px; height: 150px; background: #718096; margin: 0 auto; }
	.beam-wrapper { position: absolute; top: 30px; width: 100%; max-width: 500px; transition: transform 0.1s; }
	.beam { display: flex; justify-content: space-between; height: 6px; background: #718096; border-radius: 3px; position: relative; }
	.pan-side { display: flex; flex-direction: column; align-items: center; transition: transform 0.1s; }
	.string { width: 1px; height: 80px; background: #a0aec0; }
	.pan-surface { background: rgba(255,255,255,0.1); border-bottom: 4px solid #cbd5e0; border-radius: 0 0 40px 40px; padding: 10px; min-height: 80px; width: 160px; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; align-items: flex-end; }

	.mystery-bag { position: relative; width: 34px; height: 42px; background: #d69e2e; border-radius: 6px; transition: transform 0.2s, box-shadow 0.2s; }
	.weight-item.selected .mystery-bag { border: 2px solid white; box-shadow: 0 0 10px rgba(255,255,255,0.5); transform: scale(1.1); }
	.weight-item.selected .known-weight { border: 2px solid white; border-radius: 4px; box-shadow: 0 0 10px rgba(255,255,255,0.5); transform: scale(1.1); }
	
	.bag-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-weight: bold; }
	.weight-body { width: 30px; height: 20px; background: #4a5568; border-radius: 3px; }
	.weight-text { font-size: 0.6rem; text-align: center; }

	.pivot { position: absolute; left: 50%; top: -6px; transform: translateX(-50%); }
	.pivot-circle { width: 18px; height: 18px; background: #f6e05e; border-radius: 50%; border: 3px solid #2d3748; }

	.drop-zone { margin: 10px auto; width: 80%; padding: 15px; background: rgba(255,255,255,0.05); border: 2px dashed #4a5568; border-radius: 12px; text-align: center; }
	.drop-zone.hover { background: rgba(245,101,101,0.2); border-color: #f56565; }

	.algebra-log { margin-top: 20px; background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; }
	.steps-container { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
	.step-card { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border-left: 4px solid #4299e1; }
	.step-action { font-size: 0.85rem; color: #a0aec0; margin-bottom: 4px; }
	.step-math { font-family: monospace; font-size: 1rem; color: #f6e05e; }
	.btn-reset-small { background: rgba(255,255,255,0.08); border: 1px solid #4a5568; color: white; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }

	.drag-cursor { position: fixed; pointer-events: none; z-index: 1000; transform: translate(-50%,-50%); }
	.drag-cursor .multi-indicator { position: absolute; top: -10px; right: -10px; background: #f56565; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold; }
	.mini-bag { width: 30px; height: 38px; background: #d69e2e; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
	.mini-weight { background: #4a5568; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; }
</style>
