import { n as noop, e as escape_html, a5 as attr_style, a6 as stringify, a7 as store_get, a8 as ensure_array_like, a9 as attr_class, aa as unsubscribe_stores, a4 as derived, ab as attr } from "../../chunks/renderer.js";
import { w as writable } from "../../chunks/index.js";
import "clsx";
const now = () => Date.now();
const raf = {
  // don't access requestAnimationFrame eagerly outside method
  // this allows basic testing of user code without JSDOM
  // bunder will eval and remove ternary when the user's app is built
  tick: (
    /** @param {any} _ */
    (_) => noop()
  ),
  now: () => now(),
  tasks: /* @__PURE__ */ new Set()
};
function loop(callback) {
  let task;
  if (raf.tasks.size === 0) ;
  return {
    promise: new Promise((fulfill) => {
      raf.tasks.add(task = { c: callback, f: fulfill });
    }),
    abort() {
      raf.tasks.delete(task);
    }
  };
}
function is_date(obj) {
  return Object.prototype.toString.call(obj) === "[object Date]";
}
function tick_spring(ctx, last_value, current_value, target_value) {
  if (typeof current_value === "number" || is_date(current_value)) {
    const delta = target_value - current_value;
    const velocity = (current_value - last_value) / (ctx.dt || 1 / 60);
    const spring2 = ctx.opts.stiffness * delta;
    const damper = ctx.opts.damping * velocity;
    const acceleration = (spring2 - damper) * ctx.inv_mass;
    const d = (velocity + acceleration) * ctx.dt;
    if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
      return target_value;
    } else {
      ctx.settled = false;
      return is_date(current_value) ? new Date(current_value.getTime() + d) : current_value + d;
    }
  } else if (Array.isArray(current_value)) {
    return current_value.map(
      (_, i) => (
        // @ts-ignore
        tick_spring(ctx, last_value[i], current_value[i], target_value[i])
      )
    );
  } else if (typeof current_value === "object") {
    const next_value = {};
    for (const k in current_value) {
      next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
    }
    return next_value;
  } else {
    throw new Error(`Cannot spring ${typeof current_value} values`);
  }
}
function spring(value, opts = {}) {
  const store = writable(value);
  const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
  let last_time;
  let task;
  let current_token;
  let last_value = (
    /** @type {T} */
    value
  );
  let target_value = (
    /** @type {T | undefined} */
    value
  );
  let inv_mass = 1;
  let inv_mass_recovery_rate = 0;
  let cancel_task = false;
  function set(new_value, opts2 = {}) {
    target_value = new_value;
    const token = current_token = {};
    if (value == null || opts2.hard || spring2.stiffness >= 1 && spring2.damping >= 1) {
      cancel_task = true;
      last_time = raf.now();
      last_value = new_value;
      store.set(value = target_value);
      return Promise.resolve();
    } else if (opts2.soft) {
      const rate = opts2.soft === true ? 0.5 : +opts2.soft;
      inv_mass_recovery_rate = 1 / (rate * 60);
      inv_mass = 0;
    }
    if (!task) {
      last_time = raf.now();
      cancel_task = false;
      task = loop((now2) => {
        if (cancel_task) {
          cancel_task = false;
          task = null;
          return false;
        }
        inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
        const elapsed = Math.min(now2 - last_time, 1e3 / 30);
        const ctx = {
          inv_mass,
          opts: spring2,
          settled: true,
          dt: elapsed * 60 / 1e3
        };
        const next_value = tick_spring(ctx, last_value, value, target_value);
        last_time = now2;
        last_value = /** @type {T} */
        value;
        store.set(value = /** @type {T} */
        next_value);
        if (ctx.settled) {
          task = null;
        }
        return !ctx.settled;
      });
    }
    return new Promise((fulfil) => {
      task.promise.then(() => {
        if (token === current_token) fulfil();
      });
    });
  }
  const spring2 = {
    set,
    update: (fn, opts2) => set(fn(
      /** @type {T} */
      target_value,
      /** @type {T} */
      value
    ), opts2),
    subscribe: store.subscribe,
    stiffness,
    damping,
    precision
  };
  return spring2;
}
function BalanceScale($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let leftItems = [];
    let rightItems = [];
    let trueXValue = 0;
    let algebraSteps = [];
    let drag = { item: null };
    let xCountLeft = derived(() => leftItems.filter((i) => i.type === "x").length);
    let xCountRight = derived(() => rightItems.filter((i) => i.type === "x").length);
    let weightLeft = derived(() => leftItems.filter((i) => i.type === "weight").reduce((s, i) => s + i.value, 0));
    let weightRight = derived(() => rightItems.filter((i) => i.type === "weight").reduce((s, i) => s + i.value, 0));
    let balance = spring(0, { stiffness: 0.05, damping: 0.4 });
    let totalWeightLeft = derived(() => xCountLeft() * trueXValue + weightLeft());
    let totalWeightRight = derived(() => xCountRight() * trueXValue + weightRight());
    let isBalanced = derived(() => Math.abs(totalWeightLeft() - totalWeightRight()) < 1e-3);
    let isSolved = derived(() => isBalanced() && (xCountLeft() === 1 && weightLeft() === 0 && xCountRight() === 0 || xCountRight() === 1 && weightRight() === 0 && xCountLeft() === 0));
    let displaySolution = derived(() => xCountLeft() === 1 && weightLeft() === 0 && xCountRight() === 0 ? weightRight() : xCountRight() === 1 && weightRight() === 0 && xCountLeft() === 0 ? weightLeft() : null);
    function formatWeight(value) {
      if (value === 0) return "0kg";
      return `${Number(value.toFixed(2))}kg`;
    }
    $$renderer2.push(`<div class="balance-scale svelte-k0cxw6"><div class="scale-header svelte-k0cxw6"><h3>⚖️ Neraca Aljabar</h3> `);
    if (isSolved()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="badge success svelte-k0cxw6">🎉 SELESAI! x = ${escape_html(formatWeight(displaySolution() || 0))}</span>`);
    } else if (isBalanced()) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<span class="badge balanced svelte-k0cxw6">⚖️ Seimbang</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<span class="badge unbalanced svelte-k0cxw6">⚠️ Tidak Seimbang</span>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="current-equation svelte-k0cxw6"><div class="eq-box"><span class="eq-x svelte-k0cxw6">${escape_html(xCountLeft() > 0 ? `${xCountLeft()}x` : "")}</span> `);
    if (xCountLeft() > 0 && weightLeft() > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="eq-plus">+</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <span class="eq-w svelte-k0cxw6">${escape_html(weightLeft() > 0 ? formatWeight(weightLeft()) : xCountLeft() === 0 ? "0" : "")}</span></div> <div class="eq-sign svelte-k0cxw6">${escape_html(isBalanced() ? "=" : "≠")}</div> <div class="eq-box"><span class="eq-x svelte-k0cxw6">${escape_html(xCountRight() > 0 ? `${xCountRight()}x` : "")}</span> `);
    if (xCountRight() > 0 && weightRight() > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="eq-plus">+</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <span class="eq-w svelte-k0cxw6">${escape_html(weightRight() > 0 ? formatWeight(weightRight()) : xCountRight() === 0 ? "0" : "")}</span></div></div> <div class="scale-container svelte-k0cxw6"><div class="pillar svelte-k0cxw6"><div class="pillar-base svelte-k0cxw6"></div> <div class="pillar-body svelte-k0cxw6"></div></div> <div class="beam-wrapper svelte-k0cxw6"${attr_style(`transform: rotate(${stringify(store_get($$store_subs ??= {}, "$balance", balance))}deg)`)}><div class="beam svelte-k0cxw6"><div class="pan-side left svelte-k0cxw6"${attr_style(`transform: rotate(${stringify(-store_get($$store_subs ??= {}, "$balance", balance))}deg)`)}><div class="strings"><div class="string svelte-k0cxw6"></div><div class="string svelte-k0cxw6"></div></div> <div class="pan"><div class="pan-surface svelte-k0cxw6"><!--[-->`);
    const each_array = ensure_array_like(leftItems);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<div${attr_class(`weight-item ${stringify(drag.item?.id === item.id ? "dragging" : "")}`)}>`);
      if (item.type === "x") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="mystery-bag svelte-k0cxw6"><div class="bag-body"></div><div class="bag-label svelte-k0cxw6">x</div></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="known-weight"><div class="weight-plate"><div class="weight-body svelte-k0cxw6"></div><div class="weight-text svelte-k0cxw6">${escape_html(formatWeight(item.value))}</div></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></div></div> <div class="pivot svelte-k0cxw6"><div class="pivot-circle svelte-k0cxw6"></div></div> <div class="pan-side right svelte-k0cxw6"${attr_style(`transform: rotate(${stringify(-store_get($$store_subs ??= {}, "$balance", balance))}deg)`)}><div class="strings"><div class="string svelte-k0cxw6"></div><div class="string svelte-k0cxw6"></div></div> <div class="pan"><div class="pan-surface svelte-k0cxw6"><!--[-->`);
    const each_array_1 = ensure_array_like(rightItems);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let item = each_array_1[$$index_1];
      $$renderer2.push(`<div${attr_class(`weight-item ${stringify(drag.item?.id === item.id ? "dragging" : "")}`)}>`);
      if (item.type === "x") {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="mystery-bag svelte-k0cxw6"><div class="bag-body"></div><div class="bag-label svelte-k0cxw6">x</div></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="known-weight"><div class="weight-plate"><div class="weight-body svelte-k0cxw6"></div><div class="weight-text svelte-k0cxw6">${escape_html(formatWeight(item.value))}</div></div></div>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></div></div></div></div></div> <div${attr_class(`drop-zone ${stringify("")}`, "svelte-k0cxw6")}><div class="drop-icon">🗑️</div><div class="drop-text">Buang di sini</div></div> `);
    if (algebraSteps.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="algebra-log svelte-k0cxw6"><h4>📝 Langkah Aljabar:</h4> <div class="steps-container svelte-k0cxw6"><!--[-->`);
      const each_array_2 = ensure_array_like(algebraSteps);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let step = each_array_2[$$index_2];
        $$renderer2.push(`<div class="step-card svelte-k0cxw6"><div class="step-action svelte-k0cxw6">${escape_html(step.split("|")[0])}</div> <div class="step-math svelte-k0cxw6">${escape_html(step.split("|")[1])}</div></div>`);
      }
      $$renderer2.push(`<!--]--></div> <button class="btn-reset-small svelte-k0cxw6">↺ Reset Timbangan</button></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let equationA = 3;
    let equationB = 2;
    let equationC = 1;
    let equationD = 10;
    $$renderer2.push(`<div class="app-container svelte-1uha8ag"><header class="app-header svelte-1uha8ag"><h1>📐 MediaMatematika</h1> <p class="subtitle svelte-1uha8ag">Media Pembelajaran Aljabar Interaktif dengan Visualisasi Timbangan</p></header> <nav class="tab-nav svelte-1uha8ag"><button${attr_class(`tab-btn ${stringify("active")}`, "svelte-1uha8ag")}>⚖️ Neraca Keseimbangan</button> <button${attr_class(`tab-btn ${stringify("")}`, "svelte-1uha8ag")}>🔄 Pindah Ruas</button></nav> <main class="app-main">`);
    {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<section class="section"><div class="equation-config svelte-1uha8ag"><h2>🎯 Konfigurasi Persamaan: ax + b = cx + d</h2> <div class="config-grid svelte-1uha8ag"><div class="side-config svelte-1uha8ag"><h3 class="svelte-1uha8ag">Ruas Kiri (ax + b)</h3> <div class="input-item svelte-1uha8ag"><label for="a" class="svelte-1uha8ag">a (jumlah kantong x)</label> <input id="a" type="number"${attr("value", equationA)} min="0" max="5" class="svelte-1uha8ag"/></div> <div class="input-item svelte-1uha8ag"><label for="b" class="svelte-1uha8ag">b (berat konstan, kg)</label> <input id="b" type="number"${attr("value", equationB)} min="0" max="20" step="0.5" class="svelte-1uha8ag"/></div></div> <div class="eq-divider svelte-1uha8ag">=</div> <div class="side-config svelte-1uha8ag"><h3 class="svelte-1uha8ag">Ruas Kanan (cx + d)</h3> <div class="input-item svelte-1uha8ag"><label for="c" class="svelte-1uha8ag">c (jumlah kantong x)</label> <input id="c" type="number"${attr("value", equationC)} min="0" max="5" class="svelte-1uha8ag"/></div> <div class="input-item svelte-1uha8ag"><label for="d" class="svelte-1uha8ag">d (berat konstan, kg)</label> <input id="d" type="number"${attr("value", equationD)} min="0" max="20" step="0.5" class="svelte-1uha8ag"/></div></div></div> <div class="preset-section svelte-1uha8ag"><h4 class="svelte-1uha8ag">Pilih Soal Tantangan:</h4> <div class="preset-buttons svelte-1uha8ag"><button class="btn btn-secondary btn-small svelte-1uha8ag">📦 3x + 2 = x + 8</button> <button class="btn btn-secondary btn-small svelte-1uha8ag">📦 4x + 1 = 2x + 9</button> <button class="btn btn-secondary btn-small svelte-1uha8ag">📦 5x + 3 = 3x + 11</button></div> <div class="preset-buttons svelte-1uha8ag" style="margin-top: 8px;"><button class="btn btn-secondary btn-small svelte-1uha8ag">📦 x + 3 = 8</button> <button class="btn btn-secondary btn-small svelte-1uha8ag">📦 2x + 2 = 10</button></div></div> <div class="button-group svelte-1uha8ag"><button class="btn btn-primary svelte-1uha8ag">🔍 Hitung Nilai x</button> <button class="btn btn-success svelte-1uha8ag">⚖️ Terapkan ke Neraca</button></div> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div> `);
      BalanceScale($$renderer2);
      $$renderer2.push(`<!----></section>`);
    }
    $$renderer2.push(`<!--]--></main> <footer class="app-footer svelte-1uha8ag"><p>MediaMatematika - Belajar Aljabar dengan Visualisasi Timbangan</p></footer></div>`);
  });
}
export {
  _page as default
};
