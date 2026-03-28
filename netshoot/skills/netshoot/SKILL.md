---
name: netshoot
description: Network troubleshooting using the nicolaka/netshoot container. Use when diagnosing Docker network connectivity, DNS resolution, HTTP endpoint reachability, TCP/UDP port checks, or any network issue within the container stack. Run via the bundled script at scripts/netshoot.
---

<objective>
Run network diagnostics inside the Docker container network using the nicolaka/netshoot image. The bundled script at `scripts/netshoot` (relative to this skill) handles container lifecycle — just pass the command and arguments.
</objective>

<quick_start>
```bash
# From /workspace/containers/
./scripts/netshoot curl http://forgejo:3000
./scripts/netshoot ping gatus
./scripts/netshoot nc -zv 10.0.6.2 5432
```

**The script must be run from `/workspace/containers/`** so it can load `.env` via `--env-file .env`.

Target a specific network with `NETSHOOT_NETWORK`:
```bash
NETSHOOT_NETWORK=containers_gatus ./scripts/netshoot ping gatus
NETSHOOT_NETWORK=container:gatus ./scripts/netshoot ss -tuln
NETSHOOT_NETWORK=host ./scripts/netshoot ip route show
```

Default network: `host`
</quick_start>

<network_modes>
| Value | Meaning |
|-------|---------|
| `host` (default) | Use host networking — can reach host services |
| `containers_gatus` | Join the `gatus` Docker network — can reach containers on it |
| `containers_tsdproxy` | Join the `tsdproxy` network |
| `containers_cloudflare` | Join the `cloudflare` network |
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
NETSHOOT_NETWORK=containers_gatus ./scripts/netshoot curl -f http://<container>:<port>
```

**Test TCP port connectivity:**
```bash
./scripts/netshoot nc -zv 10.0.6.2 5432      # PostgreSQL
./scripts/netshoot nc -zv 10.0.6.2 6379      # Redis
./scripts/netshoot nc -zv 10.0.6.2 27017     # MongoDB
```

**DNS resolution:**
```bash
NETSHOOT_NETWORK=containers_gatus ./scripts/netshoot nslookup immich-server
NETSHOOT_NETWORK=containers_gatus ./scripts/netshoot dig forgejo
```

**Inspect container's open ports:**
```bash
NETSHOOT_NETWORK=container:gatus ./scripts/netshoot ss -tuln
```

**Packet capture:**
```bash
NETSHOOT_NETWORK=containers_gatus ./scripts/netshoot tcpdump -i any -n port 80
```

**Run a shell for interactive debugging:**
```bash
NETSHOOT_NETWORK=containers_gatus ./scripts/netshoot sh
```
</common_patterns>

<success_criteria>
- Command runs without "network not found" errors
- Output matches expected connectivity (HTTP 200, connection accepted, DNS resolved)
- If connectivity fails, the error message identifies the root cause (DNS failure, connection refused, timeout)
</success_criteria>
