Add-Type -AssemblyName System.Drawing

function Process-CircleIcon($srcPath, $destPngPath) {
    $img = [System.Drawing.Bitmap]::FromFile($srcPath)
    $w = $img.Width
    $h = $img.Height
    
    # We want to find the circle center and radius.
    # In these icons, the center is approximately (w/2, h/2).
    $cx = [int]($w / 2)
    $cy = [int]($h / 2)
    
    # Let's scan from cx to the left (x=0) to find where the coin circle begins (non-white/checkerboard)
    # The background is white or checkerboard (R > 230, G > 230, B > 230).
    $left = 0
    for ($x = 0; $x < $cx; $x++) {
        $p = $img.GetPixel($x, $cy)
        # If it's noticeably different from white/light grey
        if ($p.R < 225 -or $p.G < 225 -or $p.B < 225) {
            $left = $x
            break
        }
    }
    
    $right = $w - 1
    for ($x = $w - 1; $x > $cx; $x--) {
        $p = $img.GetPixel($x, $cy)
        if ($p.R < 225 -or $p.G < 225 -or $p.B < 225) {
            $right = $x
            break
        }
    }
    
    $top = 0
    for ($y = 0; $y < $cy; $y++) {
        $p = $img.GetPixel($cx, $y)
        if ($p.R < 225 -or $p.G < 225 -or $p.B < 225) {
            $top = $y
            break
        }
    }
    
    $bottom = $h - 1
    for ($y = $h - 1; $y > $cy; $y--) {
        $p = $img.GetPixel($cx, $y)
        if ($p.R < 225 -or $p.G < 225 -or $p.B < 225) {
            $bottom = $y
            break
        }
    }
    
    Write-Host "$srcPath bounds: left=$left, right=$right, top=$top, bottom=$bottom (size: $w x $h)"
    
    $coinW = $right - $left
    $coinH = $bottom - $top
    $actualRadius = [Math]::Min($coinW, $coinH) / 2.0
    $actualCx = ($left + $right) / 2.0
    $actualCy = ($top + $bottom) / 2.0
    
    Write-Host "  Coin center=($actualCx, $actualCy), radius=$actualRadius"
    
    # Now let's create a transparent PNG of size (2*radius, 2*radius)
    $targetSize = [int]($actualRadius * 2)
    $outputBmp = New-Object System.Drawing.Bitmap $targetSize, $targetSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    
    # Fill with transparent
    for ($ty = 0; $ty < $targetSize; $ty++) {
        for ($tx = 0; $tx < $targetSize; $tx++) {
            $dx = $tx - $actualRadius
            $dy = $ty - $actualRadius
            $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
            
            # Map back to source image
            $sx = [int]($actualCx + $dx)
            $sy = [int]($actualCy + $dy)
            
            if ($dist <= $actualRadius - 1.5) {
                # Completely inside circle
                if ($sx -ge 0 -and $sx -lt $w -and $sy -ge 0 -and $sy -lt $h) {
                    $p = $img.GetPixel($sx, $sy)
                    $outputBmp.SetPixel($tx, $ty, [System.Drawing.Color]::FromArgb(255, $p.R, $p.G, $p.B))
                }
            } elseif ($dist <= $actualRadius + 0.5) {
                # Antialiased edge
                $alpha = [int](255 * [Math]::Max(0.0, [Math]::Min(1.0, ($actualRadius + 0.5 - $dist) / 2.0)))
                if ($sx -ge 0 -and $sx -lt $w -and $sy -ge 0 -and $sy -lt $h) {
                    $p = $img.GetPixel($sx, $sy)
                    $outputBmp.SetPixel($tx, $ty, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
                }
            } else {
                # Outside circle - fully transparent
                $outputBmp.SetPixel($tx, $ty, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }
    
    $outputBmp.Save($destPngPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $outputBmp.Dispose()
    $img.Dispose()
    Write-Host "  Saved transparent circle PNG to $destPngPath"
}

$dir = "C:\Users\rizva\.gemini\antigravity\scratch\trading-platform\client\public\icons"
Process-CircleIcon "$dir\tron.jpg" "$dir\tron.png"
Process-CircleIcon "$dir\bnb.jpg" "$dir\bnb.png"
Process-CircleIcon "$dir\binance.jpg" "$dir\binance.png"
Process-CircleIcon "$dir\usdt.jpg" "$dir\usdt.png"
