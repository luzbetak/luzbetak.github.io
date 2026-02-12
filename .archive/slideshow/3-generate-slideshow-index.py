#!/usr/bin/env python
import os

# Get all .png files in the current directory and sort them
png_files = sorted([f for f in os.listdir('.') if f.endswith('.png')])

# Start building the HTML content
html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Full Screen Image Slideshow</title>
    <style>
        body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: black;
            flex-direction: column;
        }
        .filename {
            font-size: 22px;
            color: white;
            position: absolute;
            top: 10px;
            text-align: center;
            width: 100%;
        }
        .slideshow-container {
            position: relative;
            width: 100%;
            height: 100%;
        }
        .slides {
            display: none;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .active {
            display: block;
        }
        .prev, .next {
            cursor: pointer;
            position: absolute;
            top: 50%;
            padding: 16px;
            color: white;
            font-weight: bold;
            font-size: 18px;
            transition: 0.6s ease;
            border-radius: 3px;
            user-select: none;
        }
        .prev {
            left: 0;
            background-color: rgba(0, 0, 0, 0.5);
        }
        .next {
            right: 0;
            background-color: rgba(0, 0, 0, 0.5);
        }
        .prev:hover, .next:hover {
            background-color: rgba(0, 0, 0, 0.8);
        }
        .disabled {
            display: none;
        }
    </style>
</head>
<body>

<div class="filename" id="filename"></div>

<div class="slideshow-container">
'''

# Add each PNG file to the slideshow
for index, file in enumerate(png_files):
    if index == 0:
        html_content += f'   <a href="{file}" target="_blank"><img class="slides active" src="{file}" alt="{file}"></a>\n'
    else:
        html_content += f'   <a href="{file}" target="_blank"><img class="slides" src="{file}" alt="{file}"></a>\n'

# Add the navigation buttons and script for slideshow functionality
html_content += f'''
    <!-- Previous and next buttons -->
    <a class="prev" onclick="changeSlide(-1)">&#10094;</a>
    <a class="next" onclick="changeSlide(1)">&#10095;</a>
</div>

<script>
    let currentSlide = 0;
    const slides = document.getElementsByClassName('slides');
    const filenameDisplay = document.getElementById('filename');
    const prevButton = document.querySelector('.prev');
    const nextButton = document.querySelector('.next');

    const filenames = {png_files};  // Array of filenames

    function updateButtons() {{
        prevButton.style.display = currentSlide === 0 ? 'none' : 'block';
        nextButton.style.display = currentSlide === slides.length - 1 ? 'none' : 'block';
    }}

    function updateFilename() {{
        filenameDisplay.textContent = filenames[currentSlide];
    }}

    function showSlide(index) {{
        // Hide all slides
        for (let i = 0; i < slides.length; i++) {{
            slides[i].classList.remove('active');
        }}
        // Ensure the slide index is within bounds
        currentSlide = index;
        slides[currentSlide].classList.add('active');
        updateButtons();
        updateFilename();
    }}

    function changeSlide(direction) {{
        const newSlide = currentSlide + direction;
        if (newSlide >= 0 && newSlide < slides.length) {{
            showSlide(newSlide);
        }}
    }}

    // Add event listener for left and right arrow key presses
    document.addEventListener('keydown', function(event) {{
        if (event.key === 'ArrowRight' && currentSlide < slides.length - 1) {{
            changeSlide(1);
        }} else if (event.key === 'ArrowLeft' && currentSlide > 0) {{
            changeSlide(-1);
        }}
    }});

    // Initialize the buttons and filename on page load
    updateButtons();
    updateFilename();
</script>

</body>
</html>
'''

# Write the HTML content to slideshow.html
with open('index.html', 'w') as file:
    file.write(html_content)

print("Slideshow HTML has been generated as 'index.html'.")

