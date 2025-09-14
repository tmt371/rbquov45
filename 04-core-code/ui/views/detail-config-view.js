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
            const newMode = currentMode === 'K1' ? null : 'K1';
            this._toggleLocationEditMode(newMode);
            return;
        }

        if (column === 'fabric') {
            const newMode = currentMode === 'K2' ? null : 'K2';
            this.uiService.setActiveEditMode(newMode);

            if (newMode) {
                this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'fabric', 'color']);
                this._updatePanelInputsState(); 
                this.uiService.setActiveCell(null, null);
            } else {
                // [FIX #1 & #2] On exiting FC mode, just disable the panel. Do not change columns.
                this._updatePanelInputsState();
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
            this._toggleLocationEditMode(null);
        }
    }


    handleBatchUpdateRequest({ column, value }) {
        this.quoteService.batchUpdateProperty(column, value);
        this.publish();
    }

    handlePanelInputEnter({ type, field, value }) {
        const { activeEditMode, lfSelectedRowIndexes } = this.uiService.getState();

        // [FIX #4] Reworked LF workflow to handle two-step input
        if (type === 'LF') {
            if (field === 'fabric') {
                const nextInput = document.querySelector('input[data-type="LF"][data-field="color"]');
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                }
            } else if (field === 'color') {
                const fNameInput = document.querySelector('input[data-type="LF"][data-field="fabric"]');
                const fNameValue = fNameInput ? fNameInput.value : '';
                const fColorValue = value;

                this.quoteService.batchUpdateLFProperties(lfSelectedRowIndexes, fNameValue, fColorValue);
                this.uiService.addLFModifiedRows(lfSelectedRowIndexes);
                this.uiService.clearLFSelection();
                this.uiService.setActiveEditMode(null);
                this._updatePanelInputsState();
                this.publish();
            }
            return;
        }
        
        // --- FC Workflow ---
        this.quoteService.batchUpdatePropertyByType(type, field, value);
        this.publish();

        const inputs = Array.from(document.querySelectorAll('.panel-input:not([disabled])'));
        const activeElement = document.activeElement;
        const currentIndex = inputs.indexOf(activeElement);
        const nextInput = inputs[currentIndex + 1];

        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        } else {
            activeElement.blur();
            this.uiService.setActiveEditMode(null);
            this.publish();
        }
    }

    handleSequenceCellClick({ rowIndex }) {
        const { activeEditMode } = this.uiService.getState();

        if (activeEditMode === 'K2_LF_SELECT' || activeEditMode === 'K2_LF_DELETE_SELECT') {
            const item = this.quoteService.getItems()[rowIndex];
            if (activeEditMode === 'K2_LF_SELECT' && item.fabricType !== 'BO1') {
                this.eventAggregator.publish('showNotification', { message: 'Only items with TYPE "BO1" can be selected.', type: 'error' });
                return;
            }
            this.uiService.toggleLFSelection(rowIndex);
            
            if (activeEditMode === 'K2_LF_SELECT') {
                this._updatePanelInputsState();
            }
        } else if (activeEditMode === 'K1') {
            this.uiService.setTargetCell({ rowIndex, column: 'location' });
            const item = this.quoteService.getItems()[rowIndex];
            this.uiService.setLocationInputValue(item.location || '');
            
            const locationInput = document.getElementById('location-input-box');
            setTimeout(() => {
                locationInput?.focus();
                locationInput?.select();
            }, 0);
        }
        this.publish();
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

    handleLFEditRequest() {
        const { activeEditMode } = this.uiService.getState();
        
        if (activeEditMode === 'K2_LF_SELECT') {
            this.uiService.setActiveEditMode(null);
            this.uiService.clearLFSelection();
            this._updatePanelInputsState();
        } else {
            this.uiService.setActiveEditMode('K2_LF_SELECT');
            this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'fabric', 'color']);
            this.eventAggregator.publish('showNotification', { message: 'Please select the items with TYPE \'BO1\' to edit the fabric name and color settings for the roller blinds.' });
        }
        this.publish();
    }

    handleLFDeleteRequest() {
        const { activeEditMode } = this.uiService.getState();
        
        if (activeEditMode === 'K2_LF_DELETE_SELECT') {
            const { lfSelectedRowIndexes } = this.uiService.getState();
            if (lfSelectedRowIndexes.size > 0) {
                this.quoteService.removeLFProperties(lfSelectedRowIndexes);
                this.uiService.removeLFModifiedRows(lfSelectedRowIndexes);
                this.eventAggregator.publish('showNotification', { message: 'Please continue to edit the fabric name and color of the roller blinds.' });
            }
            this.uiService.setActiveEditMode(null);
            this.uiService.clearLFSelection();
        } else {
            this.uiService.setActiveEditMode('K2_LF_DELETE_SELECT');
            this.eventAggregator.publish('showNotification', { message: 'Please select the roller blinds for which you want to cancel the Light-Filter fabric setting. After selection, click the LF-Del button again.' });
        }
        this.publish();
    }
    
    /**
     * [NEW] Public method to initialize or reset the panel's input states.
     * Called by AppController when switching to the detail view.
     */
    initializePanelState() {
        this._updatePanelInputsState();
    }

    _updatePanelInputsState() {
        const { activeEditMode, lfSelectedRowIndexes } = this.uiService.getState();
        const items = this.quoteService.getItems();
        const presentTypes = new Set(items.map(item => item.fabricType).filter(Boolean));
        
        const allPanelInputs = document.querySelectorAll('.panel-input');
        
        if (activeEditMode === 'K2') {
            allPanelInputs.forEach(input => {
                if (input.dataset.type !== 'LF') {
                    input.disabled = !presentTypes.has(input.dataset.type);
                } else {
                    input.disabled = true;
                }
            });
            const firstEnabledInput = document.querySelector('.panel-input:not([disabled])');
            if (firstEnabledInput) {
                setTimeout(() => {
                    firstEnabledInput.focus();
                    firstEnabledInput.select();
                }, 0);
            }
        } else if (activeEditMode === 'K2_LF_SELECT') {
            allPanelInputs.forEach(input => {
                const isLFRow = input.dataset.type === 'LF';
                const hasSelection = lfSelectedRowIndexes.size > 0;
                input.disabled = !(isLFRow && hasSelection);
            });
            const firstEnabledInput = document.querySelector('.panel-input:not([disabled])');
            if (firstEnabledInput) {
                setTimeout(() => {
                    firstEnabledInput.focus();
                    firstEnabledInput.select();
                }, 0);
            }
        } else {
             allPanelInputs.forEach(input => {
                input.disabled = true;
                input.value = '';
            });
        }
    }
}