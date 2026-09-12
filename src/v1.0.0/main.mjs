const SETTINGS_SECTION = 'Melvor Corruption';
const CORRUPTION_COUNTER_ID = 'melvorItA:CorruptionCounter';

export async function setup(ctx) {
	const { patch, settings } = ctx;
	settings.section(SETTINGS_SECTION).add([
		{
			type: 'number',
			name: 'growth-multiplier',
			label: 'Growth Multiplier',
			hint: 'Multiplier applied to the Corruption Counter threshold each time a corruption is applied to the player (default 1.44 = +44% per proc).',
			default: 1.44,
			min: 1,
			max: 10
		},
		{
			type: 'number',
			name: 'initial-multiplier',
			label: 'Initial Multiplier',
			hint: 'One-time multiplier applied to the vanilla Corruption Counter threshold the moment it is first granted to the player, before any corruption has been applied this fight (default 1 = unchanged from vanilla).',
			default: 1,
			min: 0.1,
			max: 10
		},
		{
			type: 'switch',
			name: 'free-auto-corruption',
			label: 'Free Auto-Corruption',
			hint: 'When on, the vanilla "Automatically Corrupt Monsters on Spawn?" option costs no Soul Points.',
			default: false
		}
	]);

	const orderUIModule = await ctx.loadModule('src/v1.0.0/orderUI.mjs');
	const order = await orderUIModule.setupOrderUI(ctx);

	patch(CombatManager, 'getAutoCorruptionCost').after(function (cost) {
		if (settings.section(SETTINGS_SECTION).get('free-auto-corruption')) {
			return 0;
		}
		return cost;
	});

	patch(ActiveCombatEffect, 'init').before(function () {
		if (!(this.character instanceof Player) || this.effect.id !== CORRUPTION_COUNTER_ID) {
			return;
		}
		const initialMultiplier = settings.section(SETTINGS_SECTION).get('initial-multiplier');
		this.parameters.maxCount = Math.round(this.parameters.maxCount * initialMultiplier);
	});

	patch(ApplyCorruptionBehaviour, '_execute').replace(function (o, character, activeEffect) {
		if (character instanceof Enemy) {
			return o(character, activeEffect);
		}
		if (!(character instanceof Player)) {
			return o(character, activeEffect);
		}

		let rowsAvail = this.corruption.corruptionEffects.unlockedRows.slice();

		character.activeEffects.forEach((activeCombatEffect, combatEffect) => {
			if (combatEffect.name === 'Corrupted' && rowsAvail.length > 0) {
				rowsAvail = rowsAvail.filter((row) => row.effect.id !== combatEffect.id);
			}
		});

		rowsAvail = rowsAvail.filter((row) => order.isEnabled(row.effect.id));

		if (rowsAvail.length === 0) {
			return;
		}

		let rows;
		if (order.isRandomize()) {
			rows = [...getExclusiveRandomArrayElements(rowsAvail, 1)];
		} else {
			const byId = new Map(rowsAvail.map((row) => [row.effect.id, row]));
			const chosen = order
				.getOrder()
				.map((id) => byId.get(id))
				.find((row) => row !== undefined);
			rows = chosen !== undefined ? [chosen] : [...getExclusiveRandomArrayElements(rowsAvail, 1)];
		}

		const applicators = rows.map((row) => {
			const applicator = new SingleCombatEffectApplicator(row.effect);
			applicator.baseChance = 100;
			return applicator;
		});
		character.processEffectApplicators(applicators, { type: 'Effect' });
		this.corruption.incStat(0);

		if (rowsAvail.length !== 1) {
			const growthMultiplier = settings.section(SETTINGS_SECTION).get('growth-multiplier');
			character.activeEffects.forEach((activeCombatEffect, combatEffect) => {
				if (combatEffect.id === CORRUPTION_COUNTER_ID) {
					activeCombatEffect.parameters.count = 0;
					activeCombatEffect.parameters.maxCount = Math.round(activeCombatEffect.parameters.maxCount * growthMultiplier);
				}
			});
		}
	});
}
