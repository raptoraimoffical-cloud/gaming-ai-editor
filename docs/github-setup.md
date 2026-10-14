# GitHub source repository

Repository: https://github.com/raptoraimoffical-cloud/gaming-ai-editor

The `main` branch contains the application source, tests, documentation, dependency lockfile, data catalogs and installation/download scripts. Local recordings, completed projects, downloaded game artwork and effects, installed runtimes/models, credentials and generated output are excluded by `.gitignore`.

Exclusions control version tracking; they do not delete or move files on this computer. The editor continues using the existing local libraries and settings. The earlier local `master` history remains local because it includes downloaded sprites; only the clean initial `main` history is uploaded.

## Authentication and future updates

Git uses Git Credential Manager and the existing signed-in GitHub account. Credentials stay in its secure credential storage. When login is needed, use the normal browser flow:

```powershell
git credential-manager github login --username raptoraimoffical-cloud --browser
```

Do not put access tokens or provider API keys in Git commands, repository files or commits. Configure provider keys inside the editor. Environment and provider-settings files are excluded, but `.gitignore` cannot detect a key pasted into a source file; review staged changes before pushing.

```powershell
git status
git add .
git diff --cached --stat
git commit -m "Describe the change"
git push
```

Push the current `main` branch. Do not use `git push --all` to upload the older local asset-containing history.

## Using a new checkout

Install the project's dependencies with `npm ci`, provide Node and FFmpeg/FFprobe, and install Python dependencies from `requirements.txt` in a local environment. Recreate the local runtime/models and configure providers on the new machine; none of those settings are copied from GitHub. The existing `scripts/setup.ps1` expects Python and uv binaries already present under `.runtime`.

Asset catalogs and download code are included. Download curated packs with `npm run assets:download`, pixel effects with `python/install_pixel_effects.py`, and sourced narration artwork with `node scripts/cache-context-art.mjs` after installing dependencies. Imported voiceovers, game libraries and saved projects must be supplied separately. Integration checks that exercise installed artwork, a configured model or user media require those local resources.
