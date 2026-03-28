# Workflow: Manage Gatus Monitoring

<required_reading>
**Read these reference files NOW before proceeding:**
1. references/environment.md
</required_reading>

<process>
<overview>
Gatus config: `/workspace/containers/gatus/config/config.yaml`

Gatus **hot-reloads** on file change — no restart needed. Changes take effect within seconds.

Alert providers are defined once at the top under `alerting:`. Endpoints reference them by `type:`.
</overview>

<add_endpoint>
## Adding an endpoint

Append to the `endpoints:` list in the config. Choose the correct protocol:

**HTTP:**
```yaml
  - name: "Service Name"
    group: "Group Name"
    url: "http://<container_name>:<port>[/health]"
    interval: 1m
    conditions:
      - "[STATUS] == 200"
      - "[RESPONSE_TIME] < 2000"
    alerts:
      - type: telegram
        enabled: true
        send-on-resolved: true
        failure-threshold: 3
        success-threshold: 2
      - type: custom
        enabled: true
        send-on-resolved: true
        failure-threshold: 3
        success-threshold: 2
```

**TCP:**
```yaml
  - name: "Service Name"
    group: "Group Name"
    url: "tcp://<host>:<port>"
    interval: 1m
    conditions:
      - "[CONNECTED] == true"
      - "[RESPONSE_TIME] < 1000"
    alerts:
      - type: telegram
        ...
      - type: custom
        ...
```

**DNS:**
```yaml
  - name: "DNS Server"
    group: "DNS"
    url: "<dns_server_ip>"
    dns:
      query-name: "google.com"
      query-type: "A"
    interval: 1m
    conditions:
      - "[DNS_RCODE] == NOERROR"
      - "[RESPONSE_TIME] < 1000"
    alerts:
      - type: telegram
        enabled: true
        send-on-resolved: true
        failure-threshold: 10
        success-threshold: 2
      - type: custom
        enabled: true
        send-on-resolved: true
        failure-threshold: 10
        success-threshold: 2
```

**Threshold guidance:**
- Standard services: failure-threshold 3, success-threshold 2
- DNS / slow-stabilizing services: failure-threshold 10, success-threshold 2
</add_endpoint>

<remove_endpoint>
## Removing an endpoint

Find and delete the endpoint block from `gatus/config/config.yaml`. Each endpoint is a YAML list item starting with `- name:`.
</remove_endpoint>

<modify_endpoint>
## Modifying an endpoint

Common modifications:
- Change URL: update `url:` field
- Change interval: update `interval:` (e.g. `1m`, `5m`, `30s`)
- Change thresholds: update `failure-threshold` / `success-threshold`
- Disable temporarily: add `enabled: false` to the alert block (not the endpoint — Gatus has no endpoint-level enabled flag; to disable monitoring, comment out or remove the endpoint)
- Add a condition: append to `conditions:` list
</modify_endpoint>

<manage_alert_providers>
## Managing alert providers

Alert providers are defined under `alerting:` at the top of the config.

**Custom webhook provider** (current setup):
```yaml
alerting:
  custom:
    url: "http://10.0.6.2:3456/webhook/<webhook_id>"
    method: POST
    body: |
      {
        "endpoint": "[ENDPOINT_NAME]",
        "group": "[ENDPOINT_GROUP]",
        "url": "[ENDPOINT_URL]",
        "status": "[ALERT_TRIGGERED_OR_RESOLVED]",
        "errors": "[RESULT_ERRORS]",
        "conditions": "[RESULT_CONDITIONS]",
        "description": "[ALERT_DESCRIPTION]"
      }
    headers:
      Content-Type: application/json
```

**Valid Gatus body placeholders:**
| Placeholder | Value |
|-------------|-------|
| `[ENDPOINT_NAME]` | Endpoint name |
| `[ENDPOINT_GROUP]` | Endpoint group |
| `[ENDPOINT_URL]` | Monitored URL |
| `[ALERT_TRIGGERED_OR_RESOLVED]` | `"TRIGGERED"` or `"RESOLVED"` |
| `[RESULT_ERRORS]` | Comma-separated error list |
| `[RESULT_CONDITIONS]` | Condition results with ✅/❌ |
| `[ALERT_DESCRIPTION]` | Alert description text |
</manage_alert_providers>

<verify>
## Verifying changes

Check Gatus logs after editing:
```bash
docker logs gatus --tail 20 2>&1 | grep -iE "error|warn|reload"
```

If no errors appear and the container continues cycling through endpoints, the config was accepted. Check for the new endpoint name in the logs within 1 minute.
</verify>
</process>

<success_criteria>
- [ ] Config file edited correctly (valid YAML)
- [ ] No errors in Gatus logs after change
- [ ] New endpoint appears in Gatus logs within 1 minute
- [ ] Alert fires correctly on test failure (if tested)
</success_criteria>
