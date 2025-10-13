# NIRS4All UI Installer Roadmap

This roadmap outlines the steps required to ship the NIRS4All UI with bundled Python dependencies and provide a self-update mechanism for both the application and its runtime stack.

## 1. Establish Baseline

- Catalogue Python packages (`nirs4all`, dependencies, data-processing helpers) and front-end build artifacts.
- Capture current versions, system requirements, and configuration assumptions in `docs/deployment/stack.md`.
- Decide on target installer format (MSI, NSIS, MSIX) and update strategy (online-only vs. offline-capable payloads).

## 2. Lock the Dependency Stack

- Introduce a locking workflow (`poetry` or `pip-tools`) to produce a reproducible `requirements.lock`.
- Add CI coverage that creates a clean environment, installs from the lock file, and runs smoke tests.
- Document the dependency bump workflow (refresh lock, re-run regression suite) in `docs/deployment/dependency_updates.md`.

## 3. Bundle the Python Runtime

- Select an environment strategy:
  - Embedded Python with a managed `venv`, or
  - Conda/miniforge environment exported through `environment.yml`.
- Implement `scripts/bootstrap_env.ps1` (and a POSIX variant if needed) to create the environment, install locked dependencies, and verify `nirs4all` health checks.
- Record environment metadata (Python build hash, lock checksum) for later update comparisons.

## 4. Package the Application

- Build the front-end (`npm run build`) and place assets under `dist/ui`.
- Decide on Python packaging: keep source inside the managed environment or produce a single binary (`pyinstaller`, `shiv`, `pex`).
- Create a unified launcher script that activates the environment, seeds data/migrations, and starts the UI/back-end services.

## 5. Build the Windows Installer

- Use the chosen installer tooling (e.g., NSIS, MSIX, `electron-builder` for hybrid apps) to assemble the payload:
  - Include UI build, Python runtime/env cache, launcher scripts, config templates, and documentation.
  - Validate the build with a headless smoke test during installer creation.
- Parameterize installer options so it can fetch wheels online when connectivity is available or fall back to bundled artifacts.

## 6. Enable Self-Update & Dependency Refresh

- Implement an update service that:
  - Checks a remote manifest for newer app builds or lock file revisions.
  - Downloads updates, stages them in a temporary directory, and applies them atomically.
- For dependency updates, create a staged install process (`pip install --require-hashes -r requirements.lock`) against a temporary environment, with rollback to the previous environment on failure.
- Expose both manual ("Check for updates") and scheduled background checks inside the UI, and retain the previous build to support rollback.

## 7. Release & Maintenance

- Automate CI pipelines to build, sign, and publish installers and update manifests.
- Maintain a QA checklist covering fresh installs, in-place updates, rollbacks, and offline scenarios.
- Publish a support playbook that lists log locations, diagnostic scripts, and recovery steps.

## Recommended Next Steps

1. Select and integrate the dependency manager (`poetry` or `pip-tools`) and produce the initial lock file.
2. Prototype `scripts/bootstrap_env.ps1` to confirm the project runs cleanly on a machine without pre-installed Python tooling.
3. Evaluate installer tooling options (NSIS vs. MSIX vs. `electron-builder`) with a small proof-of-concept build.
