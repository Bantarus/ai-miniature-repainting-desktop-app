# Technical Stack Definition: AI Miniature Repainting Desktop Application

**Version:** 1.0
**Date:** November 7, 2025
**Status:** APPROVED

---

## Executive Summary

This document defines the complete technical stack for building a production-ready, cross-platform desktop application for AI-powered miniature painting idea iteration. The stack has been selected through comprehensive analysis of three architectural approaches, weighing performance, memory efficiency, development complexity, licensing considerations, and long-term maintainability.

**Key Decision:** We adopt a **Tauri + React + PyTauri + ComfyUI + Multi-Model** architecture that prioritizes memory efficiency (critical for AI workloads), maintains model flexibility (avoiding vendor lock-in), and provides professional UX while managing GPL licensing risks through strict API separation.

---

## 1. Technology Stack Overview

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Desktop Framework** | Tauri | v2.x | Minimal memory footprint (30-40MB vs 200-300MB Electron) critical for AI workloads |
| **Frontend Framework** | React | v18.x | Industry standard for complex SPAs with large ecosystem |
| **Language (Frontend)** | TypeScript | v5.x | Type safety, better tooling, reduced runtime errors |
| **Design System** | Adobe React Spectrum | v3.x | Professional "Adobe-like" aesthetic, accessibility built-in |
| **Backend Language** | Python | 3.10+ | ML ecosystem requirements (PyTorch, Diffusers, ComfyUI) |
| **AI Engine (Primary)** | ComfyUI | Latest | Superior inference speed, better GGUF integration, proven quality |
| **AI Library (Fallback)** | Diffusers | v0.35.0+ | Programmatic API, model flexibility, stable releases |
| **IPC Bridge** | PyTauri (Pyo3) | Latest | Zero-overhead Rust-Python communication |
| **Primary Model** | FLUX Kontext | Latest | Stable aspect ratios, reliable context preservation |
| **Alternative Model** | Qwen-Image-Edit | v2509 | Text editing capabilities (with known alignment limitations) |
| **Model Optimization** | GGUF Q4_K | - | 15GB VRAM requirement, optimal quality/performance balance |
| **Python Packaging** | PyInstaller | Latest | Sidecar executable for dependency isolation |
| **Asset Distribution** | Tauri Resources | - | Secure bundling of large model files (7-20GB) |

---

## 2. Desktop Framework: Tauri (SELECTED)

### Decision Rationale

**Tauri is mandatory** for this AI-focused application due to its minimal resource footprint. The 170-270MB memory savings compared to Electron directly translates to available VRAM for AI model execution.

### Comparative Analysis

| Metric | Tauri (✓ Selected) | Electron |
|--------|-------------------|-----------|
| Idle Memory | 30-40 MB | 200-300 MB |
| Installer Size | <10 MB | >100 MB |
| Launch Speed | <0.5s | 1-2s |
| Core Tech | Rust + System WebView | Node.js + Bundled Chromium |
| Security Model | Explicit function exposure | Broad Node.js API access |
| **Memory Savings** | **Baseline** | **-170-270 MB** |

### Key Benefits
- **Critical for AI Workloads:** When running 15-20GB models, every MB counts
- **Native Performance:** Rust core provides native-level performance
- **Security by Default:** Functions must be explicitly exposed via `#[tauri::command]`
- **System WebView:** No Chromium bundle = smaller distribution

### Trade-offs
- Smaller ecosystem than Electron (acceptable - growing rapidly)
- Some Rust knowledge required for backend commands (mitigated by PyTauri bridge)
- Newer platform with fewer battle-tested examples (offset by excellent documentation)

---

## 3. Frontend Stack: React + TypeScript + Adobe React Spectrum

### React + TypeScript (SELECTED)

**Rationale:** Industry-standard combination for complex, stateful UIs with strong typing.

**Why React:**
- Mature ecosystem with extensive component libraries
- Virtual DOM for efficient updates during AI generation progress
- Large talent pool for future development
- Excellent tooling (DevTools, testing frameworks)

