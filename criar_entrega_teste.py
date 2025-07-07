import requests
import json

API_URL = "http://localhost:3001/api"
CLIENTE_EMAIL = "cliente1@exemplo.com"  # E-mail do cliente cadastrado no seed
CLIENTE_SENHA = "123456"                # Senha do cliente cadastrado no seed

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

def criar_entrega_teste(token):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Dados da entrega de teste
    entrega_data = {
        "productName": "Pizza Margherita",
        "productDescription": "Pizza tradicional italiana",
        "address": "Rua das Flores, 123 - São Paulo, SP",
        "destinationLat": -23.5410,  # Destino final
        "destinationLng": -46.6240,
        "estimatedDelivery": "2025-07-07T02:00:00.000Z"
    }
    
    print("📦 Criando entrega de teste...")
    resp = requests.post(
        f"{API_URL}/deliveries",
        json=entrega_data,
        headers=headers,
    )
    
    if resp.status_code == 201:
        data = resp.json()
        print(f"✅ Entrega criada com sucesso!")
        print(f"🆔 ID da entrega: {data['id']}")
        print(f"📦 Produto: {data['productName']}")
        print(f"📍 Endereço: {data['address']}")
        print(f"📊 Status: {data['statusText']}")
        
        # Salvar o ID em um arquivo para uso no simulador
        with open("entrega_id.txt", "w") as f:
            f.write(data['id'])
        
        print(f"\n💡 ID salvo em 'entrega_id.txt'")
        print(f"🔗 URL da entrega: http://localhost:3000/deliveries/{data['id']}")
        
        return data['id']
    else:
        print(f"❌ Erro ao criar entrega: {resp.status_code} - {resp.text}")
        return None

if __name__ == "__main__":
    print("🚀 Criando entrega de teste...")
    token = obter_token(CLIENTE_EMAIL, CLIENTE_SENHA)
    delivery_id = criar_entrega_teste(token)
    
    if delivery_id:
        print(f"\n🎯 Agora você pode:")
        print(f"1. Abrir: http://localhost:3000/deliveries/{delivery_id}")
        print(f"2. Executar: python simulador_entregador.py")
        print(f"3. Observar a rota sendo desenhada no mapa!") 