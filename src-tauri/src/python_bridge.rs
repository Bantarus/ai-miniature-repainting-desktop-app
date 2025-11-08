use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::{async_runtime::tokio::time::sleep, AppHandle, Emitter};

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

#[derive(Debug)]
pub struct PythonBridge {
    initialized: AtomicBool,
}

impl Default for PythonBridge {
    fn default() -> Self {
        Self {
            initialized: AtomicBool::new(false),
        }
    }
}

impl PythonBridge {
    pub async fn generate_with_progress(
        &self,
        app: &AppHandle,
        request: GenerationRequest,
    ) -> Result<GenerationResponse, BridgeError> {
        self.initialized.store(true, Ordering::SeqCst);

        let GenerationRequest {
            prompt,
            negative_prompt,
            model,
            steps,
            guidance_scale,
        } = request;

        let total_steps = steps.max(1);

        for step in 0..=total_steps {
            let update = ProgressUpdate {
                current: step,
                total: total_steps,
                percentage: if total_steps == 0 {
                    0.0
                } else {
                    (step as f32 / total_steps as f32) * 100.0
                },
                message: None,
            };

            app.emit("generation-progress", update)
                .map_err(BridgeError::from)?;
            sleep(Duration::from_millis(50)).await;
        }

        let response = GenerationResponse {
            status: GenerationStatus::Completed,
            output_path: None,
            metadata: GenerationMetadata {
                prompt,
                negative_prompt,
                model,
                steps: total_steps,
                guidance_scale,
            },
        };

        Ok(response)
    }

    pub async fn health_check(&self) -> Result<bool, BridgeError> {
        Ok(self.initialized.load(Ordering::SeqCst))
    }
}
