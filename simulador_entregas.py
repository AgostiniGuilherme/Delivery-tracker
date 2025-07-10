# simulador_entregador.py (Versão Otimizada)

import requests
import json
import time
import threading
import math
import random

# --- CONFIGURAÇÕES ---
API_BASE_URL = "http://localhost:3001/api"
LOGIN_ENDPOINT = f"{API_BASE_URL}/auth/login" # Sua rota de login está em /api/auth/login

# Lista de credenciais de entregadores do seu seed.ts
COURIER_CREDENTIALS = [
    {"email": "entregador1@exemplo.com", "password": "123456"},
    {"email": "entregador2@exemplo.com", "password": "123456"},
    {"email": "entregador3@exemplo.com", "password": "123456"},
]

# --- CLASSES E FUNÇÕES AUXILIARES ---

class DeliverySimulator:
    def __init__(self, delivery_data, initial_lat, initial_lon):
        self.id = delivery_data['id']
        self.courier_id = delivery_data['courierId'] # <-- Pegando courierId do delivery_data
        self.courier_name = delivery_data['courierName'] # <-- Pegando courierName do delivery_data
        self.destination_lat = delivery_data['destinationLat']
        self.destination_lng = delivery_data['destinationLng']
        self.current_lat = initial_lat
        self.current_lon = initial_lon
        self.status = delivery_data['status']
        self.num_steps_total = 50 # Aumentado para mais pontos para suavizar o trajeto
        self.trajectory = self._generate_trajectory_points()
        self.current_step_index = 0
        print(f"📦 Simulador criado para entrega {self.id} com entregador {self.courier_name}")

    def _generate_trajectory_points(self):
        """Gera uma trajetória linear entre o ponto inicial e o destino, com aleatoriedade."""
        trajectory = []
        for i in range(self.num_steps_total):
            t = i / (self.num_steps_total - 1)
            lat = self.current_lat + (self.destination_lat - self.current_lat) * t
            lon = self.current_lon + (self.destination_lng - self.current_lon) * t

            if i > 0 and i < self.num_steps_total - 1:
                lat += random.uniform(-0.0002, 0.0002)
                lon += random.uniform(-0.0002, 0.0002)

            trajectory.append((round(lat, 6), round(lon, 6)))
        
        trajectory[-1] = (round(self.destination_lat, 6), round(self.destination_lng, 6))
        return trajectory

    def get_next_location(self):
        if self.current_step_index < len(self.trajectory):
            lat, lon = self.trajectory[self.current_step_index]
            self.current_step_index += 1
            return {
                'latitude': lat,
                'longitude': lon,
                'timestamp': int(time.time() * 1000)
            }
        return None

def obter_token(email, password):
    try:
        resp = requests.post(LOGIN_ENDPOINT, json={"email": email, "password": password})
        resp.raise_for_status()
        return resp.json()["token"]
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao fazer login para {email}: {e}")
        if resp:
            print(f"   Status: {resp.status_code}, Resposta: {resp.text}")
        return None

def get_active_deliveries(token):
    headers = {'Authorization': f'Bearer {token}'}
    active_deliveries = []
    try:
        response = requests.get(f"{API_BASE_URL}/deliveries", headers=headers) # Sua rota /api/deliveries
        response.raise_for_status()
        all_deliveries = response.json()

        for delivery in all_deliveries:
            # Note que seu backend retorna o status em minúsculas (ex: 'in_transit')
            if delivery['status'] in ['pending', 'assigned', 'in_transit']:
                active_deliveries.append(delivery)
        
        return active_deliveries

    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao obter entregas: {e}")
        if response:
            print(f"   Status: {response.status_code}, Resposta: {response.text}")
        return []