**Why TypeScript:**
- Type safety prevents runtime errors in complex state management
- Better IDE support and autocomplete
- Self-documenting code through interfaces
- Reduces bugs in IPC communication layer

### Adobe React Spectrum (SELECTED)

**Rationale:** Achieves the "Adobe-like professional look" requirement natively.

**Key Benefits:**
- Official Adobe design system implementation
- Accessibility (WCAG 2.1 AA) built-in
- Unstyled hooks + styled components architecture
- Professional creative tool aesthetic
- Dark mode support (standard for creative software)

**Alternative Considered:** Material-UI / MUI
- **Rejected:** Google-style design language doesn't match Adobe aesthetic
- **Rejected:** More customization needed to achieve professional creative tool look

---

## 4. AI Backend Architecture: Hybrid ComfyUI + Diffusers

### Primary: ComfyUI (API Mode)

**SELECTED as primary inference engine for performance and quality.**

#### Performance Comparison

| Metric | ComfyUI (✓ Primary) | Diffusers (Fallback) |
|--------|---------------------|----------------------|
| Inference Speed | 1s per iteration | 15s per iteration (unoptimized) |
| GGUF Support | Excellent (ComfyUI-GGUF) | Limited (from_single_file only) |
| Quality | Superior (node-based workflow integrity) | Requires optimization |
| Memory Management | Automatic optimization | Manual configuration needed |

#### Key Advantages
1. **15x Faster Inference:** 1s vs 15s reported in benchmarks
2. **Better GGUF Integration:** ComfyUI-GGUF custom nodes proven reliable
3. **Superior Quality:** Maintains workflow integrity, less texture smoothing
4. **Virtual VRAM Support:** DisTorch nodes enable layer offloading for low-VRAM GPUs
5. **Proven Workflows:** Large community with tested workflows

#### GPL Licensing Risk Mitigation

**Challenge:** ComfyUI core is GPL-licensed, creating derivative work concerns.

**Mitigation Strategy:**
1. **Strict API Separation:** Communicate exclusively via documented JSON API endpoints
2. **Process Isolation:** Run ComfyUI as separate sidecar process, not embedded code
3. **License Audit:** Only use custom nodes with permissive licenses (MIT, Apache 2.0)
4. **In-House Nodes:** Develop critical functionality internally under permissive license
5. **Legal Position:** Desktop app is a *client* of ComfyUI API, not derivative work

**Legal Assessment:** With strict API boundary and process isolation, GPL contagion risk is contained. Similar to how proprietary apps can call GPL-licensed tools via subprocess.

### Fallback: Diffusers Library

**INCLUDED as fallback option for licensing-sensitive deployments and model flexibility.**

#### Key Advantages
1. **Clean Programmatic API:** Direct Python function calls, no JSON workflows
2. **Enterprise Backing:** HuggingFace support, stable monthly releases
3. **Permissive License:** Apache 2.0, no GPL concerns
4. **Model Flexibility:** Easier to swap between different model architectures
5. **Better for Direct Control:** UI state → function parameters mapping is cleaner

#### When to Use Diffusers
- Commercial deployments with strict GPL avoidance requirements
- Models not well-supported in ComfyUI ecosystem
- Workflows requiring heavy programmatic manipulation
- Development/testing environments for rapid prototyping

### Architectural Decision: Abstraction Layer

**Implementation:** Create a model-agnostic inference API that abstracts ComfyUI vs Diffusers.

```
UI → Inference API → [ComfyUI (primary) | Diffusers (fallback)]
```

**Benefits:**
- Runtime model engine selection
- A/B testing different backends
- Easy migration if ComfyUI licensing becomes problematic
- Testing with fast mock implementations

---

## 5. Model Strategy: Multi-Model Architecture

### Primary Model: FLUX Kontext (SELECTED)

**Rationale:** Solves the critical alignment problems identified with Qwen-Image-Edit.

