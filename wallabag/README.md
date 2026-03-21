# wallabag

Claude Code plugin for interacting with a [Wallabag](https://wallabag.org) instance.

## Skills

### `/wallabag:configure`

Set up credentials to connect to your Wallabag instance. Credentials are saved
to `~/.claude/channels/wallabag/.env` and used by all Wallabag tools.

```
/wallabag:configure                          # show status
/wallabag:configure setup                    # guided setup walkthrough
/wallabag:configure url=<URL> client_id=<ID> client_secret=<SECRET> username=<USER> password=<PASS>
/wallabag:configure clear                    # remove all credentials
/wallabag:configure clear <key>              # remove a single key
```

### `/wallabag:save`

Save a URL to Wallabag.

```
/wallabag:save https://example.com/article
/wallabag:save https://example.com/article #tag1 #tag2
/wallabag:save https://example.com/article "My custom title"
```

## Credentials

Wallabag uses OAuth2 password grant. You need:

| Key | Where to find it |
|-----|-----------------|
| `WALLABAG_URL` | Base URL of your instance (e.g. `https://app.wallabag.it`) |
| `WALLABAG_CLIENT_ID` | Create at `<URL>/developer/client/create` |
| `WALLABAG_CLIENT_SECRET` | Same registration page as client ID |
| `WALLABAG_USERNAME` | Your Wallabag login |
| `WALLABAG_PASSWORD` | Your Wallabag password |

## License

Apache-2.0
