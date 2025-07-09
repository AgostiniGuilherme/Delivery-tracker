import requests
import time
import threading

API_URL = "http://localhost:3001/api"

# Dados dos entregadores simulados
ENTREGADORES = [
    {"email": "entregador1@exemplo.com", "senha": "123456", "entrega_id": "cmcvedp690007ucbo7r9lep7p"},
    {"email": "entregador2@exemplo.com", "senha": "123456", "entrega_id": "cmcvedp6x0009ucboylb22djc"},
    # Adicione mais entregadores/entregas conforme necessário
]

# Trajeto simulado (pode variar para cada entrega)
TRAJETOS = [
    [(-23.5605, -46.6433), (-23.5580, -46.6400), (-23.5555, -46.6370)],
    [(-23.5610, -46.6440), (-23.5590, -46.6410), (-23.5560, -46.6380)],
    [(-23.5620, -46.6450), (-23.5600, -46.6420), (-23.5505, -46.6333)],
]

def obter_token(email, senha):
    resp = requests.post(
        f"{API_URL}/auth/login",
        json={"email": email, "password": senha}
    )
    if resp.status_code == 200:
        return resp.json()["token"]
    else:
        print(f"Erro ao fazer login para {email}: {resp.status_code} {resp.text}")
        return None

def simular_entrega(entregador, trajeto):
    token = obter_token(entregador["email"], entregador["senha"])
    if not token:
        return
    headers = {"Authorization": f"Bearer {token}"}
    delivery_id = entregador["entrega_id"]
    print(f"🚚 [{entregador['email']}] Simulando entrega {delivery_id}")

    for i, (lat, lng) in enumerate(trajeto):
        print(f"📍 [{entregador['email']}] Enviando posição {i+1}/{len(trajeto)}: ({lat}, {lng})")
        resp = requests.post(
            f"{API_URL}/locations",
            json={"deliveryId": delivery_id, "latitude": lat, "longitude": lng},
            headers=headers,
        )
        if resp.status_code == 201:
            print(f"✅ [{entregador['email']}] Posição enviada!")
        else:
            print(f"❌ [{entregador['email']}] Erro: {resp.status_code} - {resp.text}")
        time.sleep(2)  # Aguarda 2 segundos entre posições

    print(f"🎉 [{entregador['email']}] Simulação concluída!")

if __name__ == "__main__":
    threads = []
    for i, entregador in enumerate(ENTREGADORES):
        trajeto = TRAJETOS[i % len(TRAJETOS)]
        t = threading.Thread(target=simular_entrega, args=(entregador, trajeto))
        t.start()
        threads.append(t)
    for t in threads:
        t.join()
    print("Todas as simulações concluídas!") 