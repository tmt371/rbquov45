// File: 04-core-code/services/ui-service.js

/**
 * @fileoverview A dedicated service for managing all UI-related state.
 * Acts as the single source of truth for the UI state.
 */
export class UIService {
    constructor(initialUIState) {
        // Use a deep copy to ensure the service has its own state object.
        this.state = JSON.parse(JSON.stringify(initialUIState));
        
        // Initialize states not present in the initial config
        this.state.isMultiDeleteMode = false;
        this.state.multiDeleteSelectedIndexes = new Set();
        this.state.locationInputValue = '';
        this.state.targetCell = null;
        this.state.activeEditMode = null;
        
        this.state.lfSelectedRowIndexes = new Set();
        this.state.lfModifiedRowIndexes = new Set();
        
        console.log("UIService Initialized.");
    }

    getState() {
        return this.state;
    }

    reset(initialUIState) {
        this.state = JSON.parse(JSON.stringify(initialUIState));
        this.state.isMultiDeleteMode = false;
        this.state.multiDeleteSelectedIndexes = new Set();
        this.state.locationInputValue = '';
        this.state.targetCell = null;
        this.state.activeEditMode = null;
        
        this.state.lfSelectedRowIndexes = new Set();
        this.state.lfModifiedRowIndexes = new Set();
    }

    setActiveCell(rowIndex, column) {
        this.state.activeCell = { rowIndex, column };
        this.state.inputMode = column;
    }

    setInputValue(value) {
        this.state.inputValue = String(value || '');
    }

    appendInputValue(key) {
        this.state.inputValue += key;
    }

    deleteLastInputChar() {
        this.state.inputValue = this.state.inputValue.slice(0, -1);
    }

    clearInputValue() {
        this.state.inputValue = '';
    }

    toggleRowSelection(rowIndex) {
        this.state.selectedRowIndex = (this.state.selectedRowIndex === rowIndex) ? null : rowIndex;
    }

    clearRowSelection() {
        this.state.selectedRowIndex = null;
    }

    toggleMultiDeleteMode() {
        const isEnteringMode = !this.state.isMultiDeleteMode;
        this.state.isMultiDeleteMode = isEnteringMode;
        this.state.multiDeleteSelectedIndexes.clear();

        if (isEnteringMode && this.state.selectedRowIndex !== null) {
            this.state.multiDeleteSelectedIndexes.add(this.state.selectedRowIndex);
        }
        
        this.clearRowSelection();

        return isEnteringMode;
    }
    
    toggleMultiDeleteSelection(rowIndex) {
        if (this.state.multiDeleteSelectedIndexes.has(rowIndex)) {
            this.state.multiDeleteSelectedIndexes.delete(rowIndex);
        } else {
            this.state.multiDeleteSelectedIndexes.add(rowIndex);
        }
    }

    setSumOutdated(isOutdated) {
        this.state.isSumOutdated = isOutdated;
    }

    setCurrentView(viewName) {
        this.state.currentView = viewName;
    }

    setVisibleColumns(columns) {
        this.state.visibleColumns = columns;
    }
    
    /**
     * [NEW] Sets the active tab ID for the left panel.
     * @param {string} tabId - e.g., 'k1-tab', 'k2-tab'.
     */
    setActiveTab(tabId) {
        this.state.activeTabId = tabId;
    }

    setLocationInputValue(value) {
        this.state.locationInputValue = value;
    }

    setTargetCell(cell) { // cell should be { rowIndex, column } or null
        this.state.targetCell = cell;
    }

    setActiveEditMode(mode) {
        this.state.activeEditMode = mode;
    }

    toggleLFSelection(rowIndex) {
        if (this.state.lfSelectedRowIndexes.has(rowIndex)) {
            this.state.lfSelectedRowIndexes.delete(rowIndex);
        } else {
            this.state.lfSelectedRowIndexes.add(rowIndex);
        }
    }

    clearLFSelection() {
        this.state.lfSelectedRowIndexes.clear();
    }

    addLFModifiedRows(rowIndexes) {
        for (const index of rowIndexes) {
            this.state.lfModifiedRowIndexes.add(index);
        }
    }

    removeLFModifiedRows(rowIndexes) {
        for (const index of rowIndexes) {
            this.state.lfModifiedRowIndexes.delete(index);
        }
    }
    
    hasLFModifiedRows() {
        return this.state.lfModifiedRowIndexes.size > 0;
    }
}