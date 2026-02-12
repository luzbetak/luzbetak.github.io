#!/usr/bin/env python3
"""
Generate improved navigation menu with nested submenus for directories.
Backs up existing menu.html and creates new one with better organization.
"""
import os
import sys
import shutil
from datetime import datetime
from collections import defaultdict
from pathlib import Path

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

def get_section_header(dirname: str) -> str:
    """Map directory names to section headers."""
    section_map = {
        'faiss': 'FAISS & Vector Search',
        'neural-network': 'Neural Networks',
        'rag': 'Retrieval Augmented Generation',
        'kimball': 'Kimball Methodology',
        'foundation_db': 'FoundationDB',
        'unity-catalog': 'Unity Catalog',
        'python': 'Python Programming',
        'transformation': 'Data Transformation',
        'apache': 'Apache Tools',
        'youtube': 'YouTube Tools'
    }
    return section_map.get(dirname, clean_text(dirname))

def categorize_ai_ml_files(files):
    """Categorize AI/ML files into logical sections."""
    categories = {
        'Frameworks & Libraries': [],
        'Vector Databases': [],
        'Models & Algorithms': [],
        'Text Processing': [],
        'Document Processing': [],
        'Tools & Apps': [],
        'Infrastructure': [],
        'Theory & Concepts': []
    }
    
    # Define patterns for categorization
    patterns = {
        'Frameworks & Libraries': ['keras', 'pytorch', 'scikit', 'hugging', 'tensors', 'tensorflow'],
        'Vector Databases': ['faiss', 'lancedb', 'vector'],
        'Models & Algorithms': ['random-forest', 'bm25', 'classifier', 'model'],
        'Text Processing': ['gunning', 'whoosh', 'syntax', 'unstructured', 'tf-idf', 'indexing'],
        'Document Processing': ['pdf', 'word', 'document'],
        'Tools & Apps': ['stable-diffusion', 'streamlit', 'app', 'web-ui'],
        'Infrastructure': ['nvidia', 'gpu', 'installation', 'recompile'],
        'Theory & Concepts': ['complexity', 'notation', 'time-complexity']
    }
    
    categorized = set()
    
    for category, keywords in patterns.items():
        for file_path in files:
            filename = os.path.basename(file_path).lower()
            if any(keyword in filename for keyword in keywords):
                categories[category].append(file_path)
                categorized.add(file_path)
    
    # Add uncategorized files to Theory & Concepts
    for file_path in files:
        if file_path not in categorized:
            categories['Theory & Concepts'].append(file_path)
    
    return categories

def collect_html_structure(base_dir: str):
    """
    Build a hierarchical structure with subdirectories identified.
    Returns: {
        'root_files': [paths...],
        'subdirs': {
            'dirname': {
                'index': path_or_none,
                'files': [paths...]
            }
        }
    }
    """
    base_dir = base_dir.rstrip("/")
    base_abs = os.path.abspath(base_dir)
    
    structure = {
        'root_files': [],
        'subdirs': {}
    }
    
    # First pass: collect all HTML files
    for root, dirs, files in os.walk(base_dir):
        abs_root = os.path.abspath(root)
        rel_root = os.path.relpath(abs_root, base_abs)
        
        for f in files:
            if not f.endswith(".html"):
                continue
            
            full_path = os.path.join(root, f)
            web_path = "/" + full_path.replace("\\", "/")
            
            if rel_root == ".":
                # Root directory file
                if f.lower() != "index.html":
                    structure['root_files'].append(web_path)
            else:
                # Subdirectory file
                # Get the immediate subdirectory name
                subdir = rel_root.split(os.sep)[0]
                
                if subdir not in structure['subdirs']:
                    structure['subdirs'][subdir] = {
                        'index': None,
                        'files': [],
                        'path': "/" + os.path.join(base_dir, subdir).replace("\\", "/")
                    }
                
                if f.lower() == "index.html":
                    structure['subdirs'][subdir]['index'] = web_path
                else:
                    structure['subdirs'][subdir]['files'].append(web_path)
    
    return structure

def generate_submenu(subdir_name: str, subdir_data: dict) -> list:
    """Generate HTML lines for a submenu."""
    lines = []
    lines.append(f'          <li class="has-submenu">')
    
    # Link to the subdir index or first file
    if subdir_data['index']:
        lines.append(f'            <a href="{subdir_data["index"]}">{get_section_header(subdir_name)}</a>')
    else:
        # Use the directory path as fallback
        lines.append(f'            <a href="{subdir_data["path"]}">{get_section_header(subdir_name)}</a>')
    
    lines.append(f'            <ul class="submenu">')
    
    # Add index if exists
    if subdir_data['index']:
        label = label_for_index(subdir_data['index'])
        lines.append(f'              <li><a href="{subdir_data["index"]}">{label}</a></li>')
    
    # Add other files
    for file_path in sorted(subdir_data['files']):
        filename = os.path.basename(file_path)
        label = label_for_file(filename)
        lines.append(f'              <li><a href="{file_path}">{label}</a></li>')
    
    lines.append(f'            </ul>')
    lines.append(f'          </li>')
    
    return lines

