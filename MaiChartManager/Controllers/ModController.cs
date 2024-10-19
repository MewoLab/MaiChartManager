﻿using System.IO.Compression;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Tomlet;

namespace MaiChartManager.Controllers;

[ApiController]
[Route("MaiChartManagerServlet/[action]Api")]
public class ModController(StaticSettings settings, ILogger<ModController> logger) : ControllerBase
{
    [HttpGet]
    public bool IsMelonInstalled()
    {
        return System.IO.File.Exists(Path.Combine(StaticSettings.GamePath, "dobby.dll"))
               && System.IO.File.Exists(Path.Combine(StaticSettings.GamePath, "version.dll"))
               && Directory.Exists(Path.Combine(StaticSettings.GamePath, "MelonLoader"));
    }

    [HttpGet]
    public bool IsAquaMaiInstalled()
    {
        return System.IO.File.Exists(Path.Combine(StaticSettings.GamePath, @"Mods\AquaMai.dll"));
    }

    public record GameModInfo(bool MelonLoaderInstalled, bool AquaMaiInstalled, string AquaMaiVersion, string BundledAquaMaiVersion);

    [HttpGet]
    public GameModInfo GetGameModInfo()
    {
        var aquaMaiInstalled = IsAquaMaiInstalled();
        var aquaMaiVersion = "N/A";
        if (aquaMaiInstalled)
        {
            aquaMaiVersion = System.Diagnostics.FileVersionInfo.GetVersionInfo(Path.Combine(StaticSettings.GamePath, @"Mods\AquaMai.dll")).ProductVersion;
        }

        var bundledAquaMaiVersion = AppDomain.CurrentDomain.GetAssemblies()
            .FirstOrDefault(a => a.GetName().Name == "AquaMai")?.GetName().Version?.ToString(3) ?? "N/A";

        return new GameModInfo(IsMelonInstalled(), aquaMaiInstalled, aquaMaiVersion, bundledAquaMaiVersion);
    }

    [HttpGet]
    public AquaMai.Config GetAquaMaiConfig()
    {
        var path = Path.Combine(StaticSettings.GamePath, "AquaMai.toml");
        return System.IO.File.Exists(path)
            ? TomletMain.To<AquaMai.Config>(System.IO.File.ReadAllText(path))
            : new AquaMai.Config();
    }

    [HttpPut]
    public void SetAquaMaiConfig(AquaMai.Config config)
    {
        System.IO.File.WriteAllText(Path.Combine(StaticSettings.GamePath, "AquaMai.toml"), TomletMain.DocumentFrom(config).SerializedValue);
    }

    [HttpPost]
    public void InstallMelonLoader()
    {
        if (IsMelonInstalled())
        {
            logger.LogInformation("MelonLoader is already installed.");
            return;
        }

        using var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("MaiChartManager.Resources.MelonLoader.x64.zip")!;
        var zip = new ZipArchive(s, ZipArchiveMode.Read);
        foreach (var entry in zip.Entries)
        {
            if (entry.Name == "NOTICE.txt")
                continue;

            Directory.CreateDirectory(Path.GetDirectoryName(Path.Combine(StaticSettings.GamePath, entry.FullName)));
            entry.ExtractToFile(Path.Combine(StaticSettings.GamePath, entry.FullName), true);
        }
    }

    [HttpPost]
    public void InstallAquaMai()
    {
        var src = Path.Combine(StaticSettings.exeDir, "AquaMai.dll");
        var dest = Path.Combine(StaticSettings.GamePath, @"Mods\AquaMai.dll");
        Directory.CreateDirectory(Path.GetDirectoryName(dest));
        System.IO.File.Copy(src, dest, true);
    }
}
