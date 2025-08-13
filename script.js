// Replace with your OpenWeatherMap API key
const WEATHER_API_KEY = 'Your_own_API_Key'; // Get a free API key from https://openweathermap.org/api

// Replace with your Gemini API key
const GEMINI_API_KEY = 'Your_own_API_key'; // Replace with your actual Gemini API key

// Emoji mapping based on weather conditions
const weatherEmojis = {
    Clear: '☀️',
    Clouds: '☁️',
    Rain: '🌧️',
    Drizzle: '🌦️',
    Thunderstorm: '⛈️',
    Snow: '❄️',
    Mist: '🌫️',
    Smoke: '🌫️',
    Haze: '🌫️',
    Dust: '🌫️',
    Fog: '🌫️',
    Sand: '🌫️',
    Ash: '🌫️',
    Squall: '💨',
    Tornado: '🌪️'
};

// Weather image mapping (for placeholders)
const weatherImages = {
    Clear: 'https://openweathermap.org/img/wn/01d@2x.png',
    Clouds: 'https://openweathermap.org/img/wn/02d@2x.png',
    Rain: 'https://openweathermap.org/img/wn/10d@2x.png',
    Drizzle: 'https://openweathermap.org/img/wn/09d@2x.png',
    Thunderstorm: 'https://openweathermap.org/img/wn/11d@2x.png',
    Snow: 'https://openweathermap.org/img/wn/13d@2x.png',
    Mist: 'https://openweathermap.org/img/wn/50d@2x.png',
    // Add more as needed
};

function getWeatherEmoji(condition) {
    return weatherEmojis[condition] || '🌍'; // Default emoji
}

function getWeatherImage(condition) {
    return weatherImages[condition] || 'https://openweathermap.org/img/wn/01d@2x.png'; // Default image
}

let currentWeatherData = null; // To store weather data globally

// Function to fetch weather data
async function getWeather(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Weather data not available');
        }
        const data = await response.json();
        currentWeatherData = data; // Store data
        updateWeather(data);
    } catch (error) {
        document.getElementById('error').textContent = 'Error fetching weather: ' + error.message;
    }
}

// Update DOM with weather data
function updateWeather(data) {
    const emoji = getWeatherEmoji(data.weather[0].main);
    document.getElementById('weather-emoji').textContent = emoji;
    document.getElementById('location').textContent = data.name + ', ' + data.sys.country;
    document.getElementById('temperature').textContent = Math.round(data.main.temp) + '°C';
    document.getElementById('description').textContent = data.weather[0].description;
    document.getElementById('details').innerHTML = `
        Humidity: ${data.main.humidity}%<br>
        Wind: ${data.wind.speed} m/s
    `;
    document.getElementById('error').textContent = '';
}

// Get current location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            getWeather(lat, lon);
        },
        (error) => {
            document.getElementById('error').textContent = 'Geolocation error: ' + error.message;
        }
    );
} else {
    document.getElementById('error').textContent = 'Geolocation is not supported by this browser.';
}

// Simple function to format Gemini response with basic Markdown and image support
function formatResponse(text) {
    // Replace image placeholders like [image: rainy] with <img> tags
    text = text.replace(/\[image: (.*?)\]/g, (match, condition) => {
        const imgUrl = getWeatherImage(condition.charAt(0).toUpperCase() + condition.slice(1));
        return `<img src="${imgUrl}" alt="${condition}" style="max-width: 100%; border-radius: 8px; margin-top: 5px; display: block;">`;
    });

    // Replace **bold** with <strong>bold</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace *italic* with <em>italic</em>
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Replace newlines with <br>
    text = text.replace(/\n/g, '<br>');
    return text;
}

// Chatbot Functionality
const chatIcon = document.getElementById('chat-icon');
const chatModal = document.getElementById('chat-modal');
const chatClose = document.getElementById('chat-close');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatBody = document.getElementById('chat-body');

// Open chat modal
chatIcon.addEventListener('click', () => {
    chatModal.style.display = 'flex';
});

// Close chat modal
chatClose.addEventListener('click', () => {
    chatModal.style.display = 'none';
});

// Send message
chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Append user message
    const userMsg = document.createElement('div');
    userMsg.classList.add('chat-message', 'user-message');
    userMsg.textContent = message;
    chatBody.appendChild(userMsg);

    // Clear input
    chatInput.value = '';

    // Scroll to bottom
    chatBody.scrollTop = chatBody.scrollHeight;

    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('chat-message', 'typing-indicator');
    chatBody.appendChild(typingIndicator);
    chatBody.scrollTop = chatBody.scrollHeight;

    // Prepare temperature details
    let temperatureDetails = 'unknown';
    if (currentWeatherData) {
        temperatureDetails = `${Math.round(currentWeatherData.main.temp)}°C in ${currentWeatherData.name}, ${currentWeatherData.sys.country}`;
    }

    // Tweaked prompt to instruct AI on image placeholders
    const prompt = `Based on the current temperature ${temperatureDetails} ${message}. If relevant to the weather or query, include a placeholder like [image: rainy] for visuals. Keep responses clean and elegant.`;

    try {
        // Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        const aiResponse = data.candidates[0].content.parts[0].text; // Extract the generated text

        // Remove typing indicator
        chatBody.removeChild(typingIndicator);

        // Append AI message with formatted content
        const aiMsg = document.createElement('div');
        aiMsg.classList.add('chat-message', 'ai-message');
        aiMsg.innerHTML = formatResponse(aiResponse);
        chatBody.appendChild(aiMsg);

        // Scroll to bottom
        chatBody.scrollTop = chatBody.scrollHeight;
    } catch (error) {
        // Remove typing indicator
        chatBody.removeChild(typingIndicator);

        // Append error message
        const errorMsg = document.createElement('div');
        errorMsg.classList.add('chat-message', 'ai-message');
        errorMsg.textContent = 'Error: ' + error.message;
        chatBody.appendChild(errorMsg);

        chatBody.scrollTop = chatBody.scrollHeight;
    }
}

