<script lang="ts">
	import { fade, scale } from 'svelte/transition';

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

	let customVarValue = $state(1);
	let customVarSign = $state(1);
	let customVarTool = $derived({
		value: customVarValue * customVarSign,
		type: 'add' as OpType,
		isVar: true,
		label: (customVarSign > 0 ? '+' : '-') + (customVarValue === 1 ? 'x' : customVarValue + 'x')
	});

	let customConstValue = $state(1);
	let customConstSign = $state(1);
	let customConstTool = $derived({
		value: customConstValue * customConstSign,
		type: 'add' as OpType,
		isVar: false,
		label: (customConstSign > 0 ? '+' : '-') + customConstValue
	});

	let customMultNum = $state(2);
	let customMultDen = $state(1);
	let customMultTool = $derived({
		value: customMultNum / customMultDen,
		type: 'mult' as OpType,
		label: customMultDen === 1 ? `${customMultNum}` : `${customMultNum}/${customMultDen}`
	});

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

	let isSolved = $derived.by(() => {
		if (hasPending || leftTerms.length !== 1 || rightTerms.length !== 1) return false;
		const L = leftTerms[0];
		const R = rightTerms[0];
		// x = n
		if (L.isVariable && Math.abs(L.value - 1) < 0.001 && !R.isVariable) return true;
		// n = x
		if (!L.isVariable && R.isVariable && Math.abs(R.value - 1) < 0.001) return true;
		return false;
	});

	let displaySolution = $derived.by(() => {
		if (!isSolved) return null;
		return leftTerms[0].isVariable ? rightTerms[0].value : leftTerms[0].value;
	});

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
	{#if isSolved}
		<div class="success-overlay" transition:fade>
			<div class="success-card" transition:scale>
				<div class="success-icon">🏆</div>
				<h3>Misi Tercapai!</h3>
				<p>Kamu berhasil menyelesaikan persamaan.</p>
				<div class="success-result">x = {Number(displaySolution?.toFixed(2))}</div>
				<button class="btn-success-action" onclick={generateRandomEquation}>Main Lagi (Reset)</button>
			</div>
		</div>
	{/if}
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
			<h4>🧬 Variabel (x)</h4>
			<div class="const-tool-config">
				<div class="sign-selector">
					<button class:active={customVarSign === 1} onclick={() => customVarSign = 1}>+</button>
					<button class:active={customVarSign === -1} onclick={() => customVarSign = -1}>-</button>
				</div>
				<div class="value-stepper">
					<button onclick={() => customVarValue = Math.max(1, customVarValue - 1)}>-</button>
					<span>{customVarValue}x</span>
					<button onclick={() => customVarValue = Math.min(20, customVarValue + 1)}>+</button>
				</div>
				<div class="tool-card add var active-tool" onmousedown={(e) => startDragTool(customVarTool, e)} ontouchstart={(e) => startDragTool(customVarTool, e)}>
					Seret {customVarTool.label}
				</div>
			</div>
		</div>

		<div class="tool-section">
			<h4>🔢 Konstanta</h4>
			<div class="const-tool-config">
				<div class="sign-selector">
					<button class:active={customConstSign === 1} onclick={() => customConstSign = 1}>+</button>
					<button class:active={customConstSign === -1} onclick={() => customConstSign = -1}>-</button>
				</div>
				<div class="value-stepper">
					<button onclick={() => customConstValue = Math.max(1, customConstValue - 1)}>-</button>
					<span>{customConstValue}</span>
					<button onclick={() => customConstValue = Math.min(100, customConstValue + 1)}>+</button>
				</div>
				<div class="tool-card add active-tool" onmousedown={(e) => startDragTool(customConstTool, e)} ontouchstart={(e) => startDragTool(customConstTool, e)}>
					Seret {customConstTool.label}
				</div>
			</div>
		</div>

		<div class="tool-section">
			<h4>✖️ Kali / Bagi</h4>
			<div class="const-tool-config">
				<div class="mult-steppers">
					<div class="value-stepper mini">
						<button onclick={() => customMultNum = Math.max(1, customMultNum - 1)}>-</button>
						<span>{customMultNum}</span>
						<button onclick={() => customMultNum = Math.min(20, customMultNum + 1)}>+</button>
					</div>
					<div class="fraction-line"></div>
					<div class="value-stepper mini">
						<button onclick={() => customMultDen = Math.max(1, customMultDen - 1)}>-</button>
						<span>{customMultDen}</span>
						<button onclick={() => customMultDen = Math.min(20, customMultDen + 1)}>+</button>
					</div>
				</div>
				<div class="tool-card mult active-tool" onmousedown={(e) => startDragTool(customMultTool, e)} ontouchstart={(e) => startDragTool(customMultTool, e)}>
					Seret × {customMultTool.label}
				</div>
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
	.header h3 { color: #f6e05e; margin: 0; font-size: 1.2rem; }
	.btn-random { background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; }

	.equation-container { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 30px; }
	.side-wrapper { flex: 1; min-width: 0; }
	.drop-zone { background: rgba(255,255,255,0.05); border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; transition: 0.3s; }
	.drop-zone.has-pending { border-color: #f6e05e; background: rgba(246, 224, 94, 0.05); }

	.terms-display { display: flex; flex-wrap: wrap; gap: 5px; font-size: 1.6rem; font-family: monospace; font-weight: bold; align-items: center; justify-content: center; }
	.side-label { font-size: 0.7rem; color: #a0aec0; margin-bottom: 8px; text-transform: uppercase; }

	.term.var { color: #63b3ed; }
	.term.num { color: #68d391; }
	.pending-term { background: rgba(246, 224, 94, 0.2); padding: 2px 6px; border-radius: 4px; color: #f6e05e; font-size: 1.3rem; }
	.mult-bracket { color: #f6e05e; font-size: 2.2rem; }
	.equals-sign { font-size: 3rem; color: #4a5568; font-weight: bold; }

	.status-area { min-height: 50px; margin-bottom: 15px; }
	.msg { padding: 10px; border-radius: 10px; text-align: center; width: 100%; font-size: 0.9rem; }
	.msg.warning { background: rgba(245, 101, 101, 0.15); border: 1px solid #f56565; color: #feb2b2; }
	.msg.success { background: rgba(72, 187, 120, 0.15); border: 1px solid #48bb78; color: #9ae6b4; }

	.toolbox { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 15px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
	.tool-section { display: flex; flex-direction: column; }
	.tool-section h4 { font-size: 0.7rem; color: #a0aec0; margin-bottom: 10px; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	
	.const-tool-config { display: flex; flex-direction: column; gap: 8px; align-items: stretch; }
	.sign-selector { display: flex; background: #2d3748; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
	.sign-selector button { flex: 1; border: none; background: transparent; color: white; padding: 5px; cursor: pointer; font-weight: bold; }
	.sign-selector button.active { background: #4a5568; color: #f6e05e; }
	
	.value-stepper { display: flex; align-items: center; justify-content: space-between; background: #2d3748; border-radius: 6px; padding: 2px; border: 1px solid rgba(255,255,255,0.1); }
	.value-stepper button { width: 25px; height: 25px; border: none; background: #4a5568; color: white; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; }
	.value-stepper span { font-weight: bold; font-family: monospace; }
	
	.active-tool { background: #f6e05e !important; color: #1a202c !important; cursor: grab; width: 100%; box-sizing: border-box; }
	.active-tool.var { background: #63b3ed !important; color: white !important; }
	.active-tool.mult { background: #48bb78 !important; color: white !important; }

	.mult-steppers { display: flex; flex-direction: column; align-items: center; gap: 4px; background: #2d3748; padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); }
	.fraction-line { width: 80%; height: 1px; background: rgba(255,255,255,0.2); }
	.value-stepper.mini { width: 100%; padding: 0; background: transparent; border: none; }
	.value-stepper.mini button { width: 20px; height: 20px; font-size: 0.7rem; }
	.value-stepper.mini span { font-size: 0.8rem; }

	.tools-grid { display: flex; flex-wrap: wrap; gap: 6px; }
	.tools-grid.scrollable { max-height: 180px; overflow-y: auto; padding-right: 5px; }
	.tool-card { padding: 8px 10px; border-radius: 6px; cursor: grab; font-weight: bold; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.1); background: #2d3748; min-width: 40px; text-align: center; touch-action: none; }
	.tool-card.var { border-color: #63b3ed; background: #2a4365; }
	.tool-card.mult { border-color: #48bb78; background: #22543d; }
	.tool-card:hover { border-color: #f6e05e; transform: scale(1.05); }

	.drag-cursor { position: fixed; pointer-events: none; background: #f6e05e; color: #1a202c; padding: 10px 20px; border-radius: 8px; font-weight: bold; font-size: 1.5rem; z-index: 1000; }
	.btn-apply { margin-left: 10px; padding: 6px 12px; background: #48bb78; border: none; border-radius: 4px; color: white; cursor: pointer; font-weight: bold; }
	.btn-cancel { margin-left: 10px; padding: 6px 12px; background: #4a5568; border: none; border-radius: 4px; color: white; cursor: pointer; }

	.scrollable::-webkit-scrollbar { width: 4px; }
	.scrollable::-webkit-scrollbar-thumb { background: #4a5568; border-radius: 2px; }

	@media (max-width: 768px) {
		.algebra-lab { padding: 15px; border-radius: 12px; }
		.header { margin-bottom: 15px; }
		.equation-container { gap: 8px; margin-bottom: 20px; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 10px; justify-content: flex-start; }
		.side-wrapper { min-width: 140px; }
		.drop-zone { padding: 10px; min-height: 100px; }
		.terms-display { font-size: 1.1rem; }
		.pending-term { font-size: 0.9rem; }
		.mult-bracket { font-size: 1.4rem; }
		.equals-sign { font-size: 1.8rem; }
		.toolbox { gap: 10px; padding: 10px; }
		.tools-grid.scrollable { max-height: 140px; }
		.tool-card { padding: 6px 8px; font-size: 0.8rem; min-width: 35px; }
	}

	@media (max-width: 480px) {
		.equation-container { gap: 5px; }
		.side-wrapper { min-width: 120px; }
		.toolbox { grid-template-columns: 1fr 1fr 1fr; gap: 5px; }
		.tool-section h4 { font-size: 0.6rem; }
		.value-stepper span { font-size: 0.8rem; }
		.active-tool { font-size: 0.75rem; padding: 6px 4px; }
	}

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
		color: #1a202c;
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

	.success-card p {
		color: #4a5568;
		margin-bottom: 5px;
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
