import { Flex, Provider, View, defaultTheme } from "@adobe/react-spectrum";
import { useGenerationController } from "../hooks/useGenerationController";
import { AppHeader } from "./AppHeader";
import { PromptPanel } from "./PromptPanel";
import { PreviewPanel } from "./PreviewPanel";

export function AppShell(): JSX.Element {
  const generation = useGenerationController();

  return (
    <Provider theme={defaultTheme} colorScheme="dark">
      <Flex direction="column" height="100vh">
        <AppHeader />
        <Flex flex={1} minHeight={0}>
          <View
            width={{ base: "size-3400", L: "size-3600" }}
            borderEndWidth="thin"
            borderColor="gray-800"
            padding="size-200"
            minWidth="size-3200"
            backgroundColor="gray-900"
          >
            <PromptPanel
              isGenerating={generation.isGenerating}
              onSubmit={generation.startGeneration}
            />
          </View>
          <View flex={1} minWidth={0} padding="size-300" backgroundColor="gray-900">
            <PreviewPanel
              isGenerating={generation.isGenerating}
              progress={generation.progress}
              response={generation.response}
              error={generation.error}
            />
          </View>
        </Flex>
      </Flex>
    </Provider>
  );
}
