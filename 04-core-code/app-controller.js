// File: 04-core-code/app-controller.js

import { initialState } from './config/initial-state.js';
import { DetailConfigView } from './ui/views/detail-config-view.js';

const AUTOSAVE_STORAGE_KEY = 'quoteAutoSaveData';
const AUTOSAVE_INTERVAL_MS = 60000;

export class AppController {
    constructor({ eventAggregator, uiService, quoteService, fileService, quickQuoteView, detailConfigView }) {
        this.eventAggregator = eventAggregator;
        this.uiService = uiService;
        this.quoteService = quoteService;
        this.fileService = fileService;
        
        this.quickQuoteView = quickQuoteView;
        this.detailConfigView = detailConfigView;

        this.autoSaveTimerId = null;
        console.log("AppController (Refactored as View Manager) Initialized.");
        this.initialize();
    }

    initialize() {
        const delegateToView = (handlerName, requiresInitialState = false) => (data) => {
            const currentView = this.uiService.getState().currentView;
            
            if (currentView === 'QUICK_QUOTE' && this.quickQuoteView && typeof this.quickQuoteView[handlerName] === 'function') {
                const args = requiresInitialState ? [initialState.ui] : [data];
                this.quickQuoteView[handlerName](...args);
            } else if (currentView === 'DETAIL_CONFIG' && this.detailConfigView && typeof this.detailConfigView[handlerName] === 'function') {
                this.detailConfigView[handlerName](data);
            }
        };

        // Quick Quote View Events
        this.eventAggregator.subscribe('numericKeyPressed', delegateToView('handleNumericKeyPress'));
        this.eventAggregator.subscribe('tableCellClicked', delegateToView('handleTableCellClick'));
        this.eventAggregator.subscribe('sequenceCellClicked', delegateToView('handleSequenceCellClick'));
        this.eventAggregator.subscribe('userRequestedInsertRow', delegateToView('handleInsertRow'));
        this.eventAggregator.subscribe('userRequestedDeleteRow', delegateToView('handleDeleteRow'));
        this.eventAggregator.subscribe('userRequestedSave', delegateToView('handleSaveToFile'));
        this.eventAggregator.subscribe('userRequestedExportCSV', delegateToView('handleExportCSV'));
        this.eventAggregator.subscribe('userRequestedReset', delegateToView('handleReset', true));
        this.eventAggregator.subscribe('userRequestedClearRow', delegateToView('handleClearRow'));
        this.eventAggregator.subscribe('userMovedActiveCell', delegateToView('handleMoveActiveCell'));
        this.eventAggregator.subscribe('userRequestedCycleType', delegateToView('handleCycleType'));
        this.eventAggregator.subscribe('userRequestedCalculateAndSum', delegateToView('handleCalculateAndSum'));
        this.eventAggregator.subscribe('userRequestedMultiDeleteMode', delegateToView('handleToggleMultiDeleteMode'));
        this.eventAggregator.subscribe('userChoseSaveThenLoad', delegateToView('handleSaveThenLoad'));

        // Detail Config View Events
        this.eventAggregator.subscribe('userRequestedFocusMode', delegateToView('handleFocusModeRequest'));
        this.eventAggregator.subscribe('panelInputEnterPressed', delegateToView('handlePanelInputEnter'));
        this.eventAggregator.subscribe('panelInputBlurred', delegateToView('handlePanelInputBlur'));
        this.eventAggregator.subscribe('editableCellBlurred', delegateToView('_handleCellInputBlur'));
        this.eventAggregator.subscribe('editableCellEnterPressed', delegateToView('_handleCellInputEnter'));
        this.eventAggregator.subscribe('locationInputEnterPressed', delegateToView('handleLocationInputEnter'));
        this.eventAggregator.subscribe('userRequestedLFEditMode', delegateToView('handleLFEditRequest'));
        this.eventAggregator.subscribe('userRequestedLFDeleteMode', delegateToView('handleLFDeleteRequest'));
        this.eventAggregator.subscribe('userToggledK3EditMode', delegateToView('handleToggleK3EditMode'));
        this.eventAggregator.subscribe('userRequestedBatchCycle', delegateToView('handleBatchCycle'));


        // Global App-Level Events
        this.eventAggregator.subscribe('userNavigatedToDetailView', () => this._handleNavigationToDetailView());
        this.eventAggregator.subscribe('userNavigatedToQuickQuoteView', () => this._handleNavigationToQuickQuoteView());
        this.eventAggregator.subscribe('userSwitchedTab', (data) => this._handleTabSwitch(data));
        this.eventAggregator.subscribe('userRequestedLoad', () => this._handleUserRequestedLoad());
        this.eventAggregator.subscribe('userChoseLoadDirectly', () => this._handleLoadDirectly());
        this.eventAggregator.subscribe('fileLoaded', (data) => this._handleFileLoad(data));
        
        this._startAutoSave();
    }
    
