import hashlib
import secrets
import getpass

password = getpass.getpass("Enter password: ")
salt = secrets.token_hex(16)
h = hashlib.sha256(f"{salt}:{password}".encode()).hexdigest()
print(f"\nsha256:{salt}:{h}")
