$viewports = @(
  @{ name = "phase22_1920x1080"; width = 1920; height = 1080 },
  @{ name = "phase22_1600x900";  width = 1600; height = 900 },
  @{ name = "phase22_1440x900";  width = 1440; height = 900 },
  @{ name = "phase22_1366x768";  width = 1366; height = 768 },
  @{ name = "phase22_768x1024";  width = 768;  height = 1024 },
  @{ name = "phase22_390x844";   width = 390;  height = 844 }
)

$artifactDir = "C:\Users\Home\.gemini\antigravity\brain\2c35a3f9-e980-40a2-bc3e-29b52de8acfb"
if (!(Test-Path "D:\PT\docs\screenshots")) {
  New-Item -ItemType Directory -Path "D:\PT\docs\screenshots" -Force
}

foreach ($vp in $viewports) {
  $file = "D:\PT\docs\screenshots\$($vp.name).png"
  $artifactFile = "$artifactDir\$($vp.name).png"
  $tempProfile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "chrome_cap_" + [System.Guid]::NewGuid().ToString())
  
  Write-Host "Capturing $($vp.name) ($($vp.width)x$($vp.height))..."
  
  Start-Process -FilePath "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList `
    "--headless=new", "--disable-gpu", "--no-sandbox", `
    "--user-data-dir=`"$tempProfile`"", `
    "--screenshot=`"$file`"", `
    "--window-size=$($vp.width),$($vp.height)", `
    "http://localhost:3000" -Wait
    
  Start-Sleep -Milliseconds 800
  
  if (Test-Path $file) {
    Copy-Item $file $artifactFile -Force
    $len = (Get-Item $file).Length
    Write-Host "Saved $($vp.name): $len bytes"
  } else {
    Write-Warning "Failed $($vp.name)"
  }
  
  Remove-Item -Path $tempProfile -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "All Phase 22 captures complete!"

