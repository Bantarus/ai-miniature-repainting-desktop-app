import { ActionButton, Flex, Heading, Text, View } from "@adobe/react-spectrum";
import { openPath } from "@tauri-apps/plugin-opener";

export function AppHeader(): JSX.Element {
  return (
    <View backgroundColor="gray-900" borderBottomWidth="thin" borderColor="gray-800" padding="size-200">
      <Flex alignItems="center" justifyContent="space-between" gap="size-200">
        <Flex direction="column" gap="size-50">
          <Heading level={3}>AI Miniature Repainting Studio</Heading>
          <Text>Iteratively explore miniature paint schemes with production-ready AI tooling.</Text>
        </Flex>
        <ActionButton
          aria-label="View technical stack"
          onPress={async () => {
            await openPath("docs/TECHNICAL_STACK_DEFINITION.md");
          }}
        >
          Stack Overview
        </ActionButton>
      </Flex>
    </View>
  );
}
