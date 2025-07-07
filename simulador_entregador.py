import requests
import time

API_URL = "http://localhost:3001/api"
ENTREGADOR_EMAIL = "burns@email.com"  # E-mail do entregador cadastrado no seed
ENTREGADOR_SENHA = "123456"                   # Senha do entregador cadastrado no seed
# Tenta ler o ID da entrega do arquivo, senão usa um valor padrão
try:
    with open("entrega_id.txt", "r") as f:
        DELIVERY_ID = f.read().strip()
    print(f"📋 Usando ID da entrega: {DELIVERY_ID}")
except FileNotFoundError:
    DELIVERY_ID = "cmc97zmel0002ucak678u43l5"  # Substitua pelo ID da entrega que deseja simular
    print(f"⚠️ Arquivo 'entrega_id.txt' não encontrado. Use: {DELIVERY_ID}")

# 1. Login para obter o token JWT do entregador
def obter_token(email, senha):
    resp = requests.post(
        f"{API_URL}/auth/login",
        json={"email": email, "password": senha}
    )
    if resp.status_code == 200:
        return resp.json()["token"]
    else:
        print("Erro ao fazer login:", resp.status_code, resp.text)
        exit(1)

# 2. Trajeto simulado (latitude, longitude) - São Paulo, SP
trajeto = [
    (-23.5605, -46.6433),  # Ponto inicial
    (-23.5580, -46.6400),  # Movimento 1
    (-23.5555, -46.6370),  # Movimento 2
    (-23.5530, -46.6350),  # Movimento 3
    (-23.5510, -46.6340),  # Movimento 4
    (-23.5490, -46.6320),  # Movimento 5
    (-23.5470, -46.6300),  # Movimento 6
    (-23.5450, -46.6280),  # Movimento 7
    (-23.5430, -46.6260),  # Movimento 8
    (-23.5410, -46.6240),  # Movimento 9
]

def simular_entrega(token, delivery_id, trajeto):
    headers = {"Authorization": f"Bearer {token}"}
    print(f"🚚 Iniciando simulação de entrega para {delivery_id}")
    print(f"📍 Trajeto com {len(trajeto)} pontos")
    
    for i, (lat, lng) in enumerate(trajeto):
        print(f"📍 Enviando posição {i+1}/{len(trajeto)}: ({lat}, {lng})")
        
        resp = requests.post(
            f"{API_URL}/locations",
            json={"deliveryId": delivery_id, "latitude": lat, "longitude": lng},
            headers=headers,
        )
        
        if resp.status_code == 201:
            data = resp.json()
            print(f"✅ Posição enviada com sucesso! ID: {data.get('id', 'N/A')}")
        else:
            print(f"❌ Erro ao enviar posição: {resp.status_code} - {resp.text}")
        
        if i < len(trajeto) - 1:  # Não espera após o último ponto
            print(f"⏳ Aguardando 3 segundos...")
            time.sleep(3)  # Reduzido para 3 segundos
    
    print("🎉 Simulação concluída!")

if __name__ == "__main__":
    token = obter_token(ENTREGADOR_EMAIL, ENTREGADOR_SENHA)
    simular_entrega(token, DELIVERY_ID, trajeto) 