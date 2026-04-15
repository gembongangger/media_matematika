export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.DgQ_ASZC.js",app:"_app/immutable/entry/app.1xFXvYjD.js",imports:["_app/immutable/entry/start.DgQ_ASZC.js","_app/immutable/chunks/B3J1MLDs.js","_app/immutable/chunks/CmkGu0ZK.js","_app/immutable/chunks/CYt3I-6q.js","_app/immutable/chunks/xrO56u8E.js","_app/immutable/entry/app.1xFXvYjD.js","_app/immutable/chunks/CmkGu0ZK.js","_app/immutable/chunks/C6c4rbP6.js","_app/immutable/chunks/BH7I5e01.js","_app/immutable/chunks/xrO56u8E.js","_app/immutable/chunks/D5lkDQcy.js","_app/immutable/chunks/CYt3I-6q.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
