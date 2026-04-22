(function initPlanetPage()
{
    const planetName = document.body.dataset.planet;
    if (!planetName)
    {
        return;
    }
    renderPlanetUI(planetName);

    if (typeof AudioManager !== 'undefined')
    {
        AudioManager.init();
    }
})();