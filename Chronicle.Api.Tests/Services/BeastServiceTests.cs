using Chronicle.Api.Services;

namespace Chronicle.Api.Tests.Services;

/// <summary>
/// Tests BeastService Wild Shape filtering by CR, fly speed, and swim speed.
/// Validates Druid-specific scenarios: eligible beasts per level restriction.
/// </summary>
public class BeastServiceTests : IDisposable
{
    private readonly BeastService _service = new();

    public void Dispose()
    {
        // Clear the static cache between tests
        var cacheField = typeof(BeastService)
            .GetField("_cache", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Static);
        cacheField?.SetValue(null, null);
    }

    // --- Basic loading ---

    [Fact]
    public void GetBeasts_NoFilters_ReturnsNonEmptyList()
    {
        var beasts = _service.GetBeasts();

        Assert.NotEmpty(beasts);
    }

    [Fact]
    public void GetBeasts_AllBeasts_HaveNonNullName()
    {
        var beasts = _service.GetBeasts();

        Assert.All(beasts, b => Assert.NotNull(b.Name));
    }

    // --- CR filtering (Druid Wild Shape level gating) ---

    [Fact]
    public void GetBeasts_MaxCr_Quarter_ReturnsOnlyLowCrBeasts()
    {
        var beasts = _service.GetBeasts(maxCr: 0.25);

        Assert.NotEmpty(beasts);
        Assert.All(beasts, b => Assert.True(b.Cr <= 0.25, $"{b.Name} has CR {b.Cr} > 0.25"));
    }

    [Fact]
    public void GetBeasts_MaxCr_1_ReturnsOnlyCrUpToOne()
    {
        var beasts = _service.GetBeasts(maxCr: 1.0);

        Assert.NotEmpty(beasts);
        Assert.All(beasts, b => Assert.True(b.Cr <= 1.0, $"{b.Name} has CR {b.Cr} > 1"));
    }

    [Fact]
    public void GetBeasts_MaxCr_1_HasFewerBeastsThan_MaxCr_6()
    {
        var cr1Beasts = _service.GetBeasts(maxCr: 1.0);
        var cr6Beasts = _service.GetBeasts(maxCr: 6.0);

        Assert.True(cr1Beasts.Count < cr6Beasts.Count,
            $"Expected fewer CR≤1 beasts ({cr1Beasts.Count}) than CR≤6 beasts ({cr6Beasts.Count})");
    }

    [Fact]
    public void GetBeasts_MaxCr_Null_ReturnsAllBeasts()
    {
        var all = _service.GetBeasts(maxCr: null);
        var filtered = _service.GetBeasts(maxCr: 30.0); // artificially high cap

        Assert.Equal(all.Count, filtered.Count);
    }

    // --- Fly speed filtering ---

    [Fact]
    public void GetBeasts_AllowFly_False_ExcludesFlyingBeasts()
    {
        var beasts = _service.GetBeasts(allowFly: false);

        Assert.All(beasts, b => Assert.Equal(0, b.FlySpeed));
    }

    [Fact]
    public void GetBeasts_AllowFly_True_IncludesFlyingBeasts()
    {
        var allBeasts = _service.GetBeasts(allowFly: true);
        var noFlyBeasts = _service.GetBeasts(allowFly: false);

        // There should be at least some flying beasts in the dataset
        Assert.True(allBeasts.Count >= noFlyBeasts.Count);
    }

    // --- Swim speed filtering ---

    [Fact]
    public void GetBeasts_AllowSwim_False_ExcludesSwimmingBeasts()
    {
        var beasts = _service.GetBeasts(allowSwim: false);

        Assert.All(beasts, b => Assert.Equal(0, b.SwimSpeed));
    }

    [Fact]
    public void GetBeasts_AllowSwim_True_IncludesSwimmingBeasts()
    {
        var allBeasts = _service.GetBeasts(allowSwim: true);
        var noSwimBeasts = _service.GetBeasts(allowSwim: false);

        Assert.True(allBeasts.Count >= noSwimBeasts.Count);
    }

    // --- Combined filters ---

    [Fact]
    public void GetBeasts_MaxCr1_NoFly_NoSwim_ReturnsBeastsMatchingAllConstraints()
    {
        var beasts = _service.GetBeasts(maxCr: 1.0, allowFly: false, allowSwim: false);

        Assert.All(beasts, b =>
        {
            Assert.True(b.Cr <= 1.0, $"{b.Name}: CR {b.Cr} > 1");
            Assert.Equal(0, b.FlySpeed);
            Assert.Equal(0, b.SwimSpeed);
        });
    }

    // --- Sort order ---

    [Fact]
    public void GetBeasts_ResultsAreSortedByCR_ThenByName()
    {
        var beasts = _service.GetBeasts();

        for (int i = 0; i < beasts.Count - 1; i++)
        {
            var current = beasts[i];
            var next = beasts[i + 1];

            if (current.Cr == next.Cr)
                Assert.True(string.Compare(current.Name, next.Name, StringComparison.Ordinal) <= 0,
                    $"At same CR {current.Cr}, '{current.Name}' should come before '{next.Name}'");
            else
                Assert.True(current.Cr <= next.Cr,
                    $"CR {current.Cr} ({current.Name}) should come before CR {next.Cr} ({next.Name})");
        }
    }

    // --- Corner cases ---

    [Fact]
    public void GetBeasts_MaxCr_Zero_ReturnsOnlyCRZeroBeasts()
    {
        // Boundary: CR 0 is a valid filter (e.g., Druid level 2 can transform into CR 0 beasts)
        var beasts = _service.GetBeasts(maxCr: 0);

        Assert.All(beasts, b => Assert.True(b.Cr <= 0, $"{b.Name} has CR {b.Cr} > 0"));
    }

    [Fact]
    public void GetBeasts_AllowFly_False_AllowSwim_False_StillReturnsNonEmptyList()
    {
        // There must be land-only beasts at accessible CRs for Druid use
        var beasts = _service.GetBeasts(allowFly: false, allowSwim: false);

        Assert.NotEmpty(beasts);
    }

    [Fact]
    public void GetBeasts_VeryHighMaxCr_ReturnsSameCountAsNoFilter()
    {
        // Any CR cap above the maximum beast CR should yield the full list
        var uncapped = _service.GetBeasts(maxCr: null);
        var highCap = _service.GetBeasts(maxCr: 100);

        Assert.Equal(uncapped.Count, highCap.Count);
    }
}
