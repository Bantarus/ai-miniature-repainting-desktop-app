

# **Expert Architectural Report: Optimizing AI Desktop Deployment for Qwen-Image-Edit Miniatures**

## **I. Executive Summary and Strategic Recommendations**

The objective is to establish a robust, production-ready technology stack capable of deploying the Qwen-Image-Edit model locally for miniature painting idea iteration. This system must meet rigorous demands for professional aesthetics, low resource overhead, cross-platform stability, and rapid inference performance. The analysis concludes that combining a highly efficient desktop wrapper with a specialized modular AI engine, utilizing zero-overhead inter-process communication, provides the only viable path to satisfying all primary constraints.

### **The Optimal Production Stack: Tauri, ComfyUI, and PyTauri**

The technical selection is dictated by the memory demands of large, quantized models and the requirement for an "Adobe-like" user experience (UX). For maximum efficiency and performance accessibility on consumer hardware, the following architecture is prescribed:

| Layer | Technology | Primary Rationale |
| :---- | :---- | :---- |
| **Desktop Wrapper** | Tauri (Rust Core) | Delivers minimal installer size (under 10MB) and extremely low memory consumption (30–40 MB idle).1 |
| **Frontend/UI** | React (with TypeScript) | Standard for complex, highly maintainable single-page applications. |
| **Design System** | Adobe React Spectrum | Directly achieves the required professional, creative-focused "Adobe-like" look and ensures high accessibility.3 |
| **Backend Core** | Python 3.10+ (Packaged via PyInstaller sidecar) | Provides access to the ComfyUI engine and the necessary ML ecosystem (PyTorch, accelerators). |
| **IPC Bridge** | PyTauri / Pyo3 Bindings | Enables secure, high-speed, zero-overhead command execution between the Rust frontend and the Python backend.5 |
| **AI Engine** | ComfyUI (API Mode) | Offers superior inference speed, better generation quality consistency, and modular workflow management, essential for complex editing tasks.6 |
| **Model Optimization** | Qwen-Image-Edit GGUF | Enables memory-efficient execution, allowing the large model (7-12 GB) to run on low-VRAM GPUs or CPUs.8 |
| **Model Distribution** | Tauri Asset Protocol (Resources) | Securely bundles the large GGUF model files within the cross-platform installer package.10 |

### **The Constraint-Driven Architecture: Maximizing Efficiency**

The architectural decisions are fundamentally driven by the demanding constraints of locally running a large diffusion model. A typical Qwen-Image-Edit GGUF model can consume between 7 GB and 12 GB of memory, even in a quantized state (e.g., Q3\_K\_S at 8.95 GB).8 Deploying this model requires maximizing every available system resource.

The selection of Tauri over traditional alternatives like Electron is mandatory under these conditions. Electron applications bundle an entire Chromium browser, leading to large installers (over 100 MB) and high idle memory consumption (200–300 MB).1 By contrast, Tauri utilizes the system's native WebView and a lean Rust core, resulting in a minimal memory footprint (30–40 MB idle).1 This 170–270 MB difference in memory consumption is not trivial; when dealing with models that push consumer VRAM limits, every freed megabyte directly increases the chance of successful, stable inference, or allows for the loading of a higher-quality model variant.11 The selection of Tauri is not merely an optimization; it is a prerequisite for a professional, high-performance desktop AI application.

## **II. AI Engine Selection and Performance Optimization**

### **Qwen-Image-Edit: Specialized Editing Capabilities**

The Qwen-Image-Edit model is an excellent choice for the specific task of miniature painting iteration due to its advanced editing features. The model is trained to support both low-level visual appearance editing (e.g., modifying elements and maintaining precise regional control) and high-level visual semantic editing (e.g., style transfer or object rotation).12 Crucially for hobbyists who frequently apply custom decals or typography, Qwen-Image-Edit supports precise bilingual text editing while preserving the original font, size, and style.12

### **GGUF Optimization for Consumer Hardware**

The availability of Qwen-Image-Edit in the GGUF (GGML Universal Format) 8 is a critical enabler for local deployment. The GGUF format is optimized for CPU inference and low-VRAM GPU usage, often executed via the underlying principles of llama.cpp.14 This format allows for block-wise quantization (e.g., Q3\_K\_S) 8, drastically reducing the memory footprint compared to full precision models, thereby making the application accessible to users with standard consumer-grade GPUs.9 The inherent portability of GGUF—one self-contained file including weights, tokenizer, and parameters—simplifies asset management and deployment.14

