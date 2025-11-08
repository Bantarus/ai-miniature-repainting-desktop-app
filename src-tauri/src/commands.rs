use tauri::{AppHandle, State};

use crate::python_bridge::{GenerationRequest, GenerationResponse, PythonBridge};

#[tauri::command]
pub async fn generate_image(
    app: AppHandle,
    bridge: State<'_, PythonBridge>,
    request: GenerationRequest,
) -> Result<GenerationResponse, String> {
    bridge
        .generate_with_progress(&app, request)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn python_health(bridge: State<'_, PythonBridge>) -> Result<bool, String> {
    bridge
        .health_check()
        .await
        .map_err(|error| error.to_string())
}
