mod commands;
mod library;
mod python_bridge;

use python_bridge::PythonBridge;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(PythonBridge::default())
        .invoke_handler(tauri::generate_handler![
            commands::generate_image,
            commands::preload_model,
            commands::python_health,
            commands::resolve_doc_path,
            library::library_import,
            library::library_save,
            library::library_load
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
