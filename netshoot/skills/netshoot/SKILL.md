---
name: netshoot
description: Network troubleshooting using the nicolaka/netshoot container. Use when diagnosing Docker network connectivity, DNS resolution, HTTP endpoint reachability, TCP/UDP port checks, or any network issue within the container stack. Run via the bundled script at scripts/netshoot.
---

<objective>
Run network diagnostics inside the Docker container network using the nicolaka/netshoot image. The bundled script at `<plugin>/scripts/netshoot` (plugin root) handles container lifecycle — just pass the command and arguments.
</objective>

<quick_start>
```bash
# From the container stack directory (see plugin CLAUDE.md)
./scripts/netshoot curl http://<service>:<port>
./scripts/netshoot ping <service>
./scripts/netshoot nc -zv 192.0.2.1 5432
```

**Run the script from the container stack directory** (see plugin CLAUDE.md) so it can load `.env` via `--env-file .env`. The script ships at the plugin root `<plugin>/scripts/netshoot`; the examples use `./scripts/netshoot` as shorthand — call it by its actual path from the stack directory. If `.env` is missing there, the script skips `--env-file` and runs without it (or create `.env` from the stack's template — see plugin CLAUDE.md).

Target a specific network with `NETSHOOT_NETWORK`:
```bash
NETSHOOT_NETWORK=<network-name> ./scripts/netshoot ping <service>
NETSHOOT_NETWORK=container:<container> ./scripts/netshoot ss -tuln
NETSHOOT_NETWORK=host ./scripts/netshoot ip route show
```

Default network: `host`

Network names are environment-specific: see the plugin CLAUDE.md for this stack's networks, or discover them with `docker network ls`.
</quick_start>

<network_modes>
| Value | Meaning |
|-------|---------|
| `host` (default) | Use host networking — can reach host services |
| `<network-name>` | Join a named Docker network — can reach containers on it. See plugin CLAUDE.md for this stack's networks, or run `docker network ls` |
| `container:<name>` | Share network namespace with a running container |
</network_modes>

<tools_by_category>
| Category | Tools |
|----------|-------|
| **Network** | ping, fping, arping, traceroute, tracepath, mtr |
| **DNS** | dig, nslookup, drill, host |
| **HTTP** | curl, wget, httpie, ab (apache bench) |
| **TCP/UDP** | nc, socat, telnet, tcpdump, termshark, tshark, ss, netstat |
| **Performance** | iperf, iperf3, tcptraceroute, speedtest-cli, iftop, iptraf-ng |
| **Security** | nmap, nping, openssl, ngrep |
| **Network Info** | ip, ifconfig, route, arp, ethtool |
| **Firewall** | iptables, nftables, ipset |
| **Protocol** | grpcurl, websocat, swaks (SMTP) |
| **Monitoring** | ctop, bird, net-snmp-tools |
| **System** | nsenter, strace, ltrace |
| **Packet Analysis** | scapy, conntrack-tools |
| **Utilities** | jq, whois, dhcping, file, vim, git |
</tools_by_category>

<common_patterns>
**Check if HTTP service is reachable:**
```bash
NETSHOOT_NETWORK=<network-name> ./scripts/netshoot curl -f http://<container>:<port>
```

**Test TCP port connectivity:**
```bash
./scripts/netshoot nc -zv 192.0.2.1 5432      # PostgreSQL
./scripts/netshoot nc -zv 192.0.2.1 6379      # Redis
./scripts/netshoot nc -zv 192.0.2.1 27017     # MongoDB
```

**DNS resolution:**
```bash
NETSHOOT_NETWORK=<network-name> ./scripts/netshoot nslookup <service>
NETSHOOT_NETWORK=<network-name> ./scripts/netshoot dig <service>
```

**Inspect container's open ports:**
```bash
NETSHOOT_NETWORK=container:<container> ./scripts/netshoot ss -tuln
```

**Packet capture:**
```bash
NETSHOOT_NETWORK=<network-name> ./scripts/netshoot tcpdump -i any -n port 80
```

**Run a shell for interactive debugging:**
```bash
NETSHOOT_NETWORK=<network-name> ./scripts/netshoot sh
```
</common_patterns>

<error_handling>
- **"network not found"** — the `NETSHOOT_NETWORK` value does not match a real network. Run `docker network ls` and check the plugin CLAUDE.md for this stack's network names.
- **Missing `.env`** — the script skips `--env-file` when `.env` is absent, so the container starts without env vars. If the target service needs them, create `.env` in the stack directory (see plugin CLAUDE.md).
</error_handling>

<success_criteria>
- Command runs without "network not found" errors
- Output matches expected connectivity (HTTP 200, connection accepted, DNS resolved)
- If connectivity fails, the error message identifies the root cause (DNS failure, connection refused, timeout)
</success_criteria>
