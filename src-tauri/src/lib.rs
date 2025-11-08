mod commands;
mod python_bridge;

use python_bridge::PythonBridge;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(PythonBridge::default())
        .invoke_handler(tauri::generate_handler![
            commands::generate_image,
            commands::python_health
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