### **ComfyUI vs. Diffusers: Performance, Quality, and Workflow**

The choice between building a raw Hugging Face Diffusers pipeline and wrapping a ComfyUI workflow leans decisively toward **ComfyUI** for production deployment. This preference is based on three key factors: performance, output quality, and GGUF compatibility.

#### **Performance and Optimization**

ComfyUI consistently demonstrates faster inference speeds compared to standard Diffusers pipelines.7 Reports indicate that a single iteration can take approximately 1 second in ComfyUI versus 15 seconds in a Diffusers implementation on similar hardware configurations.7 While optimization techniques exist for Diffusers (such as enable\_model\_cpu\_offload or enable\_vae\_tiling), these introduce complexity and may not always yield consistent cross-platform speed gains.7 ComfyUI's native handling of model loading and unloading contributes to its reliability and speed advantage.15

#### **Quality and Workflow Integrity**

For complex tasks like image editing, maintaining high-fidelity output is essential. Developers transitioning workflows from ComfyUI often encounter a significant drop in image quality using Diffusers, including issues like blurry details or inaccurate faces.6 ComfyUI's modular, node-based structure allows for the creation and execution of intricate, high-quality workflows that are challenging to reproduce accurately and efficiently via a programmatic Diffusers pipeline.16

#### **GGUF Integration**

ComfyUI possesses a critical advantage in GGUF compatibility. While Diffusers supports loading GGUF checkpoints via from\_single\_file, full pipeline integration remains unsupported as of current documentation.17 Conversely, the ComfyUI ecosystem has robust community support, featuring custom nodes (such as those in ComfyUI-GGUF) that specifically enable the reliable loading of GGUF-quantized UNet components.18 This integration ensures the application can leverage the memory savings provided by the GGUF format.

### **GGUF Acceleration and Virtual VRAM Strategies**

To meet the requirement for "fast painting idea iteration," the AI engine must employ sophisticated memory management. Since the Qwen model is large, running it efficiently often requires more memory than available on the compute GPU (VRAM).

Advanced custom nodes, such as those that leverage DisTorch, provide a solution by creating what is termed "Virtual VRAM".19 This functionality splits the quantized UNet layers of the diffusion model and offloads static layers from the primary compute GPU (CUDA/XPS device) to slower memory devices, such as system RAM (CPU DRAM).19 This mechanism frees up crucial VRAM space on the main GPU, allowing for larger latent batch sizes or, more critically, enabling the high-quality Qwen model to run reliably on consumer cards with limited VRAM (e.g., 8 GB cards).20 The optimization focuses not just on raw speed, but on ensuring the application functions stably under memory pressure.

### **Dependency Management and Environment Isolation**

The core technical decision to rely on a ComfyUI Python backend introduces significant complexity in packaging. The application environment requires Python, PyTorch, specific ML accelerators (such as CUDA, xFormers, or Vulkan/SYCL bindings for GGUF) 7, and the various system dependencies required by ComfyUI.22 Packaging such a complex dependency stack for cross-platform desktop distribution is notoriously difficult, often failing due to environment inconsistencies on the end-user's machine.23

To mitigate this, the Python environment must be bundled into a fixed, standalone executable—a process known as creating a "sidecar" binary using tools like PyInstaller.24 By isolating the entire ComfyUI environment into a self-contained executable, the development team fixes the complex dependency versions to a known-good configuration. This dramatically simplifies deployment, as the end-user is not required to manage their system-wide Python installation or complex ML package dependencies.23

## **III. High-Performance Desktop Application Architecture**

### **Framework Selection: Tauri's Crucial Advantage**

The technical superiority of Tauri over Electron stems from its minimal resource utilization, which is a direct benefit to an application running large, memory-hungry AI models.

Table: Desktop Framework Comparison for AI Applications

