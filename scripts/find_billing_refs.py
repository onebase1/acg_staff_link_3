import os

for root, _, files in os.walk("src"):
    for filename in files:
        if filename.endswith((".js", ".jsx", ".ts", ".tsx")):
            path = os.path.join(root, filename)
            try:
                with open(path, "r", encoding="utf-8") as fh:
                    if "billing_email" in fh.read():
                        print(path)
            except UnicodeDecodeError:
                continue






