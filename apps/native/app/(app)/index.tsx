import { Button } from "heroui-native";
import { ScrollView, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-background pt-4">
      <View className="gap-6 p-6">
        <View className="gap-1">
          <Text className="text-3xl font-bold text-foreground">Sūtra</Text>
          <Text className="text-muted">
            A visual demo of the app color tokens.
          </Text>
        </View>

        <View className="gap-3">
          <Text className="text-lg font-semibold text-foreground">
            Surfaces
          </Text>
          <View className="gap-3 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-surface-foreground">Surface</Text>
            <View className="rounded-xl bg-surface-secondary p-4">
              <Text className="text-surface-secondary-foreground">
                Surface secondary
              </Text>
            </View>
            <View className="rounded-xl bg-surface-tertiary p-4">
              <Text className="text-surface-tertiary-foreground">
                Surface tertiary
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-lg font-semibold text-foreground">Brand</Text>
          <View className="gap-3">
            <View className="rounded-2xl bg-accent p-4">
              <Text className="font-semibold text-accent-foreground">
                Accent / primary
              </Text>
            </View>
            <View className="rounded-2xl bg-default p-4">
              <Text className="text-default-foreground">Default</Text>
            </View>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-lg font-semibold text-foreground">Status</Text>
          <View className="flex-row flex-wrap gap-3">
            <View className="rounded-xl bg-success px-4 py-3">
              <Text className="font-semibold text-success-foreground">
                Success
              </Text>
            </View>
            <View className="rounded-xl bg-warning px-4 py-3">
              <Text className="font-semibold text-warning-foreground">
                Warning
              </Text>
            </View>
            <View className="rounded-xl bg-danger px-4 py-3">
              <Text className="font-semibold text-danger-foreground">
                Danger
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-lg font-semibold text-foreground">
            Sūtra tokens
          </Text>
          <View className="gap-2 rounded-2xl border border-separator bg-surface p-4">
            <Text className="text-unread">Unread</Text>
            <Text className="text-mention">Mention</Text>
            <Text className="text-online">Online</Text>
            <Text className="text-away">Away</Text>
            <Text className="text-offline">Offline</Text>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-lg font-semibold text-foreground">Buttons</Text>
          <Button variant="primary" onPress={() => console.log("Primary")}>
            Primary
          </Button>
          <Button variant="secondary" onPress={() => console.log("Secondary")}>
            Secondary
          </Button>
          <Button variant="outline" onPress={() => console.log("Outline")}>
            Outline
          </Button>
          <Button variant="ghost" onPress={() => console.log("Ghost")}>
            Ghost
          </Button>
          <Button variant="danger" onPress={() => console.log("Danger")}>
            Danger
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
