const cities = {
  dongguan: {
    name: "Dongguan",
    latitude: 23.0207,
    longitude: 113.7518
  },
  shenzhen: {
    name: "Shenzhen",
    latitude: 22.5431,
    longitude: 114.0579
  },
  toronto: {
    name: "Toronto",
    latitude: 43.6532,
    longitude: -79.3832
  }
};

const citySelect = document.querySelector("#city");
const refreshButton = document.querySelector("#refresh");
const statusText = document.querySelector("#status");
const weatherSection = document.querySelector("#weather");

let activeController;
let requestId = 0;

function getWeatherStyle(code, isDay) {
  if ([95, 96, 99].includes(code)) {
    return {
      theme: "stormy",
      icon: "⛈️",
      description: "Thunderstorm",
      suggestion: "A stormy sky today. Enjoy a quiet moment indoors."
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      theme: "snowy",
      icon: "❄️",
      description: "Snow",
      suggestion: "Snow is in the air. Wear warm layers before heading out."
    };
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return {
      theme: "rainy",
      icon: "🌧️",
      description: "Rain or drizzle",
      suggestion: "Take an umbrella and enjoy the rhythm of the rain."
    };
  }

  if ([45, 48].includes(code)) {
    return {
      theme: isDay ? "cloudy" : "night",
      icon: "🌫️",
      description: "Fog",
      suggestion: "A misty view today. Take your time on the journey."
    };
  }

  if ([0, 1].includes(code)) {
    return {
      theme: isDay ? "sunny" : "night",
      icon: isDay ? "☀️" : "🌙",
      description: isDay ? "Clear or mainly clear" : "Clear or mainly clear night",
      suggestion: isDay
        ? "A bright sky today. Take a short walk and enjoy the light."
        : "A quiet sky tonight. Take a moment to slow down."
    };
  }

  if ([2, 3].includes(code)) {
    return {
      theme: isDay ? "cloudy" : "night",
      icon: isDay ? "☁️" : "☁️",
      description: code === 2 ? "Partly cloudy" : "Overcast",
      suggestion: "Soft skies today. A good moment for a relaxed city walk."
    };
  }

  return {
    theme: "cloudy",
    icon: "🌍",
    description: "Weather unavailable",
    suggestion: "Explore the city at your own pace."
  };
}

function updateWeather(data, city) {
  const current = data.current;
  const requiredFields = [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "wind_speed_10m",
    "weather_code",
    "is_day"
  ];

  if (
    !current ||
    !requiredFields.every(field => Number.isFinite(current[field])) ||
    typeof current.time !== "string"
  ) {
    throw new Error("Incomplete weather data");
  }

  const weather = getWeatherStyle(current.weather_code, current.is_day === 1);

  document.body.dataset.weather = weather.theme;
  document.querySelector("#city-name").textContent = city.name;
  document.querySelector("#condition").textContent = weather.description;
  document.querySelector("#icon").textContent = weather.icon;

  document.querySelector("#temperature").textContent =
    `${Math.round(current.temperature_2m)}°C`;

  document.querySelector("#feels-like").textContent =
    `${Math.round(current.apparent_temperature)}°C`;

  document.querySelector("#humidity").textContent =
    `${Math.round(current.relative_humidity_2m)}%`;

  document.querySelector("#wind").textContent =
    `${Math.round(current.wind_speed_10m)} km/h`;

  document.querySelector("#suggestion").textContent = weather.suggestion;

  document.querySelector("#updated").textContent =
    `Weather time: ${current.time.replace("T", " ")} (${data.timezone})`;
}

async function loadWeather() {
  activeController?.abort();

  const controller = new AbortController();
  activeController = controller;

  const currentRequest = ++requestId;
  const city = cities[citySelect.value];

  refreshButton.disabled = true;
  weatherSection.setAttribute("aria-busy", "true");
  statusText.classList.remove("error");
  statusText.textContent = `Loading weather for ${city.name}…`;

  const parameters = new URLSearchParams({
    latitude: city.latitude,
    longitude: city.longitude,
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "wind_speed_10m",
      "weather_code",
      "is_day"
    ].join(","),
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    timezone: "auto"
  });

  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${parameters}`,
      {
        signal: controller.signal,
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (currentRequest !== requestId) return;

    updateWeather(data, city);
    statusText.textContent = `Weather loaded for ${city.name}.`;
  } catch (error) {
    if (currentRequest !== requestId) return;

    statusText.classList.add("error");
    statusText.textContent =
      `Could not load ${city.name} weather. Check your connection and refresh. ` +
      "Any existing weather shown has not been updated.";
  } finally {
    clearTimeout(timeout);

    if (currentRequest === requestId) {
      refreshButton.disabled = false;
      weatherSection.setAttribute("aria-busy", "false");
    }
  }
}

citySelect.addEventListener("change", loadWeather);
refreshButton.addEventListener("click", loadWeather);

loadWeather();