**Key Benefits:**
- **Stable Aspect Ratios:** No unpredictable zoom/crop changes
- **Context Preservation:** Maintains spatial relationships across edits
- **Iterative Workflows:** Supports progressive refinement
- **Production Reliability:** Mature model with proven stability

### Secondary Model: Qwen-Image-Edit (CONDITIONAL)

**Status:** Included as optional experimental feature with user warnings.

**Known Limitations:**
- **Critical:** Aspect ratio changes and zoom shifts make it unsuitable for precision work
- **Alignment Issues:** Output doesn't align pixel-perfectly with input
- **Texture Smoothing:** Reduces fine detail critical for miniature painting

**When to Use:**
- Text editing (Chinese/English) - industry-leading capability
- Style transfer where alignment not critical
- Creative exploration (not production-ready editing)
- Novel view synthesis (90°/180° rotation)

**User Disclosure Required:** Clear warnings about alignment limitations.

### Model Architecture Principles

1. **Model-Agnostic API:** Backend abstracts specific model implementations
2. **Runtime Selection:** Users can choose model based on task requirements
3. **Easy Extension:** Add new models as landscape evolves
4. **Graceful Degradation:** Fallback to simpler models if primary unavailable

### Future-Proofing

The AI editing landscape evolves rapidly. Architecture must support:
- Hot-swapping models without app recompilation
- Downloading models on-demand (not bundled in installer)
- Community model support (Civitai, HuggingFace)
- Custom model fine-tuning integration

---

## 6. Model Optimization: GGUF Quantization

### Selected Format: GGUF Q4_K

**Rationale:** Optimal balance of quality, performance, and accessibility.

### Quantization Comparison

| Format | VRAM Required | Quality | Speed | Target Hardware |
|--------|---------------|---------|-------|-----------------|
| Full Precision (bf16) | 60 GB | Baseline | Baseline | Workstation GPUs |
| BitsAndBytes 4-bit | 17-20 GB | Very Good | Good | RTX 4090 (24GB) |
| **GGUF Q4_K** ✓ | **15 GB** | **Very Good** | **Good** | **RTX 4080 (16GB)** |
| GGUF Q3_K | 12 GB | Good | Fast | RTX 3060 (12GB) |
| GGUF Q2_K | 10 GB | Acceptable | Very Fast | Budget GPUs |

### Recommended Configuration by Hardware

**High-End (RTX 4090 24GB):**
- Format: GGUF Q4_K
- Optimization: Model CPU offload enabled
- Speed: 15-20s per generation
- Quality: Near full precision

**Mid-Range (RTX 4080 16GB):**
- Format: GGUF Q4_K
- Optimization: Sequential CPU offload
- Speed: 20-30s per generation
- Quality: Very good

**Budget (RTX 3060 12GB):**
- Format: GGUF Q3_K
- Optimization: Aggressive CPU offload
- Speed: 45-60s per generation
- Quality: Good (acceptable detail loss)

### Additional Optimizations

1. **Lightning LoRA:** 8-step variant for 6x speedup (15-20s → 3s)
2. **xFormers:** Memory-efficient attention (15-20% VRAM reduction)
3. **VAE Tiling:** High-resolution image support
4. **torch.compile():** 20-30% speed improvement after warmup
5. **Virtual VRAM (DisTorch):** Offload static layers to system RAM

---

## 7. IPC Architecture: PyTauri (Pyo3 Bindings)

### Selected: PyTauri (SELECTED)

**Rationale:** Zero-overhead, direct Rust-Python communication eliminates network latency.

### Comparative Analysis

| Method | Latency | Complexity | Security | Concurrency |
|--------|---------|------------|----------|-------------|
| **PyTauri (Pyo3)** ✓ | **<1ms** | **Medium** | **Excellent** | **Good** |
| FastAPI (HTTP) | 5-20ms | Low | Good | Excellent |
| WebSocket | 3-10ms | Medium | Good | Excellent |
| Pipes (stdin/stdout) | 2-5ms | High | Medium | Poor |

