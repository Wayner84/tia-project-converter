# TIA Project Converter

Experimental, local-first tooling for planning Siemens TIA Portal migrations, with **V17 as the minimum target**.

## M0 status

The public static app strictly parses `.ap17` and newer project entry XML, locally inspects bounded `.zapXX` ZIPs in memory, validates the single root `.apXX` entry against the archive extension and XML version, and reports only sanitized conversion-log filename version pairs. It emits deterministic JSON migration plans, including V21→V18 planning. It does not convert or rewrite proprietary project data.

## Development

```sh
npm test
npm run build
```

`npm run build` creates `dist/` with relative assets suitable for a GitHub Pages project subpath. The Pages workflow runs tests, builds, and deploys `dist`.

Full conversion remains out of scope: it requires installed, licensed, version-matched TIA Portal/Openness workers, explicit object compatibility handling, compilation, and engineering review.

See [docs/product-spec.md](docs/product-spec.md) for the acceptance contract.
