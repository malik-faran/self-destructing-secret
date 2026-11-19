"""End-to-end API tests for the self-destructing secret service."""

from datetime import timedelta

from app.crypto import decrypt_secret
from app.models import SecretItem
from app.timeutils import utcnow_naive

SECRET_TEXT = "correct horse battery staple — hunter2"


def create_secret(client, **overrides):
    payload = {"secret_text": SECRET_TEXT, "expires_in_minutes": 60}
    payload.update(overrides)
    response = client.post("/api/secrets", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "self-destructing-secret"
    assert body["active_secrets"] == 0
    assert body["timestamp"].endswith("Z")


def test_create_secret_is_encrypted_at_rest(client, db):
    body = create_secret(client)
    secret_id = body["secret_id"]
    assert body["requires_passphrase"] is False
    assert body["expires_at"].endswith("Z")

    item = db.get(SecretItem, secret_id)
    assert item is not None
    assert SECRET_TEXT not in item.encrypted_content
    assert item.encrypted_content != SECRET_TEXT
    assert decrypt_secret(item.encrypted_content) == SECRET_TEXT
    assert item.passphrase_salt is None
    assert item.passphrase_hash is None

    assert client.get("/api/health").json()["active_secrets"] == 1


def test_meta_check_never_destroys_the_secret(client, db):
    secret_id = create_secret(client, passphrase="open sesame")["secret_id"]

    first = client.get(f"/api/secrets/{secret_id}/meta")
    second = client.get(f"/api/secrets/{secret_id}/meta")

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["exists"] is True
    assert first.json()["requires_passphrase"] is True
    # Still present after two bot-style previews.
    assert db.get(SecretItem, secret_id) is not None
    assert client.get("/api/health").json()["active_secrets"] == 1
    # And a human can still reveal it exactly once.
    reveal = client.post(f"/api/secrets/{secret_id}/reveal", json={"passphrase": "open sesame"})
    assert reveal.status_code == 200
    assert reveal.json()["secret_text"] == SECRET_TEXT


def test_reveal_is_one_time_only(client, db):
    secret_id = create_secret(client)["secret_id"]

    first = client.post(f"/api/secrets/{secret_id}/reveal", json={})
    assert first.status_code == 200
    assert first.json() == {"secret_text": SECRET_TEXT}

    second = client.post(f"/api/secrets/{secret_id}/reveal", json={})
    assert second.status_code == 404
    assert "self-destructed" in second.json()["detail"]

    assert client.get(f"/api/secrets/{secret_id}/meta").status_code == 404
    assert db.get(SecretItem, secret_id) is None
    assert client.get("/api/health").json()["active_secrets"] == 0


def test_passphrase_protection_and_expiration_enforcement(client, db):
    body = create_secret(client, passphrase="open sesame", expires_in_minutes=10)
    secret_id = body["secret_id"]
    assert body["requires_passphrase"] is True

    item = db.get(SecretItem, secret_id)
    assert item is not None
    assert item.passphrase_hash not in (None, "open sesame")
    assert item.passphrase_salt

    # Missing and wrong passphrases are rejected without burning the secret.
    assert client.post(f"/api/secrets/{secret_id}/reveal", json={}).status_code == 403
    wrong = client.post(
        f"/api/secrets/{secret_id}/reveal", json={"passphrase": "wrong"}
    )
    assert wrong.status_code == 403
    assert client.get(f"/api/secrets/{secret_id}/meta").status_code == 200

    right = client.post(
        f"/api/secrets/{secret_id}/reveal", json={"passphrase": "open sesame"}
    )
    assert right.status_code == 200
    assert right.json()["secret_text"] == SECRET_TEXT
    assert client.get(f"/api/secrets/{secret_id}/meta").status_code == 404

    # Expired secrets are purged and can never be revealed.
    expired_id = create_secret(client)["secret_id"]
    expired = db.get(SecretItem, expired_id)
    assert expired is not None
    expired.expires_at = utcnow_naive() - timedelta(minutes=1)
    db.commit()

    assert client.get(f"/api/secrets/{expired_id}/meta").status_code == 404
    assert client.post(f"/api/secrets/{expired_id}/reveal", json={}).status_code == 404
    assert db.get(SecretItem, expired_id) is None