| Metric | Tauri (Rust Core, System WebView) | Electron (Bundled Chromium) |
| :---- | :---- | :---- |
| **Installer Size** | Typically under 10 MB 1 | Typically over 100 MB 1 |
| **Idle Memory Usage** | 30–40 MB 1 | 200–300 MB 1 |
| **Launch Speed** | Under half a second 1 | 1–2 seconds 1 |
| **Core Technology** | Rust/System WebView 1 | Node.js/Bundled Chromium 26 |

The drastic difference in memory consumption is the primary driver for selecting Tauri. With the ComfyUI pipeline and the Qwen GGUF model already pushing system memory limits, the 170-270 MB memory savings provided by Tauri means that more physical memory and VRAM are available for the critical ML inference tasks.1 This maximizes stability and speed, aligning with the "professional look" mandate by delivering a snappier, more responsive experience.1 Furthermore, Tauri provides enhanced security features by default, requiring explicit exposure of Rust functions for OS access, whereas Electron grants broad access to Node APIs, necessitating extra developer discipline for security lockdown.2

### **High-Speed Inter-Process Communication (IPC)**

The interface between the React/TypeScript frontend and the Python/ComfyUI backend must be optimized to prevent communication overhead from degrading the user experience.

#### **Avoiding Network-Bound Latency**

Standard integration methods, such as launching the Python environment as a local web server (e.g., using Flask or FastAPI) and communicating via HTTP or WebSockets, introduce network latency and unnecessary complexity. For a desktop application focused on local computation, a lower-level, direct communication method is necessary.

#### **The PyTauri Solution (Pyo3 Bindings)**

The recommended approach utilizes **PyTauri**, which leverages Pyo3 to create a highly efficient, zero-overhead bridge between Tauri's native Rust core and the Python backend.5 The frontend uses a simple invocation mechanism (pyInvoke) to call Python functions directly, passing and receiving data securely and quickly.5 This direct binding avoids the serialization and network stack overhead of traditional API communication, minimizing latency in command transmission.

#### **Asynchronous Workflow and Feedback**

Since AI inference via the Qwen model can take several seconds to complete, the execution must be handled asynchronously to prevent the frontend UI from freezing. The Python backend, upon receiving an execution command, submits the ComfyUI workflow via its standard API interface.27 During execution, the Python logic should utilize asynchronous capabilities (asyncio) to stream real-time progress updates back to the frontend. These updates are communicated via **Tauri Events**, which are one-way IPC messages that can be global or window-specific.28 This constant feedback loop is essential for maintaining the professional quality and responsiveness expected of an Adobe-like application.29

### **Production Packaging and Model Distribution Strategy**

Deploying the final application requires careful management of the core binaries, the complex Python environment, and the large model assets.

#### **Bundling the Python Sidecar**

The entire ComfyUI environment, including all its necessary dependencies (PyTorch, accelerators, etc.), must be compiled into a standalone executable using a tool like PyInstaller.24 Tauri is configured to recognize this Python executable as a "sidecar" binary.30 Upon application startup, the Tauri Rust core is responsible for launching the sidecar and managing its entire lifecycle, including ensuring it shuts down cleanly when the main GUI exits.24 This process requires meticulous path handling, especially noting that resources within the packaged binary must be accessed via the special sys.\_MEIPASS variable rather than standard file paths.25

#### **Large Asset Management via Tauri Resources**

The core Qwen GGUF model files (7-12 GB) cannot be embedded directly into the small Tauri executable binary without negating the size advantage. The most professional and robust method for distributing these large, non-code assets is through the **Tauri Asset Protocol (Resources)**.10

By listing the GGUF files in the tauri.conf.json as resources, the Tauri CLI automatically ensures these large files are bundled alongside the application binary within the final cross-platform installers (MSI for Windows, DMG for macOS).32 This yields a single, professional installer package for the end-user while providing the Python backend with a guaranteed, secure, and predictable path to load the massive model assets at runtime.10 This method is crucial for scalable, professional distribution outside of traditional web-based deployment methods.

#### **Addressing VRAM Fragmentation and Process Isolation**

A potential complication arises from the intersection of PyTorch (used by ComfyUI) and llama-cpp-python bindings (often used for GGUF execution). Low-level conflicts have been documented where the CUDA context initialization by the llama.cpp library can fragment VRAM, causing subsequent large PyTorch allocations to become inefficient or fail entirely.34

