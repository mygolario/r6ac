using Serilog;
using Serilog.Events;

namespace R6AC.Agent.Utils;

/// <summary>
/// مدیریت لاگ‌های ساختاریافته با استفاده از Serilog.
/// Structured logging manager using Serilog.
/// </summary>
public static class Logger
{
    private static bool _initialized;

    /// <summary>
    /// راه‌اندازی سیستم لاگ با خروجی کنسول و فایل‌های روزانه.
    /// Initialize logging system with Console and daily rolling File sinks.
    /// </summary>
    public static void Initialize()
    {
        if (_initialized) return;

        Log.Logger = new LoggerConfiguration()
            .MinimumLevel.Debug()
            .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
            .Enrich.FromLogContext()
            .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
            .WriteTo.File(
                path: "logs/r6ac-agent-.log",
                rollingInterval: RollingInterval.Day,
                retainedFileCountLimit: 7,
                outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Message:lj}{NewLine}{Exception}")
            .CreateLogger();

        _initialized = true;
    }

    /// <summary>
    /// بستن صحیح فایل‌های لاگ در زمان خروج از برنامه.
    /// Flush and close log sinks cleanly on application shutdown.
    /// </summary>
    public static void Close()
    {
        if (_initialized)
        {
            Log.CloseAndFlush();
            _initialized = false;
        }
    }
}
