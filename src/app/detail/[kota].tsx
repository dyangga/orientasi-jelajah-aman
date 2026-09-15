// app/detail/[kota].tsx 
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import WeatherCard from "../../components/WeatherCard";

export default function HalamanDetail() {
    const { kota } = useLocalSearchParams<{ kota: string }>();

    return (
        <View style={{ padding: 16 }}>
            <WeatherCard kota={kota} suhu={29} tingkatAQI="BAIK" />
        </View>
    );
} 