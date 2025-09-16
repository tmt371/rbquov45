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

    handlePanelInputBlur({ type, field, value }) {
        const { lfSelectedRowIndexes } = this.uiService.getState();
        
        if (type === 'LF') {
            const fNameInput = document.querySelector('input[data-type="LF"][data-field="fabric"]');
            const fColorInput = document.querySelector('input[data-type="LF"][data-field="color"]');
            
            if (fNameInput && fColorInput && fNameInput.value && fColorInput.value) {
                this.quoteService.batchUpdateLFProperties(lfSelectedRowIndexes, fNameInput.value, fColorInput.value);
                this.uiService.addLFModifiedRows(lfSelectedRowIndexes);
            }
        } else {
            this.quoteService.batchUpdatePropertyByType(type, field, value);
        }
        
        this.publish();
    }

    handlePanelInputEnter() {
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
    
    handleToggleK3EditMode() {
        const currentMode = this.uiService.getState().activeEditMode;
        const newMode = currentMode === 'K3' ? null : 'K3';
        this.uiService.setActiveEditMode(newMode);
        this.publish();
    }

    handleBatchCycle({ column }) {
        const items = this.quoteService.getItems();
        if (items.length === 0 || !items[0]) return;

        const BATCH_CYCLE_SEQUENCES = {
            over: ['O', ''],
            oi: ['IN', 'OUT'],
            lr: ['L', 'R']
        };
        const sequence = BATCH_CYCLE_SEQUENCES[column];
        if (!sequence) return;
        
        const firstItemValue = items[0][column] || '';
        const currentIndex = sequence.indexOf(firstItemValue);
        const nextIndex = (currentIndex === -1) ? 0 : (currentIndex + 1) % sequence.length;
        const nextValue = sequence[nextIndex];
        
        this.quoteService.batchUpdateProperty(column, nextValue);
        this.publish();
    }

    initializePanelState() {
        this._updatePanelInputsState();
    }

    _updatePanelInputsState() {
        const { activeEditMode, lfSelectedRowIndexes } = this.uiService.getState();
        const items = this.quoteService.getItems();
        const presentTypes = new Set(items.map(item => item.fabricType).filter(Boolean));
        
        const allPanelInputs = document.querySelectorAll('.panel-input');
        let firstEnabledInput = null;
        
        if (activeEditMode === 'K2') {
            allPanelInputs.forEach(input => {
                const type = input.dataset.type;
                const field = input.dataset.field;

                if (type !== 'LF') {
                    const isEnabled = presentTypes.has(type);
                    input.disabled = !isEnabled;

                    if (isEnabled) {
                        if (!firstEnabledInput) {
                            firstEnabledInput = input;
                        }
                        // [FIX] Correctly find item with existing data, even if it's an empty string
                        const itemWithData = items.find(item => item.fabricType === type && typeof item[field] === 'string');
                        input.value = itemWithData ? itemWithData[field] : '';
                    }
                } else {
                    input.disabled = true;
                }
            });

            if (firstEnabledInput) {
                setTimeout(() => {
                    firstEnabledInput.focus();
                    firstEnabledInput.select();
                }, 50); // Use a slightly safer timeout
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
                }, 50);
            }
        } else {
             allPanelInputs.forEach(input => {
                input.disabled = true;
                input.value = '';
            });
        }
    }
}