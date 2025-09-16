// File: 04-core-code/ui/ui-manager.js

import { TableComponent } from './table-component.js';
import { SummaryComponent } from './summary-component.js';
import { PanelComponent } from './panel-component.js';
import { NotificationComponent } from './notification-component.js';
import { DialogComponent } from './dialog-component.js';

export class UIManager {
    constructor(appElement, eventAggregator) {
        this.appElement = appElement;
        this.eventAggregator = eventAggregator;

        // --- DOM 元素引用 ---
        this.numericKeyboardPanel = document.getElementById('numeric-keyboard-panel');
        this.insertButton = document.getElementById('key-insert');
        this.deleteButton = document.getElementById('key-delete');
        this.mDelButton = document.getElementById('key-f5');
        const clearButtonOnKeyboard = document.getElementById('key-clear');
        this.clearButton = clearButtonOnKeyboard;
        this.leftPanel = document.getElementById('left-panel');
        
        // K1 Panel
        this.locationButton = document.getElementById('btn-focus-location');
        this.locationInput = document.getElementById('location-input-box');
        
        // K2 Panel
        this.fabricColorButton = document.getElementById('btn-focus-fabric');
        this.lfButton = document.getElementById('btn-light-filter');
        this.lfDelButton = document.getElementById('btn-lf-del');

        // K3 Panel
        this.k3EditButton = document.getElementById('btn-k3-edit');
        this.k3OverButton = document.getElementById('btn-batch-cycle-over');
        this.k3OiButton = document.getElementById('btn-batch-cycle-oi');
        this.k3LrButton = document.getElementById('btn-batch-cycle-lr');
        
        this.tabButtons = document.querySelectorAll('.tab-button');
        this.tabContents = document.querySelectorAll('.tab-content');

        // --- 實例化所有子元件 ---
        const tableElement = document.getElementById('results-table');
        this.tableComponent = new TableComponent(tableElement);

        const summaryElement = document.getElementById('total-sum-value');
        this.summaryComponent = new SummaryComponent(summaryElement);

        this.functionPanel = new PanelComponent({
            panelElement: document.getElementById('function-panel'),
            toggleElement: document.getElementById('function-panel-toggle'),
            eventAggregator: this.eventAggregator,
            expandedClass: 'is-expanded',
            retractEventName: 'operationSuccessfulAutoHidePanel'
        });

        this.notificationComponent = new NotificationComponent({
            containerElement: document.getElementById('toast-container'),
            eventAggregator: this.eventAggregator
        });

        this.dialogComponent = new DialogComponent({
            overlayElement: document.getElementById('confirmation-dialog-overlay'),
            eventAggregator: this.eventAggregator
        });

        this.initialize();
        this._initializeLeftPanelLayout();
    }

    initialize() {
        this.eventAggregator.subscribe('userToggledNumericKeyboard', () => this._toggleNumericKeyboard());
    }

    render(state) {
        const isDetailView = state.ui.currentView === 'DETAIL_CONFIG';
        this.appElement.classList.toggle('detail-view-active', isDetailView);

        this.tableComponent.render(state);
        this.summaryComponent.render(state.quoteData.summary, state.ui.isSumOutdated);
        
        this._updateButtonStates(state);
        this._updateLeftPanelState(state.ui.currentView);
        this._updatePanelButtonStates(state);
        this._updateTabStates(state.ui);
        
        this._scrollToActiveCell(state);
    }

    _updateTabStates(uiState) {
        const { activeEditMode, activeTabId } = uiState;
        const isInEditMode = activeEditMode !== null;

        const activeTabButton = document.getElementById(activeTabId);
        const activeContentTarget = activeTabButton ? activeTabButton.dataset.tabTarget : null;

        this.tabButtons.forEach(button => {
            button.classList.toggle('active', button.id === activeTabId);
            button.disabled = isInEditMode;
        });

        this.tabContents.forEach(content => {
            const isThisContentActive = activeContentTarget && `#${content.id}` === activeContentTarget;
            content.classList.toggle('active', isThisContentActive);
        });
        
        const panelBgColors = {
            'k1-tab': 'var(--k1-bg-color)',
            'k2-tab': 'var(--k2-bg-color)',
            'k3-tab': 'var(--k3-bg-color)',
            'k4-tab': 'var(--k4-bg-color)',
            'k5-tab': 'var(--k5-bg-color)',
        };
        this.leftPanel.style.backgroundColor = panelBgColors[activeTabId] || 'var(--k1-bg-color)';
    }

