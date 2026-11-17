$csharp = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class LogoRenderer {
    public static void GenerateHighResLogo(string outAvatarPath, string outFullLogoPath) {
        // 1. Generate 1024x1024 App / Telegram Avatar Icon
        int size = 1024;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;

                // Dark background
                using (SolidBrush bg = new SolidBrush(Color.FromArgb(255, 10, 11, 15))) {
                    g.FillRectangle(bg, 0, 0, size, size);
                }

                // Ambient Radial Glow behind the icon
                using (GraphicsPath glowPath = new GraphicsPath()) {
                    glowPath.AddEllipse(size * 0.15f, size * 0.15f, size * 0.7f, size * 0.7f);
                    using (PathGradientBrush pgb = new PathGradientBrush(glowPath)) {
                        pgb.CenterColor = Color.FromArgb(45, 16, 185, 129);
                        pgb.SurroundColors = new Color[] { Color.FromArgb(0, 10, 11, 15) };
                        g.FillPath(pgb, glowPath);
                    }
                }

                // Rounded Squircle Container
                float pad = 120f;
                float boxSize = size - (pad * 2);
                float radius = 180f;

                GraphicsPath boxPath = new GraphicsPath();
                boxPath.AddArc(pad, pad, radius, radius, 180, 90);
                boxPath.AddArc(pad + boxSize - radius, pad, radius, radius, 270, 90);
                boxPath.AddArc(pad + boxSize - radius, pad + boxSize - radius, radius, radius, 0, 90);
                boxPath.AddArc(pad, pad + boxSize - radius, radius, radius, 90, 90);
                boxPath.CloseFigure();

                // Inner box background: dark titanium
                using (LinearGradientBrush boxBrush = new LinearGradientBrush(
                    new PointF(pad, pad),
                    new PointF(pad + boxSize, pad + boxSize),
                    Color.FromArgb(255, 20, 22, 32),
                    Color.FromArgb(255, 12, 13, 18)
                )) {
                    g.FillPath(boxBrush, boxPath);
                }

                // Outer border gradient: Emerald to Cyan
                using (LinearGradientBrush borderBrush = new LinearGradientBrush(
                    new PointF(pad, pad),
                    new PointF(pad + boxSize, pad + boxSize),
                    Color.FromArgb(255, 52, 211, 153),
                    Color.FromArgb(255, 6, 182, 212)
                )) {
                    using (Pen borderPen = new Pen(borderBrush, 14f)) {
                        g.DrawPath(borderPen, boxPath);
                    }
                }

                // Inner Glow on Border
                using (Pen innerPen = new Pen(Color.FromArgb(60, 255, 255, 255), 3f)) {
                    g.DrawPath(innerPen, boxPath);
                }

                // Draw the dynamic GrowthX Symbol
                // Center: size/2, size/2
                float cx = size / 2f;
                float cy = size / 2f;
                float span = 200f; // half span

                // 1. Back slash: bottom-left to top-right (Growth curve with arrow)
                PointF bl = new PointF(cx - span, cy + span);
                PointF tr = new PointF(cx + span, cy - span);

                using (LinearGradientBrush greenBrush = new LinearGradientBrush(
                    bl, tr,
                    Color.FromArgb(255, 16, 185, 129),
                    Color.FromArgb(255, 6, 182, 212)
                )) {
                    using (Pen mainPen = new Pen(greenBrush, 58f)) {
                        mainPen.StartCap = LineCap.Round;
                        mainPen.EndCap = LineCap.Round;
                        g.DrawLine(mainPen, bl, tr);
                    }

                    // Arrowhead at TR
                    PointF arrowLeft = new PointF(tr.X - 110f, tr.Y);
                    PointF arrowDown = new PointF(tr.X, tr.Y + 110f);

                    using (Pen arrowPen = new Pen(greenBrush, 58f)) {
                        arrowPen.StartCap = LineCap.Round;
                        arrowPen.EndCap = LineCap.Round;
                        arrowPen.LineJoin = LineJoin.Round;
                        g.DrawLines(arrowPen, new PointF[] { arrowLeft, tr, arrowDown });
                    }
                }

                // 2. Cross stroke: top-left to center, and center to bottom-right (in clean bright white with cut gap)
                PointF tl = new PointF(cx - span, cy - span);
                PointF tlMid = new PointF(cx - 55f, cy - 55f);
                PointF brMid = new PointF(cx + 55f, cy + 55f);
                PointF br = new PointF(cx + span, cy + span);

                using (Pen whitePen = new Pen(Color.White, 58f)) {
                    whitePen.StartCap = LineCap.Round;
                    whitePen.EndCap = LineCap.Round;
                    g.DrawLine(whitePen, tl, tlMid);
                    g.DrawLine(whitePen, brMid, br);
                }
            }
            bmp.Save(outAvatarPath, ImageFormat.Png);
        }

        // 2. Generate 1600x600 Full Brand Banner (Icon + GrowthX typography + Tagline)
        int w = 1600;
        int h = 600;
        using (Bitmap banner = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(banner)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;

                // Dark background
                using (SolidBrush bg = new SolidBrush(Color.FromArgb(255, 10, 11, 15))) {
                    g.FillRectangle(bg, 0, 0, w, h);
                }

                // Ambient emerald glow left
                using (GraphicsPath glowPath = new GraphicsPath()) {
                    glowPath.AddEllipse(50, 50, 500, 500);
                    using (PathGradientBrush pgb = new PathGradientBrush(glowPath)) {
                        pgb.CenterColor = Color.FromArgb(50, 16, 185, 129);
                        pgb.SurroundColors = new Color[] { Color.FromArgb(0, 10, 11, 15) };
                        g.FillPath(pgb, glowPath);
                    }
                }

                // Draw Avatar Icon scaled down on the left
                using (Image iconImg = Image.FromFile(outAvatarPath)) {
                    g.DrawImage(iconImg, new Rectangle(120, 110, 380, 380));
                }

                // Typography
                using (Font fontMain = new Font("Arial", 110, FontStyle.Bold)) {
                    // "Growth" in White
                    g.DrawString("Growth", fontMain, Brushes.White, new PointF(540, 175));
                    
                    // Measure "Growth"
                    SizeF growthSize = g.MeasureString("Growth", fontMain);

                    // "X" with Emerald Gradient
                    using (LinearGradientBrush xBrush = new LinearGradientBrush(
                        new PointF(540 + growthSize.Width - 45, 175),
                        new PointF(540 + growthSize.Width + 120, 290),
                        Color.FromArgb(255, 52, 211, 153),
                        Color.FromArgb(255, 6, 182, 212)
                    )) {
                        g.DrawString("X", fontMain, xBrush, new PointF(540 + growthSize.Width - 45, 175));
                    }
                }

                // Tagline
                using (Font fontSub = new Font("Arial", 28, FontStyle.Bold)) {
                    using (SolidBrush subBrush = new SolidBrush(Color.FromArgb(255, 156, 163, 175))) {
                        g.DrawString("PRIVATE CAPITAL EXECUTION & GROWTH TERMINAL", fontSub, subBrush, new PointF(548, 330));
                    }
                }

                // Mini stats badge below tagline
                using (Font fontBadge = new Font("Arial", 20, FontStyle.Bold)) {
                    using (SolidBrush badgeBg = new SolidBrush(Color.FromArgb(255, 20, 23, 34))) {
                        g.FillRectangle(badgeBg, 548, 395, 340, 48);
                    }
                    using (Pen badgeBorder = new Pen(Color.FromArgb(255, 30, 41, 59), 2f)) {
                        g.DrawRectangle(badgeBorder, 548, 395, 340, 48);
                    }
                    using (SolidBrush dotBrush = new SolidBrush(Color.FromArgb(255, 52, 211, 153))) {
                        g.FillEllipse(dotBrush, 565, 413, 12, 12);
                    }
                    using (SolidBrush badgeText = new SolidBrush(Color.FromArgb(255, 209, 213, 219))) {
                        g.DrawString("VIP PORTFOLIO ACCESS", fontBadge, badgeText, new PointF(590, 407));
                    }
                }
            }
            banner.Save(outFullLogoPath, ImageFormat.Png);
        }
    }
}
"@

