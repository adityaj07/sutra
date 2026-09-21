import { Button, Typography } from "heroui-native";
import { View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background">
      <Typography className="text-sutra-brand text-2xl font-bold">
        Sūtra
      </Typography>

      <Button>
        <Button.Label>Test button</Button.Label>
      </Button>
    </View>
  );
}
