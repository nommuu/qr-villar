import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "@/constants/colors";

type Props = { title: string };

export default function Header({ title }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
});
