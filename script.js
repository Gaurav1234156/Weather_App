document.addEventListener('DOMContentLoaded', () => {
    // --- Theme Management (Milestone 1) ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;

    const savedTheme = localStorage.getItem('weatherAppTheme');
    if (savedTheme === 'dark') {
        htmlElement.setAttribute('data-theme', 'dark');
    } else {
        htmlElement.setAttribute('data-theme', 'light');
    }

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('weatherAppTheme', newTheme);
    });

    // --- Search & API Integration (Milestone 2) ---
    const searchForm = document.getElementById('search-form');
    const cityInput = document.getElementById('city-input');
    const clearBtn = document.getElementById('clear-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');

    // Show/hide clear button based on input value
    cityInput.addEventListener('input', () => {
        if (cityInput.value.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    });

    // Clear input when 'X' is clicked
    clearBtn.addEventListener('click', () => {
        cityInput.value = '';
        clearBtn.classList.add('hidden');
        cityInput.focus();
    });

    // Handle form submission
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const city = cityInput.value.trim();
        if (!city) return;

        // Reset UI states
        errorMessage.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');

        try {
            // Step 1: Geocoding API - Resolve City Name to Coordinates
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
            const geoResponse = await fetch(geoUrl);
            const geoData = await geoResponse.json();

            // Validate if city was found
            if (!geoData.results || geoData.results.length === 0) {
                throw new Error(`City "${city}" not found. Please check your spelling.`);
            }

            const location = geoData.results[0];
            const { latitude, longitude, name, country } = location;
            
            console.log(`Resolved Location: ${name}, ${country} (Lat: ${latitude}, Lon: ${longitude})`);

            // Step 2: Forecast API - Fetch Weather Data using Coordinates
            // We request current, hourly, and daily data needed for upcoming milestones
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
            
            const weatherResponse = await fetch(weatherUrl);
            
            if (!weatherResponse.ok) {
                throw new Error('Failed to retrieve weather data from the server.');
            }

            const weatherData = await weatherResponse.json();

            // Deliverable Met: Log the data to the console
            console.log('Weather Data Successfully Retrieved:', weatherData);
            
            // In future milestones, we will pass this data to UI rendering functions here

        } catch (error) {
            // Handle and display errors
            console.error(error);
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        } finally {
            // Always hide the loading spinner when the fetch is complete
            loadingSpinner.classList.add('hidden');
        }
    });
});