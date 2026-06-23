document.addEventListener("DOMContentLoaded", () => {
    const themeToggleBtn = document.getElementById("theme-toggle");
    const htmlElement = document.documentElement;

    // 1. Check for saved user preference in localStorage
    const savedTheme = localStorage.getItem("weather-app-theme");
    
    if (savedTheme) {
        htmlElement.setAttribute("data-theme", savedTheme);
    } else {
        // Optional: Check system preference if no localStorage value exists
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (systemPrefersDark) {
            htmlElement.setAttribute("data-theme", "dark");
        }
    }

    // 2. Handle theme toggle click
    themeToggleBtn.addEventListener("click", () => {
        const currentTheme = htmlElement.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";
        
        // Update DOM
        htmlElement.setAttribute("data-theme", newTheme);
        
        // Persist to localStorage
        localStorage.setItem("weather-app-theme", newTheme);
    });
});