    _handleNavigationToDetailView() {
        const currentView = this.uiService.getState().currentView;
        if (currentView === 'QUICK_QUOTE') {
            this.uiService.setCurrentView('DETAIL_CONFIG');
            if (this.detailConfigView) {
                this.detailConfigView.initializePanelState();
            }
            this._handleTabSwitch({ tabId: 'k1-tab' });
        } else {
            this.uiService.setCurrentView('QUICK_QUOTE');
            this.uiService.setVisibleColumns(initialState.ui.visibleColumns);
            this._publishStateChange();
        }
    }

    _handleNavigationToQuickQuoteView() {
        this.uiService.setCurrentView('QUICK_QUOTE');
        this.uiService.setVisibleColumns(initialState.ui.visibleColumns);
        this._publishStateChange();
    }

    _handleTabSwitch({ tabId }) {
        const TAB_COLUMN_MAP = {
            'k1-tab': ['sequence', 'fabricTypeDisplay', 'location'],
            'k2-tab': ['sequence', 'fabricTypeDisplay', 'fabric', 'color'],
            'k3-tab': ['sequence', 'fabricTypeDisplay', 'location', 'over', 'oi', 'lr'],
            'k4-tab': ['sequence', 'fabricTypeDisplay', 'location', 'oi', 'lr'],
            'k5-tab': ['sequence', 'fabricTypeDisplay'],
        };

        const newColumns = TAB_COLUMN_MAP[tabId];

        if (newColumns) {
            this.uiService.setActiveTab(tabId);
            this.uiService.setVisibleColumns(newColumns);
            this._publishStateChange();
        }
    }

    _handleUserRequestedLoad() {
        if (this.quoteService.hasData()) {
            this.eventAggregator.publish('showLoadConfirmationDialog');
        } else {
            this.eventAggregator.publish('triggerFileLoad');
        }
    }

    _handleLoadDirectly() {
        this.eventAggregator.publish('triggerFileLoad');
    }

    _handleFileLoad({ fileName, content }) {
        const result = this.fileService.parseFileContent(fileName, content);
        if (result.success) {
            this.quoteService.quoteData = result.data;
            this.uiService.reset(initialState.ui);
            this.uiService.setSumOutdated(true);
            this._publishStateChange();
            this.eventAggregator.publish('showNotification', { message: result.message });
        } else {
            this.eventAggregator.publish('showNotification', { message: result.message, type: 'error' });
        }
    }
    
    _getFullState() {
        return {
            ui: this.uiService.getState(),
            quoteData: this.quoteService.getQuoteData()
        };
    }
    
    publishInitialState() { this._publishStateChange(); }
    _publishStateChange() {
        this.eventAggregator.publish('stateChanged', this._getFullState());
    }

    _startAutoSave() {
        if (this.autoSaveTimerId) { clearInterval(this.autoSaveTimerId); }
        this.autoSaveTimerId = setInterval(() => this._handleAutoSave(), AUTOSAVE_INTERVAL_MS);
    }

    _handleAutoSave() {
        try {
            const items = this.quoteService.getItems();
            const hasContent = items.length > 1 || (items.length === 1 && (items[0].width || items[0].height));
            if (hasContent) {
                const dataToSave = JSON.stringify(this.quoteService.getQuoteData());
                localStorage.setItem(AUTOSAVE_STORAGE_KEY, dataToSave);
            }
        } catch (error) {
            console.error('Auto-save failed:', error);
        }
    }
}