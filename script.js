document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Theme Management ---
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

    // --- 2. Helper Functions ---
    const formatCurrentDate = () => {
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        return new Date().toLocaleDateString('en-US', options);
    };

    const getWeatherDetails = (code, isDay) => {
        const isNight = isDay === 0;
        const weatherMap = {
            0: { label: 'Clear Sky', icon: isNight ? '🌙' : '☀️' },
            1: { label: 'Mainly Clear', icon: isNight ? '🌙' : '🌤️' },
            2: { label: 'Partly Cloudy', icon: isNight ? '☁️' : '⛅' },
            3: { label: 'Overcast', icon: '☁️' },
            45: { label: 'Fog', icon: '🌫️' },
            48: { label: 'Depositing Rime Fog', icon: '🌫️' },
            51: { label: 'Light Drizzle', icon: '🌦️' },
            53: { label: 'Moderate Drizzle', icon: '🌦️' },
            55: { label: 'Dense Drizzle', icon: '🌧️' },
            61: { label: 'Light Rain', icon: '🌧️' },
            63: { label: 'Moderate Rain', icon: '🌧️' },
            65: { label: 'Heavy Rain', icon: '🌧️' },
            71: { label: 'Light Snow', icon: '🌨️' },
            73: { label: 'Moderate Snow', icon: '❄️' },
            75: { label: 'Heavy Snow', icon: '❄️' },
            95: { label: 'Thunderstorm', icon: '⛈️' }
        };
        return weatherMap[code] || { label: 'Unknown Condition', icon: '❓' };
    };

    // --- 3. Search, UI Elements & Persistence ---
    const searchForm = document.getElementById('search-form');
    const cityInput = document.getElementById('city-input');
    const clearBtn = document.getElementById('clear-btn');
    const appResetBtn = document.getElementById('app-reset-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    
    const currentWeatherSection = document.getElementById('current-weather-section');
    const forecastSection = document.getElementById('forecast-section');
    const insightsSection = document.getElementById('insights-section');

    // Input handlers
    cityInput.addEventListener('input', () => {
        if (cityInput.value.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
        }
    });

    clearBtn.addEventListener('click', () => {
        cityInput.value = '';
        clearBtn.classList.add('hidden');
        cityInput.focus();
    });

    // Milestone 5: App Reset Handler
    appResetBtn.addEventListener('click', () => {
        localStorage.removeItem('weatherAppLastCity'); // Clear storage
        
        // Reset UI to default empty state
        cityInput.value = '';
        clearBtn.classList.add('hidden');
        appResetBtn.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        if (currentWeatherSection) currentWeatherSection.classList.add('hidden');
        if (forecastSection) forecastSection.classList.add('hidden');
        if (insightsSection) insightsSection.classList.add('hidden');
    });

    // Core Fetch Function (Refactored for reuse)
    const fetchAndRenderWeather = async (city) => {
        errorMessage.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
        
        if (currentWeatherSection) currentWeatherSection.classList.add('hidden');
        if (forecastSection) forecastSection.classList.add('hidden');
        if (insightsSection) insightsSection.classList.add('hidden');

        try {
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
            const geoResponse = await fetch(geoUrl);
            const geoData = await geoResponse.json();

            if (!geoData.results || geoData.results.length === 0) {
                throw new Error(`City "${city}" not found. Please check your spelling.`);
            }

            const { latitude, longitude, name, country } = geoData.results[0];

            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure,wind_speed_10m,is_day&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
            const weatherResponse = await fetch(weatherUrl);
            
            if (!weatherResponse.ok) throw new Error('Failed to retrieve weather data.');

            const weatherData = await weatherResponse.json();

            // Render Current Weather
            const current = weatherData.current;
            document.getElementById('cw-location').textContent = `${name}, ${country}`;
            document.getElementById('cw-date').textContent = formatCurrentDate();
            
            const tempValue = Math.round(current.temperature_2m);
            document.getElementById('cw-temp').textContent = tempValue;
            
            const currentDetails = getWeatherDetails(current.weather_code, current.is_day);
            document.getElementById('cw-icon').textContent = currentDetails.icon;
            document.getElementById('cw-condition').textContent = currentDetails.label;
            
            document.getElementById('cw-humidity').textContent = `${current.relative_humidity_2m}%`;
            document.getElementById('cw-wind').textContent = `${current.wind_speed_10m} km/h`;
            document.getElementById('cw-pressure').textContent = `${current.surface_pressure} hPa`;

            const tempUnitEl = document.getElementById('cw-temp-unit');
            tempUnitEl.classList.remove('temp-hot', 'temp-cold', 'temp-mild');
            if (tempValue >= 25) {
                tempUnitEl.classList.add('temp-hot');
            } else if (tempValue <= 10) {
                tempUnitEl.classList.add('temp-cold');
            } else {
                tempUnitEl.classList.add('temp-mild');
            }

            // Render 5-Day Forecast
            const forecastContainer = document.getElementById('forecast-container');
            forecastContainer.innerHTML = ''; 

            for(let i = 0; i < 5; i++) {
                const dateStr = weatherData.daily.time[i];
                const dateObj = new Date(dateStr + "T00:00:00"); 
                const isToday = i === 0;
                const dayName = isToday ? 'TODAY' : dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                
                const maxTemp = Math.round(weatherData.daily.temperature_2m_max[i]);
                const minTemp = Math.round(weatherData.daily.temperature_2m_min[i]);
                const code = weatherData.daily.weather_code[i];
                const details = getWeatherDetails(code, 1);

                const cardHTML = `
                    <div class="forecast-card ${isToday ? 'today-card' : ''}">
                        <span class="forecast-day">${dayName}</span>
                        <span class="forecast-icon">${details.icon}</span>
                        <div class="forecast-temps">
                            <span class="temp-high">${maxTemp}°</span>
                            <span class="temp-low">${minTemp}°</span>
                        </div>
                    </div>
                `;
                forecastContainer.insertAdjacentHTML('beforeend', cardHTML);
            }

            // Render Hourly Insights
            const hourlyContainer = document.getElementById('hourly-container');
            hourlyContainer.innerHTML = '';

            const now = new Date();
            const currentHourStr = now.getFullYear() + "-" +
                String(now.getMonth() + 1).padStart(2, '0') + "-" +
                String(now.getDate()).padStart(2, '0') + "T" +
                String(now.getHours()).padStart(2, '0') + ":00";
            
            let startIndex = weatherData.hourly.time.indexOf(currentHourStr);
            if (startIndex === -1) startIndex = 0; 

            for(let i = 0; i < 6; i++) {
                const index = startIndex + i;
                if (index >= weatherData.hourly.time.length) break;

                const timeStr = weatherData.hourly.time[index];
                const temp = Math.round(weatherData.hourly.temperature_2m[index]);
                const code = weatherData.hourly.weather_code[index];
                
                const hourNum = new Date(timeStr).getHours();
                const isHourDay = (hourNum >= 6 && hourNum <= 18) ? 1 : 0;
                
                const details = getWeatherDetails(code, isHourDay);
                const timeLabel = new Date(timeStr).toLocaleTimeString('en-US', { hour: '2-digit', minute:'2-digit', hour12: false });

                const rowHTML = `
                    <div class="hourly-row">
                        <span class="hourly-time">${timeLabel}</span>
                        <div class="hourly-condition">
                            <span class="hourly-icon">${details.icon}</span>
                            <span>${details.label}</span>
                        </div>
                        <span class="hourly-temp">${temp}°C</span>
                    </div>
                `;
                hourlyContainer.insertAdjacentHTML('beforeend', rowHTML);
            }

            // Reveal sections & update input/storage
            currentWeatherSection.classList.remove('hidden');
            forecastSection.classList.remove('hidden');
            insightsSection.classList.remove('hidden');
            appResetBtn.classList.remove('hidden'); // Show reset button

            // Milestone 5: Save to localStorage upon successful load
            localStorage.setItem('weatherAppLastCity', city);
            cityInput.value = city; // Populate input box with current city

        } catch (error) {
            console.error(error);
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    };

    // Form Submission Listener
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (city) {
            fetchAndRenderWeather(city);
        }
    });

    // --- Milestone 5: Auto-Load on Refresh ---
    const lastVisitedCity = localStorage.getItem('weatherAppLastCity');
    if (lastVisitedCity) {
        fetchAndRenderWeather(lastVisitedCity);
    }
});