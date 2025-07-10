import requests
import time
import threading
import math

API_URL = "http://localhost:3001/api"

# Dados dos entregadores simulados com IDs das entregas do seed
ENTREGADORES = [
    {"email": "entregador1@exemplo.com", "senha": "123456", "entrega_id": "cmcxr0f2x0007uc7wzlyasroo"},
    {"email": "entregador2@exemplo.com", "senha": "123456", "entrega_id": "cmcxr0f380009uc7wkm8xu7el"},
]

# Destinos das entregas (baseado no seed.ts)
DESTINOS = {
    "cmcxr0f2x0007uc7wzlyasroo": (-23.5505, -46.6333),  # Av. Paulista, 1000
    "cmcxr0f380009uc7wkm8xu7el": (-23.5605, -46.6433),  # Rua Augusta, 500
}

# Pontos de partida simulados (diferentes para cada entregador)
PONTOS_PARTIDA = [
    (-23.5805, -46.6633),  # Zona sul de São Paulo
    (-23.5705, -46.6533),  # Zona oeste de São Paulo
]

def calcular_ponto_intermediario(lat1, lng1, lat2, lng2, progresso):
    """Calcula um ponto intermediário entre dois pontos baseado no progresso (0-1)"""
    lat = lat1 + (lat2 - lat1) * progresso
    lng = lng1 + (lng2 - lng1) * progresso
    return lat, lng

def gerar_trajeto_completo(ponto_partida, destino, num_pontos=12):
    """Gera um trajeto realista com variações de rota"""
    trajeto = []
    
    # Adiciona pequenas variações para simular rotas reais
    variacoes = [
        (0.001, 0.001), (-0.001, 0.002), (0.002, -0.001), (-0.002, 0.001),
        (0.001, -0.002), (-0.001, -0.001), (0.002, 0.002), (-0.002, -0.002)
    ]
    
    for i in range(num_pontos):
        progresso = i / (num_pontos - 1)
        
        # Calcula ponto base
        lat, lng = calcular_ponto_intermediario(
            ponto_partida[0], ponto_partida[1],
            destino[0], destino[1],
            progresso
        )
        
        # Adiciona variação para simular rota real
        if i > 0 and i < num_pontos - 1:
            variacao = variacoes[i % len(variacoes)]
            lat += variacao[0]
            lng += variacao[1]
        
        trajeto.append((lat, lng))
    
    return trajeto

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
    destino = DESTINOS.get(delivery_id)
    
    print(f"🚚 [{entregador['email']}] Simulando entrega {delivery_id}")
    print(f"📍 Destino: {destino}")
    print(f"🛣️ Trajeto com {len(trajeto)} pontos")

    for i, (lat, lng) in enumerate(trajeto):
        # Calcula distância até o destino
        if destino:
            distancia = math.sqrt((lat - destino[0])**2 + (lng - destino[1])**2) * 111  # Aproximadamente km
            print(f"📍 [{entregador['email']}] Posição {i+1}/{len(trajeto)}: ({lat:.6f}, {lng:.6f}) - {distancia:.2f}km do destino")
        else:
            print(f"📍 [{entregador['email']}] Posição {i+1}/{len(trajeto)}: ({lat:.6f}, {lng:.6f})")
        
        resp = requests.post(
            f"{API_URL}/locations",
            json={"deliveryId": delivery_id, "latitude": lat, "longitude": lng},
            headers=headers,
        )
        if resp.status_code == 201:
            print(f"✅ [{entregador['email']}] Posição enviada!")
        else:
            print(f"❌ [{entregador['email']}] Erro: {resp.status_code} - {resp.text}")
        
        # Intervalo variável baseado na proximidade do destino
        if destino:
            distancia = math.sqrt((lat - destino[0])**2 + (lng - destino[1])**2)
            if distancia < 0.01:  # Muito próximo do destino
                intervalo = 1  # 1 segundo
            elif distancia < 0.05:  # Próximo do destino
                intervalo = 1.5  # 1.5 segundos
            else:
                intervalo = 2  # 2 segundos
        else:
            intervalo = 2
        
        time.sleep(intervalo)

    print(f"🎉 [{entregador['email']}] Simulação concluída!")

if __name__ == "__main__":
    threads = []
    for i, entregador in enumerate(ENTREGADORES):
        delivery_id = entregador["entrega_id"]
        destino = DESTINOS.get(delivery_id)
        
        if destino:
            ponto_partida = PONTOS_PARTIDA[i % len(PONTOS_PARTIDA)]
            trajeto = gerar_trajeto_completo(ponto_partida, destino, num_pontos=12)
            
            print(f"🛣️ Trajeto {i+1}: {ponto_partida} → {destino}")
            
            t = threading.Thread(target=simular_entrega, args=(entregador, trajeto))
            t.start()
            threads.append(t)
        else:
            print(f"⚠️ Destino não encontrado para entrega {delivery_id}")
    
    for t in threads:
        t.join()
    print("🎉 Todas as simulações concluídas!") 