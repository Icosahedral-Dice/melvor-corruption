const STORAGE_KEY = 'corruption-order-config';
const MODAL_ID = 'corruption-order';

class ConfigStore {
	constructor(ctx) {
		this.ctx = ctx;
		const stored = ctx.characterStorage.getItem(STORAGE_KEY);
		this.config = stored && stored.version === 1 ? stored : { version: 1, order: [], enabled: {}, randomize: true };
		this.reconcile();
	}

	save = () => {
		this.ctx.characterStorage.setItem(STORAGE_KEY, this.config);
	};

	/** Appends any newly-unlocked corruptions to the stored order/enabled maps. Returns true if anything changed. */
	reconcile = () => {
		let changed = false;
		game.corruption.corruptionEffects.unlockedRows.forEach((row) => {
			const id = row.effect.id;
			if (!this.config.order.includes(id)) {
				this.config.order.push(id);
				changed = true;
			}
			if (this.config.enabled[id] === undefined) {
				this.config.enabled[id] = true;
				changed = true;
			}
		});
		if (changed) {
			this.save();
		}
		return changed;
	};

	updateOrder = (newOrder) => {
		this.config.order = newOrder;
		this.save();
	};

	setEnabled = (id, enabled) => {
		this.config.enabled[id] = enabled;
		this.save();
	};

	isEnabled = (id) => this.config.enabled[id] !== false;

	getOrder = () => this.config.order;

	setRandomize = (randomize) => {
		this.config.randomize = randomize;
		this.save();
	};

	isRandomize = () => this.config.randomize !== false;
}

/** Every corruption's ActiveEffect is named "Corrupted" - the actual distinguishing text is the row's own description, exactly like the vanilla corruption-element UI resolves it (corruption.js CorruptionElementElement.initialize). */
function getRowDescription(row) {
	return row.langStringID !== '' ? getLangString(row.langStringID) : row.customDescription;
}

function computeRows(store) {
	const unlockedRows = game.corruption.corruptionEffects.unlockedRows;
	const orderedIds = store.config.order.filter((id) => unlockedRows.some((row) => row.effect.id === id));
	unlockedRows.forEach((row) => {
		if (!orderedIds.includes(row.effect.id)) {
			orderedIds.push(row.effect.id);
		}
	});
	return orderedIds.map((id) => {
		const row = unlockedRows.find((r) => r.effect.id === id);
		return {
			id,
			name: getRowDescription(row),
			media: row.effect.media,
			enabled: store.isEnabled(id)
		};
	});
}

const CorruptionOrderModalContent = ({ randomize, rows, handlers }) => ({
	$template: '#corruption-order-modal-content',
	randomize,
	rows,
	handlers
});

/** Builds (or rebuilds) a barebones Bootstrap modal after #modal-privacy, mirroring the standard Melvor mod modal shape. Returns jQuery refs to the modal and its content container. */
function buildModal(id, title) {
	const existing = $(`#modal-${id}`);
	if (existing.length) {
		existing.modal('hide');
		existing.remove();
	}
	$('#modal-privacy').after(`
		<div class="modal corruption-order-modal" id="modal-${id}" tabindex="-1" role="dialog" aria-hidden="true" style="display: none;">
			<div class="modal-dialog modal-lg" role="document">
				<div class="modal-content">
					<div class="block block-themed block-transparent mb-0">
						<div class="block-header bg-primary-dark">
							<h3 class="block-title">${title}</h3>
							<div class="block-options">
								<button type="button" class="btn-block-option" data-dismiss="modal" aria-label="Close">
									<i class="fa fa-fw fa-times"></i>
								</button>
							</div>
						</div>
						<div class="block-container">
							<div id="${id}-list"></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	`);
	return { modal: $(`#modal-${id}`), listContainer: $(`#${id}-list`) };
}

export async function setupOrderUI(ctx) {
	let store;
	let modal;

	function makeSortable() {
		const list = document.getElementById('corruption-order-rows-list');
		if (!list) {
			return;
		}
		Sortable.create(list, {
			animation: 150,
			handle: '.corruption-order-drag-handle',
			disabled: store.isRandomize(),
			onEnd: () => {
				const newOrder = [...list.querySelectorAll('[data-corruption]')].map((el) => el.dataset.corruption);
				store.updateOrder(newOrder);
			}
		});
	}

	function renderList() {
		const listHost = document.getElementById(`${MODAL_ID}-list`);
		if (!listHost || !store) {
			return;
		}
		listHost.innerHTML = '';
		const handlers = {
			toggleEnabled: (id, enabled) => {
				store.setEnabled(id, enabled);
				renderList();
			},
			toggleRandomize: (randomize) => {
				store.setRandomize(randomize);
				renderList();
			}
		};
		ui.create(CorruptionOrderModalContent({ randomize: store.isRandomize(), rows: computeRows(store), handlers }), listHost);
		makeSortable();
	}

	function injectPanel() {
		if (document.getElementById('corruption-order-open-btn')) {
			return;
		}
		const target = $('#combat-corruption-settings .row.gutters-tiny');
		if (target.length === 0) {
			return;
		}
		target.append(
			'<div class="font-w400 font-size-sm text-center p-2 w-100"><button type="button" id="corruption-order-open-btn" class="btn btn-primary btn-sm">Configure Activation Order</button></div>'
		);
		if (!modal) {
			modal = buildModal(MODAL_ID, 'Corruption Activation Order').modal;
		}
		renderList();
		$('#corruption-order-open-btn').on('click', () => {
			renderList();
			modal.modal('show');
		});
	}

	ctx.onCharacterLoaded(() => {
		store = new ConfigStore(ctx);
		injectPanel();
	});

	ctx.patch(CorruptionEffectTable, 'unlockRow').after(function () {
		if (!store) {
			return;
		}
		store.reconcile();
		injectPanel();
		renderList();
	});

	ctx.patch(Corruption, 'onUnlock').after(function () {
		injectPanel();
	});

	return {
		isEnabled: (id) => (store ? store.isEnabled(id) : true),
		getOrder: () => (store ? store.getOrder() : []),
		isRandomize: () => (store ? store.isRandomize() : true)
	};
}