### Key Benefits

1. **Zero Network Overhead:** Direct function calls, no serialization/deserialization
2. **Type Safety:** Pyo3 enforces type checking at compile time
3. **Integrated Error Handling:** Rust Result types map to Python exceptions
4. **Memory Efficiency:** No HTTP server overhead, no port conflicts
5. **Tauri Native:** Designed specifically for Tauri architecture

### Communication Pattern

```
React UI → Tauri Command (Rust) → Pyo3 Bridge → Python ML Backend
                                ← Events ←
```

**Request Flow:**
1. User action in React UI triggers `invoke('generate_image', params)`
2. Tauri Rust command receives request
3. Pyo3 bridge calls Python function directly
4. Python executes AI inference (ComfyUI/Diffusers)
5. Progress updates streamed via Tauri Events
6. Final result returned to UI

### Implementation Details

**Frontend (React/TypeScript):**
```typescript
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

// Start generation
await invoke('generate_image', {
  prompt: buildPrompt(uiState),
  model: 'flux-kontext',
  steps: 50
});

// Listen for progress
listen('generation-progress', (event) => {
  updateProgress(event.payload.percentage);
});
```

**Backend (Rust):**
```rust
#[tauri::command]
fn generate_image(prompt: String, model: String, steps: u32) -> Result<String, String> {
    // Call Python via Pyo3
    Python::with_gil(|py| {
        let inference = py.import("inference")?;
        inference.call_method1("generate", (prompt, model, steps))
    })
}
```

**Python (ML Backend):**
```python
def generate(prompt: str, model: str, steps: int) -> str:
    """Called directly from Rust via Pyo3"""
    pipeline = get_model(model)
    result = pipeline(prompt=prompt, num_inference_steps=steps)
    return save_result(result)
```

### Async Progress Streaming

**Challenge:** AI inference takes 15-60s, UI must remain responsive.

**Solution:** Tauri Events for one-way progress updates.

```python
from tauri_events import emit_event

def generate_with_progress(prompt, model, steps):
    for step in range(steps):
        # Emit progress to frontend
        emit_event('generation-progress', {
            'current': step,
            'total': steps,
            'percentage': (step / steps) * 100
        })
        # Continue inference
```

---

## 8. Python Backend Packaging: PyInstaller Sidecar

### Architecture: Standalone Executable

**Rationale:** Isolates complex ML dependencies from end-user system.

### Packaging Strategy

1. **Sidecar Process:** Python backend runs as separate executable managed by Tauri
2. **Dependency Bundling:** All dependencies (PyTorch, ComfyUI, etc.) included
3. **No User Installation:** Users don't need Python, CUDA, or any ML libraries
4. **Fixed Environment:** Known-good dependency versions locked

### PyInstaller Configuration

**Key Requirements:**
- Include hidden imports (uvicorn, diffusers, transformers, torch)
- Exclude unnecessary packages (matplotlib, scipy, pandas) to reduce size
- Handle PyTorch CUDA libraries correctly
- Configure for one-folder distribution (faster startup than one-file)

**Spec File Example:**
```python
# inference.spec
a = Analysis(
    ['inference.py'],
    hiddenimports=['uvicorn', 'diffusers', 'transformers', 'torch'],
    excludes=['matplotlib', 'scipy', 'pandas'],
    # ... other config
)
```

### Expected Bundle Sizes

- **Minimal (CPU only):** 1.5-2 GB
- **Standard (CUDA 11.8):** 2.5-3.5 GB
- **Full (CUDA + optimizations):** 3.5-4.5 GB
- **+ Models:** Add 4-20 GB depending on quantization

### Sidecar Lifecycle Management

**Startup:**
1. Tauri spawns Python executable on app launch
2. Health check polling (exponential backoff, 30s timeout)
3. Display loading screen during initialization
4. Show meaningful errors if startup fails

**Runtime:**
- Python process runs continuously while app open
- Handles requests via Pyo3 bridge
- Emits progress events during inference
- Manages GPU memory automatically

