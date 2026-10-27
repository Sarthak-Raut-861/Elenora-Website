import re

def generate_asset_code(name: str, count: int) -> str:
    slug = re.sub(r'\s+', '-', name.strip().upper())
    slug = re.sub(r'[^A-Z0-9-]', '', slug)
    return f"{slug}-{str(count).zfill(3)}"