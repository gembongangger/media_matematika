<script lang="ts">
	interface Term {
		id: string;
		value: number;
		isVariable?: boolean;
	}

	let leftTerms: Term[] = $state([]);
	let rightTerms: Term[] = $state([]);

	type OpType = 'add' | 'mult';
	interface PendingOp {
		value: number;
		type: OpType;
		isVar?: boolean;
		label?: string;
	}

	let leftPending: PendingOp[] = $state([]);
	let rightPending: PendingOp[] = $state([]);
	let draggingTool: PendingOp | null = $state(null);
	let dragPos = $state({ x: 0, y: 0 });

	function getOpSignature(op: PendingOp): string {
		return `${op.type}:${op.isVar ? 'var' : 'num'}:${Number(op.value.toFixed(4))}`;
	}

	function normalizePending(ops: PendingOp[]): PendingOp[] {
		return [...ops].sort((a, b) => getOpSignature(a).localeCompare(getOpSignature(b)));
	}

	function getOrderedPending(ops: PendingOp[]): PendingOp[] {
		const addOps = normalizePending(ops.filter((op) => op.type === 'add'));
		const multOps = normalizePending(ops.filter((op) => op.type === 'mult'));
		return [...addOps, ...multOps];
	}

	const addNumbers = Array.from({ length: 10 }, (_, i) => i + 1);
	const variableNumbers = Array.from({ length: 5 }, (_, i) => i + 1);

	function formatVariableToolLabel(value: number): string {
		const sign = value > 0 ? '+' : '-';
		const absValue = Math.abs(value);
		return absValue === 1 ? `${sign}x` : `${sign}${absValue}x`;
	}

	const addTools = [
		...variableNumbers.flatMap(n => [
			{ value: n, type: 'add' as OpType, isVar: true, label: formatVariableToolLabel(n) },
			{ value: -n, type: 'add' as OpType, isVar: true, label: formatVariableToolLabel(-n) }
		]),
		...addNumbers.flatMap(n => [
			{ value: n, type: 'add' as OpType, isVar: false, label: `+${n}` },
			{ value: -n, type: 'add' as OpType, isVar: false, label: `-${n}` }
		])
	];

	const multNumbers = Array.from({ length: 9 }, (_, i) => i + 2);
	const multTools = [
		...multNumbers.map(n => ({ value: n, type: 'mult' as OpType, label: `${n}` })),
		...multNumbers.map(n => ({ value: 1/n, type: 'mult' as OpType, label: `1/${n}` })),
		{ value: 1/10, type: 'mult' as OpType, label: '1/10' }
	].sort((a,b) => b.value - a.value);

	let isBalanced = $derived.by(() => {
		if (leftPending.length !== rightPending.length) return false;
		const normalizedLeft = normalizePending(leftPending);
		const normalizedRight = normalizePending(rightPending);
		return normalizedLeft.every((op, i) => getOpSignature(op) === getOpSignature(normalizedRight[i]));
	});

	let hasPending = $derived(leftPending.length > 0 || rightPending.length > 0);

	function toFraction(val: number): string {
		for (let d = 2; d <= 10; d++) {
			if (Math.abs(val - 1/d) < 0.01) return `1/${d}`;
		}
		return Number(val.toFixed(2)).toString();
	}

	function formatTerm(val: number, isVar: boolean, isFirst: boolean): string {
		let str = '';
		if (!isFirst && val > 0) str += '+';
		if (val < 0) str += '-';
		const absVal = Math.abs(val);
		if (isVar) {
			if (Math.abs(absVal - 1) < 0.01) str += 'x';
			else {
				const frac = toFraction(absVal);
				str += frac.includes('/') ? `(${frac})x` : `${frac}x`;
			}
		} else {
			str += Number(absVal.toFixed(2));
		}
		return str;
	}

	function generateRandomEquation() {
		const type = Math.random();
		const x = Math.floor(Math.random() * 8) + 1;
		
		if (type < 0.4) { 
			// Tipe Pecahan: 1/n * x + b = d
			const n = Math.floor(Math.random() * 4) + 2; // 2, 3, 4, 5
			const b = Math.floor(Math.random() * 5) + 1;
			const d = x/n + b; // x harus kelipatan n agar d bulat? Tidak perlu d bulat, tapi x/n + b = d
			// Agar d bulat:
			const x_mult = x * n; 
			// Soal: 1/n x + b = (x_mult/n + b)
			leftTerms = [{ id: 'v1', value: 1/n, isVariable: true }, { id: 'c1', value: b }];
			rightTerms = [{ id: 'c2', value: x + b }]; 
		} else {
			// Tipe Standar: ax + b = cx + d
			const a = Math.floor(Math.random() * 4) + 2;
			const c = Math.floor(Math.random() * a);
			const b = Math.floor(Math.random() * 10) + 1;
			const d = (a - c) * x + b;
			leftTerms = [{ id: 'v1', value: a, isVariable: true }, { id: 'c1', value: b }];
			rightTerms = [c > 0 ? { id: 'v2', value: c, isVariable: true } : null, { id: 'c2', value: d }].filter(Boolean) as Term[];
		}
		leftPending = []; rightPending = [];
	}

	function startDragTool(tool: any, e: MouseEvent | TouchEvent) {
		e.preventDefault();
		draggingTool = { ...tool };
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		dragPos = { x: clientX, y: clientY };
	}

	function handleMove(e: MouseEvent | TouchEvent) {
		if (!draggingTool) return;
		e.preventDefault();
		const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
		const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
		dragPos = { x: clientX, y: clientY };
	}

	function handleEnd(e: MouseEvent | TouchEvent) {
		if (!draggingTool) return;
		const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
		const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
		const el = document.elementFromPoint(clientX, clientY);
		const zone = el?.closest('.drop-zone');
		if (zone) {
			const side = zone.getAttribute('data-side');
			if (side === 'left') leftPending = [...leftPending, draggingTool];
			else rightPending = [...rightPending, draggingTool];
		}
		draggingTool = null;
	}

	function applyOperation() {
		if (!isBalanced) return;
		for (const op of getOrderedPending(leftPending)) {
			if (op.type === 'add') {
				leftTerms = [...leftTerms, { id: Math.random().toString(), value: op.value, isVariable: op.isVar }];
				rightTerms = [...rightTerms, { id: Math.random().toString(), value: op.value, isVariable: op.isVar }];
			} else {
				leftTerms = leftTerms.map(t => ({ ...t, value: t.value * op.value }));
				rightTerms = rightTerms.map(t => ({ ...t, value: t.value * op.value }));
			}
		}
		leftPending = []; rightPending = [];
		setTimeout(simplify, 800);
	}

	function simplify() {
		const sumSide = (terms: Term[]) => {
			const v = terms.filter(t => t.isVariable).reduce((s, t) => s + t.value, 0);
			const c = terms.filter(t => !t.isVariable).reduce((s, t) => s + t.value, 0);
			const res: Term[] = [];
			if (Math.abs(v) > 0.001) res.push({ id: 'v'+Math.random(), value: v, isVariable: true });
			if (Math.abs(c) > 0.001) res.push({ id: 'c'+Math.random(), value: c });
			if (res.length === 0) res.push({ id: 'z'+Math.random(), value: 0 });
			return res;
		};
		leftTerms = sumSide(leftTerms);
		rightTerms = sumSide(rightTerms);
	}

	$effect(() => { generateRandomEquation(); });
