/**
 * main.js — App entry point
 * Initializes the Habit Intelligence Dashboard
 */
import { initUI } from './ui.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initUI();
    } catch (err) {
        console.error('HabitIQ initialization error:', err);
        const body = document.querySelector('.main-content') || document.body;
        const errDiv = document.createElement('div');
        errDiv.style.cssText = 'padding:40px;color:#ef4444;font-family:monospace;';
        errDiv.textContent = `Failed to initialize: ${err.message}`;
        body.prepend(errDiv);
    }
});
