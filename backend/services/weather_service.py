import httpx
from datetime import datetime

# Coordonnées des principales villes agricoles Cameroun
VILLES = {
    "yaoundé":   {"lat": 3.848,  "lon": 11.502},
    "douala":    {"lat": 4.051,  "lon": 9.768},
    "bafoussam": {"lat": 5.478,  "lon": 10.421},
    "garoua":    {"lat": 9.301,  "lon": 13.397},
    "bertoua":   {"lat": 4.578,  "lon": 13.684},
    "ebolowa":   {"lat": 2.900,  "lon": 11.150},
    "bafia":     {"lat": 4.733,  "lon": 11.233},
}

async def get_weather_forecast(ville: str = "yaoundé") -> dict:
    """
    Récupère les prévisions météo via Open-Meteo (100% gratuit, pas de clé API).
    """
    coords = VILLES.get(ville.lower(), VILLES["yaoundé"])
    lat, lon = coords["lat"], coords["lon"]

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&daily=precipitation_sum,temperature_2m_max,temperature_2m_min,"
        f"weathercode,windspeed_10m_max"
        f"&forecast_days=7"
        f"&timezone=Africa%2FDouala"
    )

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(url)
        data = r.json()["daily"]

        jours = []
        alertes = []

        for i in range(7):
            pluie = data["precipitation_sum"][i] or 0
            tmax  = data["temperature_2m_max"][i] or 0
            tmin  = data["temperature_2m_min"][i] or 0
            code  = data["weathercode"][i] or 0
            date  = data["time"][i]

            # Déterminer l'icône météo
            if code < 3:    icon = "☀️"
            elif code < 50: icon = "⛅"
            elif code < 70: icon = "🌧️"
            else:           icon = "⛈️"

            jour = {
                "date":  date,
                "icon":  icon,
                "pluie": round(pluie, 1),
                "tmax":  round(tmax, 1),
                "tmin":  round(tmin, 1),
            }
            jours.append(jour)

            # Générer des alertes agricoles
            if pluie > 30:
                alertes.append({
                    "type":    "danger",
                    "message": f"Jour {i+1} : Fortes pluies ({pluie}mm) — risque maladies fongiques élevé",
                })
            elif pluie == 0 and i < 3:
                alertes.append({
                    "type":    "warning",
                    "message": f"Jour {i+1} : Sécheresse prévue — pensez à irriguer",
                })
            elif pluie > 15:
                alertes.append({
                    "type":    "info",
                    "message": f"Jour {i+1} : Pluies modérées ({pluie}mm) — conditions favorables",
                })

        return {
            "ville":   ville.title(),
            "previsions": jours,
            "alertes":    alertes,
            "source":     "Open-Meteo API",
            "updated":    datetime.now().strftime("%H:%M"),
        }

    except Exception as e:
        print(f"Erreur météo: {e}")
        return {
            "ville":      ville.title(),
            "previsions": [],
            "alertes":    [{"type": "danger", "message": "Données météo indisponibles"}],
            "source":     "Indisponible",
            "updated":    "—",
        }

def format_weather_for_llm(weather: dict) -> str:
    """Formate les données météo pour le contexte LLM."""
    if not weather["previsions"]:
        return "Données météo indisponibles."

    lines = [f"Météo {weather['ville']} — {weather['updated']}"]
    for j in weather["previsions"][:4]:
        lines.append(
            f"{j['date']} : {j['pluie']}mm de pluie, "
            f"{j['tmin']}°C–{j['tmax']}°C"
        )
    if weather["alertes"]:
        lines.append("\nAlertes :")
        for a in weather["alertes"][:3]:
            lines.append(f"  • {a['message']}")
    return "\n".join(lines)
