#!/usr/bin/env python3
"""
Environment Setup Script for Evaris Monorepo.

Reads env/config.{env}.json and generates .env files for each service.
Supports multiple environments: local, staging, prod.
This simplifies the env management so much and its easier to share the env
for development as well.

Usage:
    python env/setup.py                 # Uses config.local.json (default)
    python env/setup.py staging         # Uses config.staging.json
    python env/setup.py prod            # Uses config.prod.json
    python env/setup.py --check         # Validate config.local.json
    python env/setup.py --check staging # Validate config.staging.json
    python env/setup.py --clean         # Remove all generated .env files
"""

import json
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).parent.parent
VALID_ENVS = ["local", "staging", "prod"]


REQUIRED_KEYS = {
    "shared": ["DATABASE_URL", "INTERNAL_JWT_SECRET"],
    "web": ["BETTER_AUTH_SECRET"],
    "server": ["OPENROUTER_API_KEY"],
}


ENV_TARGETS = {
    "web/.env": {
        "sections": ["shared", "web", "web_backend"],
        "public_section": "web.public",
        "public_prefix": "VITE_PUBLIC_",
    },
    "web/packages/backend/.env": {
        "sections": ["shared", "web_backend"],
    },
    "server/.env": {
        "sections": ["shared", "server"],
    },
    "core/.env": {
        "sections": ["core"],
    },
    "shared/.env": {
        "sections": ["shared"],
        "keys": ["DATABASE_URL", "DIRECT_URL"],
    },
    "sdk/python/examples/.env": {
        "sections": ["testing"],
    },
}


def get_config_path(env: str) -> Path:
    return REPO_ROOT / "env" / f"config.{env}.json"


def load_config(env: str) -> dict:
    config_path = get_config_path(env)

    if not config_path.exists():
        return {}

    with open(config_path) as f:
        return json.load(f)


def validate_config(config: dict) -> list[str]:
    errors = []

    for section, keys in REQUIRED_KEYS.items():
        if section not in config:
            errors.append(f"Missing section: {section}")
            continue

        for key in keys:
            value = config[section].get(key, "")
            if not value or value.startswith("your-") or value.startswith("sk-or-v1-your"):
                errors.append(f"Missing or placeholder value: {section}.{key}")

    return errors


def flatten_section(config: dict, section_name: str) -> dict[str, str]:
    section = config.get(section_name, {})
    result = {}

    for key, value in section.items():
        if key.startswith("_"):
            continue
        if isinstance(value, dict):
            continue
        result[key] = str(value)

    return result


def generate_env_content(config: dict, target_config: dict) -> str:
    lines = []
    sections = target_config.get("sections", [])
    allowed_keys = target_config.get("keys")

    for section in sections:
        env_vars = flatten_section(config, section)

        if allowed_keys:
            env_vars = {k: v for k, v in env_vars.items() if k in allowed_keys}

        for key, value in env_vars.items():
            if value:
                lines.append(f'{key}="{value}"')

    public_section = target_config.get("public_section")
    if public_section:
        parts = public_section.split(".")
        public_vars = config.get(parts[0], {}).get(parts[1], {})
        prefix = target_config.get("public_prefix", "")

        for key, value in public_vars.items():
            if key.startswith("_"):
                continue
            if value:
                lines.append(f'{prefix}{key}="{value}"')

    return "\n".join(sorted(lines)) + "\n" if lines else ""


def generate_all(config: dict) -> dict[str, str]:
    results = {}

    for target_path, target_config in ENV_TARGETS.items():
        content = generate_env_content(config, target_config)
        if content:
            results[target_path] = content

    return results


def write_env_files(env_files: dict[str, str]) -> None:
    for rel_path, content in env_files.items():
        full_path = REPO_ROOT / rel_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content)
        print(f"  {rel_path}")


def clean_env_files() -> None:
    for rel_path in ENV_TARGETS.keys():
        full_path = REPO_ROOT / rel_path
        if full_path.exists():
            full_path.unlink()
            print(f"  Removed: {rel_path}")


def print_usage() -> None:
    print("Usage: python env/setup.py [ENV] [OPTIONS]")
    print()
    print("Environments:")
    print("  local     Development environment (default)")
    print("  staging   Staging environment")
    print("  prod      Production environment")
    print()
    print("Options:")
    print("  --check   Validate config without generating")
    print("  --clean   Remove all generated .env files")
    print()
    print("Examples:")
    print("  python env/setup.py              # Generate from config.local.json")
    print("  python env/setup.py staging      # Generate from config.staging.json")
    print("  python env/setup.py prod         # Generate from config.prod.json")
    print("  python env/setup.py --check prod # Validate config.prod.json")
    print()
    print("Or use make commands:")
    print("  make env-local     make env-staging     make env-prod")


def main() -> int:
    args = sys.argv[1:]

    if "--help" in args or "-h" in args:
        print_usage()
        return 0

    if "--clean" in args:
        print("Cleaning generated .env files...")
        clean_env_files()
        print("Done.")
        return 0

    # Parse environment and options
    check_mode = "--check" in args
    args = [a for a in args if not a.startswith("-")]

    env = "local"
    if args and args[0] in VALID_ENVS:
        env = args[0]
    elif args and args[0] not in VALID_ENVS:
        print(f"Error: Unknown environment '{args[0]}'")
        print(f"Valid environments: {', '.join(VALID_ENVS)}")
        return 1

    config_path = get_config_path(env)
    config = load_config(env)

    if not config:
        print(f"Error: {config_path.relative_to(REPO_ROOT)} not found.")
        print()
        print("To get started:")
        print(f"  1. cp env/config.example.json env/config.{env}.json")
        print(f"  2. Edit env/config.{env}.json with your {env} values")
        print(f"  3. Run: make env-{env}")
        return 1

    errors = validate_config(config)

    if check_mode:
        if errors:
            print(f"Validation errors in config.{env}.json:")
            for err in errors:
                print(f"  - {err}")
            return 1
        print(f"config.{env}.json is valid.")
        return 0

    if errors:
        print(f"Warning: Some required values are missing in config.{
              env}.json:")
        for err in errors:
            print(f"  - {err}")
        print()

    print(f"Generating .env files from config.{env}.json...")
    env_files = generate_all(config)
    write_env_files(env_files)
    print()
    print(f"Generated {len(env_files)} .env files for [{env}] environment.")

    if errors:
        print()
        print(
            f"Note: Fill in the missing values in env/config.{env}.json and re-run.")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