Add-Type -TypeDefinition $csharp -ReferencedAssemblies System.Drawing

$avatarPath = "C:\Users\rizva\.gemini\antigravity\scratch\trading-platform\GrowthX_Avatar_1024.png"
$bannerPath = "C:\Users\rizva\.gemini\antigravity\scratch\trading-platform\GrowthX_Banner_Full.png"

# Also copy into client public so user can view/download in browser directly
$pubAvatar = "C:\Users\rizva\.gemini\antigravity\scratch\trading-platform\client\public\growthx-logo.png"
$pubBanner = "C:\Users\rizva\.gemini\antigravity\scratch\trading-platform\client\public\growthx-banner.png"

# Also into artifact directory for embedding in artifact
$artAvatar = "C:\Users\rizva\.gemini\antigravity\brain\c7c7224a-3da0-4ce6-ad22-afeb096bb295\GrowthX_Avatar_1024.png"
$artBanner = "C:\Users\rizva\.gemini\antigravity\brain\c7c7224a-3da0-4ce6-ad22-afeb096bb295\GrowthX_Banner_Full.png"

[LogoRenderer]::GenerateHighResLogo($avatarPath, $bannerPath)

Copy-Item $avatarPath $pubAvatar -Force
Copy-Item $bannerPath $pubBanner -Force
Copy-Item $avatarPath $artAvatar -Force
Copy-Item $bannerPath $artBanner -Force

Write-Host "Generated ultra high-res logo files successfully!"
