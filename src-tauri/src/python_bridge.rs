use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};

use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use pyo3::prelude::*;
use pyo3::types::{PyDict, PyList};
use serde::{Deserialize, Serialize};
use tauri::{path::BaseDirectory, AppHandle, Emitter, Manager};
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
        let python_module = self.ensure_initialized(app)?;
        let total_steps = request.steps.max(1);

        let start_update = ProgressUpdate {
            current: 0,
            total: total_steps,
            percentage: 0.0,
            message: Some("Starting Python generation".to_string()),
        };

        app.emit("generation-progress", start_update)?;

        let request_for_python = request;

        let response = task::spawn_blocking(move || -> Result<GenerationResponse, BridgeError> {
            Python::with_gil(|py| -> PyResult<GenerationResponse> {
                let module = python_module.bind(py);
                let py_request = PyDict::new_bound(py);

                py_request.set_item("prompt", &request_for_python.prompt)?;
                py_request.set_item("model", &request_for_python.model)?;
                py_request.set_item("steps", request_for_python.steps)?;
                py_request.set_item("guidance_scale", request_for_python.guidance_scale)?;

                match &request_for_python.negative_prompt {
                    Some(value) => py_request.set_item("negative_prompt", value)?,
                    None => py_request.set_item("negative_prompt", py.None())?,
                };

                let result = module.call_method1("generate", (py_request.into_py(py),))?;
                let json_module = py.import_bound("json")?;
                let response_json: String =
                    json_module.call_method1("dumps", (result,))?.extract()?;

                serde_json::from_str(&response_json)
                    .map_err(|err| PyErr::new::<pyo3::exceptions::PyValueError, _>(err.to_string()))
            })
            .map_err(BridgeError::from)
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

        let python_dir = Self::locate_python_root(app)?;
        let module_root = python_dir.parent().ok_or_else(|| {
            BridgeError::new("Python runtime directory is missing a parent directory")
        })?;
        let python_path = Self::build_pythonpath(module_root)?;

        std::env::set_var("PYTHONPATH", &python_path);
        self.spawn_sidecar(&python_dir, &python_path)?;

        let module = Python::with_gil(|py| -> PyResult<Py<PyModule>> {
            let sys = py.import_bound("sys")?;
            let sys_path = sys.getattr("path")?.downcast_into::<PyList>()?;

            let root_str = module_root.to_str().ok_or_else(|| {
                PyErr::new::<pyo3::exceptions::PyRuntimeError, _>("Invalid Python module path")
            })?;

            if !sys_path.iter().any(|entry| {
                entry
                    .extract::<&str>()
                    .map(|p| p == root_str)
                    .unwrap_or(false)
            }) {
                sys_path.insert(0, root_str)?;
            }

            let module = PyModule::import_bound(py, "python.inference")?;
            module.call_method0("load_runtime")?;
            Ok(module.unbind())
        })?;

        self.module
            .set(module.clone())
            .map_err(|_| BridgeError::new("Python module already initialised"))?;

        self.ready.store(true, Ordering::SeqCst);

        Ok(module)
    }

    fn spawn_sidecar(&self, python_dir: &Path, python_path: &OsString) -> Result<(), BridgeError> {
        let mut guard = self.sidecar.lock();

        if guard.is_some() {
            return Ok(());
        }

        let Some((program, args)) = Self::sidecar_invocation(python_dir) else {
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

    fn sidecar_invocation(python_dir: &Path) -> Option<(PathBuf, Vec<OsString>)> {
        if let Some(explicit) = std::env::var_os("PYTHON_SIDECAR") {
            return Some((PathBuf::from(explicit), Vec::new()));
        }

        let dist_dir = python_dir.join("dist");
        let binary_name = if cfg!(windows) {
            "inference-sidecar.exe"
        } else {
            "inference-sidecar"
        };
        let binary_path = dist_dir.join(binary_name);

        if binary_path.exists() {
            return Some((binary_path, Vec::new()));
        }

        let script_path = python_dir.join("sidecar.py");
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

    fn build_pythonpath(module_root: &Path) -> Result<OsString, BridgeError> {
        let mut paths = vec![module_root.to_path_buf()];

        if let Some(existing) = std::env::var_os("PYTHONPATH") {
            for entry in std::env::split_paths(&existing) {
                if entry != module_root {
                    paths.push(entry);
                }
            }
        }

        std::env::join_paths(paths).map_err(|_| BridgeError::new("Failed to construct PYTHONPATH"))
    }

    fn locate_python_root(app: &AppHandle) -> Result<PathBuf, BridgeError> {
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
