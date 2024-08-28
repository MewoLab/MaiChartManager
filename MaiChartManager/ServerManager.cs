﻿using System.Net;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;
using System.Windows.Forms;
using Microsoft.AspNetCore.Server.Kestrel.Https;
using Pluralsight.Crypto;
using Sentry.AspNetCore;

namespace MaiChartManager;

public static class ServerManager
{
    public static WebApplication? app;

    public static async Task StopAsync()
    {
        if (app == null) return;
        await app.StopAsync();
        await app.DisposeAsync();
        app = null;
    }

    public static bool IsRunning => app != null;

    private static X509Certificate2 GetCert()
    {
        var path = Path.Combine(Application.LocalUserAppDataPath, "cert.pfx");
        if (File.Exists(path))
        {
            return new X509Certificate2(path);
        }

        // ASP.NET 是不是不支持 ecc
        // var ecdsa = ECDsa.Create();
        // var req = new CertificateRequest("CN=MaiChartManager", ecdsa, HashAlgorithmName.SHA256);
        // req.CertificateExtensions.Add(new X509BasicConstraintsExtension(false, false, 0, false));
        // req.CertificateExtensions.Add(new X509KeyUsageExtension(X509KeyUsageFlags.DigitalSignature | X509KeyUsageFlags.KeyEncipherment, false));
        // req.CertificateExtensions.Add(new X509EnhancedKeyUsageExtension([new Oid("1.3.6.1.5.5.7.3.1")], true));
        // req.CertificateExtensions.Add(new X509SubjectKeyIdentifierExtension(req.PublicKey, false));
        // var builder = new SubjectAlternativeNameBuilder();
        // builder.AddDnsName("MaiChartManager");
        // req.CertificateExtensions.Add(builder.Build());
        //
        // var cert = req.CreateSelfSigned(DateTimeOffset.Now, DateTimeOffset.Now.AddYears(5));
        using var ctx = new CryptContext();
        ctx.Open();

        var cert = ctx.CreateSelfSignedCertificate(
            new SelfSignedCertProperties
            {
                IsPrivateKeyExportable = true,
                KeyBitLength = 4096,
                Name = new X500DistinguishedName("cn=MaiChartManager"),
                ValidFrom = DateTime.Today.AddDays(-1),
                ValidTo = DateTime.Today.AddYears(5),
            });

        X509Certificate2UI.DisplayCertificate(cert);

        File.WriteAllBytes(path, cert.Export(X509ContentType.Pfx));
        return cert;
    }

    public static void StartApp(bool export, Action? onStart = null)
    {
        var builder = WebApplication.CreateBuilder();

        builder.WebHost.UseSentry((SentryAspNetCoreOptions o) =>
        {
            // Tells which project in Sentry to send events to:
            o.Dsn = "https://b9c3da740445a9de74e8a4204bded577@o4507852801638400.ingest.de.sentry.io/4507852868419664";
            // Set TracesSampleRate to 1.0 to capture 100% of transactions for tracing.
            // We recommend adjusting this value in production.
            o.TracesSampleRate = 0.5;
        });

        builder.Services.AddSingleton<StaticSettings>()
            .AddEndpointsApiExplorer()
            .AddSwaggerGen()
            .AddControllers()
            .AddJsonOptions(options =>
                options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

# if !DEBUG
        builder.WebHost.ConfigureKestrel((context, serverOptions) =>
        {
            serverOptions.Listen(IPAddress.Loopback, 0);
            if (export)
            {
                serverOptions.Listen(IPAddress.Any, 5001, listenOptions =>
                {
                    listenOptions.UseHttps(new HttpsConnectionAdapterOptions()
                    {
                        ServerCertificate = GetCert()
                    });
                });
            }
        });
# endif

        app = builder.Build();
        app.Lifetime.ApplicationStarted.Register(() => { app.Services.GetService<StaticSettings>(); });

# if DEBUG
        app.Lifetime.ApplicationStopped.Register(Application.Exit);
# endif

        if (onStart != null)
            app.Lifetime.ApplicationStarted.Register(onStart);

        app.UseSwagger();
        app.UseSwaggerUI();
        app.UseFileServer();
        app.MapControllers();
        Task.Run(app.Run);
    }
}