def simular_entrega_courier_thread(delivery_data, courier_token):
    delivery_id = delivery_data['id']
    courier_name = delivery_data['courierName'] # Usado para logs e vem do backend
    
    # Ponto de partida inicial para a simulação
    # Prioriza a última localização conhecida, senão gera um ponto aleatório
    initial_lat = delivery_data['lastKnownLocation']['latitude'] if delivery_data['lastKnownLocation'] else (delivery_data['destinationLat'] + random.uniform(-0.1, 0.1))
    initial_lon = delivery_data['lastKnownLocation']['longitude'] if delivery_data['lastKnownLocation'] else (delivery_data['destinationLng'] + random.uniform(-0.1, 0.1))

    simulator = DeliverySimulator(delivery_data, initial_lat, initial_lon)
    headers = {"Authorization": f"Bearer {courier_token}"}
    
    print(f"🚚 [{courier_name}] Iniciando trajeto para entrega {delivery_id}. Destino: ({simulator.destination_lat}, {simulator.destination_lng})")

    while True:
        next_location = simulator.get_next_location()
        if not next_location:
            print(f"🎉 [{courier_name}] Trajeto para entrega {delivery_id} concluído pelo simulador (último ponto enviado).")
            break

        location_data = {
            "deliveryId": delivery_id,
            "latitude": next_location['latitude'],
            "longitude": next_location['longitude'],
            # courierId não é mais necessário no payload, o backend o obtém do token
        }
        
        try:
            resp = requests.post(
                f"{API_BASE_URL}/locations", # Endpoint para envio de localização
                json=location_data,
                headers=headers,
            )
            resp.raise_for_status()
            # print(f"✅ [{courier_name}] Posição enviada para {delivery_id}: ({next_location['latitude']}, {next_location['longitude']})")
        except requests.exceptions.RequestException as e:
            print(f"❌ [{courier_name}] Erro ao enviar posição para {delivery_id}: {e}")
            if resp:
                print(f"   Status: {resp.status_code}, Resposta: {resp.text}")
            if resp and (resp.status_code == 403 or resp.status_code == 404):
                print(f"🚨 [{courier_name}] Parando simulação para {delivery_id} devido a erro de autorização/não encontrado.")
                break
        
        time.sleep(random.uniform(2, 4))

def main():
    courier_tokens = {}
    for courier_cred in COURIER_CREDENTIALS:
        token = obter_token(courier_cred["email"], courier_cred["password"])
        if token:
            courier_tokens[courier_cred["email"]] = token
            print(f"Token obtido para {courier_cred['email']}")
        else:
            print(f"Falha ao obter token para {courier_cred['email']}.")
    
    if not courier_tokens:
        print("Nenhum token de entregador obtido. O simulador não pode prosseguir.")
        return

    active_simulations: dict[str, threading.Thread] = {}

    while True:
        print("\n--- Buscando e Gerenciando Entregas Ativas ---")
        
        sample_token = list(courier_tokens.values())[0] 
        deliveries_from_backend = get_active_deliveries(sample_token)

        current_active_delivery_ids = {d['id'] for d in deliveries_from_backend} # Não filtra por status aqui, já foi filtrado na função
        
        simulators_to_clean = [
            delivery_id for delivery_id in active_simulations 
            if delivery_id not in current_active_delivery_ids and not active_simulations[delivery_id].is_alive()
        ]
        for delivery_id in simulators_to_clean:
            print(f"🧹 Removendo simulação para entrega {delivery_id} (não está mais ativa ou thread finalizou).")
            del active_simulations[delivery_id]

        for delivery_data in deliveries_from_backend:
            delivery_id = delivery_data['id']
            courier_email = delivery_data['courier'] and delivery_data['courier']['email'] # Acessa com segurança
            
            # Ajuste aqui para pegar o courierId do delivery_data
            courier_id_from_delivery = delivery_data['courierId'] 

            # Verifica se a entrega tem um entregador atribuído e se o simulador tem token para ele
            if courier_id_from_delivery and courier_email in courier_tokens:
                if delivery_id not in active_simulations or not active_simulations[delivery_id].is_alive():
                    # Verifica se o entregador desta entrega corresponde a um dos tokens que o simulador possui
                    if any(c['email'] == courier_email for c in COURIER_CREDENTIALS):
                        print(f"🚀 Iniciando/Reiniciando simulação para entrega {delivery_id} (entregador: {courier_email}).")
                        thread = threading.Thread(
                            target=simular_entrega_courier_thread, 
                            args=(delivery_data, courier_tokens[courier_email])
                        )
                        thread.start()
                        active_simulations[delivery_id] = thread
                else:
                    print(f"🔄 Entrega {delivery_id} já está sendo simulada ativamente.")
            elif delivery_data['status'] == 'pending': # Status em minúsculas
                print(f"⏳ Entrega {delivery_id} está PENDING. Aguardando atribuição de entregador.")
            else: # Outros status (delivered, cancelled)
                if delivery_id in active_simulations and active_simulations[delivery_id].is_alive():
                    print(f"⚠️ Entrega {delivery_id} mudou de status para {delivery_data['status']}. A thread de simulação deve finalizar em breve.")
        
        time.sleep(5)

if __name__ == "__main__":
    main()