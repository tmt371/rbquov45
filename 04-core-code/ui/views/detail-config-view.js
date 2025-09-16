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

            if (newMode) {
                const items = this.quoteService.getItems();
                const { lfModifiedRowIndexes } = this.uiService.getState();
                const hasConflict = items.some((item, index) => 
                    item.fabricType === 'BO1' && lfModifiedRowIndexes.has(index)
                );

                if (hasConflict) {
                    this.eventAggregator.publish('showConfirmationDialog', {
                        message: 'Some BO1 items have Light-Filter settings. Continuing will overwrite this data. Proceed?',
                        buttons: [
                            { text: 'OK', callback: () => this._enterFCMode(true) },
                            { text: 'Cancel', className: 'secondary', callback: () => {} }
                        ]
                    });
                } else {
                    this._enterFCMode(false);
                }
            } else {
                this.uiService.setActiveEditMode(null);
                this._updatePanelInputsState();
                this.publish();
            }
        } 
    }
    
    _enterFCMode(isOverwriting) {
        if (isOverwriting) {
            const items = this.quoteService.getItems();
            const { lfModifiedRowIndexes } = this.uiService.getState();
            const indexesToClear = new Set();
            items.forEach((item, index) => {
                if (item.fabricType === 'BO1' && lfModifiedRowIndexes.has(index)) {
                    indexesToClear.add(index);
                }
            });
            if (indexesToClear.size > 0) {
                this.uiService.removeLFModifiedRows(indexesToClear);
            }
        }
        this.uiService.setActiveEditMode('K2');
        this.uiService.setVisibleColumns(['sequence', 'fabricTypeDisplay', 'fabric', 'color']);
        this._updatePanelInputsState(); 
        this.uiService.setActiveCell(null, null);
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
        console.log(`[DetailConfigView] Received panel input: type=${type}, field=${field}, value=${value}`);

        const { lfSelectedRowIndexes } = this.uiService.getState();
        
        if (type === 'LF') {
            // ... (LF logic remains the same)
            return;
        }
        
        this.quoteService.batchUpdatePropertyByType(type, field, value);
        this.publish();

        // --- [DEEP DEBUG LOG] ---
        // Create a deep copy for logging to prevent mutations before console displays it.
        const currentState = JSON.parse(JSON.stringify(this.quoteService.getQuoteData()));
        console.log(`[DetailConfigView] State AFTER update for ${type}-${field}:`, currentState.rollerBlindItems);
        // --- [END DEEP DEBUG LOG] ---

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
            this._updatePanelInputsState();
            this.publish();
        }
    }

    handleSequenceCellClick({ rowIndex }) {
        const { activeEditMode } = this.uiService.getState();

        if (activeEditMode === 'K2_LF_SELECT' || activeEditMode === 'K2_LF_DELETE_SELECT') {
            const item = this.quoteService.getItems()[rowIndex];
            
            if (activeEditMode === 'K2_LF_DELETE_SELECT') {
                const { lfModifiedRowIndexes } = this.uiService.getState();
                if (!lfModifiedRowIndexes.has(rowIndex)) {
                    this.eventAggregator.publish('showNotification', { message: 'Only items with a Light-Filter setting (pink background) can be selected for deletion.', type: 'error' });
                    return;
                }
            }

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

    handleTableCellClick({ rowIndex, column }) {
        const { activeEditMode } = this.uiService.getState();

        if (activeEditMode !== 'K3') return;

        if (['over', 'oi', 'lr'].includes(column)) {
            this.uiService.setActiveCell(rowIndex, column);
            this.quoteService.cycleK3Property(rowIndex, column);
            this.publish();
            
            setTimeout(() => {
                this.uiService.setActiveCell(null, null);
                this.publish();
            }, 150);
        }
    }

    handleLFEditRequest() {
        // ... (logic remains the same)
    }

    handleLFDeleteRequest() {
        // ... (logic remains the same)
    }
    
    handleToggleK3EditMode() {
        const currentMode = this.uiService.getState().activeEditMode;
        const newMode = currentMode === 'K3' ? null : 'K3';
        this.uiService.setActiveEditMode(newMode);
        this.publish();
    }

    handleBatchCycle({ column }) {
        // ... (logic remains the same)
    }

    initializePanelState() {
        this._updatePanelInputsState();
    }

    _updatePanelInputsState() {
        // ... (logic remains the same)
    }
}