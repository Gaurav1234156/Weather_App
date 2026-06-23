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

    // --- Mobile Navigation Toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const appNav = document.getElementById('app-nav');

    mobileMenuBtn.addEventListener('click', () => {
        appNav.classList.toggle('nav-open');
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

    // --- 3. UI Elements & Autocomplete ---
    const searchForm = document.getElementById('search-form');
    const cityInput = document.getElementById('city-input');
    const searchBtn = document.getElementById('search-btn');
    const clearBtn = document.getElementById('clear-btn');
    const appResetBtn = document.getElementById('app-reset-btn');
    const suggestionsList = document.getElementById('suggestions-list');
    const loadingSpinner = document.getElementById('loading-spinner');
    const errorMessage = document.getElementById('error-message');
    
    const currentWeatherSection = document.getElementById('current-weather-section');
    const forecastSection = document.getElementById('forecast-section');
    const insightsSection = document.getElementById('insights-section');

    let debounceTimer;

    // Handle typing and fetch suggestions
    cityInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (query.length > 0) {
            clearBtn.classList.remove('hidden');
        } else {
            clearBtn.classList.add('hidden');
            suggestionsList.classList.add('hidden');
            return;
        }

        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
            if (query.length < 2) {
                suggestionsList.classList.add('hidden');
                return; 
            }

            try {
                const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
                const response = await fetch(geoUrl);
                const data = await response.json();

                suggestionsList.innerHTML = ''; 

                if (data.results && data.results.length > 0) {
                    data.results.forEach(city => {
                        const li = document.createElement('li');
                        const state = city.admin1 ? `${city.admin1}, ` : '';
                        
                        li.innerHTML = `
                            <span class="suggestion-name">${city.name}</span>
                            <span class="suggestion-details">${state}${city.country}</span>
                        `;
                        
                        li.addEventListener('click', () => {
                            const fullDisplayName = `${city.name}, ${city.country}`;
                            cityInput.value = fullDisplayName; 
                            suggestionsList.classList.add('hidden'); 
                            
                            // Send EXACT coordinates
                            fetchAndRenderWeather({
                                latitude: city.latitude,
                                longitude: city.longitude,
                                name: city.name,
                                country: city.country,
                                displayString: fullDisplayName
                            }); 
                        });
                        
                        suggestionsList.appendChild(li);
                    });
                    suggestionsList.classList.remove('hidden'); 
                } else {
                    suggestionsList.classList.add('hidden'); 
                }
            } catch (error) {
                console.error("Error fetching suggestions:", error);
            }
        }, 300); 
    });

    document.addEventListener('click', (e) => {
        if (!searchForm.contains(e.target)) {
            suggestionsList.classList.add('hidden');
        }
    });

    clearBtn.addEventListener('click', () => {
        cityInput.value = '';
        clearBtn.classList.add('hidden');
        suggestionsList.classList.add('hidden');
        cityInput.focus();
    });

    appResetBtn.addEventListener('click', () => {
        // Clear all storage keys to ensure a hard reset
        localStorage.removeItem('weatherAppLastLocation');
        localStorage.removeItem('weatherAppLastCity'); 
        
        cityInput.value = '';
        clearBtn.classList.add('hidden');
        appResetBtn.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        if (currentWeatherSection) currentWeatherSection.classList.add('hidden');
        if (forecastSection) forecastSection.classList.add('hidden');
        if (insightsSection) insightsSection.classList.add('hidden');
    });

    const toggleInteractiveStates = (isLoading) => {
        searchBtn.disabled = isLoading;
        cityInput.disabled = isLoading;
        if (isLoading) {
            loadingSpinner.classList.remove('hidden');
            errorMessage.classList.add('hidden');
        } else {
            loadingSpinner.classList.add('hidden');
        }
    };

    const fetchAndRenderWeather = async (locationData) => {
        toggleInteractiveStates(true);
        
        if (currentWeatherSection) currentWeatherSection.classList.add('hidden');
        if (forecastSection) forecastSection.classList.add('hidden');
        if (insightsSection) insightsSection.classList.add('hidden');

        try {
            let latitude, longitude, name, country, savedString;

            // 1. Determine how to get the coordinates
            if (typeof locationData === 'string') {
                // If they manually hit enter, grab only the first word before a comma to prevent API crashes
                const safeQuery = locationData.split(',')[0].trim();
                
                const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(safeQuery)}&count=1&language=en&format=json`;
                const geoResponse = await fetch(geoUrl);
                const geoData = await geoResponse.json();

                if (!geoData.results || geoData.results.length === 0) {
                    throw new Error(`City "${locationData}" not found. Please check your spelling.`);
                }

                latitude = geoData.results[0].latitude;
                longitude = geoData.results[0].longitude;
                name = geoData.results[0].name;
                country = geoData.results[0].country;
                savedString = `${name}, ${country}`; // Format it nicely
            } else {
                // Data from autocomplete click OR localStorage JSON
                latitude = locationData.latitude;
                longitude = locationData.longitude;
                name = locationData.name;
                country = locationData.country;
                savedString = locationData.displayString;
            }

            // 2. Fetch the weather
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,surface_pressure,wind_speed_10m,is_day&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
            const weatherResponse = await fetch(weatherUrl);
            
            if (!weatherResponse.ok) throw new Error('Failed to retrieve weather data.');

            const weatherData = await weatherResponse.json();
            const current = weatherData.current;

            // Render Current Weather
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
            tempUnitEl.className = 'temp-unit';
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

            currentWeatherSection.classList.remove('hidden');
            forecastSection.classList.remove('hidden');
            insightsSection.classList.remove('hidden');
            appResetBtn.classList.remove('hidden');
            
            // FIXED: Store the exact object data to prevent geocoding issues on page refresh
            const locationToSave = { latitude, longitude, name, country, displayString: savedString };
            localStorage.setItem('weatherAppLastLocation', JSON.stringify(locationToSave));
            
            cityInput.value = savedString;
            clearBtn.classList.remove('hidden'); 

        } catch (error) {
            console.error(error);
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        } finally {
            toggleInteractiveStates(false);
        }
    };

    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (city) {
            suggestionsList.classList.add('hidden'); 
            fetchAndRenderWeather(city); 
        }
    });

    // FIXED: Load the robust JSON object on refresh
    const lastLocationJSON = localStorage.getItem('weatherAppLastLocation');
    if (lastLocationJSON) {
        try {
            const parsedLocation = JSON.parse(lastLocationJSON);
            fetchAndRenderWeather(parsedLocation);
        } catch (e) {
            // Failsafe in case JSON is corrupted
            console.error("Could not parse saved location.");
        }
    } else {
        // Fallback for anyone who still has the old string version saved on their browser
        const oldLastCity = localStorage.getItem('weatherAppLastCity');
        if (oldLastCity) {
            fetchAndRenderWeather(oldLastCity);
        }
    }
});