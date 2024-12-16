import React, { useEffect, useState } from 'react';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { View, StyleSheet, Alert, Image } from 'react-native';

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState(null);
  const [route, setRoute] = useState([]);
  const destination = { latitude: 50.7749, longitude: -102.4194 };

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });

      // Fetch or simulate route points
      setRoute([
        { latitude, longitude },
        destination, // Add more points if needed
      ]);
    };

    getLocation();
    const intervalId = setInterval(getLocation, 10 * 1000); // 10 minutes

    return () => clearInterval(intervalId);
  }, []);

  // Helper to calculate heading between two points
  const calculateHeading = (start, end) => {
    const deltaLong = end.longitude - start.longitude;
    const y = Math.sin(deltaLong) * Math.cos(end.latitude);
    const x =
      Math.cos(start.latitude) * Math.sin(end.latitude) -
      Math.sin(start.latitude) * Math.cos(end.latitude) * Math.cos(deltaLong);
    return (Math.atan2(y, x) * 180) / Math.PI;
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: destination.latitude,
          longitude: destination.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {userLocation ? <Marker coordinate={userLocation} title="Your Location" />: null }
        {route.length > 1 &&
          route.map((point, index) => {
            if (index < route.length - 1) {
              const heading = calculateHeading(point, route[index + 1]);
              return (
                <Marker
                  key={index}
                  coordinate={point}
                  anchor={{ x: 0.5, y: 0.5 }}
                  rotation={heading}
                  flat
                >
                 
                </Marker>
              );
            }
            return null;
          })}
        {route.length > 0 ? (
          <Polyline coordinates={route} strokeColor="#000" strokeWidth={3} />
        ): null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