**Shutdown:**
1. Tauri sends graceful shutdown signal
2. Python cleans up GPU memory
3. Saves any pending state
4. Process terminates cleanly
5. SIGKILL failsafe after 5s timeout

---

## 9. Model Distribution: Tauri Asset Protocol

### Challenge: 7-20GB Model Files

Models are too large to embed in the application executable. Distribution strategy must:
- Bundle models with installer (single package for user)
- Provide secure, predictable access path for Python backend
- Work cross-platform (Windows/macOS/Linux)
- Handle large file sizes efficiently

### Selected Solution: Tauri Resources

**Configuration (tauri.conf.json):**
```json
{
  "tauri": {
    "bundle": {
      "resources": [
        "models/*.gguf",
        "models/*.safetensors"
      ]
    }
  }
}
```

**Benefits:**
1. **Single Installer:** Models bundled in MSI/DMG/AppImage
2. **Asset Protocol:** Secure access via `asset://` URLs
3. **Cross-Platform:** Automatic path handling per OS
4. **Guaranteed Presence:** Models always available, no download needed

### Alternative Strategy: On-Demand Download

**For models >10GB, consider on-demand download:**

**Benefits:**
- Smaller initial installer
- Users only download models they use
- Easier to update models independently

**Implementation:**
1. First run: Detect missing models
2. Show download UI with progress bar
3. Verify checksum after download
4. Cache in user directory (platform-specific)
5. Subsequent runs: Use cached models

**Platform-Specific Cache Locations:**
- **Windows:** `%APPDATA%/ai-miniature-repainting/models/`
- **macOS:** `~/Library/Application Support/ai-miniature-repainting/models/`
- **Linux:** `~/.local/share/ai-miniature-repainting/models/`

---

## 10. UI/UX Design Principles

### Adobe-Style Professional Aesthetic

**Key Requirements:**
1. **Dark Mode Default:** Standard for creative professional tools
2. **Clear Visual Hierarchy:** Primary/secondary/tertiary actions clearly distinguished
3. **Sufficient Contrast:** WCAG 2.1 AA compliance minimum
4. **Contextual Help:** Tooltips on hover, help icons for complex features
5. **Consistent Spacing:** Use Adobe Spectrum spacing tokens

### Decomposed Prompting System

**Goal:** Users never write prompts directly.

**Implementation:**
1. **Component Breakdown:** Sliders, dropdowns, color pickers map to miniature parts
2. **Template Engine:** UI selections populate detailed prompt template
3. **Prompt Upsampling:** Simple inputs → token-dense, context-rich prompts
4. **Hidden Complexity:** Advanced users can view/edit generated prompts

**Example User Flow:**
```
User selects:
- Miniature Part: "Shoulder Armor"
- Material: "Metallic"
- Color: #4A90E2 (blue)
- Weathering: 60/100 slider

System generates:
"Shoulder armor plate, metallic paint finish (1.3), cobalt blue base color
(#4A90E2), reflective surface with chrome highlights, medium weathering
(0.6), rust streaks on edges, battle-worn appearance, dramatic side
lighting, 45-degree key light, rim lighting on raised edges"
```

### Prompt Sliders Implementation

**Technology:** Textual Inversion embeddings (not LoRA)

**Benefits:**
- **30% faster** than LoRA (no adapter loading)
- **3 KB per concept** vs 8+ MB for LoRA
- Works across models sharing text encoder
- Real-time slider updates without model reload

**Implementation:**
1. Train concept embeddings for key attributes (weathering, glossiness, etc.)
2. Slider value (0-100) → weighted multiplier in prompt
3. Example: Weathering=60 → `(weathering:0.6)` in prompt
4. Combine multiple sliders for fine-grained control

### Progress Indication

**Critical for AI Apps:** 15-60s inference times require clear feedback.

