use std::fs;
use std::path::PathBuf;

use tauri::{AppHandle, Manager};

/// The app-owned directory where layer images live, so they survive the OS temp
/// dir being cleared between sessions (the Python backend writes outputs to %TEMP%).
fn library_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("Could not resolve app data dir: {error}"))?;
    let dir = base.join("library");
    fs::create_dir_all(&dir).map_err(|error| format!("Could not create library dir: {error}"))?;
    Ok(dir)
}

fn project_path(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_local_data_dir()
        .map_err(|error| format!("Could not resolve app data dir: {error}"))?;
    fs::create_dir_all(&base).map_err(|error| format!("Could not create app data dir: {error}"))?;
    Ok(base.join("library.json"))
}

fn sanitize_file_name(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() || name.contains('/') || name.contains('\\') || name.contains("..") {
        return Err(format!("Invalid library file name: {name}"));
    }
    Ok(name.to_string())
}

/// Copy an image into the app-owned library under `file_name`, returning the new
/// absolute path. Used so chained/persisted layer images don't rely on %TEMP%.
#[tauri::command]
pub fn library_import(
    app: AppHandle,
    source_path: String,
    file_name: String,
) -> Result<String, String> {
    let file_name = sanitize_file_name(&file_name)?;
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Err(format!("Source image not found: {source_path}"));
    }
    let dest = library_dir(&app)?.join(&file_name);
    fs::copy(&source, &dest)
        .map_err(|error| format!("Could not copy image into library: {error}"))?;
    dest.into_os_string()
        .into_string()
        .map_err(|_| "Library path is not valid UTF-8".to_string())
}

/// Persist the serialized project (base image + layer stack) to `library.json`.
#[tauri::command]
pub fn library_save(app: AppHandle, json: String) -> Result<(), String> {
    let path = project_path(&app)?;
    fs::write(&path, json).map_err(|error| format!("Could not write project: {error}"))
}

/// Load the serialized project JSON, or an empty string if none has been saved.
#[tauri::command]
pub fn library_load(app: AppHandle) -> Result<String, String> {
    let path = project_path(&app)?;
    if !path.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(&path).map_err(|error| format!("Could not read project: {error}"))
}
