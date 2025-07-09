# simulador_entregador.py (Versão Final Otimizada para seu Backend)

import requests
import json
import time
import threading
import math
import random

# --- CONFIGURAÇÕES ---
# A URL base do seu backend.
API_BASE_URL = "http://localhost:3001/api"
LOGIN_ENDPOINT = f"{API_BASE_URL}/auth/login" # Confirme que esta é a sua rota de login exata

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
        self.courier_id = delivery_data['courierId']
        self.courier_name = delivery_data['courier']['name']
        self.destination_lat = delivery_data['destinationLat']
        self.destination_lng = delivery_data['destinationLng']
        self.current_lat = initial_lat
        self.current_lon = initial_lon
        self.status = delivery_data['status']
        self.num_steps_total = 20 # Número de pontos na trajetória
        self.trajectory = self._generate_trajectory_points()
        self.current_step_index = 0
        print(f"📦 Simulador criado para entrega {self.id} com entregador {self.courier_name}")

    def _generate_trajectory_points(self):
        """Gera uma trajetória linear entre o ponto inicial e o destino, com aleatoriedade."""
        trajectory = []
        for i in range(self.num_steps_total):
            # Interpolação linear
            t = i / (self.num_steps_total - 1)
            lat = self.current_lat + (self.destination_lat - self.current_lat) * t
            lon = self.current_lon + (self.destination_lng - self.current_lon) * t

            # Adiciona um pouco de aleatoriedade aos pontos intermediários, exceto o último
            if i > 0 and i < self.num_steps_total - 1:
                lat += random.uniform(-0.0002, 0.0002) # Pequenas variações
                lon += random.uniform(-0.0002, 0.0002)

            trajectory.append((round(lat, 6), round(lon, 6)))
        
        # Garante que o último ponto é EXATAMENTE o destino
        trajectory[-1] = (round(self.destination_lat, 6), round(self.destination_lng, 6))
        return trajectory

    def get_next_location(self):
        """Retorna a próxima localização na trajetória."""
        if self.current_step_index < len(self.trajectory):
            lat, lon = self.trajectory[self.current_step_index]
            self.current_step_index += 1
            return {
                'latitude': lat,
                'longitude': lon,
                'timestamp': int(time.time() * 1000)
            }
        return None # Trajetória completa

def obter_token(email, password):
    """Obtém um token JWT do backend para o entregador."""
    try:
        resp = requests.post(LOGIN_ENDPOINT, json={"email": email, "password": password})
        resp.raise_for_status() # Levanta exceção para erros HTTP
        return resp.json()["token"]
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao fazer login para {email}: {e}")
        if resp: # Verifica se a resposta existe antes de tentar acessá-la
            print(f"   Status: {resp.status_code}, Resposta: {resp.text}")
        return None

