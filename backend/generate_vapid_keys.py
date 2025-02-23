# -*- coding: utf-8 -*-
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
import base64
import json

# Generar el par de claves
private_key = ec.generate_private_key(ec.SECP256R1())
public_key = private_key.public_key()

# Convertir la clave privada a formato PEM
pem_private = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

# Convertir la clave pública a formato PEM
pem_public = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# Convertir a base64
private_key_base64 = base64.b64encode(pem_private).decode('utf-8')
public_key_base64 = base64.b64encode(pem_public).decode('utf-8')

# Guardar las claves en un archivo
keys = {
    "VAPID_PRIVATE_KEY": private_key_base64,
    "VAPID_PUBLIC_KEY": public_key_base64
}

with open('vapid_keys.json', 'w') as f:
    json.dump(keys, f, indent=2)

print("VAPID_PRIVATE_KEY:", private_key_base64)
print("VAPID_PUBLIC_KEY:", public_key_base64)
print("\nLas claves han sido guardadas en vapid_keys.json")