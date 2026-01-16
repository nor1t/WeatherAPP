import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Alert,
  Dimensions,
  RefreshControl,
  Animated,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// List of all Kosovo cities and municipalities
const KOSOVO_CITIES = [
  'Prishtina', 'Prizren', 'Ferizaj', 'Peja', 'Gjilan', 
  'Mitrovica', 'Podujeva', 'Vushtrri', 'Rahovec', 'Drenas', 
  'Lipjan', 'Kamenica', 'Viti', 'Deçan', 'Istog', 
  'Klinë', 'Skenderaj', 'Dragash', 'Kaçanik', 'Obiliq', 
  'Leposaviq', 'Shtime', 'Junik', 'Malisheva', 'Suhareka',
  'Kllokot', 'Hani i Elezit', 'Zveçan', 'Zubin Potok', 'Ranillug',
  'Graçanica', 'Partesh', 'Mamusha', 'Novobërda', 'Fushë Kosova'
];

const WeatherApp = () => {
  // State management
  const [weatherData, setWeatherData] = useState([]);
  const [forecastData, setForecastData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('Prishtina');
  const [favoriteCities, setFavoriteCities] = useState([]);
  const [theme, setTheme] = useState('light');
  const [units, setUnits] = useState('metric');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  
  // Refs
  const searchInputRef = useRef(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // YOUR API KEY - GET FROM https://home.openweathermap.org/
  const API_KEY = '90b8b0524e8772cb81a7c872ed57db1b'; // REPLACE THIS!!!
  
  // Color themes
  const themes = {
    light: {
      background: '#f8f9fa',
      card: '#ffffff',
      text: '#2d3748',
      textSecondary: '#718096',
      accent: '#3b82f6',
      gradient: ['#3b82f6', '#60a5fa'],
      shadow: '#00000020',
      searchBg: '#ffffff',
      searchText: '#2d3748'
    },
    dark: {
      background: '#1a202c',
      card: '#2d3748',
      text: '#f7fafc',
      textSecondary: '#cbd5e0',
      accent: '#60a5fa',
      gradient: ['#1e3a8a', '#3b82f6'],
      shadow: '#00000060',
      searchBg: '#2d3748',
      searchText: '#f7fafc'
    },
    kosovo: {
      background: '#e6f2ff',
      card: '#ffffff',
      text: '#003399',
      textSecondary: '#3366cc',
      accent: '#0055cc',
      gradient: ['#0055cc', '#3366cc'],
      shadow: '#00000020',
      searchBg: '#ffffff',
      searchText: '#003399'
    }
  };
  
  const currentTheme = themes[theme];

  // Emoji icons for weather
  const weatherIcons = {
    '01d': '☀️', '01n': '🌙', // clear sky
    '02d': '⛅', '02n': '☁️', // few clouds
    '03d': '☁️', '03n': '☁️', // scattered clouds
    '04d': '☁️', '04n': '☁️', // broken clouds
    '09d': '🌧️', '09n': '🌧️', // shower rain
    '10d': '🌦️', '10n': '🌧️', // rain
    '11d': '⛈️', '11n': '⛈️', // thunderstorm
    '13d': '❄️', '13n': '❄️', // snow
    '50d': '🌫️', '50n': '🌫️', // mist
  };

  // Initialize app
  useEffect(() => {
    loadSavedData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load saved data from storage
  const loadSavedData = async () => {
    try {
      const savedFavorites = await AsyncStorage.getItem('favoriteCities');
      const savedTheme = await AsyncStorage.getItem('theme');
      const savedUnits = await AsyncStorage.getItem('units');
      
      if (savedFavorites) {
        const favorites = JSON.parse(savedFavorites);
        setFavoriteCities(favorites);
        if (favorites.length > 0) {
          fetchMultipleCitiesWeather(favorites.slice(0, 5));
        } else {
          const defaultCities = ['Prishtina', 'Prizren', 'Ferizaj', 'Peja', 'Gjilan'];
          setFavoriteCities(defaultCities);
          fetchMultipleCitiesWeather(defaultCities);
        }
      } else {
        const defaultCities = ['Prishtina', 'Prizren', 'Ferizaj', 'Peja', 'Gjilan'];
        setFavoriteCities(defaultCities);
        fetchMultipleCitiesWeather(defaultCities);
      }
      
      if (savedTheme) setTheme(savedTheme);
      if (savedUnits) setUnits(savedUnits);
    } catch (error) {
      console.error('Error loading saved data:', error);
      const defaultCities = ['Prishtina', 'Prizren', 'Ferizaj', 'Peja', 'Gjilan'];
      setFavoriteCities(defaultCities);
      fetchMultipleCitiesWeather(defaultCities);
    }
  };

  // Enhanced weather data fetch
  const fetchWeatherData = async (cityName) => {
    try {
      if (!cityName?.trim()) {
        throw new Error('Ju lutem shkruani emrin e qytetit');
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName.trim())}&appid=${API_KEY}&units=${units}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Çelësi API është i pavlefshëm. Ju lutem përditësoni API_KEY në kod.');
        } else if (response.status === 404) {
          throw new Error(`Qyteti "${cityName}" nuk u gjet`);
        } else if (response.status === 429) {
          throw new Error('Shumë kërkesa. Ju lutem prisni një moment.');
        } else {
          throw new Error(`Dështoi marrja e të dhënave të motit (Gabim ${response.status})`);
        }
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('Gabim në marrjen e motit:', error);
      throw error;
    }
  };

  // Fetch forecast data
  const fetchForecastData = async (cityName) => {
    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&appid=${API_KEY}&units=${units}`;
      const response = await fetch(url);
      const data = await response.json();
      
      // Process for 5-day forecast
      const dailyForecasts = processDailyForecast(data.list);
      // Process for hourly forecast (next 12 hours)
      const next12Hours = processHourlyForecast(data.list);
      
      setHourlyForecast(next12Hours);
      
      return {
        city: data.city,
        dailyForecasts,
        list: data.list
      };
    } catch (error) {
      console.error('Gabim në marrjen e parashikimit:', error);
      throw error;
    }
  };

  // Process daily forecast data
  const processDailyForecast = (forecastList) => {
    const dailyData = {};
    
    forecastList.forEach(item => {
      const date = new Date(item.dt * 1000);
      const day = date.toDateString();
      
      if (!dailyData[day]) {
        dailyData[day] = {
          date,
          temps: [],
          weather: item.weather[0],
          humidity: item.main.humidity,
          wind: item.wind.speed
        };
      }
      
      dailyData[day].temps.push(item.main.temp);
    });
    
    // Convert to array and calculate average temp
    return Object.values(dailyData).slice(0, 5).map(day => ({
      ...day,
      avgTemp: day.temps.reduce((a, b) => a + b, 0) / day.temps.length
    }));
  };

  // Process hourly forecast data
  const processHourlyForecast = (forecastList) => {
    return forecastList.slice(0, 8).map(item => ({
      time: new Date(item.dt * 1000).getHours() + ':00',
      temp: item.main.temp,
      icon: item.weather[0].icon,
      description: item.weather[0].description,
    }));
  };

  // Main function to fetch city weather
  const fetchCityWeather = async (cityName) => {
    if (!cityName?.trim()) {
      Alert.alert('Gabim', 'Ju lutem shkruani emrin e qytetit');
      return;
    }

    try {
      setLoading(true);
      
      const weather = await fetchWeatherData(cityName);
      const forecast = await fetchForecastData(cityName);
      
      // Update weather data list
      setWeatherData(prev => {
        const existingIndex = prev.findIndex(item => item.id === weather.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = weather;
          return updated;
        } else {
          return [weather, ...prev];
        }
      });
      
      setForecastData(forecast);
      setCurrentCity(cityName);
      setSearchQuery('');
      setShowSearchModal(false);
      
    } catch (error) {
      Alert.alert(
        'Gabim',
        error.message,
        [{ text: 'OK', style: 'cancel' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch multiple cities
  const fetchMultipleCitiesWeather = async (cities) => {
    try {
      setLoading(true);
      const promises = cities.map(city => 
        fetchWeatherData(city).catch(error => {
          console.warn(`Dështoi marrja e ${city}:`, error.message);
          return null;
        })
      );
      
      const results = await Promise.all(promises);
      const validResults = results.filter(result => result !== null);
      setWeatherData(validResults);
      
      // If we got at least one result, fetch forecast for first city
      if (validResults.length > 0) {
        fetchForecastData(validResults[0].name);
      }
      
    } catch (error) {
      console.error('Gabim në marrjen e qyteteve të shumta:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter cities based on search input
  const filterCities = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredCities([]);
    } else {
      const filtered = KOSOVO_CITIES.filter(city =>
        city.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredCities(filtered.slice(0, 10));
    }
  };

  // Save favorite cities
  const saveFavorites = async (newFavorites) => {
    try {
      await AsyncStorage.setItem('favoriteCities', JSON.stringify(newFavorites));
    } catch (error) {
      console.error('Gabim në ruajtjen e të dhënave:', error);
    }
  };

  // Add to favorites
  const addToFavorites = (cityName) => {
    const trimmedCity = cityName.trim();
    if (!trimmedCity || favoriteCities.includes(trimmedCity)) return;
    
    const newFavorites = [...favoriteCities, trimmedCity];
    setFavoriteCities(newFavorites);
    saveFavorites(newFavorites);
    Alert.alert('Sukses', `${trimmedCity} u shtua në të preferuarat!`);
  };

  // Remove from favorites
  const removeFromFavorites = (cityName) => {
    const newFavorites = favoriteCities.filter(city => city !== cityName);
    setFavoriteCities(newFavorites);
    saveFavorites(newFavorites);
    setWeatherData(prev => prev.filter(city => city.name !== cityName));
  };

  // Toggle theme
  const toggleTheme = async (newTheme) => {
    setTheme(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };

  // Toggle units
  const toggleUnits = async () => {
    const newUnits = units === 'metric' ? 'imperial' : 'metric';
    setUnits(newUnits);
    await AsyncStorage.setItem('units', newUnits);
    
    // Refresh all data with new units
    if (weatherData.length > 0) {
      fetchMultipleCitiesWeather(weatherData.map(city => city.name));
    }
  };

  // Get weather icon emoji
  const getWeatherIcon = (iconCode) => {
    return weatherIcons[iconCode] || '🌈';
  };

  // Format temperature with unit
  const formatTemp = (temp) => {
    const unitSymbol = units === 'metric' ? '°C' : '°F';
    return temp !== undefined ? `${Math.round(temp)}${unitSymbol}` : '--°';
  };

  // Format date in Albanian
  const formatDateAlbanian = (date, isToday = false) => {
    if (isToday) return 'Sot';
    
    const days = ['Diele', 'Hënë', 'Martë', 'Mërkurë', 'Enjte', 'Premte', 'Shtunë'];
    const months = ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj'];
    
    const day = days[date.getDay()];
    const month = months[date.getMonth()];
    const dayNum = date.getDate();
    
    return `${day}, ${dayNum} ${month}`;
  };

  // Render weather card
  const renderWeatherCard = ({ item, index }) => (
    <Animated.View 
      style={[
        styles.weatherCard,
        { 
          backgroundColor: currentTheme.card, 
          shadowColor: currentTheme.shadow,
          opacity: fadeAnim
        }
      ]}
      key={item.id}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cityInfo}>
          <Text style={[styles.cityName, { color: currentTheme.text }]}>
            {item.name}, {item.sys?.country || 'KS'}
          </Text>
          <Text style={[styles.cardTime, { color: currentTheme.textSecondary }]}>
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity 
            onPress={() => fetchCityWeather(item.name)}
            style={styles.actionButton}
          >
            <Text style={[styles.actionButtonText, { color: currentTheme.accent }]}>🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => removeFromFavorites(item.name)}
            style={styles.actionButton}
          >
            <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardMain}>
        <View style={styles.tempSection}>
          <Text style={[styles.temperature, { color: currentTheme.accent }]}>
            {formatTemp(item.main?.temp)}
          </Text>
          <Text style={[styles.feelsLike, { color: currentTheme.textSecondary }]}>
            Ndjehet si {formatTemp(item.main?.feels_like)}
          </Text>
        </View>
        <View style={styles.weatherIconSection}>
          <Text style={styles.weatherIconLarge}>
            {getWeatherIcon(item.weather?.[0]?.icon)}
          </Text>
          <Text style={[styles.weatherDescription, { color: currentTheme.text }]}>
            {item.weather?.[0]?.description || 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>💧</Text>
            <Text style={[styles.detailValue, { color: currentTheme.text }]}>
              {item.main?.humidity || '--'}%
            </Text>
            <Text style={[styles.detailLabel, { color: currentTheme.textSecondary }]}>
              Lagështia
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>🌡️</Text>
            <Text style={[styles.detailValue, { color: currentTheme.text }]}>
              {item.main?.pressure || '--'} hPa
            </Text>
            <Text style={[styles.detailLabel, { color: currentTheme.textSecondary }]}>
              Presioni
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>💨</Text>
            <Text style={[styles.detailValue, { color: currentTheme.text }]}>
              {item.wind?.speed || '--'} {units === 'metric' ? 'm/s' : 'mph'}
            </Text>
            <Text style={[styles.detailLabel, { color: currentTheme.textSecondary }]}>
              Era
            </Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>👁️</Text>
            <Text style={[styles.detailValue, { color: currentTheme.text }]}>
              {item.visibility ? `${(item.visibility / 1000).toFixed(1)} km` : '--'}
            </Text>
            <Text style={[styles.detailLabel, { color: currentTheme.textSecondary }]}>
              Dukshmëria
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  // Render forecast item
  const renderForecastItem = (forecast, index) => (
    <View 
      key={index} 
      style={[
        styles.forecastItem, 
        { backgroundColor: currentTheme.card, borderColor: currentTheme.shadow }
      ]}
    >
      <Text style={[styles.forecastDay, { color: currentTheme.text }]}>
        {formatDateAlbanian(forecast.date, index === 0)}
      </Text>
      <Text style={styles.forecastIcon}>
        {getWeatherIcon(forecast.weather.icon)}
      </Text>
      <Text style={[styles.forecastTemp, { color: currentTheme.accent }]}>
        {formatTemp(forecast.avgTemp)}
      </Text>
      <Text style={[styles.forecastDesc, { color: currentTheme.textSecondary }]}>
        {forecast.weather.description}
      </Text>
    </View>
  );

  // Render hourly forecast item
  const renderHourlyItem = (hour, index) => (
    <View 
      key={index} 
      style={[
        styles.hourlyItem, 
        { backgroundColor: currentTheme.card, borderColor: currentTheme.shadow }
      ]}
    >
      <Text style={[styles.hourlyTime, { color: currentTheme.text }]}>{hour.time}</Text>
      <Text style={styles.hourlyIcon}>{getWeatherIcon(hour.icon)}</Text>
      <Text style={[styles.hourlyTemp, { color: currentTheme.accent }]}>
        {formatTemp(hour.temp)}
      </Text>
    </View>
  );

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    if (weatherData.length > 0) {
      await fetchMultipleCitiesWeather(weatherData.map(city => city.name));
    }
    setRefreshing(false);
  };

  // Kosovo flag gradient component
  const KosovoHeader = () => (
    <View style={[styles.header, { backgroundColor: currentTheme.accent }]}>
      <View style={styles.headerFlag}>
        <View style={styles.flagBlue} />
        <View style={styles.flagWhite}>
          <View style={styles.flagStar}>
            <Text style={styles.starText}>★</Text>
          </View>
        </View>
      </View>
      <View style={styles.headerContent}>
        <View>
          <Text style={styles.appTitle}>🌤️ Moti në Kosovë</Text>
          <Text style={styles.appSubtitle}>Parashikimi i motit për të gjitha qytetet</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => {
              setShowSearchModal(true);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
          >
            <Text style={styles.headerButtonText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowSettingsModal(true)}
          >
            <Text style={styles.headerButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.currentWeather}>
        <Text style={styles.currentCity}>{currentCity}</Text>
        {weatherData[0] && (
          <>
            <Text style={styles.currentTemp}>
              {formatTemp(weatherData[0].main?.temp)}
            </Text>
            <Text style={styles.currentDescription}>
              {weatherData[0].weather?.[0]?.description || 'N/A'}
            </Text>
          </>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <KosovoHeader />

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[currentTheme.accent]}
            tintColor={currentTheme.accent}
          />
        }
      >
        {/* Hourly Forecast */}
        {hourlyForecast.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              ⏰ Ora të ardhshme
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.hourlyContainer}>
                {hourlyForecast.map(renderHourlyItem)}
              </View>
            </ScrollView>
          </View>
        )}

        {/* 5-Day Forecast */}
        {forecastData && forecastData.dailyForecasts && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              📅 Parashikimi 5-ditor
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.forecastList}>
                {forecastData.dailyForecasts.map(renderForecastItem)}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Kosovo Cities Quick Access */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              🇽🇰 Qytetet e Kosovës
            </Text>
            <TouchableOpacity onPress={() => {
              setShowSearchModal(true);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}>
              <Text style={[styles.addCityText, { color: currentTheme.accent }]}>
                + Kërko
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.kosovoCitiesContainer}>
              {KOSOVO_CITIES.slice(0, 15).map(city => (
                <TouchableOpacity 
                  key={city} 
                  style={[styles.cityChip, { backgroundColor: currentTheme.card }]}
                  onPress={() => fetchCityWeather(city)}
                >
                  <Text style={[styles.cityChipText, { color: currentTheme.text }]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Favorite Cities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              ⭐ Qytete të Preferuara
            </Text>
            <Text style={[styles.cityCount, { color: currentTheme.textSecondary }]}>
              {favoriteCities.length} qytete
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.favoriteCitiesContainer}>
              {favoriteCities.map(city => (
                <TouchableOpacity 
                  key={city} 
                  style={[styles.favoriteChip, { backgroundColor: currentTheme.accent }]}
                  onPress={() => fetchCityWeather(city)}
                >
                  <Text style={[styles.favoriteChipText, { color: '#fff' }]}>
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* All Cities Weather */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
              🌍 Të gjitha vendndodhjet
            </Text>
            <Text style={[styles.cityCount, { color: currentTheme.textSecondary }]}>
              {weatherData.length} qytete
            </Text>
          </View>
          
          {weatherData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>☁️</Text>
              <Text style={[styles.emptyStateText, { color: currentTheme.text }]}>
                Nuk ka të dhëna moti
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: currentTheme.textSecondary }]}>
                Kërko për një qytet për të filluar
              </Text>
            </View>
          ) : (
            <FlatList
              data={weatherData}
              renderItem={renderWeatherCard}
              keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
              scrollEnabled={false}
              contentContainerStyle={styles.weatherList}
            />
          )}
        </View>
      </ScrollView>

      {/* Full Screen Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
      >
        <KeyboardAvoidingView 
          style={[styles.fullModalContainer, { backgroundColor: currentTheme.background }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <SafeAreaView style={styles.fullModalContent}>
            {/* Modal Header */}
            <View style={styles.fullModalHeader}>
              <TouchableOpacity 
                style={styles.fullModalBackButton}
                onPress={() => {
                  setShowSearchModal(false);
                  Keyboard.dismiss();
                }}
              >
                <Text style={[styles.fullModalBackText, { color: currentTheme.text }]}>←</Text>
              </TouchableOpacity>
              <Text style={[styles.fullModalTitle, { color: currentTheme.text }]}>
                🔍 Kërko Qytet
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Search Input */}
            <View style={styles.fullSearchContainer}>
              <TextInput
                ref={searchInputRef}
                style={[styles.fullSearchInput, { 
                  backgroundColor: currentTheme.searchBg,
                  color: currentTheme.searchText,
                  borderColor: currentTheme.shadow
                }]}
                placeholder="Shkruani emrin e qytetit..."
                placeholderTextColor={currentTheme.textSecondary}
                value={searchQuery}
                onChangeText={filterCities}
                autoFocus={true}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => {
                    setSearchQuery('');
                    setFilteredCities([]);
                  }}
                >
                  <Text style={[styles.clearButtonText, { color: currentTheme.textSecondary }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Kosovo Cities */}
            <View style={styles.fullQuickCities}>
              <Text style={[styles.fullQuickTitle, { color: currentTheme.textSecondary }]}>
                Qytete të Kosovës:
              </Text>
              <View style={styles.fullQuickGrid}>
                {KOSOVO_CITIES.slice(0, 12).map(city => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.fullQuickItem, { backgroundColor: currentTheme.card }]}
                    onPress={() => {
                      fetchCityWeather(city);
                      setShowSearchModal(false);
                    }}
                  >
                    <Text style={[styles.fullQuickText, { color: currentTheme.text }]}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Search Results */}
            <ScrollView style={styles.fullResultsContainer}>
              {filteredCities.length > 0 ? (
                <>
                  <Text style={[styles.resultsTitle, { color: currentTheme.textSecondary }]}>
                    Rezultatet e kërkimit:
                  </Text>
                  {filteredCities.map(city => (
                    <TouchableOpacity
                      key={city}
                      style={[styles.resultItem, { 
                        backgroundColor: currentTheme.card,
                        borderBottomColor: currentTheme.shadow
                      }]}
                      onPress={() => {
                        fetchCityWeather(city);
                        setShowSearchModal(false);
                      }}
                    >
                      <Text style={[styles.resultText, { color: currentTheme.text }]}>{city}</Text>
                      <Text style={[styles.resultArrow, { color: currentTheme.textSecondary }]}>→</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : searchQuery.length > 2 ? (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsIcon}>🔍</Text>
                  <Text style={[styles.noResultsText, { color: currentTheme.text }]}>
                    Nuk u gjet qytet me "{searchQuery}"
                  </Text>
                  <Text style={[styles.noResultsSubtext, { color: currentTheme.textSecondary }]}>
                    Provoni me emrin e plotë të qytetit
                  </Text>
                </View>
              ) : (
                <View style={styles.searchHint}>
                  <Text style={[styles.searchHintText, { color: currentTheme.textSecondary }]}>
                    💡 Shkruani të paktën 3 shkronja për të kërkuar
                  </Text>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* FIXED: Full Screen Settings Modal */}
      <Modal
        visible={showSettingsModal}
        animationType="slide"
        transparent={false}
        statusBarTranslucent={true}
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <SafeAreaView style={[styles.settingsModalContainer, { backgroundColor: currentTheme.background }]}>
          <View style={styles.settingsModalHeader}>
            <TouchableOpacity 
              style={styles.settingsModalBackButton}
              onPress={() => setShowSettingsModal(false)}
            >
              <Text style={[styles.settingsModalBackText, { color: currentTheme.text }]}>←</Text>
            </TouchableOpacity>
            <Text style={[styles.settingsModalTitle, { color: currentTheme.text }]}>
              ⚙️ Cilësimet
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView 
            style={styles.settingsScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.settingsContent}
          >
            {/* Theme Settings */}
            <View style={styles.settingsSection}>
              <Text style={[styles.settingsSectionTitle, { color: currentTheme.text }]}>
                Pamja e Aplikacionit
              </Text>
              <Text style={[styles.settingsSectionDesc, { color: currentTheme.textSecondary }]}>
                Zgjidhni pamjen e aplikacionit
              </Text>
              
              <View style={styles.themeCardsContainer}>
                {/* Light Theme */}
                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    theme === 'light' && styles.themeCardActive,
                    { backgroundColor: '#ffffff' }
                  ]}
                  onPress={() => toggleTheme('light')}
                >
                  <View style={styles.themeCardHeader}>
                    <View style={[styles.themePreview, { backgroundColor: '#3b82f6' }]} />
                    <Text style={styles.themeCardTitle}>E Çelët</Text>
                  </View>
                  <View style={styles.themeCardColors}>
                    <View style={[styles.colorDot, { backgroundColor: '#f8f9fa' }]} />
                    <View style={[styles.colorDot, { backgroundColor: '#ffffff' }]} />
                    <View style={[styles.colorDot, { backgroundColor: '#3b82f6' }]} />
                  </View>
                  {theme === 'light' && (
                    <View style={styles.themeSelectedBadge}>
                      <Text style={styles.themeSelectedText}>✓ Aktive</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Dark Theme */}
                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    theme === 'dark' && styles.themeCardActive,
                    { backgroundColor: '#2d3748' }
                  ]}
                  onPress={() => toggleTheme('dark')}
                >
                  <View style={styles.themeCardHeader}>
                    <View style={[styles.themePreview, { backgroundColor: '#60a5fa' }]} />
                    <Text style={[styles.themeCardTitle, { color: '#fff' }]}>E Errët</Text>
                  </View>
                  <View style={styles.themeCardColors}>
                    <View style={[styles.colorDot, { backgroundColor: '#1a202c' }]} />
                    <View style={[styles.colorDot, { backgroundColor: '#2d3748' }]} />
                    <View style={[styles.colorDot, { backgroundColor: '#60a5fa' }]} />
                  </View>
                  {theme === 'dark' && (
                    <View style={styles.themeSelectedBadge}>
                      <Text style={styles.themeSelectedText}>✓ Aktive</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Kosovo Theme */}
                <TouchableOpacity
                  style={[
                    styles.themeCard,
                    theme === 'kosovo' && styles.themeCardActive,
                    { backgroundColor: '#ffffff' }
                  ]}
                  onPress={() => toggleTheme('kosovo')}
                >
                  <View style={styles.themeCardHeader}>
                    <View style={[styles.themePreview, { backgroundColor: '#0055cc' }]} />
                    <Text style={styles.themeCardTitle}>Kosovë</Text>
                  </View>
                  <View style={styles.themeCardColors}>
                    <View style={[styles.colorDot, { backgroundColor: '#e6f2ff' }]} />
                    <View style={[styles.colorDot, { backgroundColor: '#ffffff' }]} />
                    <View style={[styles.colorDot, { backgroundColor: '#0055cc' }]} />
                  </View>
                  {theme === 'kosovo' && (
                    <View style={styles.themeSelectedBadge}>
                      <Text style={styles.themeSelectedText}>✓ Aktive</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Units Settings */}
            <View style={styles.settingsSection}>
              <Text style={[styles.settingsSectionTitle, { color: currentTheme.text }]}>
                Njësitë e Matjes
              </Text>
              <Text style={[styles.settingsSectionDesc, { color: currentTheme.textSecondary }]}>
                Zgjidhni njësitë e temperaturës
              </Text>
              
              <View style={styles.unitsContainer}>
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    units === 'metric' && styles.unitOptionActive,
                    { backgroundColor: currentTheme.card }
                  ]}
                  onPress={() => {
                    if (units !== 'metric') {
                      toggleUnits();
                    }
                  }}
                >
                  <Text style={[
                    styles.unitOptionText,
                    units === 'metric' && { color: currentTheme.accent, fontWeight: 'bold' },
                    { color: currentTheme.text }
                  ]}>
                    Celsius (°C)
                  </Text>
                  <Text style={[styles.unitOptionDesc, { color: currentTheme.textSecondary }]}>
                    Standarde ndërkombëtare
                  </Text>
                  {units === 'metric' && (
                    <Text style={[styles.unitOptionBadge, { color: currentTheme.accent }]}>● Aktualisht</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.unitOption,
                    units === 'imperial' && styles.unitOptionActive,
                    { backgroundColor: currentTheme.card }
                  ]}
                  onPress={() => {
                    if (units !== 'imperial') {
                      toggleUnits();
                    }
                  }}
                >
                  <Text style={[
                    styles.unitOptionText,
                    units === 'imperial' && { color: currentTheme.accent, fontWeight: 'bold' },
                    { color: currentTheme.text }
                  ]}>
                    Fahrenheit (°F)
                  </Text>
                  <Text style={[styles.unitOptionDesc, { color: currentTheme.textSecondary }]}>
                    Përdoret në SHBA
                  </Text>
                  {units === 'imperial' && (
                    <Text style={[styles.unitOptionBadge, { color: currentTheme.accent }]}>● Aktualisht</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* App Info */}
            <View style={styles.settingsSection}>
              <Text style={[styles.settingsSectionTitle, { color: currentTheme.text }]}>
                📱 Informacione rreth Aplikacionit
              </Text>
              
              <View style={[styles.infoCard, { backgroundColor: currentTheme.card }]}>
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Emri i Aplikacionit:</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.text }]}>Moti në Kosovë</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Versioni:</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.text }]}>2.0.0</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Zhvilluesi:</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.text }]}>Projekt Universitar</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Burimi i të Dhënave:</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.text }]}>OpenWeatherMap API</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Qytetet e Kosovës:</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.text }]}>{KOSOVO_CITIES.length} qytete</Text>
                </View>
                
                <View style={styles.infoItem}>
                  <Text style={[styles.infoLabel, { color: currentTheme.textSecondary }]}>Data e Përditësimit:</Text>
                  <Text style={[styles.infoValue, { color: currentTheme.text }]}>{new Date().toLocaleDateString('sq-AL')}</Text>
                </View>
              </View>
              
              <View style={styles.aboutSection}>
                <Text style={[styles.aboutText, { color: currentTheme.textSecondary }]}>
                  Ky aplikacion është zhvilluar si projekt universitar për të shfaqur parashikimin e motit për të gjitha qytetet e Kosovës.
                </Text>
                <Text style={[styles.versionText, { color: currentTheme.textSecondary, marginTop: 20 }]}>
                  © 2025 Moti në Kosovë - Të gjitha të drejtat e rezervuara
                </Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={currentTheme.accent} />
          <Text style={[styles.loadingText, { color: currentTheme.text }]}>
            Po ngarkohen të dhënat e motit...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// Professional Styles with Kosovo Theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Kosovo Flag Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  headerFlag: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 60,
    height: 40,
    borderRadius: 4,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  flagBlue: {
    flex: 1,
    backgroundColor: '#0055cc',
  },
  flagWhite: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagStar: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  starText: {
    color: '#0055cc',
    fontSize: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 18,
    color: '#fff',
  },
  currentWeather: {
    alignItems: 'center',
    marginTop: 10,
  },
  currentCity: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  currentTemp: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
  },
  currentDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'capitalize',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  addCityText: {
    fontSize: 14,
    fontWeight: '600',
  },
  kosovoCitiesContainer: {
    flexDirection: 'row',
    paddingRight: 20,
    flexWrap: 'nowrap',
  },
  hourlyContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  hourlyItem: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 12,
    minWidth: 80,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  hourlyTime: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  hourlyIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  hourlyTemp: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  forecastList: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  forecastItem: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 12,
    minWidth: 100,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  forecastDay: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  forecastIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  forecastTemp: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  forecastDesc: {
    fontSize: 12,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  cityChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cityChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  favoriteCitiesContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  favoriteChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  favoriteChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  cityCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
  },
  weatherList: {
    paddingBottom: 100,
  },
  weatherCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cityInfo: {
    flex: 1,
  },
  cityName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 14,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  actionButtonText: {
    fontSize: 18,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tempSection: {
    flex: 1,
  },
  temperature: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  feelsLike: {
    fontSize: 14,
  },
  weatherIconSection: {
    alignItems: 'center',
  },
  weatherIconLarge: {
    fontSize: 48,
    marginBottom: 8,
  },
  weatherDescription: {
    fontSize: 16,
    textTransform: 'capitalize',
  },
  cardDetails: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  detailItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
  },
  detailIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  detailLabel: {
    fontSize: 12,
  },
  // Full Screen Search Modal (Keep as is)
  fullModalContainer: {
    flex: 1,
  },
  fullModalContent: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  fullModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  fullModalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullModalBackText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  fullModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  fullSearchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullSearchInput: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    fontSize: 18,
    borderWidth: 1,
    paddingRight: 50,
  },
  clearButton: {
    position: 'absolute',
    right: 30,
    padding: 10,
  },
  clearButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fullQuickCities: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  fullQuickTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  fullQuickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  fullQuickItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: '30%',
    alignItems: 'center',
  },
  fullQuickText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fullResultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '500',
  },
  resultArrow: {
    fontSize: 20,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  noResultsSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  searchHint: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  searchHintText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // FIXED: Full Screen Settings Modal
  settingsModalContainer: {
    flex: 1,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingsModalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsModalBackText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  settingsScrollView: {
    flex: 1,
  },
  settingsContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  settingsSection: {
    marginBottom: 32,
  },
  settingsSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  settingsSectionDesc: {
    fontSize: 14,
    marginBottom: 20,
  },
  themeCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  themeCard: {
    width: (width - 55) / 3, // Account for padding and gap
    padding: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardActive: {
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.2,
  },
  themeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  themePreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
  },
  themeCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  themeCardColors: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeSelectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  themeSelectedText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  unitsContainer: {
    gap: 15,
  },
  unitOption: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  unitOptionActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  unitOptionText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 5,
  },
  unitOptionDesc: {
    fontSize: 14,
  },
  unitOptionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  aboutSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default WeatherApp;