def get_active_deliveries(token):
    """Pega a lista de entregas ativas do backend."""
    headers = {'Authorization': f'Bearer {token}'}
    try:
        response = requests.get(f"{API_BASE_URL}/deliveries", headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao obter entregas ativas: {e}")
        if response:
            print(f"   Status: {response.status_code}, Resposta: {response.text}")
        return []

def simular_entrega_courier_thread(delivery_data, courier_token):
    """Função que a thread de simulação executa para uma entrega."""
    delivery_id = delivery_data['id']
    courier_name = delivery_data['courier']['name'] # Usado apenas para logs

    # Ponto de partida inicial para a simulação
    # Se houver uma última localização conhecida, use-a. Caso contrário, um ponto aleatório.
    initial_lat = delivery_data['lastKnownLocation']['latitude'] if delivery_data['lastKnownLocation'] else (delivery_data['destinationLat'] + random.uniform(-0.1, 0.1))
    initial_lon = delivery_data['lastKnownLocation']['longitude'] if delivery_data['lastKnownLocation'] else (delivery_data['destinationLng'] + random.uniform(-0.1, 0.1))

    simulator = DeliverySimulator(delivery_data, initial_lat, initial_lon)
    headers = {"Authorization": f"Bearer {courier_token}"}
    
    print(f"🚚 [{courier_name}] Iniciando trajeto para entrega {delivery_id}. Destino: ({simulator.destination_lat}, {simulator.destination_lng})")

    while True:
        # Nota: O backend é responsável por mudar o status para DELIVERED.
        # O simulador deve parar quando não houver mais pontos para enviar ou se o backend já marcou como DELIVERED.
        
        next_location = simulator.get_next_location()
        if not next_location:
            print(f"🎉 [{courier_name}] Trajeto para entrega {delivery_id} concluído pelo simulador (último ponto enviado).")
            # Agora, o backend (via DeliveryQueueService) deve detectar a chegada e marcar como DELIVERED
            break # Trajetória completa, para a thread de simulação

        location_data = {
            "deliveryId": delivery_id,
            "latitude": next_location['latitude'],
            "longitude": next_location['longitude'],
            # REMOVIDO: "courierId": courier_id, -> Não é mais necessário no payload, o backend pega do token
        }
        
        try:
            resp = requests.post(
                f"{API_BASE_URL}/locations", 
                json=location_data,
                headers=headers,
            )
            resp.raise_for_status()
            # print(f"✅ [{courier_name}] Posição enviada para {delivery_id}: ({next_location['latitude']}, {next_location['longitude']})")
        except requests.exceptions.RequestException as e:
            print(f"❌ [{courier_name}] Erro ao enviar posição para {delivery_id}: {e}")
            if resp:
                print(f"   Status: {resp.status_code}, Resposta: {resp.text}")
            # Se a resposta for 403 (Forbidden) ou 404 (Not Found), a entrega pode ter sido concluída/reassinalada.
            # O simulador deve parar para esta entrega.
            if resp and (resp.status_code == 403 or resp.status_code == 404):
                print(f"🚨 [{courier_name}] Parando simulação para {delivery_id} devido a erro de autorização/não encontrado.")
                break # Para a thread atual se houver problema de autorização/entrega não encontrada
        
        time.sleep(random.uniform(2, 4)) # Pausa entre as posições

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
        
        # Usa o token de qualquer entregador para buscar as entregas
        sample_token = list(courier_tokens.values())[0] 
        deliveries_from_backend = get_active_deliveries(sample_token)

        # Atualiza a lista de simulações ativas
        current_active_delivery_ids = {d['id'] for d in deliveries_from_backend if d['status'] in ['PENDING', 'ASSIGNED', 'IN_TRANSIT']}
        
        # Para simulações que não estão mais ativas no backend ou cujas threads finalizaram
        simulators_to_clean = [
            delivery_id for delivery_id in active_simulations 
            if delivery_id not in current_active_delivery_ids and not active_simulations[delivery_id].is_alive()
        ]
        for delivery_id in simulators_to_clean:
            print(f"🧹 Removendo simulação para entrega {delivery_id} (não está mais ativa ou thread finalizou).")
            del active_simulations[delivery_id]

        for delivery_data in deliveries_from_backend:
            delivery_id = delivery_data['id']
            courier_email = delivery_data['courier']['email'] if delivery_data.get('courier') else None

            if delivery_data['status'] in ['ASSIGNED', 'IN_TRANSIT'] and courier_email and courier_email in courier_tokens:
                if delivery_id not in active_simulations or not active_simulations[delivery_id].is_alive():
                    print(f"🚀 Iniciando/Reiniciando simulação para entrega {delivery_id} (entregador: {courier_email}).")
                    thread = threading.Thread(
                        target=simular_entrega_courier_thread, 
                        args=(delivery_data, courier_tokens[courier_email])
                    )
                    thread.start()
                    active_simulations[delivery_id] = thread
                else:
                    # Se a thread estiver viva e a entrega ainda ativa no backend, tudo OK.
                    print(f"🔄 Entrega {delivery_id} já está sendo simulada ativamente.")
            elif delivery_data['status'] == 'PENDING':
                print(f"⏳ Entrega {delivery_id} está PENDING. Aguardando atribuição de entregador.")
            else: # Status DELIVERED ou CANCELLED
                if delivery_id in active_simulations and active_simulations[delivery_id].is_alive():
                    print(f"⚠️ Entrega {delivery_id} mudou de status para {delivery_data['status']}. A thread de simulação deve finalizar em breve.")
                # A thread de simulação interna já tem a lógica para parar quando o trajeto termina
        
        time.sleep(5) # Verifica o estado das entregas a cada 5 segundos

if __name__ == "__main__":
    main()