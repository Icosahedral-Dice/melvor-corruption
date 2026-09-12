export async function setup(ctx) {
	const module = await ctx.loadModule('src/v1.0.0/main.mjs');
	return module.setup(ctx);
}
