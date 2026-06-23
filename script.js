document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    // 1. Check for saved theme in localStorage
    const savedTheme = localStorage.getItem('weatherAppTheme');

    // 2. Apply saved theme or default to light
    if (savedTheme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
    } else {
        htmlElement.setAttribute('data-theme', 'light');
    }

    // 3. Handle toggle click event
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        let newTheme = 'light';

        if (currentTheme === 'light') {
            newTheme = 'dark';
        }

        // Apply new theme to DOM
        htmlElement.setAttribute('data-theme', newTheme);
        
        // Persist preference to localStorage
        localStorage.setItem('weatherAppTheme', newTheme);
    });
});