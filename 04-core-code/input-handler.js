// File: 04-core-code/input-handler.js

export class InputHandler {
    constructor(eventAggregator) {
        this.eventAggregator = eventAggregator;
    }

    initialize() {
        this._setupNumericKeyboard();
        this._setupTableInteraction();
        this._setupFunctionKeys();
        this._setupPanelToggles();
        this._setupFileLoader();
        this._setupPhysicalKeyboard();
        this._setupNavigation();
        this._setupLeftPanelInputs();
    }
    
    _setupNavigation() {
        const leftPanelToggle = document.getElementById('left-panel-toggle');
        if (leftPanelToggle) {
            leftPanelToggle.addEventListener('click', () => {
                this.eventAggregator.publish('userNavigatedToDetailView');
            });
        }
    }

    _setupLeftPanelInputs() {
        const tabContainer = document.querySelector('.tab-container');
        if (tabContainer) {
            tabContainer.addEventListener('click', (event) => {
                const target = event.target.closest('.tab-button');
                if (target && !target.disabled) {
                    this.eventAggregator.publish('userSwitchedTab', { tabId: target.id });
                }
            });
        }

        const locationButton = document.getElementById('btn-focus-location');
        if (locationButton) {
            locationButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedFocusMode', { column: 'location' });
            });
        }
        
        const fabricButton = document.getElementById('btn-focus-fabric');
        if (fabricButton) {
            fabricButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedFocusMode', { column: 'fabric' });
            });
        }
        const lfButton = document.getElementById('btn-light-filter');
        if (lfButton) {
            lfButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedLFEditMode');
            });
        }
        const lfDelButton = document.getElementById('btn-lf-del');
        if (lfDelButton) {
            lfDelButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedLFDeleteMode');
            });
        }

        const editButton = document.getElementById('btn-k3-edit');
        if (editButton) {
            editButton.addEventListener('click', () => {
                this.eventAggregator.publish('userToggledK3EditMode');
            });
        }

        const setupBatchCycleButton = (buttonId, column) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.eventAggregator.publish('userRequestedBatchCycle', { column });
                });
            }
        };
        setupBatchCycleButton('btn-batch-cycle-over', 'over');
        setupBatchCycleButton('btn-batch-cycle-oi', 'oi');
        setupBatchCycleButton('btn-batch-cycle-lr', 'lr');


        const returnButton = document.getElementById('btn-return-form1');
        if (returnButton) {
            returnButton.addEventListener('click', () => {
                this.eventAggregator.publish('userNavigatedToQuickQuoteView');
            });
        }

        const batchTable = document.getElementById('fabric-batch-table');
        if (batchTable) {
            batchTable.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.matches('.panel-input')) {
                    event.preventDefault();
                    const input = event.target;
                    this.eventAggregator.publish('panelInputEnterPressed', {
                        type: input.dataset.type,
                        field: input.dataset.field,
                        value: input.value
                    });
                }
            });

            batchTable.addEventListener('blur', (event) => {
                if (event.target.matches('.panel-input')) {
                    this.eventAggregator.publish('panelInputBlurred', {
                        type: event.target.dataset.type,
                        field: event.target.dataset.field,
                        value: event.target.value
                    });
                }
            }, true);
        }

        const locationInput = document.getElementById('location-input-box');
        if (locationInput) {
            locationInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.eventAggregator.publish('locationInputEnterPressed', {
                        value: event.target.value
                    });
                }
            });
        }
    }

    _setupPhysicalKeyboard() {
        window.addEventListener('keydown', (event) => {
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }
            
            let keyToPublish = null;
            let eventToPublish = 'numericKeyPressed';
            const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
            if (arrowKeys.includes(event.key)) {
                event.preventDefault();
                const direction = event.key.replace('Arrow', '').toLowerCase();
                this.eventAggregator.publish('userMovedActiveCell', { direction });
                return;
            }
            if (event.key >= '0' && event.key <= '9') {
                keyToPublish = event.key;
            } 
            else {
                switch (event.key.toLowerCase()) {
                    case 'w': keyToPublish = 'W'; break;
                    case 'h': keyToPublish = 'H'; break;
                    case 't': this.eventAggregator.publish('userRequestedCycleType'); return;
                    case '$': this.eventAggregator.publish('userRequestedCalculateAndSum'); return;
                    case 'enter': keyToPublish = 'ENT'; event.preventDefault(); break;
                    case 'backspace': keyToPublish = 'DEL'; event.preventDefault(); break;
                    case 'delete': eventToPublish = 'userRequestedClearRow'; break;
                }
            }
            if (keyToPublish !== null) {
                this.eventAggregator.publish(eventToPublish, { key: keyToPublish });
            } else if (eventToPublish === 'userRequestedClearRow') {
                this.eventAggregator.publish(eventToPublish);
            }
        });
    }

    _setupFileLoader() {
        const fileLoader = document.getElementById('file-loader');
        if (fileLoader) {
            fileLoader.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (!file) { return; }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    this.eventAggregator.publish('fileLoaded', { fileName: file.name, content: content });
                };
                reader.onerror = () => {
                    this.eventAggregator.publish('showNotification', { message: `Error reading file: ${reader.error}`, type: 'error' });
                };
                reader.readAsText(file);
                event.target.value = '';
            });
        }
        this.eventAggregator.subscribe('triggerFileLoad', () => {
            if (fileLoader) {
                fileLoader.click();
            }
        });
    }
    
    _setupPanelToggles() {
        const numericToggle = document.getElementById('panel-toggle');
        if (numericToggle) {
            numericToggle.addEventListener('click', () => {
                this.eventAggregator.publish('userToggledNumericKeyboard');
            });
        }
    }

    _setupFunctionKeys() {
        const setupButton = (id, eventName) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => {
                    this.eventAggregator.publish(eventName);
                });
            }
        };

        setupButton('key-insert', 'userRequestedInsertRow');
        setupButton('key-delete', 'userRequestedDeleteRow');
        setupButton('key-save', 'userRequestedSave');
        setupButton('key-export', 'userRequestedExportCSV');
        setupButton('key-reset', 'userRequestedReset');
        setupButton('key-f5', 'userRequestedMultiDeleteMode');

        const loadButton = document.getElementById('key-load');
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                this.eventAggregator.publish('userRequestedLoad');
            });
        }
    }
    
    _setupNumericKeyboard() {
        const keyboard = document.getElementById('numeric-keyboard');
        if (!keyboard) return;

        const addButtonListener = (id, eventName, data = {}) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', () => {
                    this.eventAggregator.publish(eventName, data);
                });
            }
        };

        addButtonListener('key-7', 'numericKeyPressed', { key: '7' });
        addButtonListener('key-8', 'numericKeyPressed', { key: '8' });
        addButtonListener('key-9', 'numericKeyPressed', { key: '9' });
        addButtonListener('key-4', 'numericKeyPressed', { key: '4' });
        addButtonListener('key-5', 'numericKeyPressed', { key: '5' });
        addButtonListener('key-6', 'numericKeyPressed', { key: '6' });
        addButtonListener('key-1', 'numericKeyPressed', { key: '1' });
        addButtonListener('key-2', 'numericKeyPressed', { key: '2' });
        addButtonListener('key-3', 'numericKeyPressed', { key: '3' });
        addButtonListener('key-0', 'numericKeyPressed', { key: '0' });
        addButtonListener('key-del', 'numericKeyPressed', { key: 'DEL' });
        addButtonListener('key-enter', 'numericKeyPressed', { key: 'ENT' });

        addButtonListener('key-w', 'numericKeyPressed', { key: 'W' });
        addButtonListener('key-h', 'numericKeyPressed', { key: 'H' });
        
        addButtonListener('key-type', 'userRequestedCycleType');

        addButtonListener('key-clear', 'userRequestedClearRow');
        addButtonListener('key-price', 'userRequestedCalculateAndSum');
    }

    _setupTableInteraction() {
        const table = document.getElementById('results-table');
        if (table) {
            table.addEventListener('click', (event) => {
                const target = event.target;
                if (target.tagName === 'TD') {
                    const column = target.dataset.column;
                    const rowIndex = target.parentElement.dataset.rowIndex;
                    if (column && rowIndex) {
                         const eventData = { rowIndex: parseInt(rowIndex, 10), column };
                        if (column === 'sequence') {
                            this.eventAggregator.publish('sequenceCellClicked', eventData);
                        } else {
                            this.eventAggregator.publish('tableCellClicked', eventData);
                        }
                    }
                }
            });

            table.addEventListener('blur', (event) => {
                if (event.target.matches('.editable-cell-input')) {
                    const input = event.target;
                    this.eventAggregator.publish('editableCellBlurred', {
                        rowIndex: parseInt(input.dataset.rowIndex, 10),
                        column: input.dataset.column,
                        value: input.value
                    });
                }
            }, true);

            table.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.matches('.editable-cell-input')) {
                    event.preventDefault();
                    const input = event.target;
                    this.eventAggregator.publish('editableCellEnterPressed', {
                        rowIndex: parseInt(input.dataset.rowIndex, 10),
                        column: input.dataset.column,
                        value: input.value
                    });
                }
            }, true);
        }
    }
}