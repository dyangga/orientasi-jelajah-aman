// app/tambah-favorit.tsx 
import { router } from "expo-router";
import { Button, Text, View } from "react-native";

export default function ModalTambahFavorit() {
    return (
        <View style={{ padding: 16 }}>
            <Text>Tambahkan kota ini ke daftar favorit?</Text>
            <Button title="Simpan" onPress={() => router.back()} />
        </View>
    );
} 