**Implementation:**
1. **Indeterminate Loading:** Model initialization (first 2-3s)
2. **Determinate Progress Bar:** Step-by-step progress (1/50, 2/50, ...)
3. **Estimated Time Remaining:** Based on previous generations
4. **Preview Updates:** Optional low-res preview every 10 steps
5. **Cancel Button:** Allow abort during generation

---

## 11. Development Workflow & Architecture

### Project Structure

```
ai-miniature-repainting-desktop-app/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs        # Tauri entry point
│   │   ├── commands.rs    # Tauri commands
│   │   └── python_bridge.rs  # Pyo3 integration
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # React frontend
│   ├── components/
│   ├── hooks/
│   ├── services/
│   │   └── inference.ts   # IPC wrapper
│   ├── App.tsx
│   └── main.tsx
├── python/                 # Python ML backend
│   ├── inference.py       # Main inference engine
│   ├── comfyui_wrapper.py # ComfyUI integration
│   ├── diffusers_wrapper.py # Diffusers integration
│   ├── prompt_builder.py  # Decomposed prompting
│   └── requirements.txt
├── models/                 # Model files (gitignored)
│   └── .gitkeep
└── docs/
```

### Development Process

**Phase 1: Core Infrastructure (Weeks 1-2)**
- Set up Tauri + React project
- Configure PyTauri bridge
- Implement basic UI layout with React Spectrum
- Create mock inference API for UI development

**Phase 2: ML Integration (Weeks 3-5)**
- Package Python backend with PyInstaller
- Integrate ComfyUI and test workflows
- Implement GGUF model loading
- Add Diffusers fallback
- Test on target hardware configurations

**Phase 3: UX Development (Weeks 6-8)**
- Build decomposed prompting system
- Implement prompt sliders
- Create progress streaming
- Add error handling and graceful degradation
- User testing with target audience

**Phase 4: Packaging & Distribution (Weeks 9-10)**
- Configure Tauri bundlers for all platforms
- Implement model distribution strategy
- Code signing and notarization
- Create installers and test on clean VMs
- Performance optimization and profiling

---

## 12. Cross-Platform Considerations

### Windows

**Requirements:**
- CUDA DLLs bundled or user-installed CUDA Toolkit
- Code signing certificate for SmartScreen trust
- Handle backslash path separators
- Test on Windows 10/11 with various GPU drivers

**Distribution:**
- MSI installer via Tauri
- Size: ~3-5 GB + models (4-20 GB)
- Install location: `C:\Program Files\AI Miniature Repainting\`

### macOS

**Requirements:**
- Code signing with Apple Developer certificate
- Notarization for Gatekeeper approval
- Entitlements for GPU access
- Universal binary (x64 + ARM64) or separate builds

**Distribution:**
- DMG installer via Tauri
- Size: ~3-5 GB + models (4-20 GB)
- Install location: `/Applications/AI Miniature Repainting.app`

**Metal Support:**
- Investigate PyTorch MPS backend for Apple Silicon
- May require separate model format (CoreML)

### Linux

**Requirements:**
- System package manager for CUDA dependencies (preferred)
- Support multiple distributions (Ubuntu, Fedora, Arch)
- AppImage for maximum compatibility

**Distribution Formats:**
- **AppImage:** Portable, no installation required
- **DEB:** Ubuntu/Debian package manager
- **RPM:** Fedora/RHEL package manager

**CUDA Handling:**
- Document NVIDIA driver installation per distro
- Detect CUDA availability at runtime
- Graceful fallback to CPU if no GPU

---

## 13. Performance Targets

### Inference Speed (by Hardware Tier)

**High-End (RTX 4090 24GB):**
- Target: 15-20s per generation (50 steps)
- With Lightning LoRA: 3-5s per generation (8 steps)
- Quality: Near full precision

**Mid-Range (RTX 4080 16GB):**
- Target: 20-30s per generation (50 steps)
- With Lightning LoRA: 5-8s per generation (8 steps)
- Quality: Very good (Q4_K quantization)

**Budget (RTX 3060 12GB):**
- Target: 45-60s per generation (50 steps)
- With Lightning LoRA: 12-18s per generation (8 steps)
- Quality: Good (Q3_K quantization)

**CPU Fallback:**
- Target: 5-10 minutes per generation (informational only)
- Not recommended for production use
- Display warning to user

### Application Performance

- **Cold Start:** <3s to main window
- **Model Load (first inference):** 10-15s
- **Subsequent Inferences:** Cache model, use above targets
- **Memory Usage (UI):** <100 MB (Tauri + React)
- **Memory Usage (Python):** 18-25 GB (model + runtime)
- **Total Footprint:** 20-30 GB (depending on model)

---

## 14. Security & Privacy

### Data Privacy

**Core Principle:** All data stays local, never transmitted to cloud.

**Implementation:**
- No telemetry or analytics without explicit opt-in
- No cloud API calls (exception: optional model downloads)
- User images never leave device
- Generated images saved locally only

### Application Security

**Tauri Security Features:**
- Content Security Policy (CSP) enforced
- No nodeIntegration (unlike Electron)
- Explicit function exposure via `#[tauri::command]`
- Sandboxed renderer process

