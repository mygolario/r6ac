using System.Drawing;
using System.Drawing.Drawing2D;

namespace R6AC.TrayApp;

public static class IconHelper
{
    public static Icon CreateStateIcon(string state)
    {
        int size = 64;
        using var bmp = new Bitmap(size, size);
        using var g = Graphics.FromImage(bmp);
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.Clear(Color.Transparent);

        switch (state.ToUpperInvariant())
        {
            case "CLEAN":
                // Green Circle
                using (var brush = new SolidBrush(Color.FromArgb(34, 197, 94)))
                {
                    g.FillEllipse(brush, 4, 4, size - 8, size - 8);
                }
                break;

            case "WARNING":
                // Yellow Triangle
                using (var brush = new SolidBrush(Color.FromArgb(234, 179, 8)))
                {
                    PointF[] points = {
                        new PointF(size / 2f, 4f),
                        new PointF(size - 4f, size - 4f),
                        new PointF(4f, size - 4f)
                    };
                    g.FillPolygon(brush, points);
                }
                break;

            case "ALERT":
            default:
                // Red Octagon
                using (var brush = new SolidBrush(Color.FromArgb(200, 16, 46)))
                {
                    float s = size;
                    float c = 16f;
                    PointF[] points = {
                        new PointF(c, 4f),
                        new PointF(s - c, 4f),
                        new PointF(s - 4f, c),
                        new PointF(s - 4f, s - c),
                        new PointF(s - c, s - 4f),
                        new PointF(c, s - 4f),
                        new PointF(4f, s - c),
                        new PointF(4f, c)
                    };
                    g.FillPolygon(brush, points);
                }
                break;
        }

        IntPtr hicon = bmp.GetHicon();
        return Icon.FromHandle(hicon);
    }

    public static void SaveDefaultIcon(string path)
    {
        try
        {
            var dir = Path.GetDirectoryName(path);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            using var icon = CreateStateIcon("ALERT");
            using var fs = new FileStream(path, FileMode.Create);
            icon.Save(fs);
        }
        catch { }
    }
}
