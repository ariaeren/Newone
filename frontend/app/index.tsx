import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";

import { useAuth } from "@/src/api/auth-context";
import { colors } from "@/src/theme";

export default function Index() {
  const { user, loading } = useAuth();

  // Keep splash-ish loading
  useEffect(() => {}, []);

  if (loading) {
    return (
      <View
        testID="boot-loading"
        style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={user ? "/(tabs)/hub" : "/(auth)/login"} />;
}