def generate_ai_ml_dropdown(base_dir: str) -> list:
    """Generate the AI/ML dropdown with categorized sections and submenus."""
    lines = []
    structure = collect_html_structure(base_dir)
    
    # Categorize root files
    categories = categorize_ai_ml_files(structure['root_files'])
    
    # Generate categorized sections
    for category, files in categories.items():
        if not files and category not in ['Vector Databases', 'Neural Networks', 'RAG']:
            continue
        
        lines.append(f'          <li class="dropdown-section-header">{category}</li>')
        
        # Add files in this category
        for file_path in sorted(files):
            filename = os.path.basename(file_path)
            label = label_for_file(filename)
            lines.append(f'          <li><a href="{file_path}">{label}</a></li>')
        
        # Add relevant subdirectories after certain categories
        if category == 'Frameworks & Libraries':
            # Add FAISS submenu
            if 'faiss' in structure['subdirs']:
                lines.extend(generate_submenu('faiss', structure['subdirs']['faiss']))
            
            # Add LanceDB if exists
            for file in structure['root_files']:
                if 'lancedb' in file.lower():
                    lines.append(f'          <li><a href="{file}">{label_for_file(os.path.basename(file))}</a></li>')
            
            # Add Neural Network submenu
            if 'neural-network' in structure['subdirs']:
                lines.extend(generate_submenu('neural-network', structure['subdirs']['neural-network']))
            
            # Add RAG submenu
            if 'rag' in structure['subdirs']:
                lines.extend(generate_submenu('rag', structure['subdirs']['rag']))
    
    return lines

def generate_menu_html(directories: dict, output_file: str, backup_dir: str = None):
    """Generate the complete menu HTML file."""
    
    # Backup existing menu if it exists
    if backup_dir and os.path.exists(output_file):
        today = datetime.now().strftime('%Y-%m-%d')
        backup_name = f"menu-{today}.html"
        backup_path = os.path.join(backup_dir, backup_name)
        shutil.copy2(output_file, backup_path)
        print(f"Backed up existing menu to: {backup_path}")
    
    # Generate the HTML
    html_lines = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '  <meta charset="UTF-8">',
        '  <title>{{ include.title }}</title>',
        '  <link rel="stylesheet" type="text/css" href="/static/style.css" />',
        '  <link rel="stylesheet" type="text/css" href="/static/navigation.css" />',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '  <link rel="icon" href="/images/vector-image-green.jpg" type="image/png" sizes="32x32">',
        '  <!-- https://prismjs.com/#supported-languages -->',
        '  <link href="/static/prism-tomorrow.min.css" rel="stylesheet" />',
        '  <script src="/static/prism.min.js"></script>',
        '  <script src="/static/prism-python.min.js"></script>',
        '  <script src="/static/prism-yaml.min.js"></script>',
        '  <script src="/static/prism-sql.min.js"></script>',
        '  <script src="/static/prism-markdown.min.js"></script>',
        '  <script src="/static/prism-bash.min.js"></script>',
        '  <script src="/static/prism-go.min.js"></script>',
        '',
        '</head>',
        '',
        '<body>',
        '  <!-- Navigation Menu with nested dropdowns -->',
        '  <nav class="navbar">',
        '    <ul>',
        '      <li><a id="home" href="/">Home</a></li>',
        ''
    ]
    
    # Process each main directory
    for main_dir, config in directories.items():
        dir_id = main_dir.lower().replace(' ', '-')
        
        html_lines.append(f'      <!-- {main_dir} -->')
        html_lines.append(f'      <li>')
        html_lines.append(f'        <a id="{dir_id}" href="/{config["path"]}">{main_dir}</a>')
        
        if config.get('has_dropdown', True):
            html_lines.append(f'        <ul class="dropdown{config.get("class", "")}">')
            
            # Custom handling for AI/ML
            # if main_dir == "AI / ML":
            #     html_lines.extend(generate_ai_ml_dropdown(config['path']))
            # else:
            # Standard handling for other directories
            structure = collect_html_structure(config['path'])
            
            # Add index.html if exists
            for root, dirs, files in os.walk(config['path']):
                if 'index.html' in files:
                    web_path = "/" + os.path.join(root, 'index.html').replace("\\", "/")
                    label = f"{main_dir} Overview"
                    html_lines.append(f'          <li><a href="{web_path}">{label}</a></li>')
                    break
            
            # Add other files
            for file_path in sorted(structure['root_files']):
                filename = os.path.basename(file_path)
                label = label_for_file(filename)
                html_lines.append(f'          <li><a href="{file_path}">{label}</a></li>')
            
            # Add subdirectories as submenus
            for subdir_name, subdir_data in sorted(structure['subdirs'].items()):
                html_lines.extend(generate_submenu(subdir_name, subdir_data))
            
            html_lines.append(f'        </ul>')
        
        html_lines.append(f'      </li>')
        html_lines.append('')
    
    # Add the rest of the HTML
    html_lines.extend([
        '    </ul>',
        '  </nav>',
        '',
        '  <!-- Breadcrumb -->',
        '  <div id="breadcrumb" class="breadcrumb"></div>',
        '',
        '  <script>',
        '    // Generate breadcrumbs based on the current URL path',
        '    const breadcrumbDiv = document.getElementById("breadcrumb");',
        '    const baseUrl       = "https://luzbetak.github.io";',
        '    const pathParts     = window.location.pathname.split("/").filter(Boolean);',
        '',
        '    let breadcrumbHtml = `<a href="${baseUrl}">Home</a>`;',
        '    let accumulatedPath = "";',
        '',
        '    pathParts.forEach((part, index) => {',
        '      accumulatedPath += `/${part}`;',
        '      if (index === pathParts.length - 1 && part.endsWith(".html")) {',
        '        part = part.replace(".html", "");',
        '      }',
        '      breadcrumbHtml += ` › <a href="${baseUrl}${accumulatedPath}">${decodeURIComponent(part)}</a>`;',
        '    });',
        '',
        '    breadcrumbDiv.innerHTML = breadcrumbHtml;',
        '',
        '    // Highlight the active section in the navbar',
        '    const currentPath = window.location.pathname;',
        '    const navItems = {',
        '      "/": "home",',
        '      "/ai-ml": "ai-ml",',
        '      "/database": "database",',
        '      "/snowflake": "snowflake",',
        '      "/databricks": "databricks",',
        '      "/redshift": "redshift",',
        '      "/aws": "aws",',
        '      "/software": "software",',
        '      "/tools": "tools",',
        '      "/github": "github",',
        '      "/search": "search"',
        '    };',
        '',
        '    for (const [path, id] of Object.entries(navItems)) {',
        '      if (currentPath.includes(path) || (path === "/" && currentPath === "/")) {',
        '        const element = document.getElementById(id);',
        '        if (element) {',
        '          element.style.backgroundColor = "#004499";',
        '          break;',
        '        }',
        '      }',
        '    }',
        '',
        '    // Navigation using left and right arrow keys',
        '    document.addEventListener("keydown", function(event) {',
        '      const menuItems = document.querySelectorAll(".navbar a");',
        '      let currentIndex = -1;',
        '',
        '      menuItems.forEach((item, index) => {',
        '        if (item === document.activeElement) {',
        '          currentIndex = index;',
        '        }',
        '      });',
        '',
        '      if (event.key === "ArrowRight") {',
        '        const nextIndex = (currentIndex + 1) % menuItems.length;',
        '        menuItems[nextIndex].focus();',
        '      } else if (event.key === "ArrowLeft") {',
        '        const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;',
        '        menuItems[prevIndex].focus();',
        '      }',
        '    });',
        '  </script>',
        '',
        '</body>',
        '</html>'
    ])
    
    # Write the file
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_lines))
    
    print(f"Generated new menu: {output_file}")

