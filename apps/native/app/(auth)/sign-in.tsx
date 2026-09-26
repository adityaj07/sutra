import { View } from "react-native";

import { Container } from "@/components/container";
import { Text } from "@/components/text";

export default function SignInScreen() {
  return (
    <Container>
      <View className="flex-1 justify-center gap-2 p-6">
        <Text variant="heading2" className="text-foreground">
          Sign in to Sūtra
        </Text>
        <Text className="text-muted">
          Continue the conversation with your team.
        </Text>
      </View>
    </Container>
  );
}