By structuring the ComfyUI environment as an isolated sidecar process managed by the Tauri core, the risk of cross-process VRAM conflicts is contained. If VRAM fragmentation occurs within the Python ML environment, the failure is limited to the sidecar, allowing the primary Tauri UI to remain responsive and functional. This isolation pattern is fundamental to building a high-reliability, professional-grade desktop application.

## **IV. UX/UI Engineering and Prompt Abstraction**

Achieving the desired "Adobe app" look requires more than just styling; it demands a deep understanding of component behavior and workflow abstraction.

### **The Adobe Aesthetic with React Spectrum**

To deliver a UI that feels professional, technical, and responsive, the use of **Adobe React Spectrum** is highly recommended.3 This library is the official React implementation of Adobe's comprehensive design system, ensuring a native aesthetic familiar to users of creative professional tools. It provides accessible, unstyled components and hooks focusing on interaction behaviors and accessibility best practices.4

The UI design must strictly adhere to core principles of clarity, consistency, and visual simplicity.29 For a tool designed for rapid iteration, the application must maintain a clear visual hierarchy, utilizing color strategically for focus and ensuring sufficient contrast for accessibility, particularly in a dark-mode theme common in creative software.29

### **Decomposed Prompting for Workflow Simplicity**

The requirement for an easy UX that avoids direct prompt writing mandates the implementation of a sophisticated prompt abstraction layer. This methodology, known as decomposed prompting, involves breaking down the complex generative objective into simpler, logically divided sub-tasks that are mapped directly to intuitive UI controls.35

#### **The Miniature Painting Mental Model**

A miniature painter naturally breaks down their task by discrete components: the specific *part* of the model (leg, body, shoulder, armor), the *material* type (metallic, matte, chitinous), the *color scheme* (primary, secondary), and *effects* (weathering, battle damage).37 The UI must reflect this professional partitioning.

The user's choices, gathered via sliders, color pickers, and radio buttons, are used to populate a hidden, detailed template.38 This templating system performs **prompt upsampling**, transforming a few simple user selections into a rich, token-dense prompt that provides the necessary context and detailed control conditions for the Qwen model.35 This approach bypasses the complexity of prompt engineering, making the application immediately usable by hobbyists.41

#### **Implementing Prompt Sliders for Fine-Grained Control**

For continuous parameters such as "weathering intensity," "paint gloss," or "surface texture," conventional LoRA adapters are often used, but they introduce overhead by requiring loading and unloading, thereby slowing down iteration.42

A more efficient method is the implementation of **Prompt Sliders**, which utilize textual inversion to learn concept embeddings.42 These embeddings are generalized across models sharing the same text encoder. The UI slider value (e.g., 0 to 100\) is translated into a weighted multiplier applied to the learned text embedding within the generated prompt (e.g., (weathering: 1.5)).

The primary advantage of this method is speed and efficiency. Prompt Sliders are reported to be 30% faster than equivalent LoRA systems because they eliminate adapter loading/unloading.43 Furthermore, each concept embedding requires minimal storage (approximately 3 KB), drastically reducing the storage burden compared to LoRA adapters (8922 KB or more).43 This high efficiency is essential for meeting the requirement of rapid, low-latency idea iteration.

## **V. Commercial Viability and Licensing Assessment**

Any application intended for production and commercial sale must critically assess the licensing terms of all major components, especially within the volatile open-source AI ecosystem.

### **Qwen Model Licensing**

The Qwen-Image-Edit model is released under the permissive **Apache 2.0 License**.9 This license explicitly grants rights for commercial use, distribution, and modification, provided that proper attribution is maintained. This ensures a clear legal foundation for the commercial deployment of the core AI functionality.

### **ComfyUI and the GPL Contagion Risk**

The use of ComfyUI introduces a significant legal risk due to its licensing model. The ComfyUI core software is often licensed under the **GNU General Public License (GPL)**.45 GPL is a copyleft license; if a proprietary application is deemed to be a "derivative work" of the GPL code, the entire application's source code, including the proprietary frontend and IPC logic, may be required to be open-sourced under the GPL.45

This risk is compounded by the dependency on ComfyUI's custom nodes. Many essential nodes used for advanced functionality (e.g., GGUF loaders, ControlNet, IPAdapter) are developed specifically for the ComfyUI architecture and are considered by some legal experts to be derivative works of the GPL core.45