</script>

<div class="algebra-lab" onmousemove={handleMove} ontouchmove={handleMove} onmouseup={handleEnd} ontouchend={handleEnd}>
	<div class="header">
		<h3>🧪 Laboratorium Operasi Aljabar</h3>
		<button class="btn-random" onclick={generateRandomEquation}>🎲 Soal Baru</button>
	</div>

	<div class="equation-container">
		<div class="side-wrapper">
			<div class="drop-zone left {leftPending.length > 0 ? 'has-pending' : ''}" data-side="left">
				<div class="side-label">Ruas Kiri</div>
				<div class="terms-display">
					{#if leftPending.some(p => p.type === 'mult')}<span class="mult-bracket">(</span>{/if}
					{#each leftTerms as t, i (t.id)}
						<span class="term {t.isVariable ? 'var' : 'num'}">{formatTerm(t.value, !!t.isVariable, i === 0)}</span>
					{/each}
					{#each leftPending.filter(p => p.type === 'add') as p}
						<span class="pending-term add">{p.label}</span>
					{/each}
					{#if leftPending.some(p => p.type === 'mult')}<span class="mult-bracket">)</span>
						{#each leftPending.filter(p => p.type === 'mult') as p}
							<span class="pending-term mult">× {p.label}</span>
						{/each}
					{/if}
				</div>
			</div>
		</div>

		<div class="equals-sign">=</div>

		<div class="side-wrapper">
			<div class="drop-zone right {rightPending.length > 0 ? 'has-pending' : ''}" data-side="right">
				<div class="side-label">Ruas Kanan</div>
				<div class="terms-display">
					{#if rightPending.some(p => p.type === 'mult')}<span class="mult-bracket">(</span>{/if}
					{#each rightTerms as t, i (t.id)}
						<span class="term {t.isVariable ? 'var' : 'num'}">{formatTerm(t.value, !!t.isVariable, i === 0)}</span>
					{/each}
					{#each rightPending.filter(p => p.type === 'add') as p}
						<span class="pending-term add">{p.label}</span>
					{/each}
					{#if rightPending.some(p => p.type === 'mult')}<span class="mult-bracket">)</span>
						{#each rightPending.filter(p => p.type === 'mult') as p}
							<span class="pending-term mult">× {p.label}</span>
						{/each}
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="status-area">
		{#if hasPending}
			{#if isBalanced}
				<div class="msg success">
					✅ <strong>Seimbang!</strong>
					<button class="btn-apply" onclick={applyOperation}>Terapkan</button>
				</div>
			{:else}
				<div class="msg warning">
					⚠️ <strong>Tidak Seimbang!</strong> Tambahkan operasi yang sama di kedua ruas.
					<button class="btn-cancel" onclick={() => {leftPending=[]; rightPending=[];}}>Batal</button>
				</div>
			{/if}
		{/if}
	</div>

	<div class="toolbox">
		<div class="tool-section">
			<h4>➕ Penjumlahan & Pengurangan</h4>
			<div class="tools-grid scrollable">
				{#each addTools as tool}
					<div class="tool-card add" onmousedown={(e) => startDragTool(tool, e)} ontouchstart={(e) => startDragTool(tool, e)}>
						{tool.label}
					</div>
				{/each}
			</div>
		</div>

		<div class="tool-section">
			<h4>✖️ Perkalian & Pembagian</h4>
			<div class="tools-grid scrollable">
				{#each multTools as tool}
					<div class="tool-card mult" onmousedown={(e) => startDragTool(tool, e)} ontouchstart={(e) => startDragTool(tool, e)}>
						× {tool.label}
					</div>
				{/each}
			</div>
		</div>
	</div>

	{#if draggingTool}
		<div class="drag-cursor" style="left: {dragPos.x}px; top: {dragPos.y}px">
			{draggingTool.type === 'mult' ? '×' : ''} {draggingTool.label}
		</div>
	{/if}
</div>

<style>
	.algebra-lab { background: #1a202c; border-radius: 20px; padding: 25px; color: white; position: relative; max-width: 900px; margin: 0 auto; }
	.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
	.header h3 { color: #f6e05e; margin: 0; }
	.btn-random { background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; }

	.equation-container { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 30px; }
	.side-wrapper { flex: 1; }
	.drop-zone { background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: 0.3s; }
	.drop-zone.has-pending { border-color: #f6e05e; background: rgba(246, 224, 94, 0.05); }

	.terms-display { display: flex; flex-wrap: wrap; gap: 5px; font-size: 1.6rem; font-family: monospace; font-weight: bold; align-items: center; justify-content: center; }
	.term.var { color: #63b3ed; }
	.term.num { color: #68d391; }
	.pending-term { background: rgba(246, 224, 94, 0.2); padding: 2px 6px; border-radius: 4px; color: #f6e05e; font-size: 1.3rem; }
	.mult-bracket { color: #f6e05e; font-size: 2.2rem; }
	.equals-sign { font-size: 3rem; color: #4a5568; font-weight: bold; }

	.status-area { min-height: 60px; margin-bottom: 20px; }
	.msg { padding: 12px; border-radius: 10px; text-align: center; width: 100%; }
	.msg.warning { background: rgba(245, 101, 101, 0.15); border: 1px solid #f56565; color: #feb2b2; }
	.msg.success { background: rgba(72, 187, 120, 0.15); border: 1px solid #48bb78; color: #9ae6b4; }

	.toolbox { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 15px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
	.tool-section h4 { font-size: 0.8rem; color: #a0aec0; margin-bottom: 12px; text-transform: uppercase; }
	.tools-grid { display: flex; flex-wrap: wrap; gap: 6px; }
	.tools-grid.scrollable { max-height: 180px; overflow-y: auto; padding-right: 5px; }
	.tool-card { padding: 8px 12px; border-radius: 6px; cursor: grab; font-weight: bold; font-size: 0.9rem; border: 1px solid rgba(255,255,255,0.1); background: #2d3748; min-width: 45px; text-align: center; touch-action: none; }
	.tool-card.mult { border-color: #4299e1; background: #2c5282; }
	.tool-card:hover { border-color: #f6e05e; transform: scale(1.05); }

	.drag-cursor { position: fixed; pointer-events: none; background: #f6e05e; color: #1a202c; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 1.5rem; z-index: 1000; }
	.btn-apply { margin-left: 10px; padding: 6px 12px; background: #48bb78; border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: bold; }
	.btn-cancel { margin-left: 10px; padding: 6px 12px; background: #4a5568; border: none; border-radius: 4px; color: white; cursor: pointer; }

	.scrollable::-webkit-scrollbar { width: 4px; }
	.scrollable::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 2px; }

	@media (max-width: 768px) { .equation-container { flex-direction: column; } .toolbox { grid-template-columns: 1fr; } }
</style>
