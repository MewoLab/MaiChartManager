﻿using Microsoft.AspNetCore.Mvc;

namespace MaiChartManager.Controllers.Charts;

[ApiController]
[Route("MaiChartManagerServlet/[action]Api/{assetDir}/{id:int}/{level:int}")]
public class ChartController(StaticSettings settings, ILogger<StaticSettings> logger) : ControllerBase
{
    [HttpPost]
    public void EditChartLevel(int id, int level, [FromBody] int value, string assetDir)
    {
        var music = settings.GetMusic(id, assetDir);
        if (music != null)
        {
            var chart = music.Charts[level];
            if (chart != null)
            {
                chart.Level = value;
            }
        }
    }

    [HttpPost]
    public void EditChartLevelDisplay(int id, int level, [FromBody] int value, string assetDir)
    {
        var music = settings.GetMusic(id, assetDir);
        if (music != null)
        {
            var chart = music.Charts[level];
            if (chart != null)
            {
                chart.LevelId = value;
            }
        }
    }

    [HttpPost]
    public void EditChartLevelDecimal(int id, int level, [FromBody] int value, string assetDir)
    {
        var music = settings.GetMusic(id, assetDir);
        if (music != null)
        {
            var chart = music.Charts[level];
            if (chart != null)
            {
                chart.LevelDecimal = value;
            }
        }
    }

    [HttpPost]
    public void EditChartDesigner(int id, int level, [FromBody] string value, string assetDir)
    {
        var music = settings.GetMusic(id, assetDir);
        if (music != null)
        {
            var chart = music.Charts[level];
            if (chart != null)
            {
                chart.Designer = value;
            }
        }
    }

    [HttpPost]
    public void EditChartNoteCount(int id, int level, [FromBody] int value, string assetDir)
    {
        var music = settings.GetMusic(id, assetDir);
        if (music != null)
        {
            var chart = music.Charts[level];
            if (chart != null)
            {
                chart.MaxNotes = value;
            }
        }
    }

    [HttpPost]
    public void EditChartEnable(int id, int level, [FromBody] bool value, string assetDir)
    {
        var music = settings.GetMusic(id, assetDir);
        if (music != null)
        {
            var chart = music.Charts[level];
            if (chart != null)
            {
                chart.Enable = value;
            }
        }
    }
}
