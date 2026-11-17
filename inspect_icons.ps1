Add-Type -AssemblyName System.Drawing

$icons = @("tron.jpg", "bnb.jpg", "binance.jpg", "usdt.jpg")
$dir = "C:\Users\rizva\.gemini\antigravity\scratch\trading-platform\client\public\icons"

foreach ($name in $icons) {
    $path = Join-Path $dir $name
    $img = [System.Drawing.Bitmap]::FromFile($path)
    Write-Host "$name : $($img.Width) x $($img.Height)"
    
    # Check color at (0,0) and center
    $c0 = $img.GetPixel(2, 2)
    $cMid = $img.GetPixel([int]($img.Width/2), [int]($img.Height/2))
    Write-Host "  TopLeft (2,2): R=$($c0.R), G=$($c0.G), B=$($c0.B), A=$($c0.A)"
    Write-Host "  Center: R=$($cMid.R), G=$($cMid.G), B=$($cMid.B), A=$($cMid.A)"
    $img.Dispose()
}
