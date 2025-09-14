// File: 04-core-code/ui/views/detail-config-view.js

/**
 * @fileoverview View module responsible for all logic related to the Detail Configuration screen.
 */
export class DetailConfigView {
    constructor({ quoteService, uiService, eventAggregator, publishStateChangeCallback }) {
        this.quoteService = quoteService;
        this.uiService = uiService;
        this.eventAggregator = eventAggregator;
        this.publish = publishStateChangeCallback;

        this.propertyOptions = {
            over: ['', 'O'],
            oi: ['', 'IN', 'OUT'],
            lr: ['', 'L', 'R']
        };

        // All direct DOM event listeners are removed from the view.
        console.log("DetailConfigView Initialized (Pure Logic View).");
    }

    handleFocusModeRequest({ column }) {
        const currentMode = this.uiService.getState().activeEditMode;

        if (column === 'location') {
            // Toggling 'location' mode within K1
            const newMode = currentMode === 'K1' ? null : 'K1';
            this._toggleLocationEditMode(newMode);
            return;
        }

        if (column === 'fabric') {
            // Toggling 'fabric' mode within K2
            const newMode = currentMode === 'K2' ? null : 'K2';
            this.uiService.setActiveEditMode(newMode);

            if (newMode) {
                this._resyncFabricAndColorData();
                this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'fabric', 'color']);
                this._updatePanelInputsState(); 
                this.uiService.setActiveCell(null, null);
            } else {
                // When exiting fabric mode, revert to a default detail view
                this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'location']);
            }
        } 
        this.publish();
    }
    
    _toggleLocationEditMode(newMode) {
        this.uiService.setActiveEditMode(newMode);

        if (newMode) {
            this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'location']);
            const targetRow = 0;
            this.uiService.setTargetCell({ rowIndex: targetRow, column: 'location' });
            
            const currentItem = this.quoteService.getItems()[targetRow];
            this.uiService.setLocationInputValue(currentItem.location || '');
            
            const locationInput = document.getElementById('location-input-box');
            setTimeout(() => {
                locationInput?.focus();
                locationInput?.select();
            }, 0);
        } else {
            this.uiService.setTargetCell(null);
            this.uiService.setLocationInputValue('');
        }
        this.publish();
    }

    handleLocationInputEnter({ value }) {
        const { targetCell } = this.uiService.getState();
        if (!targetCell) return;

        this.quoteService.updateItemProperty(targetCell.rowIndex, targetCell.column, value);

        const nextRowIndex = targetCell.rowIndex + 1;
        const totalRows = this.quoteService.getItems().length;
        const locationInput = document.getElementById('location-input-box');

        if (nextRowIndex < totalRows - 1) {
            this.uiService.setTargetCell({ rowIndex: nextRowIndex, column: 'location' });
            const nextItem = this.quoteService.getItems()[nextRowIndex];
            this.uiService.setLocationInputValue(nextItem.location || '');
            this.publish();
            setTimeout(() => locationInput?.select(), 0);
        } else {
            this._toggleLocationEditMode(null); // Auto-exit after the last item
        }
    }


    handleBatchUpdateRequest({ column, value }) {
        this.quoteService.batchUpdateProperty(column, value);
        this.publish();
    }

    handlePanelInputEnter({ type, field }) {
        const inputElement = document.querySelector(`.panel-input[data-type="${type}"][data-field="${field}"]`);
        if (inputElement) {
            this.quoteService.batchUpdatePropertyByType(type, field, inputElement.value);
            this.publish();
        }

        const inputs = Array.from(document.querySelectorAll('.panel-input:not([disabled])'));
        const currentIndex = inputs.indexOf(inputElement);
        const nextInput = inputs[currentIndex + 1];

        if (nextInput) {
            nextInput.focus();
        } else {
            inputElement.blur();
        }
    }

    handleSequenceCellClick({ rowIndex }) {
        const { activeEditMode } = this.uiService.getState();
        if (activeEditMode === 'K1') { // Check for the generic K1 edit mode
            this.uiService.setTargetCell({ rowIndex, column: 'location' });
            const item = this.quoteService.getItems()[rowIndex];
            this.uiService.setLocationInputValue(item.location || '');
            this.publish();
            const locationInput = document.getElementById('location-input-box');
            setTimeout(() => {
                locationInput?.focus();
                locationInput?.select();
            }, 0);
        }
    }

    handleTableCellInteraction({ rowIndex, column }) {
        if (this.propertyOptions[column]) {
            this.uiService.setActiveCell(rowIndex, column);
            const options = this.propertyOptions[column];
            this.quoteService.cycleItemProperty(rowIndex, column, options);
            this.publish();
            setTimeout(() => {
                this.uiService.setActiveCell(null, null);
                this.publish();
            }, 100);
            return;
        }
    }

    _updatePanelInputsState() {
        const items = this.quoteService.getItems();
        const presentTypes = new Set(items.map(item => item.fabricType).filter(Boolean));
        
        const allPanelInputs = document.querySelectorAll('.panel-input');
        allPanelInputs.forEach(input => {
            if (input.dataset.type !== 'LF') {
                input.disabled = !presentTypes.has(input.dataset.type);
            }
        });

        const firstEnabledInput = document.querySelector('.panel-input:not([disabled])');
        if (firstEnabledInput) {
            setTimeout(() => firstEnabledInput.focus(), 0);
        }
    }

    _resyncFabricAndColorData() {
        const enabledInputs = document.querySelectorAll('.panel-input:not([disabled])');
        enabledInputs.forEach(input => {
            const type = input.dataset.type;
            const field = input.dataset.field;
            const value = input.value;
            if (value) {
                this.quoteService.batchUpdatePropertyByType(type, field, value);
            }
        });
        this.publish();
    }
}