"""
Script de test rapide pour vérifier que le backend fonctionne.
Lancer avec : python test_api.py
(Le serveur doit être démarré : uvicorn main:app --reload)
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    print("\n1️⃣  Test health check...")
    r = requests.get(f"{BASE_URL}/health")
    print(f"   Status: {r.status_code} | Réponse: {r.json()}")
    assert r.status_code == 200

def test_chat():
    print("\n2️⃣  Test chat...")
    payload = {
        "message": "Quand planter le maïs au Cameroun ?",
        "history": []
    }
    r = requests.post(f"{BASE_URL}/api/v1/chat", json=payload)
    print(f"   Status: {r.status_code}")
    if r.status_code == 200:
        resp = r.json()["response"]
        print(f"   Réponse ({len(resp)} chars): {resp[:150]}...")
    else:
        print(f"   Erreur: {r.text}")

def test_market():
    print("\n3️⃣  Test prix marché...")
    r = requests.get(f"{BASE_URL}/api/v1/market")
    print(f"   Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"   {len(data)} cultures retournées")
        for item in data[:2]:
            print(f"   → {item['emoji']} {item['culture']} : {item['prix_kg']} FCFA/{item['unite']}")

def test_calculator():
    print("\n4️⃣  Test calculateur rentabilité...")
    payload = {
        "culture": "maïs",
        "superficie": 2.5,
        "qualite": "moyen"
    }
    r = requests.post(f"{BASE_URL}/api/v1/calculator", json=payload)
    print(f"   Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        print(f"   Profit net : {data['profit_net']:,} FCFA")
        print(f"   Rentable : {data['rentable']}")
    else:
        print(f"   Erreur: {r.text}")

def test_weather_in_chat():
    print("\n5️⃣  Test météo via chat...")
    payload = {
        "message": "Quelle est la météo agricole cette semaine à Yaoundé ?",
        "history": [],
        "ville": "yaoundé"
    }
    r = requests.post(f"{BASE_URL}/api/v1/chat", json=payload)
    print(f"   Status: {r.status_code}")
    if r.status_code == 200:
        resp = r.json()["response"]
        print(f"   Réponse: {resp[:200]}...")

if __name__ == "__main__":
    print("🌱 AgroVision API — Tests de fonctionnement")
    print("=" * 50)
    try:
        test_health()
        test_chat()
        test_market()
        test_calculator()
        test_weather_in_chat()
        print("\n✅ Tous les tests réussis !")
    except requests.exceptions.ConnectionError:
        print("\n❌ Impossible de connecter au serveur.")
        print("   Lance d'abord : uvicorn main:app --reload --port 8000")
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
