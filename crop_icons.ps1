$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;

public class IconCropper {
    public static void CropCircle(string srcPath, string destPath) {
        using (Bitmap src = new Bitmap(srcPath)) {
            int w = src.Width;
            int h = src.Height;
            int cx = w / 2;
            int cy = h / 2;

            // 1. Scan left
            int left = 0;
            for (int x = 0; x < cx; x++) {
                Color p = src.GetPixel(x, cy);
                // Check if not white / checkerboard
                if (p.R < 235 || p.G < 235 || p.B < 235) {
                    left = x;
                    break;
                }
            }

            // 2. Scan right
            int right = w - 1;
            for (int x = w - 1; x > cx; x--) {
                Color p = src.GetPixel(x, cy);
                if (p.R < 235 || p.G < 235 || p.B < 235) {
                    right = x;
                    break;
                }
            }

            // 3. Scan top
            int top = 0;
            for (int y = 0; y < cy; y++) {
                Color p = src.GetPixel(cx, y);
                if (p.R < 235 || p.G < 235 || p.B < 235) {
                    top = y;
                    break;
                }
            }

            // 4. Scan bottom
            int bottom = h - 1;
            for (int y = h - 1; y > cy; y--) {
                Color p = src.GetPixel(cx, y);
                if (p.R < 235 || p.G < 235 || p.B < 235) {
                    bottom = y;
                    break;
                }
            }

            Console.WriteLine(string.Format("{0} -> Left:{1}, Right:{2}, Top:{3}, Bottom:{4}", srcPath, left, right, top, bottom));

            double coinW = right - left;
            double coinH = bottom - top;
            double radius = Math.Min(coinW, coinH) / 2.0;
            // Trim 1.5 pixel inward to completely eliminate any remaining white fringe
            radius = radius - 1.5;
            double centerImgX = (left + right) / 2.0;
            double centerImgY = (top + bottom) / 2.0;

            int size = (int)(radius * 2);
            using (Bitmap dest = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
                for (int ty = 0; ty < size; ty++) {
                    for (int tx = 0; tx < size; tx++) {
                        double dx = tx - radius;
                        double dy = ty - radius;
                        double dist = Math.Sqrt(dx * dx + dy * dy);

                        int sx = (int)(centerImgX + dx);
                        int sy = (int)(centerImgY + dy);

                        if (dist <= radius - 1.0) {
                            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                                Color p = src.GetPixel(sx, sy);
                                dest.SetPixel(tx, ty, Color.FromArgb(255, p.R, p.G, p.B));
                            }
                        } else if (dist <= radius) {
                            // Smooth antialiasing edge
                            double factor = radius - dist;
                            int alpha = (int)(255 * factor);
                            if (alpha > 255) alpha = 255;
                            if (alpha < 0) alpha = 0;

                            if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
                                Color p = src.GetPixel(sx, sy);
                                dest.SetPixel(tx, ty, Color.FromArgb(alpha, p.R, p.G, p.B));
                            }
                        } else {
                            dest.SetPixel(tx, ty, Color.FromArgb(0, 0, 0, 0));
                        }
                    }
                }
                dest.Save(destPath, ImageFormat.Png);
            }
        }
    }
}
"@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing

$dir = "C:\Users\rizva\.gemini\antigravity\scratch\trading-platform\client\public\icons"
[IconCropper]::CropCircle("$dir\tron.jpg", "$dir\tron.png")
[IconCropper]::CropCircle("$dir\bnb.jpg", "$dir\bnb.png")
[IconCropper]::CropCircle("$dir\binance.jpg", "$dir\binance.png")
[IconCropper]::CropCircle("$dir\usdt.jpg", "$dir\usdt.png")
Write-Host "All icons cropped to perfect circular transparent PNGs!"