#### **Prescriptive Mitigation Strategy**

To leverage the performance advantage of ComfyUI while mitigating legal risk, a disciplined approach is necessary:

1. **License Audit:** Conduct a thorough audit of every custom node intended for use in the production workflow, prioritizing nodes released under permissive commercial licenses (MIT, Apache 2.0).  
2. **Strict API Separation:** The proprietary Tauri application must communicate with ComfyUI exclusively through its documented JSON API endpoints.27 Maintaining a clear boundary—where the application is a client invoking a service endpoint—strengthens the legal argument that the application is not a derivative work of the GPL-licensed engine.  
3. **In-House Node Development:** If a critical function is only available via a custom node under restrictive licensing, the development team must allocate resources to recreate that functionality internally under a permissive license. While this increases development overhead, it eliminates the risk of GPL contagion, ensuring the proprietary nature of the desktop application remains intact. The technical performance superiority of the ComfyUI engine must be balanced against the necessity for strict commercial compliance.

## **VI. Conclusion and Implementation Roadmap**

The analysis identifies the **Tauri \+ PyTauri \+ ComfyUI GGUF** stack as the optimal solution for delivering a professional, efficient, and high-performance desktop application for miniature painting idea iteration. This architecture strategically maximizes resource availability for the AI model while providing the responsiveness and aesthetic quality expected of a professional creative tool.

### **Phased Implementation Roadmap**

To execute this architecture efficiently, a phased approach is recommended, focusing first on validating performance and integration complexity.

#### **Phase 1: Performance Validation (Proof-of-Concept)**

The initial focus must be on confirming the viability of the AI execution chain. This involves setting up the ComfyUI environment, integrating the Qwen GGUF model and necessary performance-boosting custom nodes (e.g., GGUF loaders, MultiGPU/DisTorch), and building a basic functional web interface (Flask/FastAPI API wrapper).27 Success in this phase is measured by achieving acceptable inference latency for the Qwen GGUF workflow on target consumer hardware.

#### **Phase 2: Production Architecture and UX Development**

This phase involves migrating the communication layer to the high-speed **PyTauri/Pyo3 IPC** framework, eliminating the slower HTTP API overhead.5 Simultaneously, the frontend development team must build the full "Adobe-like" UI using the **Adobe React Spectrum** design system.3 The decomposed prompting engine and the highly efficient **Prompt Sliders** system must be implemented and mapped to the ComfyUI workflow template, ensuring the user experience abstracts away all prompt engineering complexity.42

#### **Phase 3: Deployment, Packaging, and Quality Assurance**

The final phase concentrates on robust distribution. This involves configuring PyInstaller to bundle the complex Python environment as a sidecar executable 24 and utilizing the **Tauri Asset Protocol (Resources)** to embed and manage the large GGUF model files within the final installer packages.10 Cross-platform installers (MSI, DMG) must be generated and rigorously tested.32 A full security and licensing audit must be conducted, specifically addressing the ComfyUI custom node ecosystem risk, ensuring commercial compliance before product launch.

#### **Sources des citations**

