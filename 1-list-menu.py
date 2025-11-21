#!/usr/bin/env python3
import os
import sys

def clean_text(name: str) -> str:
    """Replace - and _ with spaces, then Title Case each word."""
    name = name.replace("-", " ").replace("_", " ")
    return " ".join(word.capitalize() for word in name.split())

def label_for_index(path: str) -> str:
    """Label for index.html → Parent Folder + 'Overview'."""
    parent = os.path.basename(os.path.dirname(path))
    return f"{clean_text(parent)} Overview"

def label_for_file(filename: str) -> str:
    """Label for non-index HTML files."""
    base = filename.replace(".html", "")
    return clean_text(base)

def collect_html_structure(base_dir: str):
    """
    Build a structure:
      { rel_dir_path: {"index": web_path_or_None,
                       "files": [(filename_lower, web_path), ...]} }
    rel_dir_path is '.' for the base_dir itself.
    """
    base_dir = base_dir.rstrip("/")
    base_abs = os.path.abspath(base_dir)

    structure = {}

    for root, dirs, files in os.walk(base_dir):
        abs_root = os.path.abspath(root)
        rel_root = os.path.relpath(abs_root, base_abs)
        if rel_root == ".":
            rel_key = "."
        else:
            rel_key = rel_root

        if rel_key not in structure:
            structure[rel_key] = {"index": None, "files": []}

        for f in files:
            if not f.endswith(".html"):
                continue

            full_path = os.path.join(root, f)
            web_path = "/" + full_path.replace("\\", "/")

            if f.lower() == "index.html":
                structure[rel_key]["index"] = web_path
            else:
                structure[rel_key]["files"].append((f.lower(), web_path))

    return structure

def print_html_list(structure, base_dir: str):
    # First print base dir ('.'), then all other dirs sorted
    dirs_order = ["."]
    dirs_order.extend(sorted(d for d in structure.keys() if d != "."))

    for rel_dir in dirs_order:
        entry = structure.get(rel_dir, {})
        index_path = entry.get("index")
        files = entry.get("files", [])

        # 1. index.html for this directory (if present)
        if index_path:
            label = label_for_index(index_path)
            print(f'          <li><a href="{index_path}">{label}</a></li>')

        # 2. all non-index html files in this directory
        for _, web_path in sorted(files, key=lambda x: x[0]):
            filename = os.path.basename(web_path)
            label = label_for_file(filename)
            print(f'          <li><a href="{web_path}">{label}</a></li>')

if __name__ == "__main__":
    base_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    if not os.path.isdir(base_dir):
        print(f"Error: directory '{base_dir}' does not exist.")
        sys.exit(1)

    structure = collect_html_structure(base_dir)
    print_html_list(structure, base_dir)

