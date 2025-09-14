// File: 04-core-code/config/initial-state.js

/**
 * @fileoverview Defines the initial state of the application.
 * This structure serves as the default blueprint for the entire app's data.
 */

export const initialState = {
    ui: {
        // --- SPA View Management ---
        currentView: 'QUICK_QUOTE', 
        visibleColumns: ['sequence', 'width', 'height', 'TYPE', 'Price'],
        activeTabId: 'k1-tab', // Tracks the active tab in the left panel

        // --- Input & Selection State ---
        inputValue: '',
        inputMode: 'width',
        isEditing: false,
        activeCell: { rowIndex: 0, column: 'width' },
        selectedRowIndex: null,
    },
    quoteData: {
        // 核心項目列表
        rollerBlindItems: [
            { 
                itemId: `item-${Date.now()}`, 
                // --- Phase 1 Fields ---
                width: null, 
                height: null, 
                fabricType: null, 
                linePrice: null,
                // --- Phase 2 Fields ---
                location: '',
                fabric: '',
                color: '',
                over: '',
                oi: '',
                lr: '',
                sd: '',
                chain: null,
                winder: '',
                motor: ''
            }
        ],
        // 報價單元數據 (未來擴充用)
        quoteId: null,
        issueDate: null,
        dueDate: null,
        status: "Configuring",
        customer: { 
            name: "",
            address: "",
            phone: "",
            email: ""
        },
        // 總價總結
        summary: { 
            totalSum: null
        }
    }
};