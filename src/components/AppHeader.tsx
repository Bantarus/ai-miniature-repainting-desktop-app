import { ActionButton, Flex, Heading, Text, View } from "@adobe/react-spectrum";
import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";

async function openStackOverview(): Promise<void> {
  try {
    // The Rust side resolves the absolute path (bundled resource in production,
    // walked up from the executable in development) so the relative path works
    // regardless of the process working directory.
    const path = await invoke<string>("resolve_doc_path", {
      name: "TECHNICAL_STACK_DEFINITION.md",
    });
    await openPath(path);
  } catch (error) {
    console.error("Failed to open the stack overview document", error);
  }
}

export function AppHeader(): JSX.Element {
  return (
    <View backgroundColor="gray-100" borderBottomWidth="thin" borderColor="gray-300" padding="size-200">
      <Flex alignItems="center" justifyContent="space-between" gap="size-200">
        <Flex direction="column" gap="size-50">
          <Heading level={3}>AI Miniature Repainting Studio</Heading>
          <Text>Iteratively explore miniature paint schemes with production-ready AI tooling.</Text>
        </Flex>
        <ActionButton aria-label="View technical stack" onPress={() => void openStackOverview()}>
          Stack Overview
        </ActionButton>
      </Flex>
    </View>
  );
}
