import { ScrollView, View } from "react-native";

import { Button } from "@/components/button";
import { Text } from "@/components/text";

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-background pt-4">
      <View className="gap-6 p-6">
        <View className="gap-1">
          <Text variant="heading1" className="text-foreground">
            Sūtra
          </Text>
          <Text className="text-muted">
            A visual demo of the app color tokens.
          </Text>
        </View>

        <View className="gap-3">
          <Text variant="heading3" className="text-foreground">
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
          <Text variant="heading3" className="text-foreground">
            Brand
          </Text>
          <View className="gap-3">
            <View className="rounded-2xl bg-accent p-4">
              <Text variant="bodyMedium" className="text-accent-foreground">
                Accent / primary
              </Text>
            </View>
            <View className="rounded-2xl bg-default p-4">
              <Text className="text-default-foreground">Default</Text>
            </View>
          </View>
        </View>

        <View className="gap-3">
          <Text variant="heading3" className="text-foreground">
            Status
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <View className="rounded-xl bg-success px-4 py-3">
              <Text variant="bodyMedium" className="text-success-foreground">
                Success
              </Text>
            </View>
            <View className="rounded-xl bg-warning px-4 py-3">
              <Text variant="bodyMedium" className="text-warning-foreground">
                Warning
              </Text>
            </View>
            <View className="rounded-xl bg-danger px-4 py-3">
              <Text variant="bodyMedium" className="text-danger-foreground">
                Danger
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-3">
          <Text variant="heading3" className="text-foreground">
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
          <Text variant="heading3" className="text-foreground">
            Typography
          </Text>
          <View className="gap-2 rounded-2xl border border-separator bg-surface p-4">
            <Text variant="display">Display</Text>
            <Text variant="heading2">Heading 2</Text>
            <Text variant="title">Title</Text>
            <Text variant="body">Body</Text>
            <Text variant="bodySmall">Body small</Text>
            <Text variant="caption">Caption</Text>
            <Text variant="overline" className="uppercase">
              Overline
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <Text variant="heading3" className="text-foreground">
            Buttons
          </Text>
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
