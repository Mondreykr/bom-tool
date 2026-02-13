import { init as initFlatBom } from './ui/flat-bom.js';
import { init as initComparison } from './ui/comparison.js';
import { init as initHierarchy } from './ui/hierarchy.js';
import { init as initIfpMerge } from './ui/ifp-merge.js';

// Initialize UI modules after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUI);
} else {
    initializeUI();
}

function initializeUI() {
    initFlatBom();
    initComparison();
    initHierarchy();
    initIfpMerge();

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Update button states
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show target tab content
            tabContents.forEach(content => {
                if (content.id === targetTab + 'Tab') {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
}
