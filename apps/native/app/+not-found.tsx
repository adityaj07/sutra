import { Button, Column, Host, Text as ExpoUIText } from "@expo/ui";
import { Stack, router } from "expo-router";
import { View, StyleSheet } from "react-native";
import { typographyStyle } from "@sutra/typography";

import { Container } from "@/components/container";
import { Text } from "@/components/text";
import { NAV_THEME } from "@/lib/constants";
import { useColorScheme } from "@/lib/use-color-scheme";

export default function NotFoundScreen() {
  const { colorScheme } = useColorScheme();
  const theme = colorScheme === "dark" ? NAV_THEME.dark : NAV_THEME.light;

  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <Container>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text>🤔</Text>
            {/* Platform-native text: metrics come from the same tokens. */}
            <Host matchContents={{ vertical: true }}>
              <Column spacing={12} alignment="center">
                <ExpoUIText
                  textStyle={{
                    color: theme.text,
                    ...typographyStyle("heading3"),
                    textAlign: "center",
                  }}
                >
                  Page Not Found
                </ExpoUIText>
                <ExpoUIText
                  textStyle={{
                    color: theme.text,
                    ...typographyStyle("body"),
                    textAlign: "center",
                  }}
                  style={{ opacity: 0.7 }}
                >
                  Sorry, the page you&apos;re looking for doesn&apos;t exist.
                </ExpoUIText>
                <Button
                  label="Go to Home"
                  variant="outlined"
                  onPress={() => router.replace("/")}
                />
              </Column>
            </Host>
          </View>
        </View>
      </Container>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  content: {
    alignItems: "center",
  },
});
