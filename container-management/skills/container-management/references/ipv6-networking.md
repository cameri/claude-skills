<overview>
IPv6 networking for Docker containers on Linux. Read this before configuring, troubleshooting, or enabling IPv6 for any container service. Covers the host-network prerequisite, Docker network configuration, live attach, and the failure modes that make IPv6 look "broken" when each layer is actually fine.
</overview>

<mental_model>
IPv6 to a container has three independent layers, each with its own failure signature:

1. **Host uplink** — the host itself needs a routable global IPv6 address and a default route. Containers inherit nothing without this.
2. **Docker network** — a network must have `enable_ipv6: true` for containers on it to get IPv6 addresses.
3. **Container/interface** — the container gets a v6 address on attached IPv6 networks; the app inside must listen on IPv6 (or `::`) to accept it.

Debug bottom-up: host route → docker network config → container interface → application binding. Check each layer in order; a symptom at layer 3 is almost never fixed at layer 3.
</mental_model>

<host_prerequisites>
The host needs a **global** IPv6 address (not just `fe80::` link-local) and a default route:

```bash
# host or host-network container
ip -6 addr show dev <iface>        # look for 2000::/3 (global unicast) vs fe80:: only
ip -6 route show                   # need a "default via ..." entry
```

Common host states and fixes:

- **`disable_ipv6=1`** on `/proc/sys/net/ipv6/conf/{all,iface}` — re-enable with `sysctl -w net.ipv6.conf.all.disable_ipv6=0` (persist in `/etc/sysctl.d/`).
- **`accept_ra=0`** — the host ignores Router Advertisements, so no default route is ever learned. SLAAC-learned routes (`proto ra` in `ip -6 route`) **expire** (RA lifetime is typically 1800s) and, if RA processing is off, may not be renewed — connectivity flaps in a ~30-minute cycle. Fix: persist `accept_ra=1` (or `2` when `forwarding=1`) for the interface, or configure a static default route via netplan/systemd-networkd.
- **Router discovery** — `rdisc6 <iface>` (from `ndisc6`, e.g. inside a netshoot container) sends a Router Solicitation and reveals the gateway, prefix, and RA lifetime. Link-local gateways (`fe80::…`) are normal.
- **forwarding=1 caveat**: the kernel ignores RAs unless `accept_ra=2`, so a forwarded host must either set that or use static routes.

Test host uplink before touching Docker: `ping -6 -c 3 2606:4700:4700::1111`.
</host_prerequisites>

<docker_networks>
**User-defined networks (recommended).** Enable IPv6 per network; no daemon restart needed:

```console
$ docker network create --ipv6 ip6net
```

Compose (root-orchestrator pattern — define shared networks in the root compose only):

```yaml
networks:
  ip6net:
    name: ip6net          # pin the name so compose adopts an existing network
    enable_ipv6: true
```

- Without an explicit subnet, Docker allocates a ULA `fd00::/8` `/64` from its internal pool — correct default; do not use a documentation range (`2001:db8::/64`) or the host's own routed prefix by default.
- **NAT66**: Docker Engine v27+ masquerades container IPv6 egress through the host by default, so containers reach IPv6 internet without any GUA prefix delegation. Check with `docker network inspect` and an outbound `ping6`/`curl -6` from a container.
- **Live attach**: `docker network connect ip6net <container>` adds the interface to a running container without recreating it — useful for verifying before wiring compose. But it does not survive recreate: the network must also be declared in compose for the service, or the container loses IPv6 on next `up`.
- **Daemon-level default bridge / legacy pattern** (`/etc/docker/daemon.json` with `ipv6: true` + `fixed-cidr-v6: <ULA>/64`, then `systemctl restart docker`): only for the default `docker0` bridge. Prefer user-defined networks — no daemon restart, per-service selection, and NAT66. Note `live-restore` matters before restarting the daemon: without it, restarting Docker stops all containers.
</docker_networks>

<live_verification>
Work from inside the actual container, not the host:

```bash
# got an address?
ip -6 addr show                     # or: docker inspect <c> --format '{{json .NetworkSettings.Networks}}'
# egress works?
ping -6 -c 3 2606:4700:4700::1111   # needs iputils-ping (ping6 is the same binary) + CAP_NET_RAW
python3 - <<'EOF'
import socket
s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM); s.settimeout(5)
print(s.connect_ex(('2606:4700:4700::1111', 443)))  # 0 = reachable
EOF
```

Tools note: `ping`/`ping6` are not in most minimal images — install `iputils-ping` (Ubuntu/Debian) in the image rather than reaching for ad-hoc replacements, and grant `NET_RAW` (compose `cap_add: [NET_RAW]`).
</live_verification>

<gotchas>
- **Proxied DNS breaks non-HTTP protocols.** If a hostname resolves to CDN edge addresses (Cloudflare-proxied AAAA hex often spells `Cloudflare`), SSH or any non-HTTP port times out — the proxy only passes HTTP/HTTPS. Use the raw IP for ssh, or set the record DNS-only (grey cloud).
- **Container `~/.ssh/known_hosts` as a read-only bind mount** — `StrictHostKeyChecking=accept-new` cannot persist the new host key ("Failed to add the host to the list of known hosts"), so every subsequent non-interactive ssh fails host verification. Write the key to the host-side file (e.g. via a root docker container mounting it) instead of relying on accept-new.
- **Ephemeral container state**: keys, packages, or config written to the container's writable layer vanish on recreate. Anything that must survive goes in a bind-mounted host directory — including SSH keypairs and their `.pub` files (never re-derive a stored pubkey; derive-at-boot was the old failure mode for missing `.pub`).
- **IPv6 DNS**: containers need resolvability for IPv6 names; dual-stack hosts resolve AAAA automatically, but a broken upstream (no IPv6 route, yet an AAAA record) causes long connect timeouts rather than clean fallbacks — test v4 and v6 separately when debugging.
- **Sandboxed/internal-resource env**: `ENETUNREACH` (errno 101) on any IPv6 connect means no route — check the host uplink, not the container.
- **Diagnosis containers**: use a netshoot container with `--network host` to inspect the host's network namespace (routes, sysctls, RA) without ssh access to the host.
</gotchas>

<success_criteria>
- Host has a global IPv6 address and a default route that survives RA expiry (persisted, not flapping).
- Target containers hold IPv6 addresses on an `enable_ipv6` network declared in compose (not just live-attached).
- Outbound IPv6 verified from inside a container (TCP connect, not just link-local ping).
- DNS used for the service actually resolves to the container's reachable address (not a proxy edge) for the ports in use.
</success_criteria>
