use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};

use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tokio::task;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationRequest {
    pub prompt: String,
    #[serde(default)]
    pub negative_prompt: Option<String>,
    pub model: String,
    pub steps: u32,
    pub guidance_scale: f32,
    #[serde(default)]
    pub source_image_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationMetadata {
    pub prompt: String,
    #[serde(default)]
    pub negative_prompt: Option<String>,
    pub model: String,
    pub steps: u32,
    pub guidance_scale: f32,
    #[serde(default)]
    pub source_image_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GenerationStatus {
    Pending,
    Running,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationResponse {
    pub status: GenerationStatus,
    #[serde(default)]
    pub output_path: Option<String>,
    pub metadata: GenerationMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressUpdate {
    pub current: u32,
    pub total: u32,
    pub percentage: f32,
    #[serde(default)]
    pub message: Option<String>,
}

#[derive(Debug)]
pub struct BridgeError {
    message: String,
}

impl BridgeError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

impl std::fmt::Display for BridgeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::error::Error for BridgeError {}

impl From<tauri::Error> for BridgeError {
    fn from(value: tauri::Error) -> Self {
        Self::new(value.to_string())
    }
}

impl From<pyo3::PyErr> for BridgeError {
    fn from(value: pyo3::PyErr) -> Self {
        Self::new(value.to_string())
    }
}

impl From<std::io::Error> for BridgeError {
    fn from(value: std::io::Error) -> Self {
        Self::new(value.to_string())
    }
}

impl From<serde_json::Error> for BridgeError {
    fn from(value: serde_json::Error) -> Self {
        Self::new(value.to_string())
    }
}

impl From<tokio::task::JoinError> for BridgeError {
    fn from(value: tokio::task::JoinError) -> Self {
        Self::new(value.to_string())
    }
}

#[derive(Debug)]
pub struct PythonBridge {
    module: OnceCell<Py<PyModule>>,
    init_lock: Mutex<()>,
    sidecar: Mutex<Option<Child>>,
    ready: AtomicBool,
}

impl Default for PythonBridge {
    fn default() -> Self {
        // Resolve HuggingFace model weights to the on-disk cache on E: so the large
        // (~24 GB) FLUX weights stay off the nearly-full C: drive. Set before the
        // interpreter initializes so Python's os.environ picks it up; respect an
        // existing value if the user already configured one.
        if std::env::var_os("HF_HOME").is_none() {
            std::env::set_var("HF_HOME", r"E:\hf_cache");
        }

        pyo3::prepare_freethreaded_python();

        Self {
            module: OnceCell::new(),
            init_lock: Mutex::new(()),
            sidecar: Mutex::new(None),
            ready: AtomicBool::new(false),
        }
    }
}

impl Drop for PythonBridge {
    fn drop(&mut self) {
        if let Some(mut child) = self.sidecar.lock().take() {
            let _ = child.kill();
        }
    }
}

impl PythonBridge {
    pub async fn generate_with_progress(
        &self,
        app: &AppHandle,
        request: GenerationRequest,
    ) -> Result<GenerationResponse, BridgeError> {
        let module = self.ensure_initialized(app)?;
        let total_steps = request.steps.max(1);

        let start_update = ProgressUpdate {
            current: 0,
            total: total_steps,
            percentage: 0.0,
            message: Some("Starting Python generation".to_string()),
        };

        app.emit("generation-progress", start_update)?;

        let request_json = serde_json::to_string(&request)?;
        let progress_app = app.clone();

        let response = task::spawn_blocking(move || -> Result<GenerationResponse, BridgeError> {
            Python::with_gil(|py| -> Result<GenerationResponse, BridgeError> {
                // Marshal the request/response across the FFI boundary as JSON so we
                // can rely on serde on the Rust side and plain dicts on the Python side.
                let module = module.bind(py);
                let json = py.import_bound("json")?;
                let py_request = json.call_method1("loads", (request_json,))?;

                // A Python-callable progress hook the backend invokes as
                // `progress(current, total, message)`; each call emits a Tauri event
                // so the UI can follow the generation step by step.
                let callback = pyo3::types::PyCFunction::new_closure_bound(
                    py,
                    None,
                    None,
                    move |args, _kwargs| {
                        let current = args
                            .get_item(0)
                            .ok()
                            .and_then(|value| value.extract::<u32>().ok())
                            .unwrap_or(0);
                        let total = args
                            .get_item(1)
                            .ok()
                            .and_then(|value| value.extract::<u32>().ok())
                            .unwrap_or(0);
                        let message = args
                            .get_item(2)
                            .ok()
                            .and_then(|value| value.extract::<String>().ok());
                        let percentage = if total > 0 {
                            (current as f32 / total as f32) * 100.0
                        } else {
                            0.0
                        };
                        let _ = progress_app.emit(
                            "generation-progress",
                            ProgressUpdate {
                                current,
                                total,
                                percentage,
                                message,
                            },
                        );
                    },
                )?;

                let result = module.call_method1("generate", (py_request, callback))?;
                let result_json: String = json.call_method1("dumps", (result,))?.extract()?;
                let response: GenerationResponse = serde_json::from_str(&result_json)?;
                Ok(response)
            })
        })
        .await??;

        let complete_update = ProgressUpdate {
            current: total_steps,
            total: total_steps,
            percentage: 100.0,
            message: Some("Python generation completed".to_string()),
        };

        app.emit("generation-progress", complete_update)?;

        Ok(response)
    }

    pub async fn health_check(&self) -> Result<bool, BridgeError> {
        let mut running = false;

        let mut sidecar_guard = self.sidecar.lock();
        if let Some(child) = sidecar_guard.as_mut() {
            match child.try_wait() {
                Ok(Some(_)) => {
                    sidecar_guard.take();
                }
                Ok(None) => {
                    running = true;
                }
                Err(_) => {
                    sidecar_guard.take();
                }
            }
        }

        Ok(self.ready.load(Ordering::SeqCst) && running)
    }

    fn ensure_initialized(&self, app: &AppHandle) -> Result<Py<PyModule>, BridgeError> {
        if let Some(module) = self.module.get() {
            return Ok(module.clone());
        }

        let _guard = self.init_lock.lock();

        if let Some(module) = self.module.get() {
            return Ok(module.clone());
        }

        let python_root = Self::locate_python_root(app)?;
        let python_path = Self::build_pythonpath(&python_root)?;

        std::env::set_var("PYTHONPATH", &python_path);
        self.spawn_sidecar(&python_root, &python_path)?;

        // `python` is a package (it contains __init__.py) imported as
        // `python.inference`, so the directory that *contains* the `python`
        // folder — i.e. its parent — must be on sys.path, not the folder itself.
        let package_parent = python_root.parent().unwrap_or(python_root.as_path());

        // The heavy ML stack (torch+CUDA, diffusers, …) lives in a project-local
        // venv on E:. Ensure its site-packages are importable by the embedded
        // interpreter (for an embedded venv, Python does not auto-add this).
        let venv_site = package_parent
            .join(".venv")
            .join("Lib")
            .join("site-packages");

        let module = Python::with_gil(|py| -> PyResult<Py<PyModule>> {
            let sys = py.import_bound("sys")?;
            let sys_path = sys.getattr("path")?.downcast_into::<pyo3::types::PyList>()?;

            // Prepend both the venv site-packages and the project root if absent.
            for path in [venv_site.as_path(), package_parent] {
                let Some(path_str) = path.to_str() else {
                    continue;
                };
                let already_present = sys_path.iter().any(|entry| {
                    entry
                        .extract::<String>()
                        .map(|p| p == path_str)
                        .unwrap_or(false)
                });
                if !already_present {
                    sys_path.insert(0, path_str)?;
                }
            }

            let module = PyModule::import_bound(py, "python.inference")?;
            module.call_method0("load_runtime")?;
            Ok(module.into())
        })?;

        self.module
            .set(module.clone())
            .map_err(|_| BridgeError::new("Python module already initialised"))?;

        self.ready.store(true, Ordering::SeqCst);

        Ok(module)
    }

    fn spawn_sidecar(&self, python_root: &Path, python_path: &OsString) -> Result<(), BridgeError> {
        let mut guard = self.sidecar.lock();

        if guard.is_some() {
            return Ok(());
        }

        let Some((program, args)) = Self::sidecar_invocation(python_root) else {
            return Err(BridgeError::new(
                "Unable to locate Python sidecar executable or script",
            ));
        };

        let mut command = Command::new(program);
        if !args.is_empty() {
            command.args(&args);
        }

        command.env("PYTHONPATH", python_path);
        command.stdin(Stdio::null());
        command.stdout(Stdio::null());
        command.stderr(Stdio::null());

        let child = command.spawn()?;
        *guard = Some(child);

        Ok(())
    }

    fn sidecar_invocation(python_root: &Path) -> Option<(PathBuf, Vec<OsString>)> {
        if let Some(explicit) = std::env::var_os("PYTHON_SIDECAR") {
            return Some((PathBuf::from(explicit), Vec::new()));
        }

        let dist_dir = python_root.join("dist");
        let binary_name = if cfg!(windows) {
            "inference-sidecar.exe"
        } else {
            "inference-sidecar"
        };
        let binary_path = dist_dir.join(binary_name);

        if binary_path.exists() {
            return Some((binary_path, Vec::new()));
        }

        let script_path = python_root.join("sidecar.py");
        if script_path.exists() {
            let interpreter = std::env::var_os("PYTHON_EXECUTABLE")
                .map(PathBuf::from)
                .unwrap_or_else(|| {
                    if cfg!(windows) {
                        PathBuf::from("python.exe")
                    } else {
                        PathBuf::from("python3")
                    }
                });

            return Some((interpreter, vec![script_path.into_os_string()]));
        }

        None
    }

    fn build_pythonpath(python_root: &Path) -> Result<OsString, BridgeError> {
        let mut paths = vec![python_root.to_path_buf()];

        if let Some(existing) = std::env::var_os("PYTHONPATH") {
            for entry in std::env::split_paths(&existing) {
                if entry != python_root {
                    paths.push(entry);
                }
            }
        }

        std::env::join_paths(paths).map_err(|_| BridgeError::new("Failed to construct PYTHONPATH"))
    }

    fn locate_python_root(app: &AppHandle) -> Result<PathBuf, BridgeError> {
        use tauri::path::BaseDirectory;
        use tauri::Manager;

        if let Ok(resource) = app.path().resolve("python", BaseDirectory::Resource) {
            if resource.exists() {
                return Ok(resource);
            }
        }

        if let Ok(resource_dir) = app.path().resource_dir() {
            let candidate = resource_dir.join("python");
            if candidate.exists() {
                return Ok(candidate);
            }
        }

        let mut current_dir = std::env::current_exe()
            .ok()
            .and_then(|path| path.parent().map(|p| p.to_path_buf()))
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());

        for _ in 0..5 {
            let candidate = current_dir.join("python");
            if candidate.exists() {
                return Ok(candidate);
            }
            if !current_dir.pop() {
                break;
            }
        }

        Err(BridgeError::new(
            "Unable to locate the Python runtime directory",
        ))
    }
}
