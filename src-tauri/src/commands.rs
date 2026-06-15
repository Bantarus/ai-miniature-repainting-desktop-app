use std::path::PathBuf;

use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager, State};

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
pub async fn preload_model(
    app: AppHandle,
    bridge: State<'_, PythonBridge>,
    model: String,
) -> Result<bool, String> {
    bridge
        .preload_model(&app, model)
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

/// Resolve a document shipped under the `docs/` directory to an absolute path.
///
/// In a bundled application the file lives in the resource directory; during
/// development it is found by walking up from the executable to the project
/// root. Returning an absolute path lets the frontend open it regardless of the
/// process working directory.
#[tauri::command]
pub fn resolve_doc_path(app: AppHandle, name: String) -> Result<String, String> {
    let file_name = name.trim();
    if file_name.is_empty()
        || file_name.contains("..")
        || file_name.contains('/')
        || file_name.contains('\\')
    {
        return Err(format!("Invalid document name: {name}"));
    }

    let relative = format!("docs/{file_name}");

    // 1. Bundled resource (production).
    if let Ok(resource) = app.path().resolve(&relative, BaseDirectory::Resource) {
        if resource.exists() {
            return path_to_string(resource);
        }
    }

    // 2. Walk up from the executable to find the project `docs/` dir (development).
    let mut dir = std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(PathBuf::from))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

    for _ in 0..6 {
        let candidate = dir.join("docs").join(file_name);
        if candidate.exists() {
            return path_to_string(candidate);
        }
        if !dir.pop() {
            break;
        }
    }

    Err(format!("Document not found: {file_name}"))
}

fn path_to_string(path: PathBuf) -> Result<String, String> {
    path.into_os_string()
        .into_string()
        .map_err(|_| "Document path is not valid UTF-8".to_string())
}