**Python Backend Security:**
- Rate limiting on inference requests (prevent abuse)
- Input validation (Pydantic models)
- Resource limits (max image size, max batch size)
- Timeout enforcement (kill runaway inference)

### Code Signing

**Windows:**
- Authenticode certificate required for SmartScreen trust
- Sign both installer and executable

**macOS:**
- Apple Developer certificate required
- Notarization via Apple notary service
- Hardened Runtime enabled

**Linux:**
- Optional GPG signatures on packages
- Repository signing for trusted sources

---

## 15. Testing Strategy

### Unit Tests
- React components (Jest + React Testing Library)
- Python inference logic (pytest)
- Rust command functions (cargo test)

### Integration Tests
- IPC communication (Rust ↔ Python)
- Model loading and inference pipeline
- Progress streaming and cancellation
- Error handling and recovery

### Performance Tests
- Inference speed benchmarks per hardware tier
- Memory leak detection (long-running sessions)
- VRAM usage profiling
- Startup time measurement

### Platform Tests
- Clean VM testing for each OS
- GPU driver compatibility matrix
- Installer functionality
- Upgrade path testing

---

## 16. Licensing & Compliance

### Application License

**Recommended:** MIT or Apache 2.0 (for maximum commercial flexibility)

### Dependency Licenses

**Permissive (Compatible):**
- Tauri: MIT/Apache 2.0
- React: MIT
- Adobe React Spectrum: Apache 2.0
- Diffusers: Apache 2.0
- PyTorch: BSD-3-Clause
- FLUX Kontext model: Check model card

**Copyleft (Requires Mitigation):**
- ComfyUI: GPL (mitigated by API-only usage)
- Custom nodes: Audit individually

### GPL Mitigation Checklist

- [ ] Communicate with ComfyUI exclusively via documented API
- [ ] Run ComfyUI as separate process (sidecar)
- [ ] Do not embed or modify ComfyUI source code
- [ ] Audit all custom nodes for permissive licenses
- [ ] Develop critical functionality in-house if GPL nodes required
- [ ] Document legal separation in LICENSE file
- [ ] Consult legal counsel before commercial release

---

## 17. Deployment Checklist

### Pre-Release

- [ ] All tests passing on target platforms
- [ ] Performance targets met on reference hardware
- [ ] Code signing certificates acquired and configured
- [ ] Models tested and optimized (GGUF Q4_K)
- [ ] Error messages user-friendly and actionable
- [ ] Documentation complete (user manual, troubleshooting)
- [ ] Privacy policy drafted (if applicable)
- [ ] License audit completed

### Release Build

- [ ] PyInstaller bundles Python backend correctly
- [ ] Tauri builds for Windows (MSI)
- [ ] Tauri builds for macOS (DMG, notarized)
- [ ] Tauri builds for Linux (AppImage, DEB, RPM)
- [ ] Model files bundled or download tested
- [ ] Installers tested on clean VMs
- [ ] Upgrade path tested (v1.0 → v1.1)
- [ ] Code signed (Windows, macOS)

