<script lang="ts">
	import { spring } from 'svelte/motion';
	import { fade, scale } from 'svelte/transition';

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

	interface AlgebraSnapshot {
		x: number;
		w: number;
	}

	interface AlgebraStep {
		action: string;
		leftBefore: AlgebraSnapshot;
		rightBefore: AlgebraSnapshot;
		leftAfter: AlgebraSnapshot;
		rightAfter: AlgebraSnapshot;
		removedX: number;
		removedW: number;
	}

	let { initialLeft = [], initialRight = [] }: Props = $props();

	let leftItems: WeightItem[] = $state([]);
	let rightItems: WeightItem[] = $state([]);
	let trueXValue = $state(0);
	let stepHistory: string[] = $state([]);
	let algebraSteps: AlgebraStep[] = $state([]);
	let drag: DragState = $state({ item: null, source: null, x: 0, y: 0 });
	let dropHover = $state(false);
	let selectedIds: Set<string> = $state(new Set());
	let activeTool: 'select' | 'hammer' = $state('select');

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

	function formatLogEq(x: number, w: number) {
		let parts = [];
		if (x > 0) parts.push(x === 1 ? 'x' : `${Number(x.toFixed(2))}x`);
		if (w > 0) parts.push(`${Number(w.toFixed(2))}`);
		if (parts.length === 0) return '0';
		return parts.join(' + ');
	}

	function formatLogTerm(value: number, suffix = '') {
		if (value === 1 && suffix) return suffix;
		return `${Number(value.toFixed(2))}${suffix}`;
	}

	function getOperationTerms(snapshot: AlgebraSnapshot, removedX: number, removedW: number) {
		const terms: { text: string; canceled: boolean }[] = [];

		if (snapshot.x > 0) terms.push({ text: formatLogTerm(snapshot.x, 'x'), canceled: false });
		if (snapshot.w > 0) terms.push({ text: formatLogTerm(snapshot.w), canceled: false });
		if (removedX > 0) terms.push({ text: `- ${formatLogTerm(removedX, 'x')}`, canceled: false });
		if (removedW > 0) terms.push({ text: `- ${formatLogTerm(removedW)}`, canceled: false });
		if (terms.length === 0) terms.push({ text: '0', canceled: false });

		return terms;
	}

	function getCancellationTerms(before: AlgebraSnapshot, after: AlgebraSnapshot, removedX: number, removedW: number) {
		const terms: { text: string; canceled: boolean }[] = [];
		const xCanceledToZero = removedX > 0 && before.x > 0 && after.x === 0;
		const wCanceledToZero = removedW > 0 && before.w > 0 && after.w === 0;

		if (after.x > 0) terms.push({ text: formatLogTerm(after.x, 'x'), canceled: false });
		else if (xCanceledToZero) terms.push({ text: formatLogTerm(0, 'x'), canceled: true });

		if (after.w > 0) terms.push({ text: formatLogTerm(after.w), canceled: false });
		else if (wCanceledToZero) terms.push({ text: formatLogTerm(0), canceled: true });

		if (terms.length === 0) terms.push({ text: '0', canceled: false });

		return terms;
	}

	function formatVariable(value: number): string {
		if (value === 1) return 'x';
		return `${Number(value.toFixed(2))}x`;
	}

	function createSplitItem(source: 'left' | 'right', item: WeightItem, value: number, index: number): WeightItem {
		const base = item.type === 'x' ? 'x' : 'w';
		return {
			id: `${base}-${source}-split-${index}-${Math.random().toString(36).slice(2, 9)}`,
			type: item.type,
			value
		};
	}

	function needsPlusBefore(term: { text: string }, index: number) {
		return index > 0 && !term.text.startsWith('-');
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
				const removedX = dxL === dxR ? dxL : 0;
				const removedW = dwL === dwR ? dwL : 0;

				// Format langkah aljabar
				let action = "";
				if (removedX > 0 && removedW > 0) {
					action = `Kedua ruas dikurangi ${formatLogTerm(removedX, 'x')} dan ${formatLogTerm(removedW)}`;
				} else if (removedX > 0) {
					action = `Kedua ruas dikurangi ${formatLogTerm(removedX, 'x')}`;
				} else if (removedW > 0) {
					action = `Kedua ruas dikurangi ${formatLogTerm(removedW)}`;
				} else {
					action = `Neraca diseimbangkan kembali`;
				}

				algebraSteps = [
					...algebraSteps,
					{
						action,
						leftBefore: { x: lastBalancedXLeft, w: lastBalancedWLeft },
						rightBefore: { x: lastBalancedXRight, w: lastBalancedWRight },
						leftAfter: { x: xCountLeft, w: weightLeft },
						rightAfter: { x: xCountRight, w: weightRight },
						removedX,
						removedW
					}
				];
				
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
		if (activeTool === 'hammer') {
			return;
		}
		if (selectedIds.has(item.id)) {
			selectedIds.delete(item.id);
		} else {
			selectedIds.add(item.id);
		}
	}

	function getSplitValues(item: WeightItem, source: 'left' | 'right') {
		if (item.type === 'x') {
			return Array.from({ length: Math.floor(item.value) }, () => 1);
		}

		const oppositeXCount = source === 'left' ? xCountRight : xCountLeft;
		const preferredParts = oppositeXCount > 1 && Math.abs(item.value % oppositeXCount) < 0.001
			? oppositeXCount
			: Math.floor(item.value);

		if (preferredParts <= 1) {
			return Array.from({ length: Math.floor(item.value) }, () => 1);
		}

		const eachValue = Number((item.value / preferredParts).toFixed(2));
		return Array.from({ length: preferredParts }, () => eachValue);
	}

	function splitItem(item: WeightItem, source: 'left' | 'right') {
		if (item.value <= 1) return;

		const splitValues = getSplitValues(item, source);
		if (splitValues.length <= 1) return;
		const splitItems = splitValues.map((value, index) => createSplitItem(source, item, value, index));

		if (source === 'left') {
			leftItems = leftItems.flatMap((current) => current.id === item.id ? splitItems : [current]);
		} else {
			rightItems = rightItems.flatMap((current) => current.id === item.id ? splitItems : [current]);
		}

		selectedIds.delete(item.id);
		const itemName = item.type === 'x' ? formatVariable(item.value) : formatWeight(item.value);
		const resultName = splitItems.map((part) => item.type === 'x' ? formatVariable(part.value) : formatWeight(part.value)).join(' + ');
		const sideName = source === 'left' ? 'kiri' : 'kanan';
		stepHistory = [...stepHistory, `Hammer: ${itemName} dipecah menjadi ${resultName} (${sideName})`];
	}

	function handleItemPointerDown(item: WeightItem, source: 'left' | 'right', e: MouseEvent | TouchEvent) {
		if (activeTool === 'hammer') {
			e.preventDefault();
			splitItem(item, source);
			return;
		}

		startDrag(item, source, e);
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

	<div class="tool-panel">
		<button
			class="tool-toggle {activeTool === 'select' ? 'active' : ''}"
			onclick={() => activeTool = 'select'}
		>
			🖐️ Pilih / Buang
		</button>
		<button
			class="tool-toggle {activeTool === 'hammer' ? 'active' : ''}"
			onclick={() => activeTool = 'hammer'}
		>
			🔨 Hammer Pecah
		</button>
		<p class="tool-hint">
			{#if activeTool === 'hammer'}
				Klik item bernilai besar seperti `3x` atau `6kg`. Beban angka akan dipecah mengikuti jumlah `x` di ruas lawan jika bisa dibagi rata.
			{:else}
				Pilih item yang sama pada kedua ruas lalu seret ke tempat sampah agar neraca tetap setara.
			{/if}
		</p>
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
		{#if isSolved}
			<div class="success-overlay" transition:fade>
				<div class="success-card" transition:scale>
					<div class="success-icon">🏆</div>
					<h3>Misi Tercapai!</h3>
					<p>Kamu berhasil mengisolasi <strong>x</strong></p>
					<div class="success-result">x = {formatWeight(displaySolution || 0)}</div>
					<button class="btn-success-action" onclick={reset}>Main Lagi (Reset)</button>
				</div>
			</div>
		{/if}
		<div class="pillar">
			<div class="pillar-base"></div>
			<div class="pillar-body"></div>
		</div>
		<div class="beam-wrapper" style="transform: rotate({$balance}deg)">
			<div class="beam">
				<div class="pan-side left" style="transform: rotate({-$balance}deg)">
					<div class="pan">
						<div class="pan-surface">
							{#each leftItems as item (item.id)}
								<div class="weight-item {drag.item?.id === item.id ? 'dragging' : ''} {selectedIds.has(item.id) ? 'selected' : ''}" 
									onmousedown={(e) => handleItemPointerDown(item, 'left', e)} 
									ontouchstart={(e) => handleItemPointerDown(item, 'left', e)}
									onclick={(e) => toggleSelect(item, e)}
								>
									{#if item.type === 'x'}<div class="mystery-bag"><div class="bag-body"></div><div class="bag-label">{formatVariable(item.value)}</div></div>
									{:else}<div class="known-weight"><div class="weight-plate"><div class="weight-body"></div><div class="weight-text">{formatWeight(item.value)}</div></div></div>{/if}
								</div>
							{/each}
						</div>
					</div>
					<div class="pan-support"></div>
				</div>
				<div class="pivot"><div class="pivot-circle"></div></div>
				<div class="pan-side right" style="transform: rotate({-$balance}deg)">
					<div class="pan">
						<div class="pan-surface">
							{#each rightItems as item (item.id)}
								<div class="weight-item {drag.item?.id === item.id ? 'dragging' : ''} {selectedIds.has(item.id) ? 'selected' : ''}" 
									onmousedown={(e) => handleItemPointerDown(item, 'right', e)} 
									ontouchstart={(e) => handleItemPointerDown(item, 'right', e)}
									onclick={(e) => toggleSelect(item, e)}
								>
									{#if item.type === 'x'}<div class="mystery-bag"><div class="bag-body"></div><div class="bag-label">{formatVariable(item.value)}</div></div>
									{:else}<div class="known-weight"><div class="weight-plate"><div class="weight-body"></div><div class="weight-text">{formatWeight(item.value)}</div></div></div>{/if}
								</div>
							{/each}
						</div>
					</div>
					<div class="pan-support"></div>
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
						<div class="step-action">{step.action}</div>
						<div class="step-trace">
							<div class="trace-line">
								<span class="trace-label">Operasi:</span>
								<span class="trace-eq">
									<span class="trace-side">
										{#each getOperationTerms(step.leftBefore, step.removedX, step.removedW) as term, index}
											{#if needsPlusBefore(term, index)}<span class="trace-join">+</span>{/if}
											<span>{term.text}</span>
										{/each}
									</span>
									<span class="trace-sign">=</span>
									<span class="trace-side">
										{#each getOperationTerms(step.rightBefore, step.removedX, step.removedW) as term, index}
											{#if needsPlusBefore(term, index)}<span class="trace-join">+</span>{/if}
											<span>{term.text}</span>
										{/each}
									</span>
								</span>
							</div>
							<div class="trace-line">
								<span class="trace-label">Coret:</span>
								<span class="trace-eq">
									<span class="trace-side">
										{#each getCancellationTerms(step.leftBefore, step.leftAfter, step.removedX, step.removedW) as term, index}
											{#if needsPlusBefore(term, index)}<span class="trace-join">+</span>{/if}
											<span class:crossed={term.canceled}>{term.text}</span>
										{/each}
									</span>
									<span class="trace-sign">=</span>
									<span class="trace-side">
										{#each getCancellationTerms(step.rightBefore, step.rightAfter, step.removedX, step.removedW) as term, index}
											{#if needsPlusBefore(term, index)}<span class="trace-join">+</span>{/if}
											<span class:crossed={term.canceled}>{term.text}</span>
										{/each}
									</span>
								</span>
							</div>
							<div class="trace-line">
								<span class="trace-label">Hasil:</span>
								<span class="step-math">{formatLogEq(step.leftAfter.x, step.leftAfter.w)} = {formatLogEq(step.rightAfter.x, step.rightAfter.w)}</span>
							</div>
						</div>
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
	.balance-scale {
		background: linear-gradient(180deg, #f8fbff 0%, #edf4ff 100%);
		border: 1px solid #d6e4ff;
		border-radius: 20px;
		padding: 24px;
		color: #1f2937;
		position: relative;
		overflow: hidden;
		box-shadow: 0 18px 40px rgba(59, 130, 246, 0.12);
	}
	.scale-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 12px; }
	.scale-header h3 { color: #1e3a8a; }
	.header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
	.tool-panel { margin-bottom: 16px; padding: 14px; background: rgba(255,255,255,0.75); border: 1px solid #dbeafe; border-radius: 12px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
	.tool-toggle { border: 1px solid #bfdbfe; background: #ffffff; color: #1e3a8a; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-weight: 700; }
	.tool-toggle.active { background: #1d4ed8; border-color: #1d4ed8; color: #ffffff; box-shadow: 0 10px 18px rgba(29, 78, 216, 0.18); }
	.tool-hint { margin: 0; color: #475569; font-size: 0.92rem; }
	.badge { padding: 6px 12px; border-radius: 20px; font-weight: bold; font-size: 0.8rem; color: white; }
	.badge.success { background: #48bb78; }
	.badge.balanced { background: #4299e1; }
	.badge.unbalanced { background: #f56565; }

	.current-equation { display: flex; justify-content: center; gap: 20px; margin-bottom: 20px; padding: 15px; background: rgba(255,255,255,0.75); border: 1px solid #dbeafe; border-radius: 12px; font-size: 1.5rem; font-weight: bold; }
	.eq-x { color: #b45309; }
	.eq-w { color: #15803d; }
	.eq-sign { color: #64748b; }

	.scale-container { position: relative; height: 320px; margin: 20px 0; display: flex; justify-content: center; align-items: flex-end; width: 100%; max-width: 100vw; }
	
	@media (max-width: 768px) {
		.scale-container { height: 260px; transform: scale(0.85); transform-origin: center bottom; margin: 10px 0; }
	}
	
	@media (max-width: 480px) {
		.scale-container { height: 220px; transform: scale(0.7); transform-origin: center bottom; margin: 5px 0; }
	}

	.pillar { position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); }
	.pillar-base { width: 120px; height: 12px; background: #64748b; border-radius: 4px; }
	.pillar-body { width: 24px; height: 120px; background: #94a3b8; margin: 0 auto; border-radius: 4px 4px 0 0; }
	.beam-wrapper { position: absolute; bottom: 120px; width: 100%; max-width: 500px; transition: transform 0.1s; }
	.beam { display: flex; justify-content: space-between; height: 10px; background: #94a3b8; border-radius: 5px; position: relative; padding: 0; }
	.pan-side { display: flex; flex-direction: column-reverse; align-items: center; transition: transform 0.1s; position: relative; top: -5px; width: 150px; }
	
	/* Adjust pan side positions based on width */
	.pan-side.left { margin-left: -50px; }
	.pan-side.right { margin-right: -50px; }
	
	@media (max-width: 480px) {
		.pan-side.left { margin-left: -20px; }
		.pan-side.right { margin-right: -20px; }
	}

	.pan-support { width: 4px; height: 40px; background: #cbd5e1; border-radius: 2px; }
	.pan-surface { background: #ffffff; border: 2px solid #cbd5e1; border-bottom: 5px solid #94a3b8; border-radius: 12px; padding: 10px; min-height: 70px; width: 150px; display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; align-items: flex-end; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

	.mystery-bag { position: relative; width: 34px; height: 42px; background: #d69e2e; border-radius: 6px; transition: transform 0.2s, box-shadow 0.2s; }
	
	@media (max-width: 480px) {
		.mystery-bag { width: 42px; height: 52px; }
	}

	.weight-item.selected .mystery-bag { border: 2px solid #1d4ed8; box-shadow: 0 0 10px rgba(59,130,246,0.35); transform: scale(1.1); }
	.weight-item.selected .known-weight { border: 2px solid #1d4ed8; border-radius: 4px; box-shadow: 0 0 10px rgba(59,130,246,0.35); transform: scale(1.1); }
	
	.bag-label { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); font-weight: bold; }
	
	@media (max-width: 480px) {
		.bag-label { font-size: 1.1rem; }
	}

	.weight-body { width: 30px; height: 20px; background: #475569; border-radius: 3px; }
	
	@media (max-width: 480px) {
		.weight-body { width: 38px; height: 26px; }
	}

	.weight-text { font-size: 0.6rem; text-align: center; }
	
	@media (max-width: 480px) {
		.weight-text { font-size: 0.8rem; }
	}

	.pivot { position: absolute; left: 50%; top: -8px; transform: translateX(-50%); }
	.pivot-circle { width: 24px; height: 24px; background: #facc15; border-radius: 50%; border: 4px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
	.weight-item { cursor: pointer; touch-action: none; }

	.drop-zone { margin: 10px auto; width: 80%; padding: 15px; background: rgba(255,255,255,0.7); border: 2px dashed #94a3b8; border-radius: 12px; text-align: center; color: #475569; }
	.drop-zone.hover { background: rgba(245,101,101,0.2); border-color: #f56565; }

	.algebra-log { margin-top: 20px; background: rgba(255,255,255,0.7); border: 1px solid #dbeafe; padding: 15px; border-radius: 12px; }
	.steps-container { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
	.step-card { background: #ffffff; padding: 10px; border-radius: 8px; border-left: 4px solid #4299e1; }
	.step-action { font-size: 0.85rem; color: #64748b; margin-bottom: 4px; }
	.step-math { font-family: monospace; font-size: 1rem; color: #b45309; }
	.step-trace { display: flex; flex-direction: column; gap: 6px; }
	.trace-line { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
	.trace-label { min-width: 42px; font-size: 0.8rem; font-weight: bold; color: #475569; }
	.trace-eq { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; font-family: monospace; font-size: 1rem; color: #b45309; }
	.trace-side { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
	.trace-sign, .trace-join { color: #64748b; }
	.crossed { text-decoration: line-through; text-decoration-thickness: 2px; text-decoration-color: #dc2626; color: #94a3b8; }
	.btn-reset-small { background: #ffffff; border: 1px solid #bfdbfe; color: #1e3a8a; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; }

	.drag-cursor { position: fixed; pointer-events: none; z-index: 1000; transform: translate(-50%,-50%); }
	.drag-cursor .multi-indicator { position: absolute; top: -10px; right: -10px; background: #f56565; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: bold; }
	.mini-bag { width: 30px; height: 38px; background: #d69e2e; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; }
	.mini-weight { background: #475569; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; }

	.success-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		border-radius: 20px;
	}

	.success-card {
		background: white;
		padding: 30px;
		border-radius: 20px;
		text-align: center;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		max-width: 80%;
	}

	.success-icon {
		font-size: 4rem;
		margin-bottom: 10px;
	}

	.success-card h3 {
		color: #15803d;
		margin: 0 0 10px;
		font-size: 1.5rem;
	}

	.success-result {
		font-size: 2rem;
		font-weight: bold;
		color: #1e3a8a;
		margin: 20px 0;
		padding: 10px;
		background: #eff6ff;
		border-radius: 12px;
	}

	.btn-success-action {
		background: #15803d;
		color: white;
		border: none;
		padding: 12px 24px;
		border-radius: 12px;
		font-weight: bold;
		cursor: pointer;
		transition: 0.2s;
	}

	.btn-success-action:hover {
		background: #166534;
		transform: translateY(-2px);
	}
</style>
