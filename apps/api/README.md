# Uganda CBC SMS — API

Express + TypeScript API for school management.

## Development

```bash
npm run dev -w @uganda-cbc-sms/api
```

Generate RS256 JWT keys (first time):

```bash
tsx scripts/generate-jwt-keys.ts
```

See [docs/security.md](../../docs/security.md) for production security configuration, Redis, migrations, and Nginx.

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Watch mode |
| `build` | Compile to `dist/` |
| `migrate` | Run SQL migrations |
| `test` | Jest security/unit tests |
| `typecheck` | TypeScript check |
