from datetime import datetime, timezone
from Crypto.PublicKey import RSA
from Crypto.Hash import SHAKE256
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

seed = b'INGLES-SEBAS-SIDELOAD-SIGNING-V1-SAEZ1205-2026'
password = b'InglesSebasSideload2026'
shake = SHAKE256.new(data=seed)
key = RSA.generate(2048, randfunc=lambda n: shake.read(n))
pem = key.export_key(format='PEM', pkcs=8)
private_key = serialization.load_pem_private_key(pem, password=None)

name = x509.Name([
    x509.NameAttribute(NameOID.COMMON_NAME, 'Ingles Sebas'),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'SAEZ1205'),
    x509.NameAttribute(NameOID.COUNTRY_NAME, 'PE'),
])
cert = (
    x509.CertificateBuilder()
    .subject_name(name)
    .issuer_name(name)
    .public_key(private_key.public_key())
    .serial_number(12052026)
    .not_valid_before(datetime(2026, 1, 1, tzinfo=timezone.utc))
    .not_valid_after(datetime(2053, 5, 18, tzinfo=timezone.utc))
    .sign(private_key, hashes.SHA256())
)

bundle = pkcs12.serialize_key_and_certificates(
    name=b'ingles-sebas',
    key=private_key,
    cert=cert,
    cas=None,
    encryption_algorithm=serialization.BestAvailableEncryption(password),
)
with open('/tmp/ingles-sebas.p12', 'wb') as f:
    f.write(bundle)

print(cert.fingerprint(hashes.SHA256()).hex())
