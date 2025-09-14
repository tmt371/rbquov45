// File: 04-core-code/ui/table-component.js

/**
 * @fileoverview A dynamic component for rendering the results table header and body.
 */

const COLUMN_CONFIG = {
    sequence: { header: '#', className: 'col-sequence', dataColumn: 'sequence', cellType: 'td' },
    width: { header: 'W', className: 'col-w', dataColumn: 'width', cellType: 'td' },
    height: { header: 'H', className: 'col-h', dataColumn: 'height', cellType: 'td' },
    TYPE: { header: 'TYPE', className: 'col-type', dataColumn: 'TYPE', cellType: 'td' },
    Price: { 
        header: (state) => `<input type="text" class="input-display-cell" id="input-display-cell" value="${state.ui.inputValue || ''}" readonly>`, 
        className: 'input-display-header col-price', 
        dataColumn: 'Price',
        cellType: 'th'
    },
    location: { header: 'Location', className: 'col-location', dataColumn: 'location', cellType: 'td' },
    fabric: { header: 'F-Name', className: 'col-fabric', dataColumn: 'fabric', cellType: 'td' },
    color: { header: 'F-Color', className: 'col-color', dataColumn: 'color', cellType: 'td' },
    over: { header: 'Over', className: 'col-over', dataColumn: 'over', cellType: 'td' },
    oi: { header: 'O/I', className: 'col-oi', dataColumn: 'oi', cellType: 'td' },
    lr: { header: 'L/R', className: 'col-lr', dataColumn: 'lr', cellType: 'td' },
    fabricTypeDisplay: { header: 'Type', className: 'col-type', dataColumn: 'fabricType', cellType: 'td' },
};


export class TableComponent {
    constructor(tableElement) {
        if (!tableElement) {
            throw new Error("Table element is required for TableComponent.");
        }
        this.tableElement = tableElement;
        console.log("TableComponent (Dynamic Engine) Initialized.");
    }

    render(state) {
        const { rollerBlindItems } = state.quoteData;
        const { visibleColumns, isLocationEditMode, targetCell } = state.ui;

        this.tableElement.innerHTML = '';

        const thead = this.tableElement.createTHead();
        const headerRow = thead.insertRow();
        visibleColumns.forEach(key => {
            const config = COLUMN_CONFIG[key];
            if (!config) return;

            const cell = document.createElement(config.cellType);
            cell.className = config.className;
            
            if (typeof config.header === 'function') {
                cell.innerHTML = config.header(state);
            } else {
                cell.innerHTML = config.header;
            }
            headerRow.appendChild(cell);
        });

        const tbody = this.tableElement.createTBody();
        if (rollerBlindItems.length === 0 || (rollerBlindItems.length === 1 && !rollerBlindItems[0].width && !rollerBlindItems[0].height)) {
            const row = tbody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = visibleColumns.length;
            cell.textContent = 'Enter dimensions to begin...';
            cell.style.textAlign = 'left';
            cell.style.color = '#888';
            return;
        }

        rollerBlindItems.forEach((item, index) => {
            const row = tbody.insertRow();
            row.dataset.rowIndex = index;

            if (isLocationEditMode && targetCell && index === targetCell.rowIndex) {
                row.classList.add('target-row-highlight');
            }

            visibleColumns.forEach(key => {
                const config = COLUMN_CONFIG[key];
                if (!config) return;

                const cell = row.insertCell();
                cell.className = config.className;
                cell.dataset.column = config.dataColumn;
                
                this._renderCellContent(cell, key, item, index, state);
            });
        });
    }

    _renderCellContent(cell, key, item, index, state) {
        const { activeCell, selectedRowIndex, isMultiDeleteMode, multiDeleteSelectedIndexes, targetCell, lfSelectedRowIndexes, lfModifiedRowIndexes } = state.ui;

        if (targetCell && index === targetCell.rowIndex && key === targetCell.column) {
            cell.classList.add('target-cell');
        }

        if (lfModifiedRowIndexes.has(index) && (key === 'fabric' || key === 'color')) {
            cell.classList.add('is-lf-modified');
        }

        switch (key) {
            case 'sequence':
                cell.textContent = index + 1;
                const isLastRowEmpty = (index === state.quoteData.rollerBlindItems.length - 1) && (!item.width && !item.height);
                
                if (lfSelectedRowIndexes.has(index)) {
                    cell.classList.add('lf-selection-highlight');
                } else if (isMultiDeleteMode) {
                    if (isLastRowEmpty) cell.classList.add('selection-disabled');
                    else if (multiDeleteSelectedIndexes.has(index)) cell.classList.add('multi-selected-row');
                } else if (index === selectedRowIndex) {
                    cell.classList.add('selected-row-highlight');
                }
                break;
            case 'width':
                cell.textContent = item.width || '';
                if (activeCell && index === activeCell.rowIndex && activeCell.column === 'width') cell.classList.add('active-input-cell');
                break;
            case 'height':
                cell.textContent = item.height || '';
                if (activeCell && index === activeCell.rowIndex && activeCell.column === 'height') cell.classList.add('active-input-cell');
                break;
            case 'TYPE':
                cell.textContent = (item.width || item.height) ? (item.fabricType || '') : '';
                if (item.fabricType === 'BO1') cell.classList.add('type-bo1');
                else if (item.fabricType === 'SN') cell.classList.add('type-sn');
                if (activeCell && index === activeCell.rowIndex && activeCell.column === 'TYPE') cell.classList.add('active-input-cell');
                break;
            case 'Price':
                cell.textContent = item.linePrice ? item.linePrice.toFixed(2) : '';
                cell.classList.add('price-cell');
                break;
            case 'location':
            case 'fabric':
            case 'color':
                cell.textContent = item[key] || '';
                break;
            case 'over':
            case 'oi':
            case 'lr':
                cell.textContent = item[key] || '';
                break;
            case 'fabricTypeDisplay':
                cell.textContent = item.fabricType || '';
                if (item.fabricType === 'BO1') cell.classList.add('type-bo1');
                else if (item.fabricType === 'SN') cell.classList.add('type-sn');
                break;
        }
    }
}