### Post-Release

- [ ] Auto-updater configured (Tauri updater)
- [ ] Error logging to local file (not cloud)
- [ ] User feedback mechanism
- [ ] Performance monitoring (opt-in telemetry)
- [ ] Community support channels (Discord, forum)

---

## 18. Future Roadmap

### Version 1.0 (MVP)
- Core inference with FLUX Kontext
- Basic decomposed prompting UI
- GGUF Q4_K optimization
- Windows/macOS support
- Single-image generation

### Version 1.1
- Batch processing
- Qwen-Image-Edit (experimental)
- Linux support
- Custom model loading
- Prompt history and favorites

### Version 1.2
- ControlNet integration
- Inpainting/outpainting
- Mask editor
- Before/after comparison slider
- Export presets

### Version 2.0
- Multi-model ensemble
- Custom training pipeline
- Plugin system for community extensions
- Cloud backup (opt-in)
- Mobile companion app

---

## 19. Risk Assessment & Mitigation

### Technical Risks

**Risk:** VRAM requirements exceed target hardware
**Mitigation:** Multiple quantization tiers, CPU fallback, clear system requirements

**Risk:** Model quality insufficient for professional use
**Mitigation:** Multi-model support, easy model swapping, user feedback loop

**Risk:** GPL licensing issues with ComfyUI
**Mitigation:** Strict API separation, legal consultation, Diffusers fallback

**Risk:** PyInstaller bundle too large (>5GB)
**Mitigation:** Exclude unnecessary dependencies, on-demand model download

### Business Risks

**Risk:** Rapid AI landscape changes make stack obsolete
**Mitigation:** Model-agnostic architecture, plugin system for extensibility

**Risk:** Competition from web-based solutions
**Mitigation:** Local processing as privacy/speed advantage, offline capability

**Risk:** High hardware requirements limit market
**Mitigation:** Clear tiered pricing by performance level, cloud option for low-end

---

## 20. Conclusion & Approval

This technical stack has been designed through comprehensive analysis of three architectural approaches, prioritizing:

1. **Memory Efficiency:** Tauri's minimal footprint maximizes VRAM for AI
2. **Performance:** ComfyUI provides fastest inference with best quality
3. **Flexibility:** Multi-model architecture avoids vendor lock-in
4. **Professional UX:** Adobe React Spectrum delivers expected aesthetic
5. **Licensing Safety:** GPL mitigation through strict API separation
6. **Future-Proofing:** Model-agnostic design adapts to AI landscape evolution

**Final Stack Summary:**
- **Desktop:** Tauri + React + TypeScript + Adobe React Spectrum
- **IPC:** PyTauri (Pyo3 bindings)
- **ML Backend:** ComfyUI (primary) + Diffusers (fallback)
- **Models:** FLUX Kontext (primary) + Qwen-Image-Edit (experimental)
- **Optimization:** GGUF Q4_K quantization
- **Distribution:** PyInstaller sidecar + Tauri resources

**Approval Status:** APPROVED for implementation.

**Next Steps:**
1. Create project repository structure
2. Initialize Tauri + React project
3. Set up PyTauri bridge with hello-world test
4. Begin Phase 1: Core Infrastructure (see Section 11)

---

**Document Revision History:**
- v1.0 (2025-11-07): Initial technical stack definition

**Contributors:**
- Architecture analysis based on research documents in `/docs`
- Decision framework: Performance benchmarking + licensing analysis + UX requirements

**References:**
1. `/docs/Desktop AI Image Editing App.md` - Tauri + ComfyUI analysis
2. `/docs/Implementing Qwen Image Edit via Diffusers for Desktop Apps.md` - Diffusers approach + Qwen limitations
3. `/docs/Tech Stack for a Qwen Image-Edit Desktop App.md` - Technology comparison overview