    _updatePanelButtonStates(state) {
        const { activeEditMode, locationInputValue, lfModifiedRowIndexes } = state.ui;
        const { rollerBlindItems } = state.quoteData;

        // --- K1 Location Input State ---
        if (this.locationInput) {
            const isLocationActive = activeEditMode === 'K1';
            this.locationInput.disabled = !isLocationActive;
            this.locationInput.classList.toggle('active', isLocationActive);
            if (this.locationInput.value !== locationInputValue) {
                this.locationInput.value = locationInputValue;
            }
        }
        
        // --- K2 Button Active/Disabled States ---
        const isFCMode = activeEditMode === 'K2';
        const isLFSelectMode = activeEditMode === 'K2_LF_SELECT';
        const isLFDeleteMode = activeEditMode === 'K2_LF_DELETE_SELECT';
        const isAnyK2ModeActive = isFCMode || isLFSelectMode || isLFDeleteMode;

        if (this.locationButton) this.locationButton.classList.toggle('active', activeEditMode === 'K1');
        if (this.fabricColorButton) this.fabricColorButton.classList.toggle('active', isFCMode);
        if (this.lfButton) this.lfButton.classList.toggle('active', isLFSelectMode);
        if (this.lfDelButton) this.lfDelButton.classList.toggle('active', isLFDeleteMode);

        const hasBO1 = rollerBlindItems.some(item => item.fabricType === 'BO1');
        const hasLFModified = lfModifiedRowIndexes.size > 0;

        if (this.locationButton) this.locationButton.disabled = isAnyK2ModeActive;
        if (this.fabricColorButton) this.fabricColorButton.disabled = activeEditMode !== null && !isFCMode;
        if (this.lfButton) this.lfButton.disabled = (activeEditMode !== null && !isLFSelectMode) || !hasBO1;
        if (this.lfDelButton) this.lfDelButton.disabled = (activeEditMode !== null && !isLFDeleteMode) || !hasLFModified;

        // --- K3 Button Active/Disabled States ---
        const isK3EditMode = activeEditMode === 'K3';
        if (this.k3EditButton) {
            this.k3EditButton.classList.toggle('active', isK3EditMode);
            this.k3EditButton.disabled = activeEditMode !== null && !isK3EditMode;
        }
        const k3SubButtonsDisabled = !isK3EditMode;
        if (this.k3OverButton) this.k3OverButton.disabled = k3SubButtonsDisabled;
        if (this.k3OiButton) this.k3OiButton.disabled = k3SubButtonsDisabled;
        if (this.k3LrButton) this.k3LrButton.disabled = k3SubButtonsDisabled;
    }

    _adjustLeftPanelLayout() {
        const appContainer = this.appElement;
        const numericKeyboard = this.numericKeyboardPanel;
        const key7 = document.getElementById('key-7');
        const leftPanel = this.leftPanel;

        if (!appContainer || !numericKeyboard || !key7 || !leftPanel) return;
        
        const containerRect = appContainer.getBoundingClientRect();
        const key7Rect = key7.getBoundingClientRect();
        const rightPageMargin = 40;
        
        leftPanel.style.left = containerRect.left + 'px';
        const newWidth = containerRect.width - rightPageMargin;
        leftPanel.style.width = newWidth + 'px';
        leftPanel.style.top = key7Rect.top + 'px';
        const keyHeight = key7Rect.height;
        const gap = 5;
        const totalKeysHeight = (keyHeight * 4) + (gap * 3);
        leftPanel.style.height = totalKeysHeight + 'px';
    }

    _initializeLeftPanelLayout() {
        window.addEventListener('resize', () => {
            if (this.leftPanel.classList.contains('is-expanded')) {
                this._adjustLeftPanelLayout();
            }
        });
        // [FIX] Restore initial layout calculation to ensure panel has height/position on load
        this._adjustLeftPanelLayout();
    }
    
    _updateLeftPanelState(currentView) {
        if (this.leftPanel) {
            const isExpanded = (currentView === 'DETAIL_CONFIG');
            this.leftPanel.classList.toggle('is-expanded', isExpanded);

            if (isExpanded) {
                this._adjustLeftPanelLayout();
            } else {
                // [FIX] Only clear 'left' style. Preserve height/top/width.
                // This fixes the desktop artifact bug without deleting the panel.
                this.leftPanel.style.left = '';
            }
        }
    }

    _updateButtonStates(state) {
        const { selectedRowIndex, isMultiDeleteMode, multiDeleteSelectedIndexes } = state.ui;
        const items = state.quoteData.rollerBlindItems;
        const isSingleRowSelected = selectedRowIndex !== null;
        
        let insertDisabled = true;
        if (isSingleRowSelected) {
            const isLastRow = selectedRowIndex === items.length - 1;
            if (!isLastRow) {
                const nextItem = items[selectedRowIndex + 1];
                const isNextRowEmpty = !nextItem.width && !nextItem.height && !nextItem.fabricType;
                if (!isNextRowEmpty) { insertDisabled = false; }
            }
        }
        if (this.insertButton) this.insertButton.disabled = insertDisabled;

        let deleteDisabled = true;
        if (isMultiDeleteMode) {
            if (multiDeleteSelectedIndexes.size > 0) { deleteDisabled = false; }
        } else if (isSingleRowSelected) {
            const item = items[selectedRowIndex];
            const isLastRow = selectedRowIndex === items.length - 1;
            const isRowEmpty = !item.width && !item.height && !item.fabricType;
            if (!(isLastRow && isRowEmpty)) { deleteDisabled = false; }
        }
        if (this.deleteButton) this.deleteButton.disabled = deleteDisabled;
        
        const mDelDisabled = !isSingleRowSelected && !isMultiDeleteMode;
        if (this.mDelButton) {
            this.mDelButton.disabled = mDelDisabled;
            this.mDelButton.style.backgroundColor = isMultiDeleteMode ? '#f5c6cb' : '';
        }

        if (this.clearButton) this.clearButton.disabled = !isSingleRowSelected;
    }
    
    _scrollToActiveCell(state) {
        if (!state.ui.activeCell) return;
        const { rowIndex, column } = state.ui.activeCell;
        const activeCellElement = document.querySelector(`tr[data-row-index="${rowIndex}"] td[data-column="${column}"]`);
        if (activeCellElement) {
            activeCellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    _toggleNumericKeyboard() {
        if (this.numericKeyboardPanel) {
            this.numericKeyboardPanel.classList.toggle('is-collapsed');
        }
    }
}