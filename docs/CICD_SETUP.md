# 🏭 CI/CD Setup — AA Print N Tags

Industry-standard pipeline: **push to `main` → GitHub Actions builds a Docker image →
pushes to GitHub Container Registry → deploys to Oracle Cloud → database is never touched.**

```
 git push main ─► GitHub Actions ─► ghcr.io image ─► SSH ─► Oracle VM
                                                              ├─ aaprintntags-db   (MySQL, persistent, untouched)
                                                              └─ aaprintntags-app  (replaced each deploy)
```

---

## 1. One-time: GitHub repository

```bash
git add .
git commit -m "Add CI/CD pipeline"
git branch -M main
git push -u origin main
```

> Repo: https://github.com/Subbu64774/aaprintntags

---

## 2. One-time: GitHub Actions secrets

Go to **GitHub → repo → Settings → Secrets and variables → Actions → New repository secret**
and add the following:

| Secret name          | Value                                                                 |
|----------------------|-----------------------------------------------------------------------|
| `ORACLE_SSH_HOST`    | `140.245.210.80`                                                      |
| `ORACLE_SSH_USER`    | `opc`                                                                 |
| `ORACLE_SSH_KEY`     | **Full contents** of your private key (`ssh-key-2026-03-20.key`)      |
| `DB_NAME`            | `aaprintntags`                                                        |
| `DB_USER`            | `appuser`                                                             |
| `DB_PASSWORD`        | a strong password (e.g. `openssl rand -base64 24`)                    |
| `DB_ROOT_PASSWORD`   | a strong password                                                     |
| `JWT_SECRET`         | `openssl rand -hex 32`                                                |

> ⚠️ The `GITHUB_TOKEN` used to push/pull the image is **automatic** — you do NOT create it.

To paste the SSH key value:
```bash
cat /Users/subramanianganesan/Downloads/ssh-key-2026-03-20.key | pbcopy
# then paste into the ORACLE_SSH_KEY secret
```

---

## 3. One-time: prepare the Oracle VM

SSH in once and make sure podman is present (Oracle Linux 9 ships with it):

```bash
ssh -i ~/Downloads/ssh-key-2026-03-20.key opc@140.245.210.80
sudo dnf install -y podman   # usually already installed
exit
```

Open the firewall + Oracle **Security List** for port 80 (and 443 if you add TLS):

```bash
ssh -i ~/Downloads/ssh-key-2026-03-20.key opc@140.245.210.80 \
  'sudo firewall-cmd --permanent --add-port=80/tcp && sudo firewall-cmd --reload'
```
Also in the **OCI Console → Networking → VCN → Security List → Add Ingress Rule**:
`0.0.0.0/0  TCP  80`.

> The very first deploy auto-creates the MySQL container + volume. Every deploy after
> that leaves it running and only swaps the app container.

---

## 4. Deploy

Just push to `main`:

```bash
git push origin main
```

Watch it run under the repo's **Actions** tab. On success the app is live at
`http://140.245.210.80`. You can also trigger manually via **Actions → CI/CD → Run workflow**.

---

## 5. How your data stays safe

- MySQL lives in a **separate container** (`aaprintntags-db`) backed by the persistent
  podman volume `mysql_data`.
- The deploy script **never** stops, removes, or recreates the DB container on a normal
  deploy — it only ensures it is running.
- Only `aaprintntags-app` is replaced. If the new version fails its health check, the
  script **automatically rolls back** to the previous image.
- Both containers have `--restart always` + systemd units, so they survive VM reboots.

---

## 6. Useful operations

```bash
# App logs
ssh -i ~/Downloads/ssh-key-2026-03-20.key opc@140.245.210.80 'sudo podman logs -f aaprintntags-app'

# DB backup (run on a schedule!)
ssh -i ~/Downloads/ssh-key-2026-03-20.key opc@140.245.210.80 \
  "sudo podman exec aaprintntags-db mysqldump -u root -p'YOUR_ROOT_PW' aaprintntags" > backup_$(date +%F).sql

# Manual rollback to a specific commit image
ssh ... 'sudo podman pull ghcr.io/subbu64774/aaprintntags:<sha> && \
         APP_IMAGE=ghcr.io/subbu64774/aaprintntags:<sha> ... ~/server-deploy.sh'
```

---

## 7. Recommended next hardening (optional)

- **TLS/HTTPS** on port 443 (Let's Encrypt) — see `deploy/setup-https.sh`.
- **Flyway** migrations instead of `ddl-auto=update` for fully versioned schema changes.
- **Separate DB VM** — set the DB container on a second Always-Free VM and point
  `SPRING_DATASOURCE_URL` at its private IP for stronger isolation.
- **Automated daily DB backups** to OCI Object Storage.

