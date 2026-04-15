

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.BsJrsX5b.js","_app/immutable/chunks/BH7I5e01.js","_app/immutable/chunks/CmkGu0ZK.js"];
export const stylesheets = ["_app/immutable/assets/0.BI2P7pSk.css"];
export const fonts = [];