def main():
    """Main function to generate the menu."""
    
    # Configuration for main navigation items
    # Update these paths to match your directory structure
    directories = {
        "AI / ML": {
            "path": "ai-ml",
            "has_dropdown": True
        },
        "Database": {
            "path": "database",
            "has_dropdown": True
        },
        "Snowflake": {
            "path": "snowflake",
            "has_dropdown": True,
            "class": " dropdown-compact"
        },
        "Databricks": {
            "path": "databricks",
            "has_dropdown": True
        },
        "Redshift": {
            "path": "redshift",
            "has_dropdown": True,
            "class": " dropdown-compact"
        },
        "AWS": {
            "path": "aws",
            "has_dropdown": True,
            "class": " dropdown-compact"
        },
        "Software": {
            "path": "software",
            "has_dropdown": True
        },
        "Tools": {
            "path": "tools",
            "has_dropdown": True
        },
        "My Github": {
            "path": "github",
            "has_dropdown": False
        },
        "Search": {
            "path": "search",
            "has_dropdown": False
        }
    }
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        output_file = sys.argv[1]
    else:
        output_file = "_includes/menu.html"
    
    # Set backup directory (same as output directory)
    backup_dir = os.path.dirname(output_file) if os.path.dirname(output_file) else "."
    
    # Check if all directories exist
    missing_dirs = []
    for name, config in directories.items():
        if config.get('has_dropdown', True) and not os.path.isdir(config['path']):
            missing_dirs.append(config['path'])
    
    if missing_dirs:
        print(f"Warning: The following directories were not found: {', '.join(missing_dirs)}")
        print("The script will continue but some menu items may be empty.")
    
    # Generate the menu
    generate_menu_html(directories, output_file, backup_dir)
    
    print("\nDon't forget to:")
    print("1. Upload navigation-improved.css (or navigation-fixed.css) to /static/")
    print("2. Verify all directory paths are correct")
    print("3. Test the menu in your browser")

if __name__ == "__main__":
    main()
