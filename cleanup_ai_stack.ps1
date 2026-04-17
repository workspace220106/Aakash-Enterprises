# 🛑 Stop Processes
Stop-Process -Name "ollama" -ErrorAction SilentlyContinue
Stop-Process -Name "docker" -ErrorAction SilentlyContinue

# 🧹 Clear AI Tool Configurations
$folders = @(
    "$env:USERPROFILE\.aider",
    "$env:USERPROFILE\.ollama",
    "$env:APPDATA\Continue",
    "$env:LOCALAPPDATA\Continue",
    "$env:USERPROFILE\.litellm"
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "Removing $folder..."
        Remove-Item -Recurse -Force $folder
    }
}

Write-Host "Cleanup Complete. Please manually uninstall Ollama, Docker, and VS Code from Control Panel if not already done."
