import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#b71c1c" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Fichas" }} />
      <Stack.Screen
        name="character/[id]/index"
        options={{ title: "Ficha do Personagem" }}
      />
      <Stack.Screen
        name="character/[id]/feats"
        options={{ title: "Talentos" }}
      />
      <Stack.Screen
        name="character/[id]/combat"
        options={{ title: "Painel de Combate" }}
      />
      <Stack.Screen
        name="character/[id]/notes"
        options={{ title: "Anotações" }}
      />
      <Stack.Screen
        name="character/[id]/skills"
        options={{ title: "Perícias" }}
      />
      <Stack.Screen
        name="character/newChar"
        options={{ title: "Nova Ficha" }}
      />
    </Stack>
  );
}
