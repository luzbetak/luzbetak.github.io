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

<div class="slideshow-container">
'''

# Add each PNG file to the slideshow
for index, file in enumerate(png_files):
    if index == 0:
        html_content += f'    <img class="slides active" src="{file}" alt="{file}">\n'
    else:
        html_content += f'    <img class="slides" src="{file}" alt="{file}">\n'

# Add the navigation buttons and script for slideshow functionality
html_content += f'''
    <!-- Previous and next buttons -->
    <a class="prev" onclick="changeSlide(-1)">&#10094;</a>
    <a class="next" onclick="changeSlide(1)">&#10095;</a>
</div>

<script>
    let currentSlide = 0;
    const slides = document.getElementsByClassName('slides');
    const prevButton = document.querySelector('.prev');
    const nextButton = document.querySelector('.next');

    function updateButtons() {{
        // Hide the "previous" button if we're on the first slide, and the "next" button if we're on the last slide
        prevButton.style.display = currentSlide === 0 ? 'none' : 'block';
        nextButton.style.display = currentSlide === slides.length - 1 ? 'none' : 'block';
    }}

    function showSlide(index) {{
        // Hide all slides
        for (let i = 0; i < slides.length; i++) {{
            slides[i].classList.remove('active');
        }}
        // Show the current slide
        slides[index].classList.add('active');
        updateButtons();
    }}

    function changeSlide(direction) {{
        const newSlide = currentSlide + direction;
        // Ensure the newSlide index is within bounds (0 <= newSlide < slides.length)
        if (newSlide >= 0 && newSlide < slides.length) {{
            currentSlide = newSlide;
            showSlide(currentSlide);
        }}
    }}

    // Add event listener for left and right arrow key presses
    document.addEventListener('keydown', function(event) {{
        if (event.key === 'ArrowRight') {{
            // Only move to the next slide if it's not the last slide
            if (currentSlide < slides.length - 1) {{
                changeSlide(1);
            }}
        }} else if (event.key === 'ArrowLeft') {{
            // Only move to the previous slide if it's not the first slide
            if (currentSlide > 0) {{
                changeSlide(-1);
            }}
        }}
    }});

    // Initialize the buttons on page load
    updateButtons();
</script>

</body>
</html>
'''

# Write the HTML content to slideshow.html
with open('slideshow.html', 'w') as file:
    file.write(html_content)

print("Slideshow HTML has been generated as 'slideshow.html'.")

