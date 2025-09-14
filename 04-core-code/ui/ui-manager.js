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
        
        this.locationButton = document.getElementById('btn-focus-location');
        this.fabricColorButton = document.getElementById('btn-focus-fabric');
        this.locationInput = document.getElementById('location-input-box');
        
        this.tabButtons = document.querySelectorAll('.tab-button');

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
        this.tableComponent.render(state);
        this.summaryComponent.render(state.quoteData.summary, state.ui.isSumOutdated);
        
        this._updateButtonStates(state);
        this._updateLeftPanelState(state.ui.currentView);
        this._updatePanelButtonStates(state.ui);
        this._updateTabStates(state.ui);
        
        this._scrollToActiveCell(state);
    }

    _updateTabStates(uiState) {
        const { activeEditMode } = uiState;
        const isInEditMode = activeEditMode !== null;
        
        let activeTabId = '';
        if (isInEditMode) {
            // Determine which tab is active based on the mode
            if (activeEditMode === 'K1') {
                activeTabId = 'k1-tab';
            } else if (activeEditMode === 'K2') {
                activeTabId = 'k2-tab';
            }
            // Add other cases for K3, K4 etc. here in the future
        }
        
        this.tabButtons.forEach(button => {
            if (isInEditMode) {
                button.disabled = button.id !== activeTabId;
            } else {
                button.disabled = false;
            }
        });
    }

    _updatePanelButtonStates(uiState) {
        const { activeEditMode, locationInputValue } = uiState;

        if (this.locationInput) {
            const isLocationActive = activeEditMode === 'K1';
            this.locationInput.disabled = !isLocationActive;
            this.locationInput.classList.toggle('active', isLocationActive);
            if (this.locationInput.value !== locationInputValue) {
                this.locationInput.value = locationInputValue;
            }
        }
        
        if (this.locationButton && this.fabricColorButton) {
            this.locationButton.classList.toggle('active', activeEditMode === 'K1');
            this.fabricColorButton.classList.toggle('active', activeEditMode === 'K2');

            this.locationButton.disabled = (activeEditMode === 'K2');
            this.fabricColorButton.disabled = (activeEditMode === 'K1');
            this.locationButton.classList.toggle('disabled-by-mode', activeEditMode === 'K2');
            this.fabricColorButton.classList.toggle('disabled-by-mode', activeEditMode === 'K1');
        }
    }

    _initializeLeftPanelLayout() {
        const appContainer = document.querySelector('.app-container');
        const leftPanel = this.leftPanel;
        const numericKeyboard = this.numericKeyboardPanel;
        const key7 = document.getElementById('key-7');

        if (!leftPanel) return;

        const adjustLayout = () => {
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
        };
        
        this.tabButtons.forEach(tab => {
            tab.addEventListener('click', (event) => {
                if (tab.disabled) {
                    event.stopPropagation();
                    return;
                }
                this.tabButtons.forEach(t => t.classList.remove('active'));
                const tabContents = this.leftPanel.querySelectorAll('.tab-content');
                tabContents.forEach(c => c.classList.remove('active'));
                
                tab.classList.add('active');
                const targetContent = document.querySelector(tab.dataset.tabTarget);

                if(targetContent) {
                    targetContent.classList.add('active');
                    const panelBgColors = {
                        '#k1-content': 'var(--k1-bg-color)', '#k2-content': 'var(--k2-bg-color)',
                        '#k3-content': 'var(--k3-bg-color)', '#k4-content': 'var(--k4-bg-color)',
                        '#k5-content': 'var(--k5-bg-color)',
                    };
                    this.leftPanel.style.backgroundColor = panelBgColors[tab.dataset.tabTarget];
                }
            });
        });

        adjustLayout();
        window.addEventListener('resize', adjustLayout);
    }
    
    _updateLeftPanelState(currentView) {
        if (this.leftPanel) {
            const isExpanded = (currentView === 'DETAIL_CONFIG');
            this.leftPanel.classList.toggle('is-expanded', isExpanded);
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