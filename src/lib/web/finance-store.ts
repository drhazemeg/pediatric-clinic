// apps/web/src/lib/web/finance-store.ts
// Smart Clinic — Pediatric & Neonatal Clinic Management System
// Financial state management (TanStack Store) for UI filters, modals, and receipt generation

import {batch, createStore, useSelector} from "@tanstack/react-store";
import type {ClinicLedgerEntry, DatePreset} from "@/hooks/use-finance";

// =============================================================================
// Types
// =============================================================================

export type FinanceTab = "overview" | "revenue" | "expenses" | "cashflow";
export type LedgerKind = "revenue" | "expense";

export interface FinanceState {
	activeTab: FinanceTab;
	datePreset: DatePreset;
	selectedCategory: string;
	searchQuery: string;
	openRecordModal: (kind?: LedgerKind) => void;
	// Record Transaction Dialog
	isRecordOpen: boolean;
	recordKind: LedgerKind;
	closeRecordModal: () => void;
	// Receipt Dialog
	isReceiptOpen: boolean;
	receiptEntry: ClinicLedgerEntry | null;
	closeReceiptModal: () => void;
	openReceiptModal: (entry: ClinicLedgerEntry) => void;
	// Delete Confirmation Dialog
	isDeleteOpen: boolean;
	deleteTarget: ClinicLedgerEntry | null;
}

// =============================================================================
// Initial state
// =============================================================================

function createInitialState(): FinanceState {
	return {
		activeTab: "overview",
		datePreset: "30d",
		selectedCategory: "all",
		searchQuery: "",
		closeRecordModal: () => {
			financeStore.setState(s => ({
				...s,
				isRecordOpen: false
			}));
		},
		isRecordOpen: false,
		recordKind: "revenue",

		isReceiptOpen: false,
		receiptEntry: null,
		closeReceiptModal: () => {
			financeStore.setState(s => ({
				...s,
				isReceiptOpen: false,
				receiptEntry: null
			}));
		},
		isDeleteOpen: false,
		deleteTarget: null,
		openRecordModal: (kind: LedgerKind = "revenue") => {
			financeStore.setState(s => ({
				...s,
				isRecordOpen: true,
				recordKind: kind
			}));
		},

		openReceiptModal: (entry: ClinicLedgerEntry) => {
			financeStore.setState(s => ({
				...s,
				isReceiptOpen: true,
				receiptEntry: entry
			}));
		}
	};
}

// =============================================================================
// Store
// =============================================================================

export const financeStore = createStore<FinanceState>(createInitialState());

/** Reactive selector hook. Components subscribe to only what they select. */
export function useFinanceStore<T = FinanceState>(
	selector: (state: FinanceState) => T = state => state as unknown as T
): T {
	return useSelector(financeStore, selector);
}

// =============================================================================
// Derived stores
// =============================================================================

export const activeTabStore = createStore(() => financeStore.state.activeTab);

export const datePresetStore = createStore(() => financeStore.state.datePreset);

export const selectedCategoryStore = createStore(
	() => financeStore.state.selectedCategory
);

export const searchQueryStore = createStore(
	() => financeStore.state.searchQuery
);

export const recordModalStore = createStore(() => ({
	isOpen: financeStore.state.isRecordOpen,
	kind: financeStore.state.recordKind
}));

export const receiptModalStore = createStore(() => ({
	isOpen: financeStore.state.isReceiptOpen,
	entry: financeStore.state.receiptEntry
}));

export const deleteModalStore = createStore(() => ({
	isOpen: financeStore.state.isDeleteOpen,
	entry: financeStore.state.deleteTarget
}));

/** True when any filter deviates from the defaults. */
export const hasActiveFiltersStore = createStore(() => {
	const s = financeStore.state;
	return (
		s.selectedCategory !== "all" ||
		s.searchQuery.length > 0 ||
		s.datePreset !== "30d"
	);
});

// =============================================================================
// Actions
// =============================================================================

export const financeActions = {
	// -------------------------------------------------------------------------
	// Filters
	// -------------------------------------------------------------------------

	setActiveTab(tab: FinanceTab) {
		financeStore.setState(s => ({ ...s, activeTab: tab }));
	},

	setDatePreset(preset: DatePreset) {
		financeStore.setState(s => ({ ...s, datePreset: preset }));
	},

	setSelectedCategory(category: string) {
		financeStore.setState(s => ({ ...s, selectedCategory: category }));
	},

	setSearchQuery(query: string) {
		financeStore.setState(s => ({ ...s, searchQuery: query }));
	},

	/** Reset all filters at once. */
	resetFilters() {
		financeStore.setState(s => ({
			...s,
			datePreset: "30d",
			selectedCategory: "all",
			searchQuery: ""
		}));
	},

	// -------------------------------------------------------------------------
	// Record Transaction Dialog
	// -------------------------------------------------------------------------

	openRecordModal(kind: LedgerKind = "revenue") {
		financeStore.setState(s => ({
			...s,
			isRecordOpen: true,
			recordKind: kind
		}));
	},

	closeRecordModal() {
		financeStore.setState(s => ({ ...s, isRecordOpen: false }));
	},

	// -------------------------------------------------------------------------
	// Receipt Dialog
	// -------------------------------------------------------------------------

	openReceiptModal(entry: ClinicLedgerEntry) {
		financeStore.setState(s => ({
			...s,
			isReceiptOpen: true,
			receiptEntry: entry
		}));
	},

	closeReceiptModal() {
		financeStore.setState(s => ({
			...s,
			isReceiptOpen: false,
			receiptEntry: null
		}));
	},

	// -------------------------------------------------------------------------
	// Delete Confirmation Dialog
	// -------------------------------------------------------------------------

	openDeleteModal(entry: ClinicLedgerEntry) {
		financeStore.setState(s => ({
			...s,
			isDeleteOpen: true,
			deleteTarget: entry
		}));
	},

	closeDeleteModal() {
		financeStore.setState(s => ({
			...s,
			isDeleteOpen: false,
			deleteTarget: null
		}));
	},

	/** Close every dialog at once (e.g. on route change). */
	closeAllModals() {
		batch(() => {
			financeStore.setState(s => ({
				...s,
				isRecordOpen: false,
				isReceiptOpen: false,
				receiptEntry: null,
				isDeleteOpen: false,
				deleteTarget: null
			}));
		});
	},

	// -------------------------------------------------------------------------
	// Reset
	// -------------------------------------------------------------------------

	reset() {
		financeStore.setState(() => createInitialState());
	}
};

// =============================================================================
// Backward-compatible facade
// =============================================================================
// Existing callers that do `const activeTab = useFinanceStore(s => s.activeTab)`
// keep working via the selector hook above. Callers that previously did
// `const { openRecordModal } = useFinanceStore()` (whole-store destructure)
// should migrate to:
//
//   import { financeActions } from "@/lib/web/finance-store";
//   financeActions.openRecordModal("expense");
//
// To ease the migration, the actions object is also re-exported under the
// legacy name so unmodified imports of `financeActions` keep working.
export const financeActionsLegacy = financeActions;
