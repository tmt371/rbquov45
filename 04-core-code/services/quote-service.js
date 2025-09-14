// File: 04-core-code/services/quote-service.js

/**
 * @fileoverview Service for managing quote data.
 * Acts as the single source of truth for the quoteData state object.
 * It contains all the business logic for mutating the quote data.
 */

export class QuoteService {
    constructor({ initialState, productFactory }) {
        // 使用深拷貝確保 QuoteService 擁有獨立的、純淨的資料狀態
        this.quoteData = JSON.parse(JSON.stringify(initialState.quoteData));
        this.productFactory = productFactory;

        const currentProduct = 'rollerBlind'; // 未來此值可由外部傳入
        this.productStrategy = this.productFactory.getProductStrategy(currentProduct);
        this.itemListName = `${currentProduct}Items`; // e.g., 'rollerBlindItems'

        console.log("QuoteService Initialized.");
    }

    getQuoteData() {
        return this.quoteData;
    }

    getItems() {
        return this.quoteData[this.itemListName];
    }
    
    _getItems() {
        return this.quoteData[this.itemListName];
    }

    insertRow(selectedIndex) {
        const items = this._getItems();
        const newItem = this.productStrategy.getInitialItemData();
        const newRowIndex = selectedIndex + 1;
        items.splice(newRowIndex, 0, newItem);
        return newRowIndex;
    }

    deleteRow(selectedIndex) {
        const items = this._getItems();
        const isLastRow = selectedIndex === items.length - 1;
        const item = items[selectedIndex];
        const isRowEmpty = !item.width && !item.height && !item.fabricType;

        if (isLastRow && !isRowEmpty) {
            this.clearRow(selectedIndex);
            return;
        }

        if (items.length === 1) {
            this.clearRow(selectedIndex);
            return;
        }

        items.splice(selectedIndex, 1);
    }

    clearRow(selectedIndex) {
        const itemToClear = this._getItems()[selectedIndex];
        if (itemToClear) {
            // --- Phase 1 Fields ---
            itemToClear.width = null;
            itemToClear.height = null;
            itemToClear.fabricType = null;
            itemToClear.linePrice = null;
            // --- Phase 2 Fields ---
            itemToClear.location = '';
            itemToClear.fabric = '';
            itemToClear.color = '';
            itemToClear.over = '';
            itemToClear.oi = '';
            itemToClear.lr = '';
            itemToClear.sd = '';
            itemToClear.chain = null;
            itemToClear.winder = '';
            itemToClear.motor = '';
        }
    }

    updateItemValue(rowIndex, column, value) {
        const targetItem = this._getItems()[rowIndex];
        if (!targetItem) return false;

        if (targetItem[column] !== value) {
            targetItem[column] = value;
            targetItem.linePrice = null;
            
            this.consolidateEmptyRows();
            return true;
        }
        return false;
    }
    
    updateItemProperty(rowIndex, property, value) {
        const item = this._getItems()[rowIndex];
        if (item && item[property] !== value) {
            item[property] = value;
            return true;
        }
        return false;
    }
    
    cycleItemProperty(rowIndex, property, options) {
        const item = this._getItems()[rowIndex];
        if (!item) return false;

        const currentValue = item[property];
        const currentIndex = options.indexOf(currentValue);
        const nextIndex = (currentIndex + 1) % options.length;
        const nextValue = options[nextIndex];

        if (item[property] !== nextValue) {
            item[property] = nextValue;
            return true;
        }
        return false;
    }

    batchUpdateProperty(property, value) {
        const items = this._getItems();
        let changed = false;
        items.forEach(item => {
            // Only update rows with data, not the final empty row
            if (item.width || item.height) {
                if (item[property] !== value) {
                    item[property] = value;
                    changed = true;
                }
            }
        });
        return changed;
    }
    
    // --- [NEW] Method for batch updating a property based on fabricType ---
    /**
     * Updates a property for all items that match a specific fabricType.
     * @param {string} type The fabricType to match (e.g., 'BO', 'SN').
     * @param {string} property The property key to update (e.g., 'fabric', 'color').
     * @param {*} value The new value to set.
     * @returns {boolean} True if any value was changed.
     */
    batchUpdatePropertyByType(type, property, value) {
        const items = this._getItems();
        let changed = false;
        items.forEach(item => {
            if (item.fabricType === type) {
                if (item[property] !== value) {
                    item[property] = value;
                    changed = true;
                }
            }
        });
        return changed;
    }

    cycleItemType(rowIndex) {
        const item = this._getItems()[rowIndex];
        if (!item || (!item.width && !item.height)) return false;

        const TYPE_SEQUENCE = ['BO', 'BO1', 'SN'];
        const currentType = item.fabricType;
        const currentIndex = TYPE_SEQUENCE.indexOf(currentType);
        const nextType = TYPE_SEQUENCE[(currentIndex + 1) % TYPE_SEQUENCE.length];
        
        if (item.fabricType !== nextType) {
            item.fabricType = nextType;
            item.linePrice = null;
            return true;
        }
        return false;
    }

    reset() {
        const initialItem = this.productStrategy.getInitialItemData();
        this.quoteData = {
            [this.itemListName]: [initialItem],
            summary: { totalSum: null }
        };
    }

    hasData() {
        const items = this._getItems();
        if (!items) return false;
        return items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
    }

    deleteMultipleRows(indexesToDelete) {
        const sortedIndexes = [...indexesToDelete].sort((a, b) => b - a);

        sortedIndexes.forEach(index => {
            this.deleteRow(index);
        });

        this.consolidateEmptyRows();
    }

    consolidateEmptyRows() {
        const items = this._getItems();
        
        while (items.length > 1) {
            const lastItem = items[items.length - 1];
            const secondLastItem = items[items.length - 2];
            const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
            const isSecondLastItemEmpty = !secondLastItem.width && !secondLastItem.height && !secondLastItem.fabricType;

            if (isLastItemEmpty && isSecondLastItemEmpty) {
                items.pop();
            } else {
                break;
            }
        }

        const lastItem = items[items.length - 1];
        if (!lastItem) return;
        const isLastItemEmpty = !lastItem.width && !lastItem.height && !lastItem.fabricType;
        if (!isLastItemEmpty) {
            const newItem = this.productStrategy.getInitialItemData();
            items.push(newItem);
        }
    }
}