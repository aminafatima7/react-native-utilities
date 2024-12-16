import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { decode } from '@googlemaps/polyline-codec';
import * as Location from 'expo-location'; // Import expo-location
import * as Battery from 'expo-battery';  // Import expo-battery

export default function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [charging, setCharging] = useState(false);
  const isFetchingRoute = useRef(false);
  const locationInterval = useRef(null);
  const GOOGLE_MAPS_API_KEY = 'AIzaSyDbzAI4BV-IQpcG2Ac2ltbQkrOLuN99QtM'; // Replace with your actual API Key

  const BASE_LOCATION = { latitude: 37.7749, longitude: -122.4194 }; // San Francisco (fallback if needed)

  const getRandomNearbyLocation = (base, radiusInMeters) => {
    const radiusInDegrees = radiusInMeters / 111320;
    const randomLat = base.latitude + (Math.random() - 0.5) * radiusInDegrees;
    const randomLng = base.longitude + (Math.random() - 0.5) * radiusInDegrees;
    return { latitude: randomLat, longitude: randomLng };
  };

  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable location services.');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const currentLocation = { latitude, longitude };

        setUserLocation(currentLocation);
        console.log("Location updated:", currentLocation);

        setWaypoints((prevWaypoints) => {
          const updatedWaypoints = [...prevWaypoints, currentLocation];
          updateArrows(updatedWaypoints);
          if (updatedWaypoints.length > 1 && !isFetchingRoute.current) {
            fetchRoute(updatedWaypoints, currentLocation);
          }
          return updatedWaypoints;
        });
      } catch (error) {
        console.error("Error fetching user location:", error);
      }
    };

    // Fetch location every 10 seconds
    getUserLocation();
    locationInterval.current = setInterval(getUserLocation, 10 * 1000);

    return () => clearInterval(locationInterval.current); // Cleanup interval
  }, []); // Empty dependency array

  useEffect(() => {
    const checkBatteryStatus = async () => {
      const batteryState = await Battery.getBatteryLevel();
      const chargingState = await Battery.isChargingAsync();

      setBatteryLevel(batteryState * 100); // Convert to percentage
      setCharging(chargingState);
    };

    checkBatteryStatus();
  }, []);

  const fetchRoute = async (waypoints, destination) => {
    if (isFetchingRoute.current) return;

    isFetchingRoute.current = true;

    const waypointsString = waypoints
      .slice(0, -1)
      .map((point) => `${point.latitude},${point.longitude}`)
      .join('|');

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${waypoints[0].latitude},${waypoints[0].longitude}&destination=${destination.latitude},${destination.longitude}&waypoints=${waypointsString}&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes.length > 0) {
        const points = decode(data.routes[0].overview_polyline.points);
        const coordinates = points.map(([lat, lng]) => ({
          latitude: lat,
          longitude: lng,
        }));
        setRoute(coordinates);
      } else {
        console.warn("No route found:", data);
        Alert.alert('Error', 'No route found.');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      Alert.alert('Error', 'Failed to fetch route.');
    } finally {
      isFetchingRoute.current = false;
    }
  };

  const updateArrows = (waypoints) => {
    const arrowMarkers = [];
    for (let i = 0; i < waypoints.length - 1; i++) {
      const current = waypoints[i];
      const next = waypoints[i + 1];

      // Calculate rotation for arrow (angle between two waypoints)
      const rotation = Math.atan2(
        next.latitude - current.latitude,
        next.longitude - current.longitude
      ) * (180 / Math.PI); // Convert to degrees

      arrowMarkers.push({
        coordinate: current,
        rotation,
      });
    }

    // Add arrow for the last waypoint pointing to the user location
    if (waypoints.length > 0 && userLocation) {
      const lastWaypoint = waypoints[waypoints.length - 1];
      const rotation = Math.atan2(
        userLocation.latitude - lastWaypoint.latitude,
        userLocation.longitude - lastWaypoint.longitude
      ) * (180 / Math.PI); // Adjust the direction of the arrow

      arrowMarkers.push({
        coordinate: lastWaypoint,
        rotation,
      });
    }

    setArrows(arrowMarkers);
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider="google"
        initialRegion={{
          latitude: userLocation ? userLocation.latitude : BASE_LOCATION.latitude,
          longitude: userLocation ? userLocation.longitude : BASE_LOCATION.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {route.length > 0 && (
          <Polyline coordinates={route} strokeColor="#FF0000" strokeWidth={3} />
        )}
        {arrows.map((arrow, index) => (
          <Marker
            key={index}
            coordinate={arrow.coordinate}
            flat // Ensures it rotates with the map
            rotation={arrow.rotation} // Apply the calculated rotation
            anchor={{ x: 0.5, y: 0 }} // Move the anchor to the bottom of the arrow
            image={require('./arrow.png')} // Replace with your arrow image path
          />
        ))}
      </MapView>

      {/* Battery Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Battery Information</Text>
        <Text style={styles.cardContent}>Battery Level: {batteryLevel ? `${batteryLevel.toFixed(0)}%` : 'Fetching...'} </Text>
        <Text style={styles.cardContent}>{charging ? 'Charging' : 'Not Charging'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  map: {
    flex: 1,
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    marginHorizontal: 10,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardContent: {
    fontSize: 16,
    marginBottom: 8,
  },
});
