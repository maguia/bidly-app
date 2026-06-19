import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Importamos las pantallas (apuntando a src/screens)
import HomeScreen from '../src/screens/HomeScreen';
import PerfilScreen from '../src/screens/PerfilScreen';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false, 
            tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Inicio') {
                iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Perfil') {
                iconName = focused ? 'person-circle' : 'person-circle-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#C9973A', // Dorado Bidly
            tabBarInactiveTintColor: '#8a9bbc', // Azul grisáceo
            tabBarStyle: {
            backgroundColor: '#1A2E4A', // Azul noche
            borderTopColor: '#2a3e5a',
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
            },
            tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            }
        })}
        >
        <Tab.Screen name="Inicio" component={HomeScreen} />
        <Tab.Screen name="Perfil" component={PerfilScreen} />
        </Tab.Navigator>
    );
}