1. Tauri vs Electron Comparison: Choose the Right Framework | by RaftLabs | Sep, 2025, consulté le novembre 6, 2025, [https://raftlabs.medium.com/tauri-vs-electron-a-practical-guide-to-picking-the-right-framework-5df80e360f26](https://raftlabs.medium.com/tauri-vs-electron-a-practical-guide-to-picking-the-right-framework-5df80e360f26)  
2. Tauri VS. Electron \- Real world application, consulté le novembre 6, 2025, [https://www.levminer.com/blog/tauri-vs-electron](https://www.levminer.com/blog/tauri-vs-electron)  
3. React Spectrum Libraries \- Adobe, consulté le novembre 6, 2025, [https://react-spectrum.adobe.com/](https://react-spectrum.adobe.com/)  
4. 14 Best React UI Component Libraries in 2025 (+ Alternatives to MUI & Shadcn) \- Untitled UI, consulté le novembre 6, 2025, [https://www.untitledui.com/blog/react-component-libraries](https://www.untitledui.com/blog/react-component-libraries)  
5. pytauri/pytauri: Tauri binding for Python through Pyo3 \- GitHub, consulté le novembre 6, 2025, [https://github.com/pytauri/pytauri](https://github.com/pytauri/pytauri)  
6. Why diffusers results are so poor comparing to comfyUI? Programmer perspective \- Reddit, consulté le novembre 6, 2025, [https://www.reddit.com/r/StableDiffusion/comments/1k06zzd/why\_diffusers\_results\_are\_so\_poor\_comparing\_to/](https://www.reddit.com/r/StableDiffusion/comments/1k06zzd/why_diffusers_results_are_so_poor_comparing_to/)  
7. Why is diffusers so much slower than ComfyUI? \- Hugging Face Forums, consulté le novembre 6, 2025, [https://discuss.huggingface.co/t/why-is-diffusers-so-much-slower-than-comfyui/51145](https://discuss.huggingface.co/t/why-is-diffusers-so-much-slower-than-comfyui/51145)  
8. QuantStack/Qwen-Image-Edit-GGUF \- Hugging Face, consulté le novembre 6, 2025, [https://huggingface.co/QuantStack/Qwen-Image-Edit-GGUF](https://huggingface.co/QuantStack/Qwen-Image-Edit-GGUF)  
9. How to Use Qwen for Image Editing in ComfyUI \- Next Diffusion, consulté le novembre 6, 2025, [https://www.nextdiffusion.ai/tutorials/how-to-use-qwen-for-image-editing-in-comfyui](https://www.nextdiffusion.ai/tutorials/how-to-use-qwen-for-image-editing-in-comfyui)  
10. How can I use large assets folder in tauri with react? \- Stack Overflow, consulté le novembre 6, 2025, [https://stackoverflow.com/questions/78522450/how-can-i-use-large-assets-folder-in-tauri-with-react](https://stackoverflow.com/questions/78522450/how-can-i-use-large-assets-folder-in-tauri-with-react)  
11. Any "mainstream" apps with genuinely useful local AI features? : r/LocalLLaMA \- Reddit, consulté le novembre 6, 2025, [https://www.reddit.com/r/LocalLLaMA/comments/1i3nbb7/any\_mainstream\_apps\_with\_genuinely\_useful\_local/](https://www.reddit.com/r/LocalLLaMA/comments/1i3nbb7/any_mainstream_apps_with_genuinely_useful_local/)  
12. Qwen/Qwen-Image-Edit \- Hugging Face, consulté le novembre 6, 2025, [https://huggingface.co/Qwen/Qwen-Image-Edit](https://huggingface.co/Qwen/Qwen-Image-Edit)  
13. Qwen-Image-Edit ComfyUI Native Workflow Example, consulté le novembre 6, 2025, [https://docs.comfy.org/tutorials/image/qwen/qwen-image-edit](https://docs.comfy.org/tutorials/image/qwen/qwen-image-edit)  
14. Run Large Language Models Locally: A Guide to Creating GGUF Files for CPU Inference, consulté le novembre 6, 2025, [https://medium.com/@suriphani/run-large-language-models-locally-a-guide-to-creating-gguf-files-for-cpu-inference-fd0ecdc23c6f](https://medium.com/@suriphani/run-large-language-models-locally-a-guide-to-creating-gguf-files-for-cpu-inference-fd0ecdc23c6f)  
15. Standalone Diffusers vs ComfyUI inference speed : r/StableDiffusion \- Reddit, consulté le novembre 6, 2025, [https://www.reddit.com/r/StableDiffusion/comments/1g4xq2r/standalone\_diffusers\_vs\_comfyui\_inference\_speed/](https://www.reddit.com/r/StableDiffusion/comments/1g4xq2r/standalone_diffusers_vs_comfyui_inference_speed/)  
16. From ComfyUI to Diffuser Pipeline, why so many differences? : r/StableDiffusion \- Reddit, consulté le novembre 6, 2025, [https://www.reddit.com/r/StableDiffusion/comments/1ewpcfg/from\_comfyui\_to\_diffuser\_pipeline\_why\_so\_many/](https://www.reddit.com/r/StableDiffusion/comments/1ewpcfg/from_comfyui_to_diffuser_pipeline_why_so_many/)  
17. GGUF \- Hugging Face, consulté le novembre 6, 2025, [https://huggingface.co/docs/diffusers/v0.33.0/en/quantization/gguf](https://huggingface.co/docs/diffusers/v0.33.0/en/quantization/gguf)  
18. GGUF Quantization support for native ComfyUI models \- GitHub, consulté le novembre 6, 2025, [https://github.com/city96/ComfyUI-GGUF](https://github.com/city96/ComfyUI-GGUF)  
19. pollockjj/ComfyUI-MultiGPU: This custom\_node for ... \- GitHub, consulté le novembre 6, 2025, [https://github.com/pollockjj/ComfyUI-MultiGPU](https://github.com/pollockjj/ComfyUI-MultiGPU)  
20. ComfyUI, GGUF, and MultiGPU: Making your \`UNet\` a \`2-Net\` (and beyond) \- Reddit, consulté le novembre 6, 2025, [https://www.reddit.com/r/comfyui/comments/1ic0mzt/comfyui\_gguf\_and\_multigpu\_making\_your\_unet\_a\_2net/](https://www.reddit.com/r/comfyui/comments/1ic0mzt/comfyui_gguf_and_multigpu_making_your_unet_a_2net/)  
21. Python bindings for llama.cpp \- GitHub, consulté le novembre 6, 2025, [https://github.com/abetlen/llama-cpp-python](https://github.com/abetlen/llama-cpp-python)  
22. ComfyUI Installation Process (Desktop Application) \- PAACADEMY, consulté le novembre 6, 2025, [https://paacademy.com/blog/comfyui-installation-process-desktop-application](https://paacademy.com/blog/comfyui-installation-process-desktop-application)  
23. Is it possible to create a desktop app with Python as back end, and HTML+CSS+JS as front end? \- Reddit, consulté le novembre 6, 2025, [https://www.reddit.com/r/learnpython/comments/1anwlhs/is\_it\_possible\_to\_create\_a\_desktop\_app\_with/](https://www.reddit.com/r/learnpython/comments/1anwlhs/is_it_possible_to_create_a_desktop_app_with/)  
24. How to write and package desktop apps with Tauri \+ Vue \+ Python \- Senhaji Rhazi hamza, consulté le novembre 6, 2025, [https://hamza-senhajirhazi.medium.com/how-to-write-and-package-desktop-apps-with-tauri-vue-python-ecc08e1e9f2a](https://hamza-senhajirhazi.medium.com/how-to-write-and-package-desktop-apps-with-tauri-vue-python-ecc08e1e9f2a)  
25. Building an Offline Streamlit Application with Tauri | by Benjamin Dornel \- Level Up Coding, consulté le novembre 6, 2025, [https://levelup.gitconnected.com/building-an-offline-streamlit-application-with-tauri-b1121ae6b646](https://levelup.gitconnected.com/building-an-offline-streamlit-application-with-tauri-b1121ae6b646)  
26. Tauri vs Electron Comparison: Choose the Right Framework in 2025 \- RaftLabs, consulté le novembre 6, 2025, [https://www.raftlabs.com/blog/tauri-vs-electron-pros-cons/](https://www.raftlabs.com/blog/tauri-vs-electron-pros-cons/)  
27. How to Use ComfyUI API with Python: A Complete Guide | by Shawn Wong | Medium, consulté le novembre 6, 2025, [https://medium.com/@next.trail.tech/how-to-use-comfyui-api-with-python-a-complete-guide-f786da157d37](https://medium.com/@next.trail.tech/how-to-use-comfyui-api-with-python-a-complete-guide-f786da157d37)  
28. Inter-Process Communication \- The Tauri Documentation WIP, consulté le novembre 6, 2025, [https://jonaskruckenberg.github.io/tauri-docs-wip/development/inter-process-communication.html](https://jonaskruckenberg.github.io/tauri-docs-wip/development/inter-process-communication.html)  
29. UI design guide: best practices for user-centric design \- Justinmind, consulté le novembre 6, 2025, [https://www.justinmind.com/ui-design](https://www.justinmind.com/ui-design)  
30. Executing python scripts using Tauri \#1645 \- GitHub, consulté le novembre 6, 2025, [https://github.com/tauri-apps/tauri/discussions/1645](https://github.com/tauri-apps/tauri/discussions/1645)  
31. How to build a Python desktop app with pywebview and Flask \- Medium, consulté le novembre 6, 2025, [https://medium.com/@nohkachi/how-to-build-a-python-desktop-app-with-pywebview-and-flask-73025115e061](https://medium.com/@nohkachi/how-to-build-a-python-desktop-app-with-pywebview-and-flask-73025115e061)  
32. DMG \- Tauri, consulté le novembre 6, 2025, [https://v2.tauri.app/distribute/dmg/](https://v2.tauri.app/distribute/dmg/)  
33. Packaging Your Application | Electron, consulté le novembre 6, 2025, [https://electronjs.org/docs/latest/tutorial/tutorial-packaging](https://electronjs.org/docs/latest/tutorial/tutorial-packaging)  
34. \[Bug Report\] Severe VRAM Allocation Instability in PyTorch after llama-cpp-python is Imported · Issue \#2060 \- GitHub, consulté le novembre 6, 2025, [https://github.com/abetlen/llama-cpp-python/issues/2060](https://github.com/abetlen/llama-cpp-python/issues/2060)  
35. Break Down Your Prompts for Better AI Results, consulté le novembre 6, 2025, [https://relevanceai.com/prompt-engineering/break-down-your-prompts-for-better-ai-results](https://relevanceai.com/prompt-engineering/break-down-your-prompts-for-better-ai-results)  
36. Advanced Decomposition Techniques for Improved Prompting in LLMs, consulté le novembre 6, 2025, [https://learnprompting.org/docs/advanced/decomposition/introduction](https://learnprompting.org/docs/advanced/decomposition/introduction)  
37. AI MiniPainter Studio \- Transform Your Miniatures with AI, consulté le novembre 6, 2025, [https://ai-minipainter.com/](https://ai-minipainter.com/)  
38. comfyui-dynamicprompts Custom Node, consulté le novembre 6, 2025, [https://comfyai.run/custom\_node/comfyui-dynamicprompts](https://comfyai.run/custom_node/comfyui-dynamicprompts)  
39. UI Prompt Generator | Trickle AI Free Template, consulté le novembre 6, 2025, [https://trickle.so/templates/apps/ui-prompt-generator](https://trickle.so/templates/apps/ui-prompt-generator)  
40. Prompt upsampling for diffusion models \- Wandb, consulté le novembre 6, 2025, [https://wandb.ai/geekyrakshit/prompt-upsampling-diffusion/reports/Prompt-upsampling-for-diffusion-models--Vmlldzo4OTc3NDc3](https://wandb.ai/geekyrakshit/prompt-upsampling-diffusion/reports/Prompt-upsampling-for-diffusion-models--Vmlldzo4OTc3NDc3)  
41. Stable Diffusion prompt: a definitive guide, consulté le novembre 6, 2025, [https://stable-diffusion-art.com/prompt-guide/](https://stable-diffusion-art.com/prompt-guide/)  
42. Prompt Sliders for Fine-Grained Control, Editing and Erasing of Concepts in Diffusion Models \- Deepak Sridhar, consulté le novembre 6, 2025, [https://deepaksridhar.github.io/promptsliders.github.io/](https://deepaksridhar.github.io/promptsliders.github.io/)  
43. \[2409.16535\] Prompt Sliders for Fine-Grained Control, Editing and Erasing of Concepts in Diffusion Models \- arXiv, consulté le novembre 6, 2025, [https://arxiv.org/abs/2409.16535](https://arxiv.org/abs/2409.16535)  
44. Generate video, images, 3D, audio with AI \- ComfyUI, consulté le novembre 6, 2025, [https://www.comfy.org/terms-of-service](https://www.comfy.org/terms-of-service)  
45. Which license for custom nodes? · Issue \#3362 · comfyanonymous/ComfyUI \- GitHub, consulté le novembre 6, 2025, [https://github.com/comfyanonymous/ComfyUI/issues/3362](https://github.com/comfyanonymous/ComfyUI/issues/3362)  
46. Comfyui for full commercial use? \#3804 \- GitHub, consulté le novembre 6, 2025, [https://github.com/comfyanonymous/ComfyUI/discussions/3804](https://github.com/comfyanonymous/ComfyUI/discussions/3804)