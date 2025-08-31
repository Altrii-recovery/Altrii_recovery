# Altrii Helper (Mac)

Supervises an iPhone/iPad and installs a **non-removable** Altrii profile (filtering + disables "Erase All Content and Settings").  
**Requires macOS and Apple Configurator 2** (provides `cfgutil`). Supervision erases the device—back up first.

## Quick steps
1. On a Mac: install **Apple Configurator 2** from the Mac App Store.
2. Plug in iPhone, tap **Trust This Computer**.
3. In Terminal (inside this repo):
   ```bash
   node helper-mac/altrii-helper.mjs
4. Follow prompts. After success, return to your Dashboard and mark